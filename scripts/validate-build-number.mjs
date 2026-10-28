import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Store upload history checked 2026-10-28. These are floors, not a live store query.
// Release from the original repository to continue its existing workflow counter.
export function validateBuildNumber(platform, value) {
  const floor = { ios: 71, android: 21 }[platform];
  if (!floor || !/^[1-9]\d*$/.test(value ?? '') ||
      !Number.isSafeInteger(Number(value)) || Number(value) <= floor ||
      Number(value) > (platform === 'android' ? 2100000000 : 9999)) {
    throw new Error(`Automatic ${platform} workflow number must exceed ${floor} and fit platform limits. Run the release workflow from the original repository to continue its counter.`);
  }
  return value;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const value = validateBuildNumber(process.argv[2], process.env.WORKFLOW_RUN_NUMBER);
  appendFileSync(process.env.GITHUB_ENV, `BUILD_NUMBER=${value}\n`);
  console.log(`Using automatic workflow build number ${value}`);
}
