// Ionic toast supplies its own polite live region; avoid nested announcements.
// A modal-owned notifier keeps one visible toast and suppresses stale async requests.
export function createRosterNotifier(controller, onVisibility = () => {}) {
  let current = null, lastKey = '', revision = 0, closed = false;
  return {
    async show(message, error = false) {
      if (closed) return;
      const key = `${error}:${message}`;
      if (key === lastKey) return;
      lastKey = key;
      const ticket = ++revision;
      const previous = current;
      current = null;
      if (previous) await previous.dismiss();
      if (ticket !== revision || closed) return;
      const toast = await controller.create({
        message, position: 'bottom', duration: error ? 0 : 6000,
        cssClass: ['saved-roster-toast', error ? 'roster-toast-error' : 'roster-toast-success'],
        buttons: [{ text: 'Dismiss', role: 'cancel' }]
      });
      if (ticket !== revision || closed) { await toast.dismiss(); return; }
      current = toast;
      void toast.onDidDismiss().then(() => {
        if (current === toast) { current = null; lastKey = ''; onVisibility(false); }
      });
      onVisibility(true);
      await toast.present();
    },
    async close() {
      closed = true; revision++;
      if (current) await current.dismiss();
      current = null; lastKey = ''; onVisibility(false);
    }
  };
}
