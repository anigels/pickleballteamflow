import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyRosterData, addSavedPlayer, saveNamedRoster } from '../src/services/rosterData.mjs';
import { stagePlayers, reviewPlayerEntry, prepareRosterEditorSave } from '../src/services/rosterEditor.mjs';
import { createRosterPersistence, ROSTER_STORAGE_KEY } from '../src/services/rosterPersistence.mjs';

function fixture() {
  const data = addSavedPlayer(emptyRosterData(), 'Andrea', () => 'a');
  data.workingRoster.namesText = 'Guest\nToday';
  return data;
}
const draft = overrides => ({name:'Tuesday',playerIds:['a'],stagedPlayers:[],...overrides});
test('staged rename preserves stable references and working names until atomic save', () => {
  let data = saveNamedRoster(fixture(),{name:'One',playerIds:['a']},()=> 'r1');
  data = saveNamedRoster(data,{name:'Two',playerIds:['a']},()=> 'r2');
  const before = JSON.stringify(data);
  const next = prepareRosterEditorSave(data,draft({id:'r1',name:'One',renamedPlayers:{a:'Andrea R'}}));
  assert.equal(next.players[0].displayName,'Andrea R');
  assert.deepEqual(next.rosters.map(r=>r.playerIds),[['a'],['a']]);
  assert.deepEqual(next.workingRoster,data.workingRoster);
  assert.equal(JSON.stringify(data),before);
  assert.throws(()=>prepareRosterEditorSave(data,draft({renamedPlayers:{missing:'Unknown'}})));
});
test('bulk entry skips blank, normalized duplicate, repeated names without overwriting identities', () => {
  const data = fixture();
  const result = reviewPlayerEntry(data.players,' Andrea \r\nMarco\nmarco\nＡＮＤＲＥＡ\n\n Sam ');
  assert.deepEqual(result.accepted,['Marco','Sam']);
  assert.deepEqual(result.skipped,['Andrea','marco','ＡＮＤＲＥＡ']);
  assert.equal(result.count,5);
  assert.equal(data.players[0].id,'a');
});
test('single and bulk staging has no library limit and never changes source data', () => {
  const data = fixture(), before = JSON.stringify(data); let id = 0;
  const result = stagePlayers(data.players,Array.from({length:30},(_,i)=>'Player '+i).join('\n'),()=> 'n'+(++id));
  assert.equal(result.additions.length,30);
  assert.equal(JSON.stringify(data),before);
  assert.equal(stagePlayers(data.players,'One',()=> 'one').additions.length,1);
});
test('save roster with existing players preserves identity, order and working roster', () => {
  const data = fixture();
  const next = prepareRosterEditorSave(data,draft());
  assert.deepEqual(next.rosters[0].playerIds,['a']);
  assert.deepEqual(next.workingRoster,data.workingRoster);
  assert.equal(data.rosters.length,0);
});
test('new players and roster memberships are prepared together; cancel discards staging', () => {
  const data = fixture(), before = JSON.stringify(data);
  const {additions} = stagePlayers(data.players,'Marco\nSam',(()=>{let i=0;return()=> 'new'+(++i);})());
  assert.equal(JSON.stringify(data),before);
  const next = prepareRosterEditorSave(data,draft({stagedPlayers:additions,playerIds:['new2','a','new1']}));
  assert.deepEqual(next.rosters[0].playerIds,['new2','a','new1']);
  assert.equal(next.players.length,3);
  assert.equal(JSON.stringify(data),before);
});
test('edit and rename reuse roster ID and do not delete unselected library players', () => {
  const data = saveNamedRoster(fixture(),{name:'Old',playerIds:['a']},()=> 'r');
  const next = prepareRosterEditorSave(data,draft({id:'r',name:'New',stagedPlayers:[{id:'b',displayName:'Beth'}],playerIds:['b']}));
  assert.equal(next.rosters[0].name,'New');
  assert.equal(next.rosters[0].id,'r');
  assert.deepEqual(next.players.map(p=>p.id),['a','b']);
  assert.deepEqual(data.rosters[0].playerIds,['a']);
});
test('invalid roster name, memberships and concurrent duplicates fail before writing', () => {
  const data = saveNamedRoster(fixture(),{name:'Tuesday',playerIds:['a']},()=> 'r');
  for(const overrides of [{name:''},{playerIds:[]},{playerIds:['missing']},{name:'tuesday'},{stagedPlayers:[{id:'n',displayName:'Andrea'}]}]) {
    assert.throws(()=>prepareRosterEditorSave(data,draft(overrides)));
  }
  assert.equal(data.players.length,1);
});
test('atomic save writes one complete document and restores after reopening', () => {
  let raw = JSON.stringify(fixture()), writes = 0;
  const storage = {getItem:()=>raw,setItem(k,v){assert.equal(k,ROSTER_STORAGE_KEY);writes++;raw=v;}};
  const persistence = createRosterPersistence(()=>storage);
  const next = prepareRosterEditorSave(persistence.snapshot().data,draft({stagedPlayers:[{id:'b',displayName:'Beth'}],playerIds:['a','b']}));
  assert.equal(persistence.saveAtomic(next).status,'ready');
  assert.equal(writes,1);
  assert.deepEqual(createRosterPersistence(()=>storage).snapshot().data,next);
});
test('failed atomic write preserves stored and in-memory library; retry succeeds', () => {
  const initial = fixture(); let raw = JSON.stringify(initial), fails = true;
  const storage = {getItem:()=>raw,setItem(_k,v){if(fails)throw Error('full');raw=v;}};
  const persistence = createRosterPersistence(()=>storage);
  const next = prepareRosterEditorSave(initial,draft({stagedPlayers:[{id:'b',displayName:'Beth'}],playerIds:['b']}));
  assert.equal(persistence.saveAtomic(next).status,'unavailable');
  assert.deepEqual(persistence.snapshot().data,initial);
  assert.deepEqual(JSON.parse(raw),initial);
  fails=false;
  assert.equal(persistence.saveAtomic(next).status,'ready');
  assert.deepEqual(persistence.snapshot().data,next);
});
test('corrupt, unavailable and conflicting storage never accepts an atomic editor save', () => {
  for(const storage of [{getItem(){throw Error('blocked');}}, {getItem:()=>'{bad'}]) {
    const p = createRosterPersistence(()=>storage), before=p.snapshot().data;
    assert.equal(p.saveAtomic(prepareRosterEditorSave(fixture(),draft())).status,'unavailable');
    assert.deepEqual(p.snapshot().data,before);
  }
  let raw=JSON.stringify(fixture());
  const p=createRosterPersistence(()=>({getItem:()=>raw,setItem(){throw Error('must not write');}}));
  const before=p.snapshot().data;
  raw=JSON.stringify({...fixture(),players:[]});
  assert.equal(p.saveAtomic(prepareRosterEditorSave(before,draft())).status,'conflict');
  assert.deepEqual(p.snapshot().data,before);
});
