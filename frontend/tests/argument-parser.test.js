const assert = require('node:assert/strict');
const test = require('node:test');
const { parseArguments } = require('../dist/argument-parser.js');

test('parses empty and plain argument lists', () => {
  assert.deepEqual(parseArguments(''), { args: [], error: '' });
  assert.deepEqual(parseArguments('--quiet /n'), { args: ['--quiet', '/n'], error: '' });
});

test('preserves quoted spaces and empty arguments', () => {
  assert.deepEqual(parseArguments('--name "hello world" ""'), { args: ['--name', 'hello world', ''], error: '' });
});

test('supports escaped quotes without stripping ordinary path separators', () => {
  assert.deepEqual(parseArguments('"say \\"hello\\"" C:\\Temp\\file.txt'), {
    args: ['say "hello"', 'C:\\Temp\\file.txt'], error: '',
  });
});

test('rejects an unterminated quote', () => {
  const result = parseArguments('--name "unfinished');
  assert.deepEqual(result.args, []);
  assert.match(result.error, /未闭合/);
});
