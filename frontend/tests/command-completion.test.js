const test = require('node:test');
const assert = require('node:assert/strict');
const completion = require('../dist/command-completion.js');

const schema = {
  commands: ['help', 'hosts', 'http', 'https', 'pivot'],
  arguments: { pivot: { 0: ['start', 'stop', 'list'], 1: ['tcp', 'pipe'] } },
};

test('completes the command at the cursor', () => {
  const result = completion.getCompletions('ht', 2, schema);
  assert.deepEqual(result.candidates, ['http', 'https']);
  assert.deepEqual(completion.replaceToken('ht', result.token, 'http'), { value: 'http ', cursor: 5 });
});

test('completes command arguments by position', () => {
  const result = completion.getCompletions('pivot st', 8, schema);
  assert.deepEqual(result.candidates, ['start', 'stop']);
});

test('preserves text after the active token', () => {
  const result = completion.getCompletions('pivot st tcp', 8, schema);
  assert.deepEqual(completion.replaceToken('pivot st tcp', result.token, 'start'), { value: 'pivot start tcp', cursor: 11 });
});

test('merges dynamic candidates and ignores duplicates', () => {
  const result = completion.getCompletions('use ab', 6, { commands: ['use'], arguments: {} }, () => ['abc', 'abc', 'abd']);
  assert.deepEqual(result.candidates, ['abc', 'abd']);
});

test('cycles completion candidates on repeated tab presses', () => {
  const listeners = {};
  const input = {
    value: 'ht', selectionStart: 2,
    addEventListener(name, callback) { listeners[name] = callback; },
    setSelectionRange(start) { this.selectionStart = start; },
  };
  completion.attach(input, { schema, render() {} });
  const event = { key: 'Tab', shiftKey: false, preventDefault() {} };
  listeners.keydown(event);
  assert.equal(input.value, 'http ');
  listeners.keydown(event);
  assert.equal(input.value, 'https ');
});
