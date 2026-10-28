import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBuildNumber } from '../scripts/validate-build-number.mjs';

test('release build numbers exceed the verified store floors', () => {
  assert.equal(validateBuildNumber('ios', '72'), '72');
  assert.equal(validateBuildNumber('android', '22'), '22');
  for (const [platform, value] of [['ios','71'],['android','21'],['ios','1'],['android','2100000001']]) {
    assert.throws(() => validateBuildNumber(platform, value));
  }
});
test('build number input rejects missing, fractional and shell-like values', () => {
  for (const value of [undefined, '', '0', '-1', '072', '72.1', '72\n', '72;echo bad', '$(echo 72)']) {
    assert.throws(() => validateBuildNumber('ios', value));
  }
});
