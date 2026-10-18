<template>
  <ion-modal :is-open="isOpen" class="saved-library-modal" aria-labelledby="saved-library-title"
    @willPresent="refresh" @didDismiss="$emit('close')">
    <ion-content>
      <div class="library-shell">
        <header class="library-header">
          <h2 id="saved-library-title">{{ tab === 'save' ? 'Save today’s roster' : 'Saved Players & Rosters' }}</h2>
          <ion-button fill="clear" @click="$emit('close')">Close</ion-button>
        </header>
        <p v-if="tab !== 'save'" class="library-help">Keep players and groups on this device for another day.</p>
        <p v-if="storageStatus !== 'ready'" role="status" class="library-notice">
          Saving is unavailable. Changes are only available while this app stays open. Existing saved data is untouched.
        </p>
        <p v-if="hasAssignments && tab !== 'save'" id="library-session-note" class="library-notice">
          You can manage your library now. Use Clear Assignments on Game Setup before adding players or loading a roster.
        </p>
        <p ref="messageText" role="status" aria-live="polite" class="library-message">{{ message }}</p>
        <ion-segment v-if="tab !== 'save' && !editingRosterId" v-model="tab" aria-label="Saved library">
          <ion-segment-button value="players"><ion-label>Players</ion-label></ion-segment-button>
          <ion-segment-button value="rosters"><ion-label>Rosters</ion-label></ion-segment-button>

        </ion-segment>

        <section v-if="pendingApply" class="library-panel" aria-labelledby="replace-roster-title">
          <h3 id="replace-roster-title" tabindex="-1">Replace today's roster?</h3>
          <p>This replaces the names currently in Game Setup. Your saved players and rosters will stay in the library.</p>
          <div class="library-actions">
            <ion-button @click="confirmApply">Replace today's roster</ion-button>
            <ion-button fill="outline" @click="pendingApply = null">Cancel</ion-button>
          </div>
        </section>

        <section v-if="tab === 'players'" aria-label="Saved players">
          <form class="library-form" @submit.prevent="addPlayer">
            <label for="library-new-player">Player name</label>
            <input id="library-new-player" v-model="newPlayerName" autocomplete="off" placeholder="e.g. Marco R">
            <ion-button type="submit" :disabled="!newPlayerName.trim()">Add player</ion-button>
          </form>
          <div class="library-panel">
            <h3 id="roster-selection-title" tabindex="-1">{{ editingRosterId ? 'Editing saved roster: ' + rosterName : 'Use selected players' }}</h3>
            <p class="library-help">{{ selectedIds.length }} selected. Select players below. Unchecking a player removes them from this selection, not from Saved Players.</p>
            <div class="library-actions">
              <ion-button v-if="!editingRosterId" :disabled="hasAssignments || !selectedIds.length" :aria-describedby="hasAssignments ? 'library-session-note' : undefined" @click="requestApply(selectedIds, 'append')">Add to today's roster</ion-button>
              <ion-button fill="clear" :disabled="!selectedIds.length" @click="selectedIds = []">Clear selection</ion-button>
            </div>
            <form class="library-form" @submit.prevent="saveRoster">
              <label for="library-roster-name">Roster name</label>
              <input id="library-roster-name" v-model="rosterName" autocomplete="off" placeholder="e.g. Tuesday Group">
              <div class="library-actions">
                <ion-button type="submit" :disabled="!rosterName.trim() || !selectedIds.length">{{ editingRosterId ? 'Save roster changes' : 'Create saved roster' }}</ion-button>
                <ion-button v-if="editingRosterId" fill="outline" @click="cancelRosterEdit(); tab = 'rosters'">Cancel</ion-button>
              </div>
            </form>
          </div>
          <label for="library-search">Search players</label>
          <input id="library-search" v-model="search" type="search" autocomplete="off">
          <p class="library-help">{{ data.players.length }} saved {{ data.players.length === 1 ? 'player' : 'players' }} · {{ selectedIds.length }} selected</p>
          <p v-if="!data.players.length">Add your first saved player above. You can also close this screen and type names directly in Game Setup.</p>
          <p v-else-if="!filteredPlayers.length">No players match your search.</p>
          <ul class="library-list">
            <li v-for="player in filteredPlayers" :key="player.id" class="library-panel">
              <div class="library-player-row">
                <label class="library-player-label">
                  <input v-model="selectedIds" type="checkbox" :value="player.id">
                  <span>{{ player.displayName }}<small v-if="duplicateName(player)">Same name · Entry {{ data.players.findIndex(p => p.id === player.id) + 1 }}. Rename to distinguish.</small></span>
                </label>
                <div class="library-actions">
                  <ion-button fill="clear" :aria-label="`Rename ${player.displayName}`" @click="startRename(player)">Rename</ion-button>
                  <ion-button fill="clear" color="medium" :aria-label="`Delete ${player.displayName}`" @click="requestDelete('player', player)">Delete</ion-button>
                </div>
              </div>
              <form v-if="editingPlayerId === player.id" class="library-form" @submit.prevent="renamePlayer">
                <label :for="`rename-${player.id}`">New display name</label>
                <input :id="`rename-${player.id}`" v-model="editedName" autocomplete="off">
                <p class="library-help">Updates saved rosters. Today's roster and generated rounds stay unchanged.</p>
                <div class="library-actions">
                  <ion-button type="submit" :disabled="!editedName.trim()">Save name</ion-button>
                  <ion-button fill="outline" @click="editingPlayerId = null">Cancel</ion-button>
                </div>
              </form>
            </li>
          </ul>

        </section>

        <section v-else-if="tab === 'rosters'" aria-label="Saved rosters">
          <label v-if="data.rosters.length" for="saved-roster-search">Search saved rosters</label>
          <input v-if="data.rosters.length" id="saved-roster-search" v-model="rosterSearch" type="search" autocomplete="off">
          <p v-if="data.rosters.length && !filteredRosters.length">No saved rosters match your search.</p>
          <p v-if="!data.rosters.length" class="library-help">Create your first saved roster by selecting players in the Players tab, or close this screen, type names in Game Setup, and choose Save today’s roster….</p>
          <ul class="library-list">
            <li v-for="roster in filteredRosters" :key="roster.id" class="library-panel">
              <h3>{{ roster.name }}</h3>
              <p class="library-help">{{ roster.playerIds.length }} {{ roster.playerIds.length === 1 ? 'player' : 'players' }}</p>
              <p>{{ rosterNames(roster) }}</p>
              <div class="library-actions">
                <ion-button :disabled="hasAssignments || !roster.playerIds.length" :aria-describedby="hasAssignments ? 'library-session-note' : undefined" :aria-label="`Load ${roster.name}`" @click="requestApply(roster.playerIds, 'replace')">Load roster</ion-button>
                <ion-button fill="outline" :aria-label="`Edit ${roster.name}`" @click="editRoster(roster)">Edit</ion-button>
                <ion-button fill="clear" color="medium" :aria-label="`Delete ${roster.name}`" @click="requestDelete('roster', roster)">Delete</ion-button>
              </div>
            </li>
          </ul>
        </section>

        <section v-else-if="!saveComplete" aria-label="Save current roster" class="library-panel">

          <p class="library-help">Keep these players for another day. Today's game stays unchanged.</p>
          <p>{{ importReview.entries.length }} {{ importReview.entries.length === 1 ? 'player' : 'players' }}: {{ importReview.newCount }} new, {{ importReview.existingCount }} already saved.</p>
          <p v-if="importReview.error" role="status" class="library-notice">{{ importReview.error }}</p>
          <details v-if="importReview.entries.length">
            <summary>Review player names</summary>
            <ul>
              <li v-for="(entry, index) in importReview.entries" :key="index">
                {{ entry.name }} — {{ entry.repeated || entry.matches.length > 1 ? 'Needs review' : entry.matches.length ? 'Use saved player' : 'Add new player' }}
              </li>
            </ul>
          </details>
          <form class="library-form" @submit.prevent="saveCurrentRoster">
            <ion-radio-group v-model="importMode" aria-label="Save as" class="library-save-options">
              <ion-radio value="players" label-placement="end" justify="start">Save players only</ion-radio>
              <ion-radio value="new" label-placement="end" justify="start">Save as a new roster</ion-radio>
              <ion-radio value="update" label-placement="end" justify="start" :disabled="!data.rosters.length">Update saved roster</ion-radio>
            </ion-radio-group>
            <ion-input v-if="importMode === 'new'" v-model="importRosterName" label="New roster name" label-placement="stacked" fill="outline" autocomplete="off" placeholder="e.g. Tuesday Morning" />
            <template v-if="importMode === 'update'">
              <ion-select v-model="importRosterId" label="Roster to update" label-placement="stacked" fill="outline" interface="popover" placeholder="Choose a saved roster">
                <ion-select-option v-for="roster in data.rosters" :key="roster.id" :value="roster.id">{{ roster.name }}</ion-select-option>
              </ion-select>
              <p v-if="importTarget" class="library-notice">
                Updating “{{ importTarget.name }}” replaces its {{ importTarget.playerIds.length }} players with today's {{ importReview.entries.length }} players. Players removed from the group stay in your library.
              </p>
            </template>
            <p class="library-help">Saved groups change only when you choose to update them.</p>
            <ion-button type="submit" :disabled="!!importReview.error || (importMode === 'new' && !importRosterName.trim()) || (importMode === 'update' && !importTarget)">
              {{ importMode === 'players' ? 'Save players' : importMode === 'new' ? 'Save new roster' : 'Update selected roster' }}
            </ion-button>
          </form>
        </section>

        <section v-if="tab === 'save' && saveComplete" class="library-panel">
          <p>Your saved library is ready for another day.</p>
          <ion-button @click="$emit('close')">Done</ion-button>
        </section>

        <section v-if="pendingDelete" class="library-panel" aria-labelledby="delete-library-title">
          <h3 id="delete-library-title" tabindex="-1">Delete {{ pendingDelete.name }}?</h3>
          <p>{{ pendingDelete.kind === 'roster' ? 'Only this saved roster is removed. Its players stay in your library.' : 'This removes the player from your library. Today\'s roster stays unchanged.' }}</p>
          <div class="library-actions">
            <ion-button color="danger" @click="confirmDelete">Confirm delete</ion-button>
            <ion-button fill="outline" @click="pendingDelete = null">Cancel</ion-button>
          </div>
        </section>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script>
import { IonButton, IonContent, IonLabel, IonModal, IonSegment, IonSegmentButton, IonRadioGroup, IonRadio, IonInput, IonSelect, IonSelectOption, alertController } from '@ionic/vue';
import { addSavedPlayer, renameSavedPlayer, saveNamedRoster, deleteSavedPlayer, deleteNamedRoster } from '../services/rosterData.mjs';
import { browseSavedPlayers, searchSavedRosters } from '../services/rosterBrowsing.mjs';
import { prepareRosterSelection } from '../services/rosterSelection.mjs';
import { reviewRosterImport, saveRosterFromText } from '../services/rosterImport.mjs';

export default {
  name: 'SavedRostersModal',
  components: { IonButton, IonContent, IonLabel, IonModal, IonSegment, IonSegmentButton, IonRadioGroup, IonRadio, IonInput, IonSelect, IonSelectOption },
  props: {
    isOpen: Boolean,
    initialTab: { type: String, default: 'players' },
    hasAssignments: Boolean,
    namesText: { type: String, default: '' },
    persistence: { type: Object, required: true }
  },
  emits: ['close', 'apply'],
  data() {
    const snapshot = this.persistence.snapshot();
    return {
      data: snapshot.data, storageStatus: snapshot.status, tab: this.initialTab, message: '',
      saveComplete: false, rosterSearch: '', importMode: 'players', importRosterName: '', importRosterId: '',
      newPlayerName: '', search: '', selectedIds: [], editingPlayerId: null, editedName: '',
      editingRosterId: null, rosterName: '', pendingApply: null, pendingDelete: null
    };
  },
  computed: {
    importReview() { return reviewRosterImport(this.data, this.namesText); },
    importTarget() { return this.data.rosters.find(roster => roster.id === this.importRosterId); },
    filteredRosters() { return searchSavedRosters(this.data.rosters, this.rosterSearch); },
    filteredPlayers() {
      return browseSavedPlayers(this.data.players, this.search);
    }
  },
  watch: {
    tab() { this.pendingApply = null; this.pendingDelete = null; },
    message(value) {
      if (value) this.$nextTick(() => this.$refs.messageText?.scrollIntoView({ block: 'center' }));
    }
  },
  methods: {
    async confirmRosterUpdate(name) {
      const alert = await alertController.create({
        header: 'Update saved roster?',
        message: 'Replace the saved name and player selection? Players removed from this roster stay in Saved Players. Today’s roster stays unchanged.',
        subHeader: name || 'Saved roster',
        buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Update saved roster', role: 'confirm' }]
      });
      await alert.present();
      return (await alert.onDidDismiss()).role === 'confirm';
    },
    async saveCurrentRoster() {
      if (this.importMode === 'update' && !(await this.confirmRosterUpdate(this.importTarget?.name))) return;
      const saved = this.commit(data => saveRosterFromText(data, {
        namesText: this.namesText, mode: this.importMode,
        rosterName: this.importRosterName, rosterId: this.importRosterId
      }), this.importMode === 'players' ? 'Players saved to your library.' : this.importMode === 'new' ? 'New roster saved.' : 'Saved roster updated.');
      this.saveComplete = saved && this.storageStatus === 'ready';
    },
    refresh() {
      const snapshot = this.persistence.snapshot();
      this.data = snapshot.data;
      this.storageStatus = snapshot.status;
      this.message = '';
      this.saveComplete = false;
      this.rosterSearch = '';
      this.pendingApply = null;
      this.pendingDelete = null;
      this.editingPlayerId = null;
      this.cancelRosterEdit();
      this.search = '';
    },
    commit(change, success) {
      try {
        const result = this.persistence.save(change(this.persistence.snapshot().data));
        this.data = result.data;
        this.storageStatus = result.status;
        if (result.status === 'invalid') { this.message = 'Changes could not be applied. Please check the selected players.'; return false; }
        this.message = result.status === 'ready' ? success : 'Changes are in memory only and could not be saved on this device.';
        return true;
      } catch (error) {
        this.message = error.message;
        return false;
      }
    },
    addPlayer() {
      if (this.commit(data => addSavedPlayer(data, this.newPlayerName), 'Player added.')) this.newPlayerName = '';
    },
    duplicateName(player) {
      return this.data.players.filter(p => p.displayName.trim().toLowerCase() === player.displayName.trim().toLowerCase()).length > 1;
    },
    startRename(player) {
      this.editingPlayerId = player.id;
      this.editedName = player.displayName;
      this.$nextTick(() => document.getElementById(`rename-${player.id}`)?.focus());
    },
    renamePlayer() {
      if (this.commit(data => renameSavedPlayer(data, this.editingPlayerId, this.editedName), 'Player name updated.')) this.editingPlayerId = null;
    },
    async saveRoster() {
      if (this.editingRosterId && !(await this.confirmRosterUpdate(this.rosterName))) return;
      if (this.commit(data => saveNamedRoster(data, {
        id: this.editingRosterId ?? undefined, name: this.rosterName, playerIds: [...this.selectedIds]
      }), 'Roster saved.')) {
        this.cancelRosterEdit();
        this.tab = 'rosters';
      }
    },
    editRoster(roster) {
      this.editingRosterId = roster.id;
      this.rosterName = roster.name;
      this.selectedIds = [...roster.playerIds];
      this.search = '';
      this.tab = 'players';
      this.$nextTick(() => document.getElementById('roster-selection-title')?.focus());
    },
    cancelRosterEdit() { this.editingRosterId = null; this.rosterName = ''; this.selectedIds = []; },
    rosterNames(roster) {
      return roster.playerIds.map(id => this.data.players.find(p => p.id === id)?.displayName).join(', ');
    },
    requestDelete(kind, item) {
      if (kind === 'player' && this.data.rosters.some(r => r.playerIds.includes(item.id))) {
        this.message = 'Remove this player from saved rosters before deleting them.';
        return;
      }
      this.pendingDelete = { kind, id: item.id, name: item.name ?? item.displayName };
      this.$nextTick(() => document.getElementById('delete-library-title')?.focus());
    },
    confirmDelete() {
      const item = this.pendingDelete;
      if (!item) return;
      if (this.commit(data => item.kind === 'player' ? deleteSavedPlayer(data, item.id) : deleteNamedRoster(data, item.id), 'Deleted from library.')) {
        if (item.kind === 'roster' && item.id === this.editingRosterId) this.cancelRosterEdit();
        this.selectedIds = this.selectedIds.filter(id => this.data.players.some(p => p.id === id));
        this.pendingDelete = null;
      }
    },
    requestApply(playerIds, mode) {
      const selection = { playerIds: [...playerIds], mode };
      try {
        prepareRosterSelection({ ...selection, data: this.persistence.snapshot().data, namesText: this.namesText, hasAssignments: this.hasAssignments });
        if (mode === 'replace' && this.namesText.trim()) {
          this.pendingApply = selection;
          this.$nextTick(() => document.getElementById('replace-roster-title')?.focus());
        } else this.$emit('apply', selection);
      } catch (error) { this.message = error.message; }
    },
    confirmApply() {
      if (!this.pendingApply) return;
      // Parent rechecks session state, references and names at the actual apply boundary.
      this.$emit('apply', this.pendingApply);
      this.pendingApply = null;
    }
  }
};
</script>

<style scoped>
.saved-library-modal {
  --width: min(48rem, 100%); --height: 90%; --border-radius: 1.25rem;
  --ion-color-primary: #0d5132; --ion-color-primary-rgb: 13, 81, 50;
  --ion-color-primary-contrast: #fff; --ion-color-primary-shade: #0b472c; --ion-color-primary-tint: #256245;
}
.library-shell { padding: max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1.5rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left)); color: #26312c; }
.library-header, .library-player-row, .library-actions { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
.library-header { justify-content: space-between; }
h2 { font-size: 1.4rem; margin: 0; flex: 1 1 15rem; }
h3 { font-size: 1.1rem; margin: 0 0 .5rem; }
p, h2, h3, label, small { overflow-wrap: break-word; }
.library-help { color: #59675f; }
.library-notice { padding: .75rem; background: #e8f5ee; border-radius: .65rem; }
.library-message { min-height: 1.5em; }
.library-panel { margin-block: 1rem; padding: 1rem; border: 1px solid #dce5df; border-radius: 1rem; }
.library-list { list-style: none; margin: 0; padding: 0; }
.library-form { display: flex; flex-direction: column; align-items: stretch; gap: .5rem; margin-block: 1rem; }
.library-player-label { display: flex; align-items: center; gap: .75rem; flex: 1 1 14rem; min-width: 0; min-height: 2.75rem; cursor: pointer; }
.library-player-label span { min-width: 0; }
small { display: block; font-size: .8rem; color: #59675f; overflow-wrap: anywhere; }
input:not([type=checkbox]):not([type=radio]), select { display: block; box-sizing: border-box; width: 100%; min-width: 0; min-height: 2.75rem; padding: .65rem; font: inherit; color: inherit; background: white; border: 1px solid #88978e; border-radius: .5rem; }
input[type=checkbox] { flex: 0 0 auto; width: 1.3rem; height: 1.3rem; accent-color: #0d5132; }
input:focus-visible, select:focus-visible, summary:focus-visible { outline: 3px solid #13764b; outline-offset: 2px; }
summary { cursor: pointer; min-height: 2.75rem; padding-block: .5rem; }
.library-save-options { display: grid; gap: .25rem; min-width: 0; margin: .5rem 0; }
ion-radio { min-height: 2.75rem; padding-block: .5rem; white-space: normal; }
ion-radio::part(label) { white-space: normal; overflow-wrap: break-word; }
ion-input, ion-select { min-width: 0; font-size: 1rem; }
input[type=radio] { width: 1.3rem; height: 1.3rem; flex: 0 0 auto; accent-color: #0d5132; }
ion-button { min-height: 2.75rem; height: auto; max-width: 100%; white-space: normal; font-size: 1rem; }
ion-button::part(native) { white-space: normal; padding-block: .65rem; }
.saved-library-modal ion-segment { display: flex; flex-wrap: wrap; }
.saved-library-modal ion-segment-button { flex: 1 0 8rem; max-width: 100%; min-width: 0; min-height: 2.75rem; }
ion-label { white-space: normal; font-size: 1rem; }
@media (max-width: 35rem) { .saved-library-modal { --height: 100%; --border-radius: 0; } }
</style>
