const test = require('node:test');
const assert = require('node:assert/strict');
const contract = require('../dist/command-contract.js');

const spec = {
  usage: 'demo [flags]', summary: 'demo', compatibility: 'official', maxPositionals: 1,
  options: [
    { name: 'name', short: 'n', type: 'string', default: '' },
    { name: 'force', short: 'F', type: 'bool', default: false },
    { name: 'port', short: 'p', type: 'uint', default: 80, supported: false },
  ],
};

test('parses Cobra-style long, equals, short and boolean options', () => {
  assert.deepEqual(contract.parse(['--name=alpha', '-F', 'target'], spec), {
    error: '', positionals: ['target'], options: { name: 'alpha', force: true },
  });
});

test('rejects unknown options, missing values and extra positionals', () => {
  assert.match(contract.parse(['--wat'], spec).error, /未知参数 --wat/);
  assert.match(contract.parse(['--name'], spec).error, /缺少值/);
  assert.match(contract.parse(['one', 'two'], spec).error, /多余参数/);
});

test('rejects missing required positional arguments', () => {
  assert.match(contract.parse([], { usage:'demo <target>', minPositionals:1, maxPositionals:1, options:[] }).error, /位置参数不足/);
});

test('tracks explicitly unsupported official options', () => {
  const parsed = contract.parse(['-p', '443'], spec);
  assert.deepEqual(contract.unsupportedOptions(parsed, spec), ['port']);
});

test('formats official options and completion candidates from one spec', () => {
  const help = contract.formatHelp('demo', spec);
  assert.match(help, /--name, -n/);
  assert.match(help, /当前 GUI 未映射/);
  assert.deepEqual(contract.optionCandidates(spec), ['--name', '-n', '--force', '-F', '--port', '-p']);
});

test('resolves nested official commands and removes command words before parsing', () => {
  const specs = {
    sessions: { path: 'sessions', options: [{ name: 'filter', short: 'f', type: 'string' }], subcommands: ['prune'] },
    'sessions prune': { path: 'sessions prune', options: [{ name: 'force', short: 'F', type: 'bool' }], maxPositionals: 0 },
  };
  const resolved = contract.resolve('sessions', ['prune', '-F'], specs);
  assert.equal(resolved.commandPath, 'sessions prune');
  assert.deepEqual(resolved.subcommands, ['prune']);
  assert.deepEqual(resolved.tokens, ['-F']);
  assert.deepEqual(contract.parse(resolved.tokens, resolved.spec), { error: '', positionals: [], options: { force: true } });
});

test('preserves repeated array and comma-separated slice flags', () => {
  const arrays = { options: [
    { name: 'env', short: 'e', type: 'stringArray' },
    { name: 'domains', short: 'd', type: 'stringSlice' },
  ] };
  assert.deepEqual(contract.parse(['-e', 'A=1', '--env=B=2', '-d', 'a.test,b.test'], arrays), {
    error: '', positionals: [], options: { env: ['A=1', 'B=2'], domains: ['a.test', 'b.test'] },
  });
});

test('resolves all supported nested help spellings before execution', () => {
  const commands = ['sessions'];
  assert.equal(contract.helpTarget('help', ['sessions', 'prune'], commands), 'sessions prune');
  assert.equal(contract.helpTarget('sessions', ['prune', 'help'], commands), 'sessions prune');
  assert.equal(contract.helpTarget('sessions', ['prune', '--help'], commands), 'sessions prune');
  assert.equal(contract.helpTarget('sessions', ['prune', '-h'], commands), 'sessions prune');
  assert.equal(contract.helpTarget('sessions', ['--help', 'extra'], commands), null);
});

test('GUI semantic overrides take precedence over conflicting official help', () => {
  const official = {
    shell: { path: 'shell', usage: 'shell [flags]', subcommands: ['attach'] },
    'shell attach': { path: 'shell attach', usage: 'shell attach <id>' },
  };
  const gui = { shell: { usage: 'shell <系统命令>', overrideOfficialHelp: true } };
  assert.deepEqual(contract.helpSpec('shell', official, gui), { commandPath: 'shell', spec: gui.shell });
  assert.equal(contract.helpSpec('shell attach', official, gui), null);
});
