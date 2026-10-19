import test from 'node:test';
import assert from 'node:assert/strict';
import { reactive, watch } from 'vue';
import { createRosterNavigation } from '../src/services/rosterNavigation.mjs';
import { createRosterPersistence } from '../src/services/rosterPersistence.mjs';
import { addSavedPlayer, renameSavedPlayer, saveNamedRoster } from '../src/services/rosterData.mjs';

function fixture(storageFails = false) {
  const storage = {value:null,getItem(){return this.value;},setItem(_key,value){if(storageFails)throw Error('offline storage');this.value=value;}};
  const persistence = createRosterPersistence(()=>storage);
  let data = addSavedPlayer(persistence.snapshot().data,'Alex',()=> 'p1');
  data = addSavedPlayer(data,'Beth',()=> 'p2');
  data = saveNamedRoster(data,{name:'Regulars',playerIds:['p1','p2']},()=> 'r1');
  persistence.save(data);
  return {persistence, navigation:createRosterNavigation(persistence),storage};
}

test('direct Players entry can load a roster before Home mounts without changing court/round settings',()=>{
  const {navigation,persistence}=fixture();
  persistence.saveWorkingRoster({namesText:'Guest',courtCount:3,roundCount:5});
  navigation.apply({playerIds:['p1','p2'],mode:'replace'});
  assert.deepEqual(persistence.snapshot().data.workingRoster,{namesText:'Alex\nBeth',courtCount:3,roundCount:5});
});

test('cached Home remains sole owner of assignments, swaps, completed rounds and sit-outs',()=>{
  const {navigation,persistence}=fixture();
  const home=reactive({namesText:'Alex\nBeth',courtCount:3,roundCount:7,schedule:[{index:1,closed:true,courts:[{players:[{id:2,name:'Beth'},{id:1,name:'Alex'}]}],sitOut:[{id:3,name:'Guest'}]},{index:2,closed:false}],expandedRounds:{1:true}});
  navigation.home=home;
  const before=JSON.stringify(home);
  const assignments=home.schedule;
  persistence.save(renameSavedPlayer(persistence.snapshot().data,'p1','Alex Library'));
  assert.equal(navigation.namesText,'Alex\nBeth');
  assert.equal(navigation.hasAssignments,true);
  assert.throws(()=>navigation.apply({playerIds:['p1'],mode:'replace'}));
  assert.equal(JSON.stringify(home),before);
  assert.equal(home.schedule,assignments);
});

test('loading into cached Home uses its existing draft watcher and one shared library writer',()=>{
  const {navigation,persistence,storage}=fixture();
  const home=reactive({namesText:'Guest',courtCount:2,roundCount:4,schedule:[]});
  navigation.home=home;
  const stop=watch(()=>home.namesText,()=>persistence.saveWorkingRoster({namesText:home.namesText,courtCount:home.courtCount,roundCount:home.roundCount}),{flush:'sync'});
  persistence.save(renameSavedPlayer(persistence.snapshot().data,'p1','Alex Library'));
  navigation.apply({playerIds:['p1'],mode:'append'});
  assert.equal(home.namesText,'Guest\nAlex Library');
  assert.equal(persistence.snapshot().status,'ready');
  assert.equal(JSON.parse(storage.value).players[0].displayName,'Alex Library');
  assert.deepEqual(home.schedule,[]);
  stop();
});

test('unavailable storage still shares the same in-memory draft across first navigation',()=>{
  const {navigation,persistence}=fixture(true);
  navigation.apply({playerIds:['p2'],mode:'replace'});
  assert.equal(navigation.namesText,'Beth');
  assert.equal(persistence.snapshot().status,'unavailable');
});
