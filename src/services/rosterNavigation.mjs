import { shallowReactive } from 'vue';
import { createRosterPersistence } from './rosterPersistence.mjs';
import { prepareRosterSelection } from './rosterSelection.mjs';

// One library writer across cached routes. Session state stays owned by Home.
export function createRosterNavigation(persistence = createRosterPersistence()) {
  return shallowReactive({
    persistence,
    home: null,
    get namesText() { return this.home ? this.home.namesText : persistence.snapshot().data.workingRoster.namesText; },
    get hasAssignments() { return !!this.home?.schedule.length; },
    apply(selection) {
      const snapshot = persistence.snapshot();
      const namesText = prepareRosterSelection({ ...selection, data: snapshot.data, namesText: this.namesText, hasAssignments: this.hasAssignments });
      if (this.home) this.home.namesText = namesText;
      else persistence.saveWorkingRoster({ ...snapshot.data.workingRoster, namesText });
    }
  });
}
