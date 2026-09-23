import test from 'node:test';
import assert from 'node:assert/strict';
import { compareVersions, shouldPrompt, DAY_MS } from '../src/services/updatePolicy.mjs';
import { createUpdateController } from '../src/services/updateController.mjs';

for (const [installed, store, expected] of [
  ['1.2.0','1.2.0',false], ['1.2.0','1.2.1',true],
  ['1.2.0','1.3.0',true], ['1.9.0','1.10.0',true],
  ['2.0.0','1.10.0',false], ['1.0','1.0.0',false],
  ['1.2.0','1.3.0-beta',false], ['bad','1.3.0',false]
]) test(`${installed} -> ${store}`, () => {
  assert.equal(shouldPrompt(installed,{version:store},{},DAY_MS),expected);
});
test('version-specific dismissal expires after 24 hours', () => {
  const state={dismissedVersion:'1.3.0',dismissedAt:DAY_MS};
  assert.equal(shouldPrompt('1.2.0',{version:'1.3.0'},state,DAY_MS+1),false);
  assert.equal(shouldPrompt('1.2.0',{version:'1.4.0'},state,DAY_MS+1),true);
  assert.equal(shouldPrompt('1.2.0',{version:'1.3.0'},state,2*DAY_MS),true);
  assert.equal(compareVersions('1.10.0','1.9.0'),1);
});
function harness(overrides={}) {
  let time=DAY_MS, persisted={},lookups=0,prompts=0,updates=0;
  const deps={isNative:()=>true,getInstalled:async()=>({version:'1.2.0'}),
    lookup:async()=>{lookups++;return {version:'1.3.0'};},
    prompt:async()=>{prompts++;return 'cancel';},update:async()=>{updates++;},
    readState:()=>structuredClone(persisted),writeState:s=>{persisted=structuredClone(s);},
    now:()=>time,...overrides};
  return {deps,make:()=>createUpdateController(deps),advance:()=>{time+=DAY_MS;},
    counts:()=>({lookups,prompts,updates}),state:()=>persisted};
}
test('browser/PWA does not even read native metadata or storage',async()=>{
  const h=harness({isNative:()=>false,getInstalled:()=>assert.fail(),readState:()=>assert.fail()});
  await h.make().check();assert.deepEqual(h.counts(),{lookups:0,prompts:0,updates:0});
});
test('dismissal survives relaunch and checks are daily',async()=>{
  const h=harness(),c=h.make();await c.check();await c.check();await h.make().check();
  assert.deepEqual(h.counts(),{lookups:1,prompts:1,updates:0});
  h.advance();await c.check();assert.equal(h.counts().prompts,2);
});
test('offline/store failure is silent and throttled',async()=>{
  let attempts=0;const h=harness({lookup:async()=>{attempts++;throw Error('offline');}});
  const c=h.make();await c.check();await c.check();await h.make().check();
  assert.equal(attempts,1);assert.equal(h.counts().prompts,0);
});
test('concurrent resumes cannot duplicate prompts',async()=>{
  const h=harness(),c=h.make();await Promise.all([c.check(),c.check(),c.check()]);
  assert.equal(h.counts().prompts,1);
});
test('background/other overlay defers prompt without another lookup',async()=>{
  let active=false;const h=harness({canPresent:()=>active}),c=h.make();
  await c.check();assert.equal(h.counts().prompts,0);active=true;await c.check();
  assert.equal(h.counts().prompts,1);assert.equal(h.counts().lookups,1);
});
test('Update action is optional and invokes adapter only once',async()=>{
  const h=harness({prompt:async()=> 'update'}),c=h.make();await c.check();await c.check();
  assert.equal(h.counts().updates,1);
});
test('stopping while lookup runs prevents a late alert',async()=>{
  let release;const h=harness({lookup:()=>new Promise(r=>{release=r;})}),c=h.make();
  const p=c.check();await Promise.resolve();c.stop();release({version:'1.3.0'});await p;
  assert.equal(h.counts().prompts,0);
});
