const assert = require('node:assert/strict');
const test = require('node:test');
const { fileActions, processActions } = require('../dist/context-menu-actions.js');

test('file context actions expose timestamps without the removed properties entry', () => {
  const file = fileActions(false).filter(item => item.action).map(item => item.action);
  const directory = fileActions(true).filter(item => item.action).map(item => item.action);

  assert.deepEqual(file, ['timestamps', 'execute', 'download', 'upload', 'delete']);
  assert.deepEqual(directory, ['timestamps', 'download', 'upload', 'delete']);
  assert.equal(file.includes('properties'), false);
  assert.equal(directory.includes('properties'), false);
});

test('process context actions contain all row operations and mark termination dangerous', () => {
  const actions = processActions().filter(item => item.action);
  assert.deepEqual(actions.map(item => item.action), ['refresh', 'kill', 'dump', 'migrate']);
  assert.equal(actions.find(item => item.action === 'kill').danger, true);
});
