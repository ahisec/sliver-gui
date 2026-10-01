const assert = require('node:assert/strict');
const test = require('node:test');
const { create } = require('../dist/agent-notification-state.js');

test('initial agents are baselined and new agents notify once', () => {
  const state = create();
  state.reset([{ id: 'session-existing' }], [{ id: 'beacon-existing' }]);

  assert.equal(state.take('session', { id: 'session-existing' }), false);
  assert.equal(state.take('beacon', { id: 'beacon-existing' }), false);
  assert.equal(state.take('session', { id: 'session-new' }), true);
  assert.equal(state.take('session', { id: 'session-new' }), false);
});

test('Session and Beacon IDs are namespaced and missing IDs are ignored', () => {
  const state = create();
  assert.equal(state.take('session', { id: 'same' }), true);
  assert.equal(state.take('beacon', { id: 'same' }), true);
  assert.equal(state.take('session', {}), false);
});
