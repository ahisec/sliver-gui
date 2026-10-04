const assert = require('node:assert/strict');
const test = require('node:test');
const { fileActions, processActions, sessionHostActions, beaconHostActions } = require('../dist/context-menu-actions.js');

test('file context actions omit unsupported timestamps and properties entries', () => {
  const file = fileActions(false).filter(item => item.action).map(item => item.action);
  const directory = fileActions(true).filter(item => item.action).map(item => item.action);

  assert.deepEqual(file, ['rename', 'execute', 'download', 'upload', 'delete']);
  assert.deepEqual(directory, ['rename', 'download', 'upload', 'delete']);
  assert.equal(file.includes('timestamps'), false);
  assert.equal(directory.includes('timestamps'), false);
  assert.equal(file.includes('properties'), false);
  assert.equal(directory.includes('properties'), false);
});

test('process context actions contain all row operations and mark termination dangerous', () => {
  const actions = processActions().filter(item => item.action);
  assert.deepEqual(actions.map(item => item.action), ['refresh', 'kill', 'dump', 'migrate']);
  assert.equal(actions.find(item => item.action === 'kill').danger, true);
});

test('Session host actions omit misleading Sleep while preserving Windows-only actions', () => {
  const windows = sessionHostActions(true).map(item => item.action);
  const linux = sessionHostActions(false).map(item => item.action);

  assert.equal(windows[0], 'interactive-shell');
  assert.equal(linux[0], 'interactive-shell');
  assert.equal(windows.includes('sleep'), false);
  assert.equal(linux.includes('sleep'), false);
  assert.equal(windows.includes('screenshot'), true);
  assert.equal(windows.includes('integrity'), true);
  assert.equal(linux.includes('screenshot'), false);
  assert.equal(linux.includes('integrity'), false);
});

test('Beacon host actions expose asynchronous capabilities only', () => {
  const windows = beaconHostActions(true).map(item => item.action);
  const linux = beaconHostActions(false).map(item => item.action);
  assert.deepEqual(windows, ['interactive-session', 'beacon-timing', 'beacon-tasks', 'integrity']);
  assert.deepEqual(linux, ['interactive-session', 'beacon-timing', 'beacon-tasks']);
  assert.equal(windows.includes('interactive-shell'), false);
  assert.equal(linux.includes('interactive-shell'), false);
  assert.equal(windows.includes('files'), false);
  assert.equal(windows.includes('processes'), false);
});
