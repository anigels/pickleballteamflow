<template>
  <ion-modal
    :is-open="isOpen"
    class="app-modal picker-modal saved-library-modal"
    aria-labelledby="picker-modal-title"
    @willPresent="reset"
    @didDismiss="$emit('cancel')"
  >
    <header class="picker-header">
      <h2 id="picker-modal-title" class="picker-header-title">Add Players to Roster</h2>
      <ion-button fill="outline" @click="$emit('cancel')">Cancel</ion-button>
    </header>

    <ion-content>
      <div class="picker-shell">

        <div v-if="!players.length" class="picker-empty">
          <div class="picker-empty-icon" aria-hidden="true">
            <ion-icon :icon="peopleOutline" />
          </div>
          <h3 class="picker-empty-title">All players already added</h3>
          <p class="picker-help">Every player in your library is already in this roster.</p>
        </div>

        <template v-else>
          <ion-searchbar
            v-if="players.length > 6"
            v-model="search"
            placeholder="Search players..."
            aria-label="Search players"
            class="picker-searchbar"
          />

          <div class="picker-bulk-actions">
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

          <p class="picker-count" aria-live="polite">
            {{ players.length }} available
            <template v-if="selectedIds.length"> · <strong>{{ selectedIds.length }} selected</strong></template>
          </p>

          <p v-if="search.trim() && !filteredPlayers.length" class="picker-help">No players match your search.</p>

          <div
            class="player-grid"
            role="group"
            :aria-label="`Select players to add. ${selectedIds.length} selected.`"
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

      </div>
    </ion-content>

    <footer v-if="selectedIds.length" class="picker-footer">
      <ion-button expand="block" @click="confirm">
        Add {{ selectedIds.length }} {{ selectedIds.length === 1 ? 'player' : 'players' }} to roster
      </ion-button>
    </footer>
  </ion-modal>
</template>

<script>
import { IonButton, IonContent, IonIcon, IonModal, IonSearchbar } from '@ionic/vue';
import { checkmarkCircleOutline, peopleOutline } from 'ionicons/icons';
import { browseSavedPlayers } from '../services/rosterBrowsing.mjs';

export default {
  name: 'PlayerPickerModal',

  components: { IonButton, IonContent, IonIcon, IonModal, IonSearchbar },

  setup() {
    return { checkmarkCircleOutline, peopleOutline };
  },

  props: {
    isOpen: Boolean,
    players: { type: Array, default: () => [] }
  },

  emits: ['confirm', 'cancel'],

  data() {
    return {
      selectedIds: [],
      search: ''
    };
  },

  computed: {
    filteredPlayers() {
      return browseSavedPlayers(this.players, this.search);
    }
  },

  methods: {
    reset() {
      this.selectedIds = [];
      this.search = '';
    },
    selectAll() {
      const toAdd = this.filteredPlayers.map(p => p.id).filter(id => !this.selectedIds.includes(id));
      this.selectedIds = [...this.selectedIds, ...toAdd];
    },
    confirm() {
      this.$emit('confirm', [...this.selectedIds]);
    }
  }
};
</script>

<style scoped>
.picker-modal {
  --width: min(40rem, 100%);
  --height: 85%;
  --border-radius: 1.25rem;
}

.picker-header {
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

.picker-header-title {
  font-size: 1.3rem;
  font-weight: 700;
  margin: 0;
  flex: 1 1 12rem;
  overflow-wrap: break-word;
  color: #1f2d23;
}

.picker-shell {
  padding: 1rem;
}

.picker-empty {
  text-align: center;
  padding: 2rem 1rem;
}

.picker-empty-icon {
  font-size: 2.5rem;
  color: #adb5bd;
  margin-bottom: 0.75rem;
}

.picker-empty-title {
  font-size: 1rem;
  font-weight: 700;
  color: #495057;
  margin: 0 0 0.4rem;
}

.picker-help {
  color: #59675f;
  font-size: 0.9rem;
  line-height: 1.4;
  margin: 0.4rem 0;
}

.picker-searchbar {
  --border-radius: 0.75rem;
  padding: 0;
  margin-bottom: 0.5rem;
}

.picker-bulk-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.picker-count {
  font-size: 0.88rem;
  color: #495057;
  margin: 0.35rem 0 0.65rem;
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
}

.player-chip-name {
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.3;
  color: #212529;
  overflow-wrap: break-word;
  word-break: break-word;
}

.player-chip-selected .player-chip-name {
  color: #0e4b2e;
}

/* =========================================================
   FOOTER
========================================================= */

.picker-footer {
  flex-shrink: 0;
  padding:
    0.5rem
    max(1rem, env(safe-area-inset-right))
    max(0.5rem, env(safe-area-inset-bottom))
    max(1rem, env(safe-area-inset-left));
  background: #ffffff;
  border-top: 1px solid #dce5df;
}

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

@media (max-width: 35rem) {
  .picker-modal {
    --height: 100%;
    --border-radius: 0;
  }
}
</style>

<style>
@import '../services/rosterUi.css';
</style>
