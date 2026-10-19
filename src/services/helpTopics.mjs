// Help content only; no session or persistence dependencies.
export const helpTopics = [
  { id: 'getting-started', title: 'Getting Started', steps: [
    'Start on Play: enter 8–24 names, one per line, or Scan Names from Photo. No saved-player setup is required. Load Saved Roster is optional.',
    'Choose 2–12 available courts and the number of rounds. Each full court needs four players; extra players rotate through sit-outs.',
    'Tap Generate Court Assignments, then check the first round’s courts and Sit Out list.'
  ], notes: ['Pickleball Team Flow varies partners and opponents, reduces repeat partnerships, and distributes sit-outs as evenly as possible.'] },
  { id: 'saved-rosters', title: 'Saved Players & Rosters', steps: [
    'To save regular players: open Players → Players → Add Players. Enter one or more names, one per line, then Save Players. Repeated or already-saved names are reported and skipped. Use the pencil to edit a name.',
    'To create a roster: open Players → Create Roster. Name the roster, select saved players or choose Add Players for missing names, then Save Roster. New players entered here are saved together with the roster. Cancel discards the draft and its new players.',
    'To play using a saved roster: open Play → Load Saved Roster, choose Use for Play, and confirm replacing today’s names if asked. Adjust attendance and generate assignments when ready. Clear existing assignments before loading players.',
    'To add individual saved players to today’s names: open Players → Players → Select for Play, choose players (or Select All), then Add to today’s roster.',
    'Adjust attendance in Game Setup: remove absent names and type guests on new lines. These edits change today’s roster only.',
    'To keep today’s names, choose Save Today’s Roster beside Load Saved Roster on Play. Save players only, save a new named roster, or update an existing roster. Updates require confirmation.',
    'To change a saved group: open Players → Saved Rosters and tap its pencil. Use Remove or uncheck a member to leave them out; they remain in Saved Players. To edit a player name, tap their pencil, Apply Name, then Save Roster and confirm. Name changes update that player throughout the saved library; today’s names and rounds stay unchanged. Cancel discards unsaved edits.',
    'Delete asks for confirmation. Deleting a saved player removes them from every saved roster, but leaves today’s roster and rounds unchanged. Deleting a roster keeps its saved players. Empty saved rosters are kept.'
  ], notes: ["Saved rosters are reusable groups. Changes to today's players won't change a saved roster unless you save those changes.", 'Saved Players is alphabetical; saved rosters keep their player order. Give people with the same name distinct display names, such as Marco R and Marco S.', 'Clearing today’s roster does not delete saved players or rosters. Your saved library and today’s draft stay on this device. Generated rounds are not restored after closing the app.'] },
  { id: 'rounds', title: 'Managing Rounds', steps: [
    'Each court shows two teams: Serving and Receiving. Check Sit Out for players waiting this round.',
    'Tap Complete Round when play finishes. The completed round collapses so you can see the next round.',
    'Tap a completed round’s header or chevron to expand it and review the matchups.',
    'If attendance changes, edit the Player Roster and tap Regenerate Open Rounds. Completed rounds stay unchanged.'
  ], notes: ['Players rotate between courts, partners, opponents, and sit-outs across rounds.'] },
  { id: 'swaps', title: 'Swapping Players', steps: [
    'In an open round, tap a court player’s name or swap icon.',
    'Choose the player to swap with. Players sitting out appear first, followed by players on courts. You can swap within a court or between courts.',
    'Only the two selected players exchange positions; other assignments remain unchanged.'
  ], notes: ['Swapping is available in open rounds, not completed rounds.'] },
  { id: 'scanning', title: 'Scanning Player Names', steps: [
    'Tap Scan Names from Photo in Game Setup and capture or select a clear photo of a printed or handwritten list.',
    'Wait for recognition to finish, then review the names in the Player Roster.',
    'Correct spelling, remove unwanted entries, and keep one player per line before generating assignments.'
  ], notes: ['Good lighting and clear handwriting help. You can always type names manually.'] },
  { id: 'settings', title: 'Settings & Preferences', steps: [
    'Open Settings → Court View to choose List or VS layouts.',
    'Use Player Numbers to show or hide roster numbers beside player names. These display preferences are saved on this device.',
    'Use Rate App to leave a store review, or Share App to invite friends. You can edit the share message before sending it.'
  ], notes: [] },
  { id: 'support', title: 'Support & Privacy', steps: [], notes: [
    'No account is required. Player names and photos for scanning are processed within the app, not uploaded to a Pickleball Team Flow server. Photos are used for name recognition and are not stored by Pickleball Team Flow.',
    'Visit Support for assistance, troubleshooting, and contact information. Read the Privacy Policy for details. Both links are always available below.'
  ] },
  { id: 'about', title: 'About Pickleball Team Flow', steps: [], notes: ['Fair court assignments across multiple courts and rounds. Built to help facilitators organize doubles matchups, player rotations, and sit-outs.'], keywords: 'development team developer project manager Marco Rodriguez Andrea Nigels version' }
];

export function filterHelpTopics(query, topics = helpTopics) {
  const words = String(query ?? '').trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return topics.filter(topic => {
    const text = [topic.title, ...topic.steps, ...topic.notes, topic.keywords ?? ''].join(' ').toLocaleLowerCase();
    return words.every(word => text.includes(word));
  });
}
