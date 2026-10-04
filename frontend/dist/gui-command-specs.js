(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GuiCommandSpecs = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const option = (name, short, type = 'string', description = '') => ({
    name, short, type, description, supported: true,
  });
  const spec = (usage, minPositionals, maxPositionals, options = []) => ({
    usage, minPositionals, maxPositionals, options,
    compatibility: 'GUI 扩展命令', summary: 'Sliver GUI 提供的客户端工作流', guiOnly: true,
  });
  const zero = (usage) => spec(usage, 0, 0);
  const ranged = (usage, min, max, options) => spec(usage, min, max, options);
  const override = value => ({ ...value, overrideOfficialContract: true, overrideOfficialHelp: true });

  const agent = {
    clear: zero('clear'),
    pty: zero('pty'),
    shell: override({
      ...ranged('shell <目标系统命令> | shell -i', 0, null),
      rawPassthrough: true,
      note: '兼容性偏差：本 GUI 保留 shell 作为目标操作系统命令的显式原始透传入口；不映射锁定 Sliver CLI 的 shell attach/kill/ls 子命令。',
    }),
    ext: { ...ranged('ext <扩展命令> [参数...]', 1, null), rawPassthrough: true },
    'ext-list': zero('ext-list'),
    socks: override(ranged('socks start|add [端口] | stop | status', 0, 2)),
    pivot: override(ranged('pivot start <tcp|pipe> [绑定地址] | stop <ID> | list', 0, 3)),
    loot: ranged('loot [add <远程路径> | rm <ID>]', 0, 2),
    'execute-windows': ranged('execute-windows [-t] [-H] [--ppid PID] <程序> [参数...]', 1, null, [
      option('token', 't', 'bool', '使用当前令牌'), option('hidden', 'H', 'bool', '隐藏窗口'), option('ppid', '', 'uint', '父进程 PID'),
    ]),
    execw: ranged('execw [-t] [-H] [--ppid PID] <程序> [参数...]', 1, null, [
      option('token', 't', 'bool', '使用当前令牌'), option('hidden', 'H', 'bool', '隐藏窗口'), option('ppid', '', 'uint', '父进程 PID'),
    ]),
    'wg-forwarders': zero('wg-forwarders'),
    'wg-list-socks': zero('wg-list-socks'),
    rmdir: ranged('rmdir <路径>', 1, 1),
    ipconfig: zero('ipconfig'),
    privesc: zero('privesc'),
    'privesc-check': zero('privesc-check'),
    harvest: zero('harvest'),
    adenum: zero('adenum'),
    'ad-enum': zero('ad-enum'),
    localenum: zero('localenum'),
    'local-enum': zero('local-enum'),
    kerberoast: zero('kerberoast'),
    spawn: ranged('spawn <类型> [参数...]', 1, null, [option('password', 'p', 'string', '远程凭据密码')]),
    jump: ranged('jump <类型> [参数...]', 1, null, [option('password', 'p', 'string', '远程凭据密码')]),
    persist: ranged('persist <方式> [参数...]', 1, null),
    scan: ranged('scan [子网] [端口...]', 0, null),
    grep: override(ranged('grep [-r] <表达式> <路径>', 2, 2, [option('recursive', 'r', 'bool', '递归搜索')])),
    terminate: override(ranged('terminate <PID>', 1, 1)),
    getenv: ranged('getenv [名称片段]', 0, 1),
    setenv: ranged('setenv <名称> <值>', 2, null),
    unsetenv: ranged('unsetenv <名称>', 1, 1),
    reg: override(ranged('reg query|read|write|read-hive [参数...]', 1, null)),
  };

  const server = {
    clear: zero('clear'),
    'official-console': zero('official-console'),
    listeners: zero('listeners'),
    players: zero('players'),
    builds: zero('builds'),
    certs: zero('certs'),
    ca: zero('ca'),
    compiler: zero('compiler'),
    'compiler-info': zero('compiler-info'),
    'traffic-encoders': zero('traffic-encoders'),
    aliases: zero('aliases'),
    'ext-list': zero('ext-list'),
    stager: ranged('stager --url <tcp://host:port> --profile <名称>', 0, 0, [option('url', 'u'), option('profile', 'p')]),
    c2profile: ranged('c2profile <名称> | c2profile edit <名称> | c2profile new', 1, 2),
    website: ranged('website add|update <站点> <Web 路径> <本地文件> | rm <站点> <Web 路径>', 1, 4),
    'restart-jobs': ranged('restart-jobs <ID> [ID...]', 1, null),
    'pivot-graph': zero('pivot-graph'),
    pivots: zero('pivots'),
    'wg-client-config': zero('wg-client-config'),
    'wg-unique-ip': zero('wg-unique-ip'),
    dll2shellcode: ranged('dll2shellcode <DLL> <导出函数> [参数]', 2, 3),
    srdi: ranged('srdi <DLL> <导出函数> [参数]', 2, 3),
    'shellcode-rdi': ranged('shellcode-rdi <DLL> <导出函数> [参数]', 2, 3),
    'shellcode-encode': ranged('shellcode-encode <文件> [架构] [迭代次数]', 1, 3),
    rename: ranged('rename <Session ID> <名称>', 2, 2),
    'kill-session': ranged('kill-session <Session ID>', 1, 1),
    'rm-session': ranged('rm-session <Session ID>', 1, 1),
    'kill-beacon': ranged('kill-beacon <Beacon ID>', 1, 1),
    'rm-beacon': ranged('rm-beacon <Beacon ID>', 1, 1),
    'certificate-authority': zero('certificate-authority'),
    canaries: zero('canaries'),
  };

  return { agent, server };
});
