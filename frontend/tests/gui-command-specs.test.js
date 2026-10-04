const test = require('node:test');
const assert = require('node:assert/strict');
const specs = require('../dist/gui-command-specs.js');
const contract = require('../dist/command-contract.js');

test('zero-argument GUI commands reject silently ignored values', () => {
  assert.match(contract.parse(['unexpected'], specs.agent.clear).error, /多余参数/);
  assert.match(contract.parse(['unexpected'], specs.agent.pty).error, /多余参数/);
  assert.match(contract.parse(['unexpected'], specs.server.clear).error, /多余参数/);
});

test('GUI commands validate required positionals', () => {
  assert.match(contract.parse([], specs.agent.ext).error, /位置参数不足/);
  assert.match(contract.parse([], specs.server['kill-session']).error, /位置参数不足/);
  assert.equal(contract.parse(['abc'], specs.server['kill-session']).error, '');
});

test('only explicit raw workflows are marked as passthrough', () => {
  const raw = Object.entries(specs.agent).filter(([, value]) => value.rawPassthrough).map(([name]) => name).sort();
  assert.deepEqual(raw, ['ext', 'shell']);
  assert.equal(specs.agent.clear.rawPassthrough, undefined);
});

test('GUI help is generated from the same command contract', () => {
  assert.match(contract.formatHelp('pty', specs.agent.pty), /用法：pty/);
  assert.match(contract.formatHelp('shell', specs.agent.shell), /原始透传|shell/);
});

test('conflicting shell name explicitly overrides official help semantics', () => {
  assert.equal(specs.agent.shell.overrideOfficialHelp, true);
  assert.equal(specs.agent.shell.overrideOfficialContract, true);
  assert.match(specs.agent.shell.note, /shell attach\/kill\/ls/);
});

test('same-name GUI simplifications explicitly override official contracts', () => {
  for (const command of ['shell', 'socks', 'pivot', 'grep', 'terminate', 'reg']) {
    assert.equal(specs.agent[command].overrideOfficialContract, true, command);
  }
});

test('all nonofficial commands registered by the consoles have GUI contracts', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  const source = fs.readFileSync(path.join(__dirname, '..', 'dist', 'main.js'), 'utf8');
  const official = require('../dist/official-command-specs.js');
  for (const [constant, scope] of [['AGENT_COMMAND_SCHEMA', 'agent'], ['SERVER_COMMAND_SCHEMA', 'server']]) {
    const start = source.indexOf(`const ${constant} =`);
    const end = source.indexOf('\n};', start) + 3;
    const expression = source.slice(start, end)
      .replace(`const ${constant} =`, 'result =')
      .replace(/\.\.\.Object\.keys\([\s\S]*?\),/g, '');
    const context = { result: null };
    vm.runInNewContext(expression, context);
    const missing = context.result.commands.filter(command => !official[scope][command] && !specs[scope][command]);
    assert.equal(missing.length, 0, `${scope} commands without a contract: ${missing.join(', ')}`);
  }
});
