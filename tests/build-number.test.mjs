import test from 'node:test';
import { readFileSync } from 'node:fs';
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

test('native workflows assign build numbers automatically without dispatch inputs', () => {
  for (const platform of ['ios', 'android']) {
    const workflow = readFileSync(new URL(`../.github/workflows/${platform}-build.yml`, import.meta.url), 'utf8');
    assert.match(workflow, /workflow_dispatch:\s*\n\s*jobs:/);
    assert.ok(workflow.includes('WORKFLOW_RUN_NUMBER: ${{ github.run_number }}'));
    assert.ok(!workflow.includes('inputs.build_number'));
  }
});
