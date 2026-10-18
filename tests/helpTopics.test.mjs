import test from 'node:test';
import assert from 'node:assert/strict';
import { helpTopics, filterHelpTopics } from '../src/services/helpTopics.mjs';

test('empty or whitespace search keeps all help topics in their original order', () => {
  for (const query of ['', '   ', null]) assert.deepEqual(filterHelpTopics(query), helpTopics);
});
test('help search matches titles without case sensitivity', () => {
  assert.deepEqual(filterHelpTopics('  SETTINGS  ').map(t => t.id), ['settings']);
});
test('help search includes instructions and supporting notes', () => {
  assert.ok(filterHelpTopics('handwritten').some(t => t.id === 'scanning'));
  assert.ok(filterHelpTopics('alphabetical').some(t => t.id === 'saved-rosters'));
  assert.ok(filterHelpTopics('completed').some(t => t.id === 'rounds'));
});
test('multiple search terms narrow results even across title and content', () => {
  assert.deepEqual(filterHelpTopics('saved  absent').map(t => t.id), ['saved-rosters']);
});
test('no matches returns an empty list without changing help data', () => {
  const before = JSON.stringify(helpTopics);
  assert.deepEqual(filterHelpTopics('xyz-no-matches'), []);
  assert.equal(JSON.stringify(helpTopics), before);
});
test('support and development information remains searchable', () => {
  assert.ok(filterHelpTopics('privacy').some(t => t.id === 'support'));
  assert.deepEqual(filterHelpTopics('Andrea').map(t => t.id), ['about']);
});
