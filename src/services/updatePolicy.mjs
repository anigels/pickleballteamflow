export const DAY_MS = 24 * 60 * 60 * 1000;

// Native versions may omit a patch component (Android currently uses "1.0").
// Reject unknown/prerelease store versions rather than advertising a beta.
export function compareVersions(a, b) {
  const parse = value => {
    if (typeof value !== 'string' || !/^\d+\.\d+(?:\.\d+)?$/.test(value)) return null;
    const parts = value.split('.').map(Number);
    if (!parts.every(Number.isSafeInteger)) return null;
    return [parts[0], parts[1], parts[2] || 0];
  };
  const left = parse(a);
  const right = parse(b);
  if (!left || !right) return null;
  for (let i = 0; i < 3; i++) {
    if (left[i] !== right[i]) return left[i] < right[i] ? -1 : 1;
  }
  return 0;
}

export function isRecent(timestamp, now) {
  return Number.isFinite(timestamp) && timestamp > 0 &&
    now >= timestamp && now - timestamp < DAY_MS;
}

export function shouldPrompt(installedVersion, candidate, state, now) {
  return !!candidate && compareVersions(installedVersion, candidate.version) === -1 &&
    !(state.dismissedVersion === candidate.version && isRecent(state.dismissedAt, now));
}
