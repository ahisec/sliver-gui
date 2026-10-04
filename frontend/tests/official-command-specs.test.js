const test = require('node:test');
const assert = require('node:assert/strict');
const specs = require('../dist/official-command-specs.js');

test('locked Sliver listener defaults and aliases are represented', () => {
  assert.equal(specs.server.mtls.options.find(option => option.name === 'lport').default, 8888);
  assert.equal(specs.server.wireguard, specs.server.wg);
  assert.equal(specs.server.stager, specs.server['stage-listener']);
});

test('unsupported official flags are explicit instead of silently dropped', () => {
  assert.equal(specs.server.https.options.find(option => option.name === 'cert').supported, false);
  assert.equal(specs.agent.interactive.options.find(option => option.name === 'mtls').supported, false);
});

test('every locked official root and nested command retains generated help metadata', () => {
  const metadata = require('../dist/official-command-metadata.js');
  for (const scope of ['server', 'agent']) {
    for (const [path, generated] of Object.entries(metadata[scope])) {
      const spec = specs[scope][path];
      assert.ok(spec, `${scope} command ${path} is missing`);
      assert.equal(spec.path, generated.path, `${scope} command ${path} lost its official path`);
      assert.ok(spec.usage, `${scope} command ${path} has no official usage`);
      for (const generatedOption of generated.options || []) {
        const option = spec.options.find(item => item.name === generatedOption.name);
        assert.ok(option, `${scope} command ${path} lost --${generatedOption.name}`);
        assert.equal(typeof option.supported, 'boolean', `${scope} command ${path} --${generatedOption.name} has no support classification`);
      }
    }
  }
});

test('generated metadata preserves repeatable Cobra option types', () => {
  assert.equal(specs.agent.execute.options.find(option => option.name === 'env').type, 'stringArray');
  assert.deepEqual(specs.agent.execute.options.find(option => option.name === 'env').default, []);
});

test('mapped commands that accept no positional values reject extras', () => {
  assert.equal(specs.agent.info.maxPositionals, 0);
  assert.equal(specs.agent.getprivs.maxPositionals, 0);
  assert.equal(specs.agent.ps.maxPositionals, 0);
  assert.equal(specs.server.version.maxPositionals, 0);
  assert.equal(specs.server.jobs.maxPositionals, 0);
  assert.equal(specs.server.mcp.maxPositionals, 0);
  assert.equal(specs.server.armory.maxPositionals, 0);
  assert.equal(specs.agent.services.maxPositionals, 0);
});

test('nested commands routed by the GUI have explicit positional limits', () => {
  for (const path of ['sessions prune', 'beacons rm', 'armory install', 'extensions install', 'hosts rm', 'loot rename', 'monitor start', 'websites rm']) {
    assert.equal(Number.isInteger(specs.server[path].maxPositionals), true, `${path} has no positional limit`);
  }
  for (const path of ['memfiles add', 'memfiles rm', 'wasm ls']) {
    assert.equal(Number.isInteger(specs.agent[path].maxPositionals), true, `${path} has no positional limit`);
  }
});

test('variable-length command arguments use an explicit unbounded contract', () => {
  for (const path of ['execute', 'execute-assembly', 'sideload', 'ssh', 'spawndll']) {
    assert.equal(specs.agent[path].maxPositionals, undefined, `${path} must not use a numeric sentinel`);
  }
});

test('SSH maps only options represented by the current RPC wrapper', () => {
  assert.equal(specs.agent.ssh.minPositionals, 1);
  assert.equal(specs.agent.ssh.options.find(option => option.name === 'login').supported, true);
  assert.equal(specs.agent.ssh.options.find(option => option.name === 'password').supported, true);
  assert.equal(specs.agent.ssh.options.find(option => option.name === 'port').supported, true);
  assert.equal(specs.agent.ssh.options.find(option => option.name === 'private-key').supported, false);
});
