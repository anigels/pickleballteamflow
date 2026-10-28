<template>
  <component
    :is="embedded ? 'section' : 'ion-modal'"
    :is-open="embedded ? undefined : isOpen"
    class="selector-component"
    :class="embedded ? 'selector-embedded' : 'app-modal saved-library-modal'"
    :aria-labelledby="embedded ? undefined : 'selector-modal-title'"
    @willPresent="refresh"
    @didDismiss="$emit('close')"
  >
    <!-- =====================================================
         MODAL HEADER (non-embedded only)
    ====================================================== -->
    <header v-if="!embedded" class="selector-header">
      <h2 id="selector-modal-title" class="selector-header-title">Load Players</h2>
      <ion-button fill="outline" @click="$emit('close')">Close</ion-button>
    </header>

    <component :is="embedded ? 'div' : 'ion-content'">
      <div class="selector-shell">

        <!-- Assignments lock notice -->
        <p v-if="hasAssignments" id="selector-assignments-note" class="selector-notice" role="alert">
          Clear Assignments on the Play tab before loading players or a roster.
        </p>

        <!-- Pending replace confirmation -->
        <section v-if="pendingApply" class="selector-panel" aria-labelledby="selector-replace-title">
          <h3 id="selector-replace-title" tabindex="-1" class="selector-panel-title">Replace today's roster?</h3>
          <p class="selector-help">This replaces the names currently in the Player Roster. Your saved library stays unchanged.</p>
          <div class="selector-actions">
            <ion-button @click="confirmApply">Replace today's roster</ion-button>
            <ion-button fill="outline" @click="pendingApply = null">Cancel</ion-button>
          </div>
        </section>

        <template v-else>
          <!-- Segment tabs -->
          <ion-segment v-model="tab" aria-label="Player selection mode" class="selector-segment">
            <ion-segment-button value="rosters">
              <ion-label>Saved Rosters</ion-label>
            </ion-segment-button>
            <ion-segment-button value="players">
              <ion-label>Select Players</ion-label>
            </ion-segment-button>
          </ion-segment>

          <!-- ===================================================
               SAVED ROSTERS TAB
          ==================================================== -->
          <section v-if="tab === 'rosters'" aria-label="Saved rosters">

            <div v-if="!data.rosters.length" class="selector-empty">
              <div class="selector-empty-icon" aria-hidden="true">
                <ion-icon :icon="folderOpenOutline" />
              </div>
              <h3 class="selector-empty-title">No saved rosters yet</h3>
              <p class="selector-help">Create and manage rosters in the Players tab.</p>
              <ion-button fill="outline" @click="goToPlayers">
                <ion-icon :icon="peopleOutline" slot="start" aria-hidden="true" />
                Go to Players
              </ion-button>
            </div>

            <template v-else>
              <ion-searchbar
                v-if="data.rosters.length > 4"
                v-model="rosterSearch"
                placeholder="Search rosters..."
                aria-label="Search saved rosters"
                class="selector-searchbar"
              />
              <p v-if="rosterSearch.trim() && !filteredRosters.length" class="selector-help">No rosters match your search.</p>
              <ul class="selector-roster-list" aria-label="Saved rosters">
                <li
                  v-for="roster in filteredRosters"
                  :key="roster.id"
                  class="selector-roster-card"
                >
                  <div class="selector-roster-info">
                    <h3 class="selector-roster-name">{{ roster.name }}</h3>
                    <p class="selector-roster-meta">{{ roster.playerIds.length }} {{ roster.playerIds.length === 1 ? 'player' : 'players' }}</p>
                    <p v-if="rosterPreview(roster)" class="selector-roster-preview">{{ rosterPreview(roster) }}</p>
                  </div>
                  <ion-button
                    :disabled="hasAssignments || !roster.playerIds.length"
                    :aria-describedby="hasAssignments ? 'selector-assignments-note' : undefined"
                    :aria-label="`Load roster: ${roster.name}`"
                    @click="requestApply(roster.playerIds, 'replace')"
                  >
                    <ion-icon :icon="folderOpenOutline" slot="start" aria-hidden="true" />
                    Load
                  </ion-button>
                </li>
              </ul>
            </template>
          </section>

          <!-- ===================================================
               SELECT PLAYERS TAB
          ==================================================== -->
          <section v-else-if="tab === 'players'" aria-label="Select players">

            <div v-if="!data.players.length" class="selector-empty">
              <div class="selector-empty-icon" aria-hidden="true">
                <ion-icon :icon="peopleOutline" />
              </div>
              <h3 class="selector-empty-title">No players in your library</h3>
              <p class="selector-help">Add players in the Players tab, then come back to select them for today's game.</p>
              <ion-button fill="outline" @click="goToPlayers">
                <ion-icon :icon="peopleOutline" slot="start" aria-hidden="true" />
                Go to Players
              </ion-button>
            </div>

            <template v-else>
              <ion-searchbar
                v-if="data.players.length > 8"
                v-model="search"
                placeholder="Search players..."
                aria-label="Search players"
                class="selector-searchbar"
              />

              <div class="selector-bulk-actions">
                <ion-button
                  fill="outline"
                  size="small"
                  :disabled="!filteredPlayers.some(p => !selectedIds.includes(p.id))"
                  @click="selectAll"
                >
                  {{ search.trim() ? 'Select All Results' : 'Select All' }}
                </ion-button>
                <ion-button
                  fill="outline"
                  size="small"
                  :disabled="!selectedIds.length"
                  @click="selectedIds = []"
                >
                  Clear
                </ion-button>
              </div>

              <p class="selector-count-label" aria-live="polite">
                {{ data.players.length }} {{ data.players.length === 1 ? 'player' : 'players' }}
                <template v-if="selectedIds.length"> · <strong>{{ selectedIds.length }} selected</strong></template>
              </p>

              <p v-if="search.trim() && !filteredPlayers.length" class="selector-help">No players match your search.</p>

              <div
                class="player-grid"
                role="group"
                :aria-label="`Player selection. ${selectedIds.length} of ${data.players.length} selected.`"
              >
                <label
                  v-for="player in filteredPlayers"
                  :key="player.id"
                  class="player-chip"
                  :class="{ 'player-chip-selected': selectedIds.includes(player.id) }"
                >
                  <input
                    type="checkbox"
                    v-model="selectedIds"
                    :value="player.id"
                    class="player-chip-input"
                  >
                  <ion-icon
                    v-if="selectedIds.includes(player.id)"
                    :icon="checkmarkCircleOutline"
                    class="player-chip-check"
                    aria-hidden="true"
                  />
                  <span class="player-chip-name">{{ player.displayName }}</span>
                </label>
              </div>
            </template>
          </section>
        </template>

      </div>
    </component>

    <!-- =====================================================
         STICKY FOOTER — select players action
    ====================================================== -->
    <footer
      v-if="tab === 'players' && selectedIds.length && !pendingApply"
      class="selector-footer"
    >
      <ion-button
        expand="block"
        :disabled="hasAssignments"
        :aria-describedby="hasAssignments ? 'selector-assignments-note' : undefined"
        @click="requestApply(selectedIds, 'append')"
      >
        Add {{ selectedIds.length }} {{ selectedIds.length === 1 ? 'player' : 'players' }} to today's roster
      </ion-button>
    </footer>
  </component>
</template>

<script>
import {
  IonButton,
  IonIcon,
  IonSearchbar,
  IonContent,
  IonLabel,
  IonModal,
  IonSegment,
  IonSegmentButton,
  toastController
} from '@ionic/vue';
import { folderOpenOutline, checkmarkCircleOutline, peopleOutline } from 'ionicons/icons';
import { browseSavedPlayers, searchSavedRosters } from '../services/rosterBrowsing.mjs';
import { prepareRosterSelection } from '../services/rosterSelection.mjs';
import { createRosterNotifier } from '../services/rosterNotifications.mjs';

export default {
  name: 'PlayerRosterSelector',

  components: {
    IonButton,
    IonIcon,
    IonSearchbar,
    IonContent,
    IonLabel,
    IonModal,
    IonSegment,
    IonSegmentButton
  },

  setup() {
    return { folderOpenOutline, checkmarkCircleOutline, peopleOutline };
  },

  props: {
    isOpen: Boolean,
    embedded: Boolean,
    hasAssignments: Boolean,
    namesText: { type: String, default: '' },
    persistence: { type: Object, required: true }
  },

  emits: ['close', 'apply'],

  data() {
    const snapshot = this.persistence.snapshot();
    return {
      data: snapshot.data,
      tab: 'rosters',
      selectedIds: [],
      search: '',
      rosterSearch: '',
      pendingApply: null,
      toastVisible: false,
      notifier: null
    };
  },

  computed: {
    filteredPlayers() {
      return browseSavedPlayers(this.data.players, this.search);
    },
    filteredRosters() {
      return searchSavedRosters(this.data.rosters, this.rosterSearch);
    }
  },

  created() {
    this.notifier = createRosterNotifier(toastController, visible => { this.toastVisible = visible; });
  },

  beforeUnmount() {
    this.notifier.close();
  },

  activated() {
    if (this.embedded) {
      this.notifier = createRosterNotifier(toastController, visible => { this.toastVisible = visible; });
      this.refresh();
    }
  },

  deactivated() {
    if (this.embedded) this.notifier.close();
  },

  methods: {
    refresh() {
      const snapshot = this.persistence.snapshot();
      this.data = snapshot.data;
      this.selectedIds = [];
      this.search = '';
      this.rosterSearch = '';
      this.pendingApply = null;
    },

    selectAll() {
      const toAdd = this.filteredPlayers.map(p => p.id).filter(id => !this.selectedIds.includes(id));
      this.selectedIds = [...this.selectedIds, ...toAdd];
    },

    rosterPreview(roster) {
      const names = roster.playerIds
        .slice(0, 5)
        .map(id => this.data.players.find(p => p.id === id)?.displayName)
        .filter(Boolean)
        .join(', ');
      return names + (roster.playerIds.length > 5 ? ` +${roster.playerIds.length - 5} more` : '');
    },

    requestApply(playerIds, mode) {
      const selection = { playerIds: [...playerIds], mode };
      try {
        prepareRosterSelection({
          ...selection,
          data: this.persistence.snapshot().data,
          namesText: this.namesText,
          hasAssignments: this.hasAssignments
        });
        if (mode === 'replace' && this.namesText.trim()) {
          this.pendingApply = selection;
          this.$nextTick(() => document.getElementById('selector-replace-title')?.focus());
        } else {
          this.$emit('apply', selection);
        }
      } catch (error) {
        void this.notifier.show(error.message, true);
      }
    },

    confirmApply() {
      if (!this.pendingApply) return;
      this.$emit('apply', this.pendingApply);
      this.pendingApply = null;
    },

    goToPlayers() {
      if (!this.embedded) this.$emit('close');
      this.$router.push('/players');
    }
  }
};
</script>

<style scoped>
/* =========================================================
   MODAL / EMBEDDED SHELL
========================================================= */

.selector-embedded {
  max-width: 48rem;
  margin: auto;
}

.selector-shell {
  padding: 1rem;
  color: #26312c;
}

/* =========================================================
   MODAL HEADER
========================================================= */

.selector-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  flex-shrink: 0;
  padding: 1rem;
  background: #ffffff;
  border-bottom: 1px solid #dce5df;
}

.selector-header-title {
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0;
  flex: 1 1 12rem;
  overflow-wrap: break-word;
}

/* =========================================================
   NOTICES & HELPERS
========================================================= */

.selector-notice {
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  background: #fff3cd;
  border-radius: 0.65rem;
  color: #664d03;
  font-size: 0.9rem;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.selector-help {
  color: #59675f;
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0.5rem 0;
  overflow-wrap: anywhere;
}

.selector-count-label {
  font-size: 0.88rem;
  color: #495057;
  margin: 0.35rem 0 0.65rem;
}

/* =========================================================
   PENDING REPLACE CONFIRMATION
========================================================= */

.selector-panel {
  padding: 1rem;
  border: 1px solid #dee2e6;
  border-radius: 0.875rem;
  background: #ffffff;
  margin-bottom: 0.75rem;
}

.selector-panel-title {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
  color: #1f2d23;
}

.selector-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

/* =========================================================
   SEGMENTS
========================================================= */

.selector-segment {
  margin-bottom: 0.75rem;
}

/* =========================================================
   EMPTY STATE
========================================================= */

.selector-empty {
  text-align: center;
  padding: 2rem 1rem;
}

.selector-empty-icon {
  font-size: 2.5rem;
  color: #adb5bd;
  margin-bottom: 0.75rem;
}

.selector-empty-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #495057;
  margin: 0 0 0.5rem;
}

/* =========================================================
   ROSTER LIST
========================================================= */

.selector-roster-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.selector-roster-card {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.875rem;
  border: 1px solid #dee2e6;
  border-radius: 0.875rem;
  background: #ffffff;
}

.selector-roster-info {
  flex: 1 1 0;
  min-width: 0;
  overflow-wrap: anywhere;
}

.selector-roster-name {
  font-size: 1rem;
  font-weight: 700;
  color: #212529;
  margin: 0 0 0.15rem;
}

.selector-roster-meta {
  font-size: 0.8rem;
  color: #6c757d;
  margin: 0 0 0.2rem;
}

.selector-roster-preview {
  font-size: 0.85rem;
  color: #495057;
  margin: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* =========================================================
   SEARCHBAR
========================================================= */

.selector-searchbar {
  --border-radius: 0.75rem;
  margin-bottom: 0.5rem;
  padding: 0;
}

/* =========================================================
   BULK ACTIONS (select all / clear)
========================================================= */

.selector-bulk-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

/* =========================================================
   PLAYER GRID
========================================================= */

.player-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 8.5rem), 1fr));
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.player-chip {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  padding: 0.55rem 0.5rem 0.45rem;
  border: 2px solid #dee2e6;
  border-radius: 0.75rem;
  background: #ffffff;
  cursor: pointer;
  text-align: center;
  user-select: none;
  transition: border-color 0.1s ease, background-color 0.1s ease;
}

.player-chip:hover {
  border-color: #a8d5b5;
  background: #f8fdf9;
}

.player-chip-selected {
  border-color: #0e4b2e;
  background: #e9f7ef;
}

.player-chip-input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
  pointer-events: none;
}

.player-chip-input:focus-visible + .player-chip-check,
.player-chip-input:focus-visible ~ .player-chip-name {
  outline: none;
}

.player-chip:has(.player-chip-input:focus-visible) {
  outline: 3px solid rgba(25, 135, 84, 0.5);
  outline-offset: 1px;
}

.player-chip-check {
  position: absolute;
  top: 4px;
  right: 4px;
  color: #0e4b2e;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.player-chip-name {
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.3;
  color: #212529;
  overflow-wrap: break-word;
  word-break: break-word;
  min-width: 0;
}

.player-chip-selected .player-chip-name {
  color: #0e4b2e;
}

/* =========================================================
   FOOTER
========================================================= */

.selector-footer {
  flex-shrink: 0;
  padding:
    0.5rem
    max(1rem, env(safe-area-inset-right))
    max(0.5rem, env(safe-area-inset-bottom))
    max(1rem, env(safe-area-inset-left));
  background: #ffffff;
  border-top: 1px solid #dce5df;
}

/* =========================================================
   IONIC OVERRIDES
========================================================= */

ion-button {
  min-height: 2.75rem;
  height: auto;
  max-width: 100%;
  white-space: normal;
  font-size: 1rem;
}

ion-button::part(native) {
  white-space: normal;
  padding-block: 0.65rem;
}

ion-label {
  white-space: normal;
  font-size: 1rem;
  line-height: 1.4;
}
</style>

<style>
/* Portaled Ionic overlays cannot inherit component-scoped theme variables. */
@import '../services/rosterUi.css';
</style>
