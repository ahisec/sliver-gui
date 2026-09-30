const assert = require('node:assert/strict');
const test = require('node:test');
const { createTaskStore, durationMs } = require('../dist/task-store.js');

test('tracks a task through waiting and success states', () => {
  let time = 1000;
  const store = createTaskStore({ now: () => time });
  const task = store.create({ type: 'beacon-command', title: 'Beacon 命令', target: 'host-a' });

  time = 1500;
  store.update(task.id, { status: 'waiting', remoteTaskId: 'remote-1' });
  time = 2500;
  const completed = store.update(task.id, { status: 'success', summary: '已完成' });

  assert.equal(completed.finishedAt, 2500);
  assert.equal(completed.remoteTaskId, 'remote-1');
  assert.equal(durationMs(completed, time), 1500);
});

test('keeps only the newest bounded history', () => {
  let time = 0;
  const store = createTaskStore({ limit: 2, now: () => ++time });
  store.create({ id: 'one' });
  store.create({ id: 'two' });
  store.create({ id: 'three' });

  assert.deepEqual(store.list().map(task => task.id), ['three', 'two']);
});

test('filters active and failed tasks and clears terminal records', () => {
  const store = createTaskStore({ now: () => 100 });
  store.create({ id: 'active', status: 'running' });
  store.create({ id: 'failed', status: 'failed' });
  store.create({ id: 'cancelled', status: 'cancelled' });
  store.create({ id: 'done', status: 'success' });

  assert.deepEqual(store.list('active').map(task => task.id), ['active']);
  assert.deepEqual(store.list('failed').map(task => task.id), ['cancelled', 'failed']);
  assert.equal(store.clearCompleted(), 3);
  assert.deepEqual(store.list().map(task => task.id), ['active']);
});
