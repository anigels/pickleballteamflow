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


test('player deletion names affected roster count, cancel does nothing, confirm cleans editing state', async () => {
  let role = 'cancel', options, commits = 0;
  const data = {players:[{id:'b',displayName:'B'}],rosters:[{id:'r',playerIds:['a']},{id:'s',playerIds:['a','b']}]};
  const api = methods('SavedRostersModal.vue', {alertController:{create:async input=>{ options=input; return {present:async()=>{},onDidDismiss:async()=>({role})}; }}});
  const state = {data,persistence:{snapshot:()=>({data})},deletionPending:false,selectedIds:['a','b'],editingPlayerId:'a',editedName:'A',editingRosterId:'r',pendingApply:{playerIds:['a']},schedule:[{closed:true}],commit(){commits++;return true;}};
  state.confirmDelete = item => api.confirmDelete.call(state,item);
  await api.requestDelete.call(state,'player',{id:'a',displayName:'A'});
  assert.match(options.message,/2 saved rosters/); assert.equal(options.subHeader,'A'); assert.equal(commits,0);
  role='confirm'; await api.requestDelete.call(state,'player',{id:'a',displayName:'A'});
  assert.equal(commits,1); assert.deepEqual(state.selectedIds,['b']); assert.equal(state.editingRosterId,'r');
  assert.equal(state.editingPlayerId,null); assert.equal(state.pendingApply,null); assert.equal(state.schedule[0].closed,true);
});

test('clear assignments calls the existing handler only after confirmation', async () => {
  let role = 'cancel', calls = 0;
  const api = methods('Home.vue', {alertController:{create:async()=>({present:async()=>{},onDidDismiss:async()=>({role})})}});
  const state = {clearAll(){calls++;}};
  await api.confirmClearAssignments.call(state);
  assert.equal(calls,0);
  role = 'confirm';
  await api.confirmClearAssignments.call(state);
  assert.equal(calls,1);
});

test('select all adds only filtered IDs, preserves existing selection order and avoids duplicates', () => {
  const api = methods('SavedRostersModal.vue');
  const state = {selectedIds:['b'],filteredPlayers:[{id:'a'},{id:'b'},{id:'c'}]};
  api.selectAllPlayers.call(state);
  assert.equal(JSON.stringify(state.selectedIds),JSON.stringify(['b','a','c']));
  api.selectAllPlayers.call(state);
  assert.equal(state.selectedIds.length,3);
});

test('successful generation positions the first round only after rendering', async () => {
  const api = methods('Home.vue', {buildRound:(_roster,index)=>({index,sitOut:[],closed:false})});
  let afterRender, focused;
  const state = {players:Array.from({length:8},(_,i)=>({id:i+1,name:'Player '+i})),namesText:Array.from({length:8},(_,i)=>'Player '+i).join('\n'),courtCount:2,roundCount:3,showMessage(){},$nextTick(fn){afterRender=fn;},focusRound(round){focused=round;}};
  api.generate.call(state);
  assert.equal(focused,undefined);
  assert.equal(state.schedule.length,3);
  await afterRender();
  assert.equal(focused,state.schedule[0]);
  afterRender=undefined; state.players=[];
  api.generate.call(state);
  assert.equal(afterRender,undefined);
});

test('completion still positions the next open round with current-round fallback', async () => {
  const api = methods('Home.vue');
  const rounds=[{index:1,closed:false},{index:2,closed:true},{index:3,closed:false}];
  let focused;
  const state={sortedSchedule:rounds,completeRound(r){r.closed=true;},async $nextTick(){},async focusRound(r){focused=r;}};
  await api.completeRoundAndFocus.call(state,rounds[0]);
  assert.equal(focused,rounds[2]);
  await api.completeRoundAndFocus.call(state,rounds[2]);
  assert.equal(focused,rounds[2]);
});
