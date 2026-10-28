import test from 'node:test';
import assert from 'node:assert/strict';
import { presentCompletionReview } from '../src/services/reviewPrompt.mjs';

test('iOS requests the system review UI without showing a custom prompt', async () => {
  let requests = 0, custom = 0;
  await presentCompletionReview({ platform:'ios', requestNative:async()=>{requests++;}, showLegacyPrompt:()=>{custom++;} });
  assert.equal(requests, 1); assert.equal(custom, 0);
});
test('native failure is silent and never falls back to a custom review prompt', async () => {
  await presentCompletionReview({ platform:'ios', requestNative:async()=>{throw Error('unavailable');}, showLegacyPrompt:()=>assert.fail('custom prompt') });
});
test('Android and browser keep their existing presentation without native calls', async () => {
  for (const platform of ['android', 'web']) {
    let custom = 0;
    await presentCompletionReview({ platform, requestNative:()=>assert.fail('native call'), showLegacyPrompt:()=>{custom++;} });
    assert.equal(custom, 1);
  }
});
