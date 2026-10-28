import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('package, lockfile and native marketing versions agree', () => {
  const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  const { version } = JSON.parse(read('package.json'));
  const lock = JSON.parse(read('package-lock.json'));
  assert.equal(lock.version, version);
  assert.equal(lock.packages[''].version, version);
  assert.equal(read('android/app/build.gradle').match(/versionName "([^"]+)"/)[1], version);
  const ios = [...read('ios/App/App.xcodeproj/project.pbxproj').matchAll(/MARKETING_VERSION = ([^;]+);/g)];
  assert(ios.length > 0);
  for (const match of ios) assert.equal(match[1], version);
});
