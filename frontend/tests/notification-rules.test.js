const assert = require('node:assert/strict');
const test = require('node:test');
const { isQuietTime, shouldNotify } = require('../dist/notification-rules.js');

test('handles a quiet window that crosses midnight', () => {
  assert.equal(isQuietTime(new Date(2026, 0, 1, 23, 30), '22:00', '07:00'), true);
  assert.equal(isQuietTime(new Date(2026, 0, 1, 12, 0), '22:00', '07:00'), false);
});

test('filters by category and minimum level', () => {
  const settings = { enabled: true, minimumLevel: 'warning', categories: { task: true, agent: false } };
  assert.equal(shouldNotify({ category: 'task', level: 'critical' }, settings), true);
  assert.equal(shouldNotify({ category: 'task', level: 'info' }, settings), false);
  assert.equal(shouldNotify({ category: 'agent', level: 'critical' }, settings), false);
});
