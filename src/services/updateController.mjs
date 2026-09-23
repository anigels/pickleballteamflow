import { isRecent, shouldPrompt } from './updatePolicy.mjs';

// Pure orchestration: native/store/UI adapters are injected so tests never use a store.
export function createUpdateController({
  isNative, getInstalled, lookup, prompt, update, readState, writeState,
  canPresent = () => true, now = Date.now
}) {
  let busy = false;
  let stopped = false;
  let state;
  let pending = null;
  const save = () => { try { writeState(state); } catch { /* session memory still throttles */ } };

  async function check() {
    if (stopped || busy || !isNative()) return;
    busy = true;
    try {
      if (!state) {
        try { state = readState(); } catch { /* unavailable storage */ }
        if (!state || typeof state !== 'object' || Array.isArray(state)) state = {};
      }
      if (!isRecent(state.lastAttemptAt, now())) {
        state.lastAttemptAt = now();
        save(); // Also throttle failures: resumes must not cause a retry storm.
        pending = null;
        const installed = await getInstalled();
        const candidate = await lookup(installed);
        state.lastSuccessfulCheckAt = now();
        save();
        if (shouldPrompt(installed.version, candidate, state, now())) pending = candidate;
      }
      if (stopped || !pending || !(await canPresent())) return;
      const candidate = pending;
      pending = null;
      const action = await prompt();
      // Both choices, backdrop dismissal and Android back are rate limited.
      state.dismissedVersion = candidate.version;
      state.dismissedAt = now();
      save();
      if (!stopped && action === 'update') await update(candidate);
    } catch {
      // Optional feature: network, native plugin, storage and UI failures stay silent.
    } finally {
      busy = false;
    }
  }
  return { check, stop() { stopped = true; pending = null; } };
}
