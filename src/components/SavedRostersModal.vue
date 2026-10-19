<template>
  <component :is="embedded ? 'section' : 'ion-modal'" :is-open="embedded ? undefined : isOpen" class="saved-library-modal" :class="embedded ? 'embedded-library' : 'app-modal'" :aria-labelledby="embedded ? undefined : 'saved-library-title'"
    @willPresent="refresh" @didPresent="announceInitialStatus" @didDismiss="$emit('close')">
        <header v-if="!embedded" class="library-header">
          <h2 id="saved-library-title">{{ tab === 'save' ? 'Save today’s roster' : 'Saved Players & Rosters' }}</h2>
          <ion-button fill="outline" @click="$emit('close')">Close</ion-button>
        </header>
    <component :is="embedded ? 'div' : 'ion-content'">
      <div class="library-shell" :class="{ 'library-toast-visible': toastVisible }">

        <details v-if="tab !== 'save' && !editorOpen && !addingPlayers" class="library-context-help">
          <summary>About saved rosters</summary>
          <p class="library-help">Saved rosters are reusable groups. Changes to today’s players won’t change a saved roster unless you save those changes.</p>
        </details>
        <p v-if="hasAssignments && tab !== 'save'" id="library-session-note" class="library-notice">
          To add players to today's roster or load a roster, first use Clear Assignments in Game Setup.
        </p>
        <ion-segment v-if="(embedded || tab !== 'save') && !editorOpen && !addingPlayers && !selectingForPlay" v-model="tab" aria-label="Saved library">
          <ion-segment-button value="rosters"><ion-label>Saved Rosters</ion-label></ion-segment-button>
          <ion-segment-button value="players"><ion-label>Players</ion-label></ion-segment-button>

        </ion-segment>

        <section v-if="pendingApply" class="library-panel" aria-labelledby="replace-roster-title">
          <h3 id="replace-roster-title" tabindex="-1">Replace today's roster?</h3>
          <p>This replaces the names currently in Game Setup. Your saved players and rosters will stay in the library.</p>
          <div class="library-actions">
            <ion-button @click="confirmApply">Replace today's roster</ion-button>
            <ion-button fill="outline" @click="pendingApply = null">Cancel</ion-button>
          </div>
        </section>

        <section v-if="addingPlayers" class="library-panel" aria-labelledby="add-players-title">
          <h3 id="add-players-title" tabindex="-1">Add Players</h3>
          <form class="library-form" @submit.prevent="addPlayers">
            <ion-textarea v-model="entryText" label="Player names — one per line" label-placement="stacked" fill="outline" :auto-grow="true" :rows="4" placeholder="Andrea&#10;Marco R" />
            <p aria-live="polite">{{ entryReview.count }} entered · {{ entryReview.accepted.length }} new · {{ entryReview.skipped.length }} skipped</p>
            <p v-if="entryReview.skipped.length" class="library-help">Already saved or repeated: {{ entryReview.skipped.join(', ') }}. Use distinct names for different people.</p>
            <p v-if="editorOpen" class="library-help">New players are saved when you save this roster.</p>
            <div class="library-actions">
              <ion-button type="submit" :disabled="!entryReview.accepted.length"><ion-icon :icon="addOutline" slot="start" aria-hidden="true" />{{ editorOpen ? 'Add to Roster' : 'Save Players' }}</ion-button>
              <ion-button fill="outline" @click="closePlayerEntry">Cancel</ion-button>
            </div>
          </form>
        </section>

        <section v-if="(tab === 'players' || editorOpen) && !addingPlayers" :aria-label="editorOpen ? 'Roster editor' : 'Saved players'">
          <template v-if="editorOpen">
            <h3 id="roster-selection-title" tabindex="-1">{{ editingRosterId ? 'Edit Roster' : 'Create Roster' }}</h3>
            <ion-input v-model="rosterName" label="Roster Name" label-placement="stacked" fill="outline" autocomplete="off" placeholder="e.g. Tuesday Morning" />
          </template>
          <div class="library-actions">
            <ion-button @click="openPlayerEntry"><ion-icon :icon="addOutline" slot="start" aria-hidden="true" />Add Players</ion-button>
            <ion-button v-if="!editorOpen && !selectingForPlay && data.players.length" fill="outline" @click="selectingForPlay = true; selectedIds = []">Select for Play</ion-button>
            <ion-button v-if="selectingForPlay" fill="outline" @click="selectingForPlay = false; selectedIds = []">Cancel Selection</ion-button>
          </div>
          <div v-if="!availablePlayers.length" class="library-panel">
            <h3>Let's add your players first!</h3>
            <p>Save the people you regularly play with, then choose who belongs in this roster.</p>
          </div>
          <ion-searchbar v-if="availablePlayers.length" v-model="search" aria-label="Search players" placeholder="Search players" />
          <div v-if="editorOpen || selectingForPlay" class="library-actions">
            <ion-button fill="outline" :disabled="!filteredPlayers.some(player => !selectedIds.includes(player.id))" @click="selectAllPlayers">{{ search.trim() ? 'Select All Results' : 'Select All' }}</ion-button>
            <ion-button fill="outline" :disabled="!selectedIds.length" @click="selectedIds = []">Clear Selection</ion-button>
          </div>
          <p class="library-help" aria-live="polite">{{ availablePlayers.length }} {{ availablePlayers.length === 1 ? 'player' : 'players' }}<template v-if="editorOpen || selectingForPlay"> · {{ selectedIds.length }} selected</template></p>
          <p v-if="availablePlayers.length && !filteredPlayers.length">No players match your search.</p>
          <ul class="library-list">
            <li v-for="player in filteredPlayers" :key="player.id" class="library-panel">
              <div class="library-player-row">
                <component :is="editorOpen || selectingForPlay ? 'label' : 'div'" class="library-player-label" :class="{ 'player-display-only': !editorOpen && !selectingForPlay }">
                  <input v-if="editorOpen || selectingForPlay" v-model="selectedIds" type="checkbox" :value="player.id">
                  <img class="library-player-badge" src="../assets/saved-player-pickleball.png" width="38" height="38" alt="" aria-hidden="true">
                  <span>{{ player.displayName }}<small v-if="duplicateName(player)">Same name · Entry {{ data.players.findIndex(p => p.id === player.id) + 1 }}. Rename to distinguish.</small></span>
                </component>
                <div v-if="!editorOpen && !selectingForPlay" class="library-actions">
                  <ion-button class="player-icon-action" fill="outline" :aria-label="`Edit ${player.displayName}`" title="Edit player name" @click="startRename(player)"><ion-icon slot="icon-only" :icon="pencilOutline" aria-hidden="true" /></ion-button>
                  <ion-button class="player-icon-action" fill="outline" color="danger" :aria-label="`Delete ${player.displayName}`" title="Delete player" @click="requestDelete('player', player)"><ion-icon slot="icon-only" :icon="trashOutline" aria-hidden="true" /></ion-button>
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

        <section v-else-if="tab === 'rosters' && !addingPlayers" aria-label="Saved rosters">
          <ion-button @click="createRoster"><ion-icon :icon="addOutline" slot="start" aria-hidden="true" />Create Roster</ion-button>
          <ion-searchbar v-if="data.rosters.length" v-model="rosterSearch" aria-label="Search saved rosters" placeholder="Search saved rosters" />
          <p v-if="data.rosters.length && !filteredRosters.length">No saved rosters match your search.</p>
          <p v-if="!data.rosters.length" class="library-help">No saved rosters yet. Create your first group, or add regular players in Players.</p>
          <ul class="library-list">
            <li v-for="roster in filteredRosters" :key="roster.id" class="library-panel">
              <h3>{{ roster.name }}</h3>
              <p class="library-help">{{ roster.playerIds.length }} {{ roster.playerIds.length === 1 ? 'player' : 'players' }}</p>
              <p>{{ rosterNames(roster) }}</p>
              <div class="library-actions">
                <ion-button :disabled="hasAssignments || !roster.playerIds.length" :aria-describedby="hasAssignments ? 'library-session-note' : undefined" :aria-label="`Use ${roster.name} for play`" @click="requestApply(roster.playerIds, 'replace')"><ion-icon :icon="folderOpenOutline" slot="start" aria-hidden="true" />Use for Play</ion-button>
                <ion-button class="player-icon-action" fill="outline" :aria-label="`Edit ${roster.name} roster`" title="Edit roster" @click="editRoster(roster)"><ion-icon :icon="pencilOutline" slot="icon-only" aria-hidden="true" /></ion-button>
                <ion-button class="player-icon-action" fill="outline" color="danger" :aria-label="`Delete ${roster.name} roster`" title="Delete roster" @click="requestDelete('roster', roster)"><ion-icon :icon="trashOutline" slot="icon-only" aria-hidden="true" /></ion-button>
              </div>
            </li>
          </ul>
        </section>

        <section v-else-if="tab === 'save' && !namesText.trim()" class="library-panel">
          <h3>No players in today's roster yet</h3><p>Enter names or scan a photo on Play, then come back to save them for next time.</p>
          <ion-button fill="outline" @click="$router.push('/')">Go to Play</ion-button>
        </section>
        <section v-else-if="tab === 'save' && !saveComplete && !addingPlayers" aria-label="Save current roster" class="library-panel">

          <p class="library-help">Keep these players for another day. Today's game stays unchanged.</p>
          <p>{{ importReview.entries.length }} {{ importReview.entries.length === 1 ? 'player' : 'players' }}: {{ importReview.newCount }} new, {{ importReview.existingCount }} already saved.</p>
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
              <ion-select v-model="importRosterId" label="Roster to update" label-placement="stacked" fill="outline" interface="popover" :interface-options="{ cssClass: 'saved-roster-overlay' }" placeholder="Choose a saved roster">
                <ion-select-option v-for="roster in data.rosters" :key="roster.id" :value="roster.id">{{ roster.name }}</ion-select-option>
              </ion-select>
              <p v-if="importTarget" class="library-notice">
                Updating “{{ importTarget.name }}” replaces its {{ importTarget.playerIds.length }} players with today's {{ importReview.entries.length }} players. Players removed from the group stay in your library.
              </p>
            </template>
            <ion-button type="submit" :disabled="!!importReview.error || (importMode === 'new' && !importRosterName.trim()) || (importMode === 'update' && !importTarget)">
              {{ importMode === 'players' ? 'Save players' : importMode === 'new' ? 'Save new roster' : 'Update selected roster' }}
            </ion-button>
          </form>
        </section>

        <section v-if="tab === 'save' && saveComplete" class="library-panel">
          <p>Your saved library is ready for another day.</p>
          <ion-button @click="$emit('close')">Done</ion-button>
        </section>

      </div>
    </component>
    <footer v-if="(editorOpen || selectingForPlay) && !addingPlayers && !pendingApply" class="library-selection-footer">
      <ion-button v-if="selectingForPlay" expand="block" :disabled="hasAssignments" :aria-describedby="hasAssignments ? 'library-session-note' : undefined" @click="requestApply(selectedIds, 'append')">
        Add {{ selectedIds.length }} {{ selectedIds.length === 1 ? 'player' : 'players' }} to today's roster
      </ion-button>
      <div v-else class="library-actions">
        <ion-button :disabled="!rosterName.trim() || !selectedIds.length || savingRoster" @click="saveRoster"><ion-icon :icon="saveOutline" slot="start" aria-hidden="true" />Save Roster · {{ selectedIds.length }} selected</ion-button>
        <ion-button fill="outline" :disabled="savingRoster" @click="cancelRosterEdit(); tab = 'rosters'">Cancel</ion-button>
      </div>
    </footer>
  </component>
</template>

<script>
import { IonButton, IonIcon, IonTextarea, IonSearchbar, IonContent, IonLabel, IonModal, IonSegment, IonSegmentButton, IonRadioGroup, IonRadio, IonInput, IonSelect, IonSelectOption, alertController, toastController } from '@ionic/vue';
import { pencilOutline, trashOutline, addOutline, saveOutline, folderOpenOutline } from 'ionicons/icons';
import { addSavedPlayer, renameSavedPlayer, deleteSavedPlayer, deleteNamedRoster } from '../services/rosterData.mjs';
import { createRosterNotifier } from '../services/rosterNotifications.mjs';
import { browseSavedPlayers, searchSavedRosters } from '../services/rosterBrowsing.mjs';
import { prepareRosterSelection } from '../services/rosterSelection.mjs';
import { stagePlayers, reviewPlayerEntry, prepareRosterEditorSave } from '../services/rosterEditor.mjs';
import { reviewRosterImport, saveRosterFromText } from '../services/rosterImport.mjs';

export default {
  name: 'SavedRostersModal',
  components: { IonButton, IonIcon, IonTextarea, IonSearchbar, IonContent, IonLabel, IonModal, IonSegment, IonSegmentButton, IonRadioGroup, IonRadio, IonInput, IonSelect, IonSelectOption },
  setup() { return { pencilOutline, trashOutline, addOutline, saveOutline, folderOpenOutline }; },
  props: {
    isOpen: Boolean,
    embedded: Boolean,
    initialTab: { type: String, default: 'rosters' },
    hasAssignments: Boolean,
    namesText: { type: String, default: '' },
    persistence: { type: Object, required: true }
  },
  emits: ['close', 'apply'],
  data() {
    const snapshot = this.persistence.snapshot();
    return {
      data: snapshot.data, storageStatus: snapshot.status, tab: this.initialTab, toastVisible: false, notifier: null, deletionPending: false,
      saveComplete: false, rosterSearch: '', importMode: 'players', importRosterName: '', importRosterId: '',
      editorOpen: false, stagedPlayers: [], addingPlayers: false, entryText: '', selectingForPlay: false, savingRoster: false, search: '', selectedIds: [], editingPlayerId: null, editedName: '',
      editingRosterId: null, rosterName: '', pendingApply: null
    };
  },
  computed: {
    availablePlayers() { return [...this.data.players, ...this.stagedPlayers]; },
    entryReview() { return reviewPlayerEntry(this.availablePlayers, this.entryText); },
    importReview() { return reviewRosterImport(this.data, this.namesText); },
    importTarget() { return this.data.rosters.find(roster => roster.id === this.importRosterId); },
    filteredRosters() { return searchSavedRosters(this.data.rosters, this.rosterSearch); },
    filteredPlayers() {
      return browseSavedPlayers(this.availablePlayers, this.search);
    }
  },
  created() { this.notifier = createRosterNotifier(toastController, visible => { this.toastVisible = visible; }); },
  beforeUnmount() { this.notifier.close(); },
  activated() { if (this.embedded) { this.notifier = createRosterNotifier(toastController, visible => { this.toastVisible = visible; }); this.refresh(); this.announceInitialStatus(); } },
  deactivated() { if (this.embedded) this.notifier.close(); },
  watch: {
    tab() { this.pendingApply = null; },
    'importReview.error'(value) { if (this.tab === 'save' && value) this.notify(value, true); }
  },
  methods: {
    selectAllPlayers() {
      this.selectedIds = [...new Set([...this.selectedIds, ...this.filteredPlayers.map(player => player.id)])];
    },
    notify(message, error = false) { void this.notifier.show(message, error); },
    announceInitialStatus() {
      if (this.storageStatus !== 'ready') this.notify('Saving is unavailable. Changes are in memory only. Existing saved data is untouched.', true);
      else if (this.tab === 'save' && this.importReview.error) this.notify(this.importReview.error, true);
    },
    async confirmRosterUpdate(name) {
      const alert = await alertController.create({
        header: 'Update saved roster?',
        cssClass: 'saved-roster-overlay',
        message: 'Replace the saved name and player selection? Players removed from this roster stay in Saved Players. Today’s roster stays unchanged.',
        subHeader: name || 'Saved roster',
        buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Update saved roster', role: 'confirm', cssClass: 'roster-confirm-action' }]
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
      this.saveComplete = false;
      this.rosterSearch = '';
      this.pendingApply = null;
      this.editingPlayerId = null;
      this.cancelRosterEdit();
      this.search = '';
    },
    commit(change, success) {
      try {
        const result = this.persistence.save(change(this.persistence.snapshot().data));
        this.data = result.data;
        this.storageStatus = result.status;
        if (result.status === 'invalid') { this.notify('Changes could not be applied. Please check the selected players.', true); return false; }
        this.notify(result.status === 'ready' ? success : 'Changes are in memory only and could not be saved on this device.', result.status !== 'ready');
        return true;
      } catch (error) {
        this.notify(error.message, true);
        return false;
      }
    },
    openPlayerEntry() { this.entryText = ''; this.addingPlayers = true; this.$nextTick(() => document.getElementById('add-players-title')?.focus()); },
    closePlayerEntry() { this.entryText = ''; this.addingPlayers = false; },
    addPlayers() {
      try {
        const review = stagePlayers(this.availablePlayers, this.entryText);
        if (!review.additions.length) { this.notify('No new names to add. Review duplicate names.', true); return; }
        if (this.editorOpen) {
          this.stagedPlayers.push(...review.additions);
          this.selectedIds = [...this.selectedIds, ...review.additions.map(p => p.id)];
          this.search = '';
        } else {
          let next = this.persistence.snapshot().data;
          for (const player of review.additions) {
            if (!reviewPlayerEntry(next.players, player.displayName).accepted.length) throw new Error('The library changed. Review the names and try again.');
            next = addSavedPlayer(next, player.displayName, () => player.id);
          }
          const result = this.persistence.saveAtomic(next);
          this.storageStatus = result.status;
          if (result.status !== 'ready') { this.notify('Players could not be saved. Your entries are still here. Please try again.', true); return; }
          this.data = result.data;
        }
        this.notify(`${review.additions.length} ${this.editorOpen ? 'added to this draft' : 'saved' }.${review.skipped.length ? ' Skipped duplicates: ' + review.skipped.join(', ') + '.' : ''}`);
        this.closePlayerEntry();
      } catch (error) { this.notify(error.message, true); }
    },
    createRoster() {
      this.cancelRosterEdit(); this.editorOpen = true; this.tab = 'rosters'; this.search = '';
      this.$nextTick(() => document.getElementById('roster-selection-title')?.focus());
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
      if (this.savingRoster) return;
      this.savingRoster = true;
      try {
        const next = prepareRosterEditorSave(this.persistence.snapshot().data, {
          id: this.editingRosterId, name: this.rosterName, playerIds: this.selectedIds, stagedPlayers: this.stagedPlayers
        });
        const result = this.persistence.saveAtomic(next);
        this.storageStatus = result.status;
        if (result.status !== 'ready') { this.notify('Roster could not be saved. Your draft is still here. Please try again.', true); return; }
        this.data = result.data;
        this.cancelRosterEdit();
        this.tab = 'rosters'; this.rosterSearch = '';
        this.notify('Roster saved.');
      } catch (error) { this.notify(error.message, true); }
      finally { this.savingRoster = false; }
    },
    editRoster(roster) {
      this.cancelRosterEdit();
      this.editorOpen = true; this.editingRosterId = roster.id; this.rosterName = roster.name;
      this.selectedIds = [...roster.playerIds]; this.search = ''; this.tab = 'rosters';
      this.$nextTick(() => document.getElementById('roster-selection-title')?.focus());
    },
    cancelRosterEdit() {
      this.editingRosterId = null; this.rosterName = ''; this.selectedIds = [];
      this.stagedPlayers = []; this.editorOpen = false; this.addingPlayers = false; this.entryText = ''; this.selectingForPlay = false;
    },
    rosterNames(roster) {
      const names = roster.playerIds.slice(0, 4).map(id => this.data.players.find(p => p.id === id)?.displayName).join(', ');
      return names + (roster.playerIds.length > 4 ? ` + ${roster.playerIds.length - 4} more` : '');
    },
    async requestDelete(kind, item) {
      if (this.deletionPending) return;
      this.deletionPending = true;
      try {
        const count = this.persistence.snapshot().data.rosters.filter(r => r.playerIds.includes(item.id)).length;
        const alert = await alertController.create({
          header: kind === 'player' ? 'Delete saved player?' : 'Delete saved roster?',
          subHeader: item.displayName ?? item.name,
          cssClass: 'saved-roster-overlay',
          message: kind === 'player'
            ? `This player belongs to ${count} saved ${count === 1 ? 'roster' : 'rosters'}. Deleting removes them from Saved Players and all saved rosters. Today's working roster, active assignments, and completed rounds remain unchanged.`
            : "Only this saved roster is removed. Its players stay in Saved Players. Today's roster and rounds remain unchanged.",
          buttons: [{ text: 'Cancel', role: 'cancel' }, { text: kind === 'player' ? 'Delete Player' : 'Delete Roster', role: 'confirm', cssClass: 'roster-destructive-action' }]
        });
        await alert.present();
        if ((await alert.onDidDismiss()).role === 'confirm') this.confirmDelete({ kind, id: item.id });
      } finally { this.deletionPending = false; }
    },
    confirmDelete(item) {
      if (this.commit(data => item.kind === 'player' ? deleteSavedPlayer(data, item.id) : deleteNamedRoster(data, item.id), item.kind === 'player' ? 'Player deleted from Saved Players and saved rosters.' : 'Saved roster deleted.')) {
        if (item.kind === 'roster' && item.id === this.editingRosterId) this.cancelRosterEdit();
        if (item.kind === 'roster' && item.id === this.importRosterId) this.importRosterId = '';
        if (item.kind === 'player' && item.id === this.editingPlayerId) { this.editingPlayerId = null; this.editedName = ''; }
        this.selectedIds = this.selectedIds.filter(id => this.data.players.some(p => p.id === id));
        this.pendingApply = null;
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
      } catch (error) { this.notify(error.message, true); }
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
}
.embedded-library { max-width: 48rem; margin: auto; background: white; border: 1px solid #dce5df; border-radius: 1rem; }
.embedded-library .library-shell { padding: clamp(.5rem, 3vw, 1rem); }
.embedded-library .library-panel { padding: clamp(.5rem, 3vw, 1rem); }
.embedded-library .library-actions { min-width: 0; max-width: 100%; }
.embedded-library .library-player-label { gap: clamp(.25rem, 2vw, .75rem); padding: clamp(.25rem, 2vw, .65rem); }
.library-player-label.player-display-only { cursor: default; border-color: transparent; }
.embedded-library .library-player-label span { overflow-wrap: anywhere; }
.embedded-library .library-selection-footer { border-radius: 0 0 1rem 1rem; }
.library-shell { padding: max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1.5rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left)); color: #26312c; }
.library-toast-visible { padding-bottom: calc(40vh + env(safe-area-inset-bottom)); }
.library-header, .library-player-row, .library-actions { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
.library-player-row > .library-actions { gap: .5rem; }
.library-player-row .library-player-label { flex-basis: 10rem; padding-inline: .25rem; }
.library-header { justify-content: space-between; flex-shrink: 0; padding: 1rem; padding-top: max(1rem, env(safe-area-inset-top)); background: white; border-bottom: 1px solid #dce5df; }
.library-selection-footer { flex-shrink: 0; padding: .5rem max(1rem, env(safe-area-inset-right)) max(.5rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left)); background: white; border-top: 1px solid #dce5df; }
h2 { font-size: 1.4rem; margin: 0; flex: 1 1 15rem; }
h3 { font-size: 1.1rem; margin: 0 0 .5rem; }
p, h2, h3, label, small { overflow-wrap: break-word; }
.library-help { color: #59675f; }
.library-context-help { margin-block: 1rem; }
.library-notice { padding: .75rem; background: #e8f5ee; border-radius: .65rem; }
.library-panel { margin-block: 1rem; padding: 1rem; border: 1px solid #dce5df; border-radius: 1rem; }
.library-list { list-style: none; margin: 0; padding: 0; }
.library-form { display: flex; flex-direction: column; align-items: stretch; gap: .5rem; margin-block: 1rem; }
.library-player-label { display: flex; align-items: center; gap: .75rem; flex: 1 1 14rem; min-width: 0; min-height: 2.75rem; cursor: pointer; }
.library-player-label span { min-width: 0; }
.library-player-badge { width: 38px; height: 38px; flex: 0 0 38px; object-fit: contain; pointer-events: none; }
small { display: block; font-size: .8rem; color: #59675f; overflow-wrap: anywhere; }
input:not([type=checkbox]):not([type=radio]), select { display: block; box-sizing: border-box; width: 100%; min-width: 0; min-height: 2.75rem; padding: .65rem; font: inherit; font-size: max(1rem, 16px); scroll-margin-block: 1rem; color: inherit; background: white; border: 1px solid #88978e; border-radius: .5rem; }
input[type=checkbox] { flex: 0 0 auto; width: 1.3rem; height: 1.3rem; accent-color: var(--ion-color-primary); }
input:focus-visible, select:focus-visible, summary:focus-visible { outline: 3px solid var(--ion-color-primary); outline-offset: 2px; }
summary { color: var(--ion-color-primary); border: 1px solid currentColor; border-radius: .5rem; padding-inline: .75rem; cursor: pointer; min-height: 2.75rem; padding-block: .5rem; }
.library-save-options { display: grid; gap: .25rem; min-width: 0; margin: .5rem 0; }
ion-radio { min-height: 2.75rem; padding-block: .5rem; white-space: normal; }
ion-radio::part(label) { white-space: normal; overflow-wrap: break-word; }
ion-input, ion-select, ion-textarea, ion-searchbar { min-width: 0; font-size: 1rem; }
input[type=radio] { width: 1.3rem; height: 1.3rem; flex: 0 0 auto; accent-color: var(--ion-color-primary); }
ion-button { min-height: 2.75rem; height: auto; max-width: 100%; white-space: normal; font-size: 1rem; }
ion-button::part(native) { white-space: normal; padding-block: .65rem; }
.player-icon-action { min-width: 48px; min-height: 48px; margin-inline: 0; }
.player-icon-action::part(native) { padding: .65rem; }
.player-icon-action ion-icon { font-size: 1.35rem; }
.saved-library-modal ion-segment { display: flex; flex-wrap: wrap; }
.saved-library-modal ion-segment-button { flex: 1 0 8rem; max-width: 100%; min-width: 0; min-height: 2.75rem; }
ion-label { white-space: normal; font-size: 1rem; line-height: 1.4; }
.saved-library-modal ion-segment-button::part(native) { padding-block: .6rem; }
@media (max-width: 35rem) { .saved-library-modal { --height: 100%; --border-radius: 0; } }
</style>

<style>
/* Portaled Ionic overlays cannot inherit component-scoped theme variables. */
@import '../services/rosterUi.css';
</style>
