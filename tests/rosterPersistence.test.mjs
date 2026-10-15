import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyRosterData, addSavedPlayer, saveNamedRoster } from '../src/services/rosterData.mjs';
import { createRosterPersistence, ROSTER_STORAGE_KEY } from '../src/services/rosterPersistence.mjs';

function harness(initial = {}) {
  const entries = new Map(Object.entries(initial));
  const writes = [];
  const storage = {
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => { entries.set(key, value); writes.push(key); }
  };
  return { entries, writes, storage, open: () => createRosterPersistence(() => storage) };
}
const draft = { namesText: '  Marco\nAndrea\nPartial ', courtCount: 3, roundCount: 9 };

test('missing storage returns defaults without writing during hydration', () => {
  const h = harness();
  assert.deepEqual(h.open().snapshot(), { data: emptyRosterData(), status: 'ready' });
  assert.equal(h.writes.length, 0);
});

test('draft text and selections survive repeated full reopen without creating library players', () => {
  const h = harness();
  assert.equal(h.open().saveWorkingRoster(draft).status, 'ready');
  for (let i = 0; i < 3; i++) {
    const { data } = h.open().snapshot();
    assert.deepEqual(data.workingRoster, draft);
    assert.deepEqual(data.players, []);
  }
  assert.equal(h.writes.length, 1);
});

test('clearing draft preserves the player library, named rosters and unrelated keys', () => {
  const h = harness({ 'pickleball-team-flow.settings.v1': '{"showNumbers":false}', 'ptf.ratePrompt.v1': 'rated' });
  const store = h.open();
  let data = addSavedPlayer(emptyRosterData(), 'Marco', () => 'p');
  data = saveNamedRoster(data, { name: 'Tuesday', playerIds: ['p'] }, () => 'r');
  store.save(data);
  store.saveWorkingRoster(draft);
  store.saveWorkingRoster({ ...draft, namesText: '' });
  const reloaded = h.open().snapshot().data;
  assert.deepEqual(reloaded.players, data.players);
  assert.deepEqual(reloaded.rosters, data.rosters);
  assert.equal(reloaded.workingRoster.namesText, '');
  assert.equal(h.entries.get('pickleball-team-flow.settings.v1'), '{"showNumbers":false}');
  assert.equal(h.entries.get('ptf.ratePrompt.v1'), 'rated');
  assert.ok(h.writes.every(key => key === ROSTER_STORAGE_KEY));
});

for (const raw of ['', '{broken', 'null', '[]', '{"schemaVersion":2}', JSON.stringify({
  ...emptyRosterData(), rosters: [{ id: 'r', name: 'Club', playerIds: ['missing'] }]
})]) test(`unreadable document is preserved: ${raw}`, () => {
  const h = harness({ [ROSTER_STORAGE_KEY]: raw });
  const store = h.open();
  assert.equal(store.snapshot().status, 'unavailable');
  assert.equal(store.saveWorkingRoster(draft).status, 'unavailable');
  assert.deepEqual(store.snapshot().data.workingRoster, draft);
  assert.equal(h.entries.get(ROSTER_STORAGE_KEY), raw);
  assert.equal(h.writes.length, 0);
});

test('blocked storage access and reads allow in-memory use without throwing', () => {
  for (const getStorage of [
    () => { throw Error('SecurityError'); },
    () => undefined,
    () => ({ getItem() { throw Error('SecurityError'); }, setItem() { assert.fail('must not overwrite'); } })
  ]) {
    const store = createRosterPersistence(getStorage);
    assert.equal(store.saveWorkingRoster(draft).status, 'unavailable');
    assert.deepEqual(store.snapshot().data.workingRoster, draft);
  }
});

test('quota failure preserves previous saved data and retries on a later edit', () => {
  const h = harness();
  const store = h.open();
  store.saveWorkingRoster(draft);
  const previous = h.entries.get(ROSTER_STORAGE_KEY);
  const write = h.storage.setItem;
  h.storage.setItem = () => { throw Error('QuotaExceededError'); };
  const changed = { ...draft, namesText: 'New draft' };
  assert.equal(store.saveWorkingRoster(changed).status, 'unavailable');
  assert.equal(h.entries.get(ROSTER_STORAGE_KEY), previous);
  assert.deepEqual(store.snapshot().data.workingRoster, changed);
  h.storage.setItem = write;
  assert.equal(store.saveWorkingRoster(changed).status, 'ready');
  assert.deepEqual(h.open().snapshot().data.workingRoster, changed);
});

test('a stale tab does not overwrite another tab\'s document', () => {
  const h = harness();
  const first = h.open(), second = h.open();
  first.saveWorkingRoster(draft);
  const saved = h.entries.get(ROSTER_STORAGE_KEY);
  assert.equal(second.saveWorkingRoster({ ...draft, namesText: 'Stale' }).status, 'conflict');
  assert.equal(h.entries.get(ROSTER_STORAGE_KEY), saved);
});

test('snapshots and callers cannot mutate internal saved data; invalid writes are rejected', () => {
  const h = harness();
  const store = h.open();
  const input = { ...draft };
  store.saveWorkingRoster(input);
  input.namesText = 'Outside mutation';
  store.snapshot().data.workingRoster.namesText = 'Snapshot mutation';
  assert.deepEqual(store.snapshot().data.workingRoster, draft);
  const previous = h.entries.get(ROSTER_STORAGE_KEY);
  assert.equal(store.saveWorkingRoster({ namesText: 'Bad' }).status, 'invalid');
  assert.equal(h.entries.get(ROSTER_STORAGE_KEY), previous);
  assert.deepEqual(store.snapshot().data.workingRoster, draft);
});
