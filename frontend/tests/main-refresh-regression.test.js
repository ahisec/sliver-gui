const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'dist', 'main.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(__dirname, '..', 'dist', 'index.html'), 'utf8');

test('agent refresh uses the existing persistence function', () => {
  assert.equal(source.includes('saveAgentState('), false);
  assert.equal(source.includes('if (integrityChanged || dismissedChanged) saveState();'), true);
});

test('directory downloads declare recursive intent', () => {
  assert.equal(source.includes('{ isDirectory: file.isDir }'), true);
  assert.equal(source.includes('DownloadPathTracked(transferID, sessionID, remotePath, Boolean(options.isDirectory))'), true);
});

test('infrastructure snapshot has a UI timeout instead of spinning forever', () => {
  assert.equal(source.includes('Promise.race(['), true);
  assert.equal(source.includes("new Error('网络基础设施汇总超过 8 秒')"), true);
  assert.equal(source.includes('正在汇总 Pivot 与活动转发（最多等待 8 秒）'), true);
});

test('getprivs is routed before the generic Beacon shell fallback', () => {
  const builtIn = source.indexOf("if (cmd === 'getprivs') return runGetPrivsCommand(kind, id, tab.obj);");
  const beaconFallback = source.indexOf("if (kind === 'beacon') {");
  assert.ok(builtIn >= 0 && beaconFallback >= 0 && builtIn < beaconFallback);
  assert.equal(source.includes("case 'getprivs':"), false);
  assert.equal(source.includes('StartBeaconGetPrivs(id)'), true);
});

test('loot workbench uses bounded backend preview and metadata filters', () => {
  assert.equal(source.includes("App().PreviewLoot(lootID)"), true);
  assert.equal(source.includes('id="loot-filter"'), true);
  assert.equal(source.includes('item.originHost'), true);
});

test('listener panel exposes only the supported TCP stager workflow', () => {
  assert.equal(source.includes('<option value="stager">TCP Stager</option>'), true);
  assert.equal(source.includes('App().StartStagerListener(host,port,profileName)'), true);
  assert.equal(source.includes('当前 Sliver RPC 仅支持 TCP Stager'), true);
});

test('compatibility panel exposes automatic forward compatibility negotiation', () => {
  assert.equal(source.includes("negotiation.mode === 'forward' ? '自动适配' : '兼容'"), true);
  assert.equal(source.includes('已知 RPC：${negotiation.continueKnownRpcs === false'), true);
  assert.equal(source.includes('全新 RPC：需客户端适配'), true);
  assert.equal(source.includes("negotiation.mode === 'incompatible'"), true);
});

test('official client bridge exposes a raw terminal without GUI command parsing', () => {
  assert.equal(indexSource.includes('data-view="official-console"'), true);
  assert.equal(indexSource.includes('vendor/xterm.js'), true);
  assert.equal(indexSource.includes('vendor/addon-fit.js'), true);
  assert.equal(source.includes("if (view === 'official-console') openOfficialConsolePanel();"), true);
  assert.equal(source.includes("case 'official-console':"), true);
  assert.equal(source.includes('const encoded = bytesToBase64(new TextEncoder().encode(value));'), true);
  assert.equal(source.includes('queueOfficialConsoleInput(data)'), true);
  assert.equal(source.includes('App().WriteOfficialConsole(encoded)'), true);
  assert.equal(source.includes("window.runtime.EventsOn('official-console:output'"), true);
  assert.equal(source.includes('if (officialTerminal) officialTerminal.write(bytes);'), true);
  assert.equal(source.includes('可输入 official-console 在官方客户端中使用'), true);
});

test('closing the official console modal preserves the bridge process', () => {
  const hideStart = source.indexOf('function hideModal()');
  const hideEnd = source.indexOf("document.getElementById('modal-close')", hideStart);
  const hideSource = source.slice(hideStart, hideEnd);
  assert.equal(hideSource.includes("if (activeModalID === '_official-console') disposeOfficialConsoleView(false);"), true);
  assert.equal(hideSource.includes('disposeOfficialConsoleView(true)'), false);
  const disposeStart = source.indexOf('function disposeOfficialConsoleView(stopProcess)');
  const disposeEnd = source.indexOf('function wireOfficialConsoleStream()', disposeStart);
  const disposeSource = source.slice(disposeStart, disposeEnd);
  assert.equal(disposeSource.includes("EventsOff('official-console:output')"), false);
  assert.equal(source.includes('关闭此窗口不会停止该进程'), true);
});

test('official console output remains isolated in its xterm view', () => {
  assert.equal(source.includes('function wireOfficialConsoleStream()'), true);
  assert.equal(source.includes('if (officialTerminal) officialTerminal.write(bytes);'), true);
  assert.equal(source.includes('appendOfficialConsoleOutput('), false);
  assert.equal(source.includes('officialConsoleOutputTarget'), false);
  assert.equal(source.includes("wireOfficialConsoleStream();"), true);
});

test('server command input uses the original GUI RPC router', () => {
  const start = source.indexOf('async function runServerCmd(raw)');
  const end = source.indexOf('async function runServerCommandViaRPC(raw)', start);
  const entrypoint = source.slice(start, end);
  assert.equal(entrypoint.includes('return runServerCommandViaRPC(raw);'), true);
  assert.equal(entrypoint.includes('forwardToOfficialConsole('), false);
  assert.equal(source.includes("case 'official-console':"), true);
});

test('agent command input uses the original GUI RPC router', () => {
  const start = source.indexOf('async function dispatchCmd(kind, id, raw)');
  const end = source.indexOf('async function dispatchAgentCommandViaRPC(kind, id, raw)', start);
  const entrypoint = source.slice(start, end);
  assert.equal(entrypoint.includes('return dispatchAgentCommandViaRPC(kind, id, raw);'), true);
  assert.equal(entrypoint.includes('forwardAgentCommandToOfficialConsole('), false);
  assert.equal(source.includes('可输入 official-console 在官方客户端中使用'), true);
});

test('clearing restored GUI consoles stays independent from the official terminal', () => {
  const serverRouter = source.slice(source.indexOf('async function runServerCommandViaRPC'), source.indexOf('function openEventsPanel'));
  const agentRouter = source.slice(source.indexOf('async function dispatchAgentCommandViaRPC'), source.indexOf('function formatPrivsResult'));
  assert.equal(serverRouter.includes("case 'clear': { const o = document.getElementById('sc-out');"), true);
  assert.equal(agentRouter.includes("if (cmd === 'clear') { const o = document.getElementById(`cout-${id}`);"), true);
  assert.equal(serverRouter.includes('clearOfficialConsoleRenderer('), false);
  assert.equal(agentRouter.includes('clearOfficialConsoleRenderer('), false);
});

test('server console rejects unmapped official syntax without auto-forwarding', () => {
  const router = source.slice(source.indexOf('async function runServerCommandViaRPC'), source.indexOf('function openEventsPanel'));
  assert.equal(router.includes('forwardToOfficialConsole('), false);
  assert.equal(router.includes('请在“官方 Sliver 控制台”中使用完整原生命令。'), true);
  assert.equal(router.includes('尚未在 GUI 中映射；请在“官方 Sliver 控制台”中使用。'), true);
});

test('GUI text console keeps local help while the official console remains available', () => {
  const router = source.slice(source.indexOf('async function runServerCommandViaRPC'), source.indexOf('function openEventsPanel'));
  assert.equal(router.includes("commandHelpDetail(helpTarget, SERVER_COMMAND_SCHEMA, SERVER_COMMAND_HELP, SERVER_HELP, '服务器')"), true);
  assert.equal(router.includes('forwardToOfficialConsole('), false);
  assert.equal(source.includes('async function openOfficialConsolePanel()'), true);
});

test('server console accepts the documented stage-listener command and stager alias', () => {
  assert.equal(source.includes("'stage-listener','stager'"), true);
  assert.match(source, /case 'stage-listener':\s*case 'stager':/);
  assert.equal(source.includes("if (!options.url || !options.profile)"), true);
  assert.equal(source.includes('App().StartStagerListener(host, port, options.profile)'), true);
});

test('official server command names are registered in completion and routing', () => {
  for (const command of ['implants', 'mcp', 'wg-config', 'shellcode-rdi', 'shikata-ga-nai']) {
    assert.equal(source.includes(`'${command}'`), true, `${command} is missing from the command registry`);
    assert.match(source, new RegExp(`case '${command.replaceAll('-', '\\-')}'`));
  }
  assert.match(source, /case 'dll2shellcode': case 'srdi': case 'shellcode-rdi':/);
  assert.match(source, /case 'shikata-ga-nai': case 'shellcode-encode':/);
  assert.match(source, /case 'wg-config': case 'wg-client-config':/);
});

test('agent aliases that already route are available to Tab completion', () => {
  for (const command of ['socks5', 'execw', 'ext-list', 'getpid', 'getuid', 'getgid', 'ipconfig', 'rmdir', 'terminate', 'privesc', 'adenum', 'localenum']) {
    assert.equal(source.includes(`'${command}'`), true, `${command} is missing from agent completion`);
  }
  assert.match(source, /case 'socks': case 'socks5':/);
  assert.equal(source.includes("sub === 'start' || sub === 'add'"), true);
});

test('server and agent consoles expose detailed help without executing commands', () => {
  assert.equal(source.includes("function commandHelpDetail(command, schema, entries, overview, consoleName)"), true);
  assert.equal(source.includes("function commandHelpTarget(cmd, args, schema)"), true);
  assert.equal(source.includes('CommandContract.helpTarget(cmd, args, schema.commands || [])'), true);
  assert.equal(source.includes("AGENT_COMMAND_SCHEMA.arguments.help"), true);
  assert.equal(source.includes("SERVER_COMMAND_SCHEMA.arguments.help"), true);

  const agentHelp = source.indexOf('const helpTarget = commandHelpTarget(cmd, args, AGENT_COMMAND_SCHEMA);', source.indexOf('async function dispatchCmd'));
  const beaconQueue = source.indexOf("if (kind === 'beacon')", agentHelp);
  assert.ok(agentHelp > -1 && agentHelp < beaconQueue, 'agent help must be handled before beacon task submission');

  const serverStart = source.indexOf('async function runServerCmd(raw)');
  const serverHelp = source.indexOf('const helpTarget = commandHelpTarget(cmd, args, SERVER_COMMAND_SCHEMA);', serverStart);
  const serverSwitch = source.indexOf('switch (cmd)', serverStart);
  assert.ok(serverHelp > -1 && serverHelp < serverSwitch, 'server help must be handled before command RPC routing');
});

test('nested help markers are resolved before command execution', () => {
  assert.equal(source.includes('CommandContract.helpTarget(cmd, args, schema.commands || [])'), true);
});

test('unknown target commands require explicit shell passthrough', () => {
  assert.equal(source.includes('未知目标命令 ${cmd}；请使用 shell <系统命令>'), true);
  assert.match(source, /case 'shell': \{/);
  assert.equal(source.includes('const passthroughCommand = cmd === \'shell\' || cmd === \'ext\';'), true);
});

test('GUI command options are consumed from the shared contract parser', () => {
  assert.equal(source.includes('const recursive = Boolean(options.recursive);'), true);
  assert.equal(source.includes('Boolean(options.token), Boolean(options.hidden), Number(options.ppid || 0)'), true);
  assert.equal(source.includes("const pass = options.password || '';"), true);
  assert.equal(source.includes("const pi2 = args.indexOf('-p');"), false);
  assert.equal(source.includes("const user = options.login || tab.obj?.username || '';"), true);
  assert.equal(source.includes("Number(options.port || 22), user, options.password || '', command"), true);
});

test('server handlers receive only validated positional arguments', () => {
  const start = source.indexOf('async function runServerCmd(raw)');
  const end = source.indexOf('switch (cmd)', start);
  const validation = source.slice(start, end);
  assert.equal(validation.includes('let args = parts.slice(1);'), true);
  assert.equal(validation.includes('const commandArgs = contract.positionals;'), true);
  assert.equal(validation.includes('args = commandArgs;'), true);
});

test('server detailed help covers listener aliases and common examples', () => {
  assert.match(source, /names:\['wg','wireguard'\], usage:'wg \[主端口\] \[NPort\] \[KeyPort\]'/);
  assert.match(source, /names:\['http'\], usage:'http \[端口\]'/);
  assert.match(source, /names:\['jobs','listeners'\]/);
  assert.match(source, /names:\['stage-listener','stager'\]/);
  assert.match(source, /names:\['socks5','socks'\]/);
});

test('server console lists locally installed extensions through official aliases', () => {
  assert.match(source, /'armory','extensions','aliases','ext-list','mcp'/);
  assert.match(source, /names:\['extensions','aliases','ext-list'\]/);
  assert.match(source, /case 'extensions': case 'aliases': case 'ext-list':/);
  assert.equal(source.includes('const installed = await App().ListInstalledExtensions();'), true);
  assert.equal(source.includes('执行方式：进入 Session/Beacon 目标工作区，使用 ext <命令> [参数]。'), true);
});

test('extensions install imports a package from the GUI-local filesystem', () => {
  assert.equal(source.includes("extensions: { 0: ['install'] }"), true);
  assert.equal(source.includes("cmd === 'extensions' && (args[0] || '').toLowerCase() === 'install'"), true);
  assert.equal(source.includes("App().InstallLocalExtension(localPath)"), true);
  assert.equal(source.includes('Teamserver 上的 /home/... 文件需先下载到 Windows。'), true);
});

test('armory install rejects archive paths with an actionable scope explanation', () => {
  assert.equal(source.includes('armory install <官方索引包名>'), true);
  assert.equal(source.includes('/\\.(?:tar\\.gz|tgz)$/i.test(args[1])'), true);
  assert.equal(source.includes('无法读取 Teamserver 或目标主机上的 /home/... 路径'), true);
});

test('armory install preserves official display names containing spaces', () => {
  assert.equal(source.includes("installArmoryPackage(args.slice(1).join(' '))"), true);
});

test('armory install console keeps the actionable backend detail', () => {
  assert.equal(source.includes("const normalized = RpcErrors.normalizeRpcError(error, 'Armory 安装失败');"), true);
  assert.equal(source.includes('详细原因：${normalized.detail}'), true);
  assert.equal(source.includes("RpcErrors.safeRpcErrorMessage(error, 'Armory 安装失败')"), true);
});

test('unsupported timestamp editing is not reachable from the UI or console', () => {
  assert.equal(source.includes("if (action === 'timestamps')"), false);
  assert.equal(source.includes("case 'chtimes'"), false);
  assert.equal(source.includes("case 'timestomp'"), false);
});

test('file browser rename prompts, calls the guarded backend and refreshes', () => {
  assert.equal(source.includes("if (action === 'rename')"), true);
  assert.equal(source.includes('App().FileBrowserRename(sessionID, file.path, newName)'), true);
  assert.equal(source.includes("await renderDir(currentPath, false);"), true);
});

test('screenshot panel always settles and ignores stale responses', () => {
  const start = source.indexOf('async function openAgentScreenshot(obj)');
  const end = source.indexOf('async function openAgentNetwork(obj)', start);
  const screenshotSource = source.slice(start, end);
  assert.equal(screenshotSource.includes('Promise.race(['), false);
  assert.equal(screenshotSource.includes('body.dataset.screenshotRequest !== requestID'), true);
  assert.equal(screenshotSource.includes("App().SaveScreenshot(obj.id, obj.hostname || obj.name || '')"), true);
  assert.equal(screenshotSource.includes('屏幕截图已保存到'), true);
  assert.equal(screenshotSource.includes('保存到程序运行目录'), true);
  assert.equal(screenshotSource.includes("App().TakeScreenshot(obj.id)"), false);
});

test('Session context menu routes shell -i to the existing interactive shell', () => {
  assert.match(source, /action === 'interactive-shell'\) return openInteractiveShell\(obj\.id, obj\)/);
});

test('implant profile size optimizer maps only supported Sliver options', () => {
  assert.equal(source.includes('体积优化（实验）'), true);
  assert.equal(source.includes("f.debug.checked = false; f.obfuscateSymbols.checked = false; f.netGo.checked = false;"), true);
  assert.equal(source.includes('不会删除 C2、流量编码器或其他能力'), true);
  assert.equal(source.includes('当前 RPC 不支持设置 Go 链接器的 <code>-s -w</code>'), true);
});

test('connect screen omits internal GUI build labels', () => {
  assert.equal(indexSource.includes('id="gui-version"'), false);
  assert.equal(source.includes("document.getElementById('gui-version')"), false);
  assert.equal(source.includes("`${bi.version} · ${bi.gitCommit}`"), false);
  assert.equal(indexSource.includes('panel-watermark'), false);
  assert.equal(indexSource.includes('Made by Raj Kumar Mullapudi'), false);
  assert.equal(source.includes('loadGuiBuildInfo'), false);
  assert.equal(source.includes('panel-watermark'), false);
  assert.equal(source.includes('Made by Raj Kumar Mullapudi'), false);
  assert.equal(source.includes("${esc(gui.version || 'dev')} · ${esc(gui.gitCommit || 'unknown')}"), true);
});

test('connection opens only server and event tabs by default', () => {
  const start = source.indexOf('async function enterApp(info)');
  const end = source.indexOf("document.getElementById('disconnect-btn')", start);
  const enterAppSource = source.slice(start, end);
  assert.equal(enterAppSource.includes('pinServerConsole();'), true);
  assert.equal(enterAppSource.includes('pinEvents();'), true);
  assert.equal(enterAppSource.includes('pinScripts();'), false);
  assert.equal(source.includes("if (view === 'scripts') openScriptsPanel();"), true);
});

test('event log renders parsed beacon metadata instead of protobuf bytes', () => {
  assert.equal(source.includes('const agent = ev.session || ev.beacon;'), true);
  assert.equal(source.includes("detail: ev.session ?"), false);
});

test('script manager lists only online visible Sessions and stays synchronized', () => {
  assert.match(source, /function visibleSessions\(\) \{[\s\S]*!dismissedOfflineAgents\.has\(session\.id\)/);
  assert.match(source, /function availableSessions\(\) \{\s*return visibleSessions\(\)\.filter\(session => !session\.isDead\);\s*\}/);
  assert.equal(source.includes('const sessions = availableSessions();'), true);
  assert.equal(source.includes('function syncScriptSessionSelectors()'), true);
  assert.match(source, /document\.querySelectorAll\('\.scripts-panel #scr-session'\)/);
  assert.equal(source.includes("out.textContent = '[!] 原跳板会话已离线或被隐藏，请重新选择在线 Session';"), true);
  assert.equal(source.includes("if (!availableSessions().some(session => session.id === sid))"), true);
});

test('agent refresh and offline clearing synchronize dependent panels without rerendering scripts', () => {
  const refreshStart = source.indexOf('async function refreshAgents(establishBaseline = false)');
  const refreshEnd = source.indexOf('function scheduleIntegrityRetry', refreshStart);
  const refreshSource = source.slice(refreshStart, refreshEnd);
  assert.equal(refreshSource.includes('syncAgentDependentPanels();'), true);
  assert.equal(refreshSource.includes('openScriptsPanel('), false);

  const clearStart = source.indexOf("document.getElementById('clear-offline-btn').addEventListener");
  const clearEnd = source.indexOf('function renderTable()', clearStart);
  assert.equal(source.slice(clearStart, clearEnd).includes('syncAgentDependentPanels();'), true);
});

test('infrastructure topology and impact scope exclude offline or hidden historical Sessions', () => {
  assert.match(source, /function currentInfrastructureData\(snapshot\)/);
  assert.equal(source.includes('const sessions = availableSessions();'), true);
  assert.equal(source.includes('(snapshot.nodes || []).filter(node => sessionIDs.has(node.id))'), true);
  assert.equal(source.includes('downstream: (node.downstream || []).filter(id => sessionIDs.has(id))'), true);
  assert.equal(source.includes('(snapshot.routes || []).filter(route => !route.sessionId || sessionIDs.has(route.sessionId))'), true);
  assert.equal(source.includes('function syncInfrastructurePanel()'), true);
  assert.equal(source.includes("if (!availableSessions().some(session => session.id === sessionID)) return toast('err', '所选 Session 已离线或已隐藏，请刷新后重试');"), true);
});

test('extension execution accepts raw arguments when an old Manifest declares none', () => {
  assert.equal(source.includes('id="ext-raw-args"'), true);
  assert.equal(source.includes('<textarea id="ext-raw-args"'), true);
  assert.equal(source.includes('placeholder="输入该扩展的命令参数（可留空）"'), true);
  assert.equal(source.includes('privilege::debug sekurlsa::logonpasswords'), false);
  assert.equal(source.includes('此扩展未声明结构化参数'), true);
  assert.equal(source.includes("ArgumentParser.parseArguments(detail.querySelector('#ext-raw-args')?.value || '')"), true);
  assert.equal(source.includes("detail.querySelectorAll('[data-ext-arg], #ext-raw-args')"), true);
  assert.equal(source.includes("if (parsed.error) return toast('err', parsed.error);"), true);
  assert.equal(source.includes('const args = parsed.args;'), true);
  assert.equal(source.includes("App().RunExtension(document.getElementById('ext-session').value, command.command, args)"), true);
  assert.equal(source.includes('此命令没有参数'), false);
});

test('extension execution keeps structured Manifest arguments and required validation', () => {
  assert.equal(source.includes('const declaredArgs = command.arguments || [];'), true);
  assert.equal(source.includes("declaredArgs.map((arg,index) => `<label>"), true);
  assert.equal(source.includes("const missing = declaredArgs.find((arg,index) => arg.required && !args[index]);"), true);
});

test('offline clearing is shared by server lists, completion and command palette', () => {
  assert.match(source, /function visibleSessions\(\) \{[\s\S]*!dismissedOfflineAgents\.has\(session\.id\)/);
  assert.match(source, /function visibleBeacons\(\) \{[\s\S]*!dismissedOfflineAgents\.has\(beacon\.id\)/);
  assert.equal(source.includes("visibleSessions().filter(item => matchesCommandFilter(item, options.filter, options['filter-re']))"), true);
  assert.equal(source.includes("visibleBeacons().filter(item => matchesCommandFilter(item, options.filter, options['filter-re']))"), true);
  assert.equal(source.includes("if (['kill-session','rm-session','rename'].includes(command)) return visibleSessions().map(item => item.id);"), true);
  assert.equal(source.includes("[...visibleSessions().map(s => ({ kind:'session', obj:s })), ...visibleBeacons().map(b => ({ kind:'beacon', obj:b }))]"), true);
  assert.equal(source.includes('const all = [...allSessions.map'), false);
});

test('official command contracts drive help, completion, validation and routing', () => {
  assert.equal(source.includes('CommandContract.formatHelp(help.commandPath, help.spec)'), true);
  assert.equal(source.includes('CommandContract.optionCandidates(activeSpec)'), true);
  assert.equal(source.includes("const contract = parseCommandContract(cmd, args, 'server');"), true);
  assert.equal(source.includes('尚无完整 GUI 契约；请在“官方 Sliver 控制台”中使用。'), true);
  assert.equal(source.includes("port = options.lport ?? 8888"), true);
  assert.equal(source.includes("durationNanoseconds(options['long-poll-timeout'] || '1s')"), true);
  assert.equal(source.includes("const unmappedSubcommand = unmappedOfficialSubcommand(contract, 'agent');"), true);
  assert.equal(source.includes("const unmappedSubcommand = unmappedOfficialSubcommand(contract, 'server');"), true);
  assert.equal(source.includes('官方子命令 ${unmappedSubcommand} 尚未在 GUI 中映射；请在“官方 Sliver 控制台”中使用。'), true);
});

test('official console runtime assets are bundled with the static frontend', () => {
  assert.equal(indexSource.includes('<link rel="stylesheet" href="./vendor/xterm.css"/>'), true);
  assert.equal(indexSource.includes('<script src="./vendor/xterm.js"></script>'), true);
  assert.equal(indexSource.includes('<script src="./vendor/addon-fit.js"></script>'), true);
  assert.equal(indexSource.includes('terminal-text-renderer.js'), false);
});

test('offline hidden IDs persist per Teamserver and revive when agents reconnect', () => {
  assert.equal(source.includes('dismissedOfflineAgents: [...dismissedOfflineAgents]'), true);
  assert.equal(source.includes('dismissedOfflineAgents.clear();'), true);
  assert.equal(source.includes('Array.isArray(data.dismissedOfflineAgents)'), true);
  assert.equal(source.includes('data.dismissedOfflineAgents.filter(id => typeof id === \'string\' && id).forEach(id => dismissedOfflineAgents.add(id));'), true);
  assert.equal(source.includes('if (!agent.isDead && dismissedOfflineAgents.delete(agent.id)) dismissedChanged = true;'), true);
  assert.equal(source.includes('if (integrityChanged || dismissedChanged) saveState();'), true);

  const clearStart = source.indexOf("document.getElementById('clear-offline-btn').addEventListener");
  const clearEnd = source.indexOf('// ── Table view', clearStart);
  assert.equal(source.slice(clearStart, clearEnd).includes('offline.forEach(agent => dismissedOfflineAgents.add(agent.id));\n  saveState(true);'), true);
});
