import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { prepareRosterEditorSave } from '../src/services/rosterEditor.mjs';
import { emptyRosterData, addSavedPlayer } from '../src/services/rosterData.mjs';

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

test('cancel roster editor clears staged players and selection without touching saved data', () => {
  const api = methods('SavedRostersModal.vue');
  const data = emptyRosterData(), before = JSON.stringify(data);
  const state = {data,editorOpen:true,editingRosterId:'r',rosterName:'Draft',selectedIds:['new'],stagedPlayers:[{id:'new',displayName:'Guest'}],addingPlayers:true,entryText:'Another',selectingForPlay:false};
  api.cancelRosterEdit.call(state);
  assert.equal(state.editorOpen,false);
  assert.equal(state.stagedPlayers.length,0);
  assert.equal(state.selectedIds.length,0);
  assert.equal(JSON.stringify(data),before);
});

test('failed editor commit retains staged entries and selection for retry; success closes editor', async () => {
  const api = methods('SavedRostersModal.vue',{prepareRosterEditorSave});
  const data = addSavedPlayer(emptyRosterData(),'Andrea',()=> 'a');
  let succeeds = false, lastWrite;
  const state = {data,editingRosterId:null,rosterName:'Tuesday',selectedIds:['a','b'],stagedPlayers:[{id:'b',displayName:'Beth'}],editorOpen:true,savingRoster:false,notify(){},persistence:{snapshot:()=>({data}),saveAtomic(next){lastWrite=next;return {data:succeeds?next:data,status:succeeds?'ready':'unavailable'};}}};
  state.cancelRosterEdit=()=>api.cancelRosterEdit.call(state);
  await api.saveRoster.call(state);
  assert.equal(state.editorOpen,true); assert.equal(state.stagedPlayers.length,1);
  assert.equal(state.data.players.length,1); assert.equal(state.savingRoster,false);
  succeeds=true; await api.saveRoster.call(state);
  assert.equal(state.editorOpen,false); assert.equal(state.data.players.length,2);
  assert.equal(lastWrite.rosters.length,1);
  assert.deepEqual(lastWrite.workingRoster,data.workingRoster);
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

test('setup actions open the player selector without changing a session', () => {
  const api = methods('Home.vue');
  const state = { selectorOpen: false, namesText: 'Alex', schedule: [{ closed: true }] };
  api.openPlayerSelector.call(state);
  assert.equal(state.selectorOpen, true);
  assert.equal(state.namesText, 'Alex');
  assert.equal(state.schedule[0].closed, true);
});
