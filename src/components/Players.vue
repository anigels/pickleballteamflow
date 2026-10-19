<template>
  <div class="players-page">
    <header class="players-heading"><h1>Players &amp; Rosters</h1><p>Keep your regular players ready for next time.</p></header>
    <SavedRostersModal embedded :persistence="rosterNavigation.persistence" :names-text="rosterNavigation.namesText" :has-assignments="rosterNavigation.hasAssignments" @apply="applyRoster" @close="$router.push('/')" />
  </div>
</template>
<script>
import { inject } from 'vue';
import { toastController } from '@ionic/vue';
import SavedRostersModal from './SavedRostersModal.vue';
export default {
  name: 'Players', components: { SavedRostersModal },
  setup() { return { rosterNavigation: inject('rosterNavigation') }; },
  methods: {
    async applyRoster(selection) {
      try { this.rosterNavigation.apply(selection); await this.$router.push('/'); }
      catch (error) { const toast = await toastController.create({message:error.message,position:'bottom',color:'danger',duration:0,buttons:[{text:'Dismiss',role:'cancel'}]}); await toast.present(); }
    }
  }
};
</script>
<style scoped>
.players-page { max-width: 48rem; margin: auto; min-width: 0; }
.players-heading { margin-bottom: 1.25rem; }
h1 { font-size: 1.8rem; color: #0d5132; overflow-wrap: break-word; }
p { color: #59675f; }
</style>
