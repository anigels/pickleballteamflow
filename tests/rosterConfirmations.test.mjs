import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Exercise the actual component methods with only native alert/UI dependencies stubbed.
function methods(file, globals = {}) {
  let script = readFileSync(new URL('../src/components/' + file, import.meta.url), 'utf8').split('<script>')[1].split('</script>')[0];
  script = script.replace(/import[\s\S]*?from ['"][^'"]+['"];?/g, '').replace(/components:\s*\{[^}]*\},/, 'components: {},').replace('export default', 'result =');
  const context = { ...globals, result: null };
  vm.runInNewContext(script, context);
  return context.result.methods;
}

test('cancel clear keeps draft and all round data; confirm calls existing clear behavior', async () => {
  let role = 'cancel';
  const api = methods('Home.vue', {alertController:{create:async()=>({present:async()=>{},onDidDismiss:async()=>({role})})}});
  const state = {namesText:'Andrea',schedule:[{closed:true}],expandedRounds:{1:true},closeSubModal(){},showMessage(){}};
  await api.clearRoster.call(state);
  assert.equal(state.namesText,'Andrea'); assert.equal(state.schedule.length,1);
  role = 'confirm'; await api.clearRoster.call(state);
  assert.equal(state.namesText,''); assert.equal(state.schedule.length,0);
});

test('cancel either saved-roster update path performs no persistence write', async () => {
  const api = methods('SavedRostersModal.vue');
  let writes = 0;
  const state = {editingRosterId:'r',rosterName:'Group',importMode:'update',importTarget:{name:'Group'},confirmRosterUpdate:async()=>false,commit(){writes++;}};
  await api.saveRoster.call(state); await api.saveCurrentRoster.call(state);
  assert.equal(writes,0);
});

test('save completion requires durable storage, not memory-only success', async () => {
  const api = methods('SavedRostersModal.vue');
  const state = {importMode:'players',commit:()=>true,storageStatus:'unavailable'};
  await api.saveCurrentRoster.call(state); assert.equal(state.saveComplete,false);
  state.storageStatus='ready'; await api.saveCurrentRoster.call(state); assert.equal(state.saveComplete,true);
});
