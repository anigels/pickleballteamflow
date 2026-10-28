import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Store upload history checked 2026-10-28. These are floors, not a live store query.
// Before every dispatch, reserve a NEW number above all uploads across both repos.
export function validateBuildNumber(platform, value) {
  const floor = { ios: 71, android: 21 }[platform];
  if (!floor || !/^[1-9]\d*$/.test(value ?? '') ||
      !Number.isSafeInteger(Number(value)) || Number(value) <= floor ||
      Number(value) > (platform === 'android' ? 2100000000 : 9999)) {
    throw new Error(`Choose an unused ${platform} build number above ${floor}; check the store upload history first.`);
  }
  return value;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const value = validateBuildNumber(process.argv[2], process.env.REQUESTED_BUILD_NUMBER);
  appendFileSync(process.env.GITHUB_ENV, `BUILD_NUMBER=${value}\n`);
  console.log(`Using explicitly reserved build number ${value}`);
}
