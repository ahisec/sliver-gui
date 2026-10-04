(function (root, factory) {
  const metadata = typeof module === 'object' && module.exports
    ? require('./official-command-metadata.js')
    : root.OfficialCommandMetadata;
  const api = factory(metadata);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.OfficialCommandSpecs = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (metadata) {
  const option = (name, short, type, defaultValue, description, supported = true, valueName = '') => ({
    name, short, type, default: defaultValue, description, supported, valueName,
  });
  const timeout = option('timeout', 't', 'int', 60, 'gRPC 超时（秒）', false, 'seconds');

  const serverOverrides = {
    sessions: {
      usage: 'sessions [flags] | sessions prune [-F]', summary: 'Session management', compatibility: '官方命令（RPC 映射）', maxPositionals: 2,
      options: [timeout, option('interact', 'i', 'string', '', '与指定 Session 交互', true, 'session'), option('kill', 'k', 'string', '', '终止指定 Session', true, 'session'), option('kill-all', 'K', 'bool', false, '终止全部 Session', true), option('clean', 'C', 'bool', false, '清理 DEAD Session', true), option('force', 'F', 'bool', false, '不等待结果强制执行', false), option('filter', 'f', 'string', '', '按子字符串筛选', true, 'text'), option('filter-re', 'e', 'string', '', '按正则表达式筛选', true, 'regexp')],
      note: 'GUI 的“清空离线主机”只隐藏本机列表；官方 --clean 会修改 Teamserver 历史记录。',
    },
    beacons: {
      usage: 'beacons [flags] | beacons rm <id> | beacons prune [-d duration]', summary: 'Beacon management', compatibility: '官方命令（RPC 映射）', maxPositionals: 2,
      options: [timeout, option('kill', 'k', 'string', '', '终止指定 Beacon', true, 'beacon'), option('kill-all', 'K', 'bool', false, '终止全部 Beacon', true), option('interact', 'i', 'string', '', '与指定 Beacon 交互', true, 'beacon'), option('force', 'F', 'bool', false, '强制终止', false), option('filter', 'f', 'string', '', '按子字符串筛选', true, 'text'), option('filter-re', 'e', 'string', '', '按正则表达式筛选', true, 'regexp'), option('duration', 'd', 'string', '1h', 'prune 的失联时长', false, 'duration')],
    },
    jobs: {
      usage: 'jobs [--kill id | --kill-all]', summary: 'Job control', compatibility: '官方命令（RPC 映射）', maxPositionals: 0,
      options: [timeout, option('kill', 'k', 'int', -1, '终止后台 Job', true, 'id'), option('kill-all', 'K', 'bool', false, '终止全部 Job', true)],
    },
    mtls: {
      usage: 'mtls [--lhost interface] [--lport port]', summary: 'Start an mTLS listener', compatibility: '官方命令（完整 RPC 映射）', maxPositionals: 0,
      options: [option('lhost', 'L', 'string', '', 'Teamserver 绑定接口', true, 'interface'), option('lport', 'l', 'uint', 8888, 'TCP 监听端口', true, 'port')],
    },
    wg: {
      aliases: ['wireguard'], usage: 'wg [flags]', summary: 'Start a WireGuard listener', compatibility: '官方命令（完整 RPC 映射）', maxPositionals: 0,
      options: [option('lhost', 'L', 'string', '', 'Teamserver 绑定接口', true, 'interface'), option('lport', 'l', 'uint', 53, 'UDP 监听端口', true, 'port'), option('nport', 'n', 'uint', 8888, '虚拟 TUN 通信端口', true, 'port'), option('key-port', 'x', 'uint', 1337, '密钥交换端口', true, 'port')],
    },
    dns: {
      usage: 'dns --domains <domain[,domain...]> [flags]', summary: 'Start a DNS listener', compatibility: '官方命令（完整 RPC 映射）', maxPositionals: 0,
      options: [option('domains', 'd', 'string', '', 'DNS C2 父域名（逗号分隔）', true, 'domains'), option('no-canaries', 'c', 'bool', false, '禁用 DNS Canary 检测', true), option('lhost', 'L', 'string', '', 'Teamserver 绑定接口', true, 'interface'), option('lport', 'l', 'uint', 53, 'UDP 监听端口', true, 'port')],
    },
    http: {
      usage: 'http [flags]', summary: 'Start an HTTP listener', compatibility: '官方命令（完整 RPC 映射）', maxPositionals: 0,
      options: [option('domain', 'd', 'string', '', '仅响应指定 Host 域名', true, 'domain'), option('website', 'w', 'string', '', '托管网站名称', true, 'name'), option('lhost', 'L', 'string', '', 'Teamserver 绑定接口', true, 'interface'), option('lport', 'l', 'uint', 80, 'TCP 监听端口', true, 'port'), option('disable-otp', 'D', 'bool', false, '禁用 OTP 认证', true), option('long-poll-timeout', 'T', 'string', '1s', '服务端长轮询超时', true, 'duration'), option('long-poll-jitter', 'J', 'string', '2s', '服务端长轮询抖动', true, 'duration')],
    },
    https: {
      usage: 'https [flags]', summary: 'Start an HTTPS listener', compatibility: '官方命令（部分 RPC 映射）', maxPositionals: 0,
      options: [option('domain', 'd', 'string', '', '仅响应指定 Host 域名', true, 'domain'), option('website', 'w', 'string', '', '托管网站名称', true, 'name'), option('lhost', 'L', 'string', '', 'Teamserver 绑定接口', true, 'interface'), option('lport', 'l', 'uint', 443, 'TCP 监听端口', true, 'port'), option('disable-otp', 'D', 'bool', false, '禁用 OTP 认证', true), option('long-poll-timeout', 'T', 'string', '1s', '服务端长轮询超时', true, 'duration'), option('long-poll-jitter', 'J', 'string', '2s', '服务端长轮询抖动', true, 'duration'), option('cert', 'c', 'string', '', 'PEM 证书文件', false, 'path'), option('key', 'k', 'string', '', 'PEM 私钥文件', false, 'path'), option('lets-encrypt', 'e', 'bool', false, "申请 Let's Encrypt 证书", true), option('disable-randomized-jarm', 'E', 'bool', false, '禁用随机 JARM 指纹', true)],
    },
    'stage-listener': {
      aliases: ['stager'], usage: 'stage-listener --url <tcp://host:port> --profile <name> [flags]', summary: 'Start a stager listener', compatibility: '官方命令（部分 RPC 映射）', maxPositionals: 0,
      options: [option('profile', 'p', 'string', '', '关联的植入体档案', true, 'name'), option('url', 'u', 'string', '', 'Stager 回连 URL', true, 'url'), option('cert', 'c', 'string', '', 'HTTPS PEM 证书文件', false, 'path'), option('key', 'k', 'string', '', 'HTTPS PEM 私钥文件', false, 'path'), option('lets-encrypt', 'e', 'bool', false, "申请 Let's Encrypt 证书", false), option('aes-encrypt-key', '', 'string', '', 'AES 加密密钥', false, 'key'), option('aes-encrypt-iv', '', 'string', '', 'AES IV', false, 'iv'), option('rc4-encrypt-key', '', 'string', '', 'RC4 加密密钥', false, 'key'), option('compress', 'C', 'string', 'none', '压缩格式：zlib/gzip/deflate9/none', false, 'format'), option('prepend-size', 'P', 'bool', false, '在载荷前附加长度', false)],
    },
  };
  const agentOverrides = {
    ssh: {
      minPositionals: 1,
      note: '当前 GUI 等价映射官方 --login、--password 和 --port；私钥、Kerberos、loot 凭据选择和超时参数会在执行前明确拒绝。',
    },
    interactive: {
      usage: 'interactive [flags]', summary: 'Task a beacon to open an interactive session', compatibility: '官方命令（部分 RPC 映射）', maxPositionals: 0,
      options: [option('mtls', 'm', 'string', '', 'mTLS 连接串', false, 'url'), option('wg', 'g', 'string', '', 'WireGuard 连接串', false, 'url'), option('http', 'b', 'string', '', 'HTTP(S) 连接串', false, 'url'), option('dns', 'n', 'string', '', 'DNS 连接串', false, 'url'), option('named-pipe', 'p', 'string', '', '命名管道连接串', false, 'url'), option('tcp-pivot', 'i', 'string', '', 'TCP Pivot 连接串', false, 'url'), option('delay', 'd', 'string', '0s', '延迟建立 Session', false, 'duration'), timeout],
    },
    close: { usage: 'close [--timeout seconds]', summary: 'Close an interactive session without killing the remote process', compatibility: '官方命令（部分 RPC 映射）', maxPositionals: 0, options: [timeout] },
  };

  const support = {
    server: {
      sessions: ['interact','kill','kill-all','clean','filter','filter-re'],
      beacons: ['interact','kill','kill-all','filter','filter-re'],
      jobs: ['kill','kill-all'], mtls: ['lhost','lport'],
      http: ['domain','website','lhost','lport','disable-otp','long-poll-timeout','long-poll-jitter'],
      https: ['domain','website','lhost','lport','disable-otp','long-poll-timeout','long-poll-jitter','lets-encrypt','disable-randomized-jarm'],
      dns: ['domains','no-canaries','lhost','lport'], wg: ['lhost','lport','nport','key-port'],
      'stage-listener': ['profile','url'],
    },
    agent: {
      execute: ['token','hidden','ppid'], ls: ['modified','reverse','size'], ps: ['exe','owner','pid'],
      runas: ['args','domain','password','process','username'], reconfig: ['beacon-interval','beacon-jitter'],
      services: ['host'], procdump: ['pid'], 'make-token': ['domain','password','username'],
      migrate: ['pid'], backdoor: ['profile'],
      ssh: ['login','password','port'],
      msf: ['payload','lhost','lport'], 'msf-inject': ['payload','lhost','lport','pid'],
    },
  };

  const positionalLimits = {
    server: {
      version: 0, sessions: 0, beacons: 0, jobs: 0, operators: 0, implants: 0,
      profiles: 0, mtls: 0, http: 0, https: 0, dns: 0, wg: 0, c2profiles: 0,
      certificates: 0, builders: 0, 'shellcode-encoders': 0, 'stage-listener': 0,
      regenerate: 1, armory: 0, extensions: 0, hosts: 0, loot: 0, monitor: 0,
      mcp: 0, websites: 0, creds: 0, canaries: 0, info: 0, 'wg-config': 0,
      aliases: 0, c2profiles: 0,
      'shikata-ga-nai': 1,
      'sessions prune': 0, 'beacons rm': 1, 'armory install': 1, 'armory rm': 1,
      'extensions install': 1, 'hosts rm': 1, 'loot rename': 2, 'loot rm': 1,
      'monitor start': 0, 'monitor stop': 0, 'websites rm': 1,
    },
    agent: {
      info: 0, getprivs: 0, ps: 0, pwd: 0, cd: 1, ls: 1, download: 2, upload: 2,
      screenshot: 0, netstat: 0, whoami: 0, kill: 1, 'make-token': 0, impersonate: 1,
      rev2self: 0, ping: 0, close: 0, mkdir: 1, rm: 1, cat: 1, mv: 2, cp: 2,
      ifconfig: 0, procdump: 1, backdoor: 2, msf: 3, 'msf-inject': 4, runas: 2,
      migrate: 2, chmod: 2, chown: 3, getpid: 0, getuid: 0, getgid: 0, mount: 0,
      terminate: 1, services: 0, memfiles: 0, wasm: 0, extensions: 0, env: 0,
      portfwd: 0, rportfwd: 0, registry: 0, socks5: 0, 'wg-portfwd': 0,
      'wg-socks': 0, tasks: 0, pivots: 0,
      'execute-shellcode': 2,
      'memfiles add': 0, 'memfiles rm': 1, 'wasm ls': 0,
    },
  };

  function mergeScope(scope, overrides) {
    const generated = (metadata || {})[scope] || {};
    const result = {};
    for (const [path, source] of Object.entries(generated)) {
      const explicit = overrides[path] || {};
      const supported = new Set(support[scope]?.[path] || []);
      const optionOverrides = new Map((explicit.options || []).map(item => [item.name, item]));
      const options = (source.options || []).filter(item => item.name).map(item => ({
        ...item,
        default: item.type === 'bool' ? String(item.default).toLowerCase() === 'true'
          : (item.type === 'int' || item.type === 'uint') ? Number(item.default)
            : (item.type === 'stringArray' || item.type === 'stringSlice') ? []
            : item.default,
        valueName: optionOverrides.get(item.name)?.valueName || '',
        description: optionOverrides.get(item.name)?.description || item.description,
        supported: optionOverrides.has(item.name)
          ? optionOverrides.get(item.name).supported !== false
          : supported.has(item.name),
      }));
      result[path] = {
        ...source,
        ...explicit,
        usage: source.usage || explicit.usage || path,
        summary: source.summary || explicit.summary || '',
        aliases: [...new Set([...(source.aliases || []), ...(explicit.aliases || [])])],
        subcommands: source.subcommands || [],
        compatibility: explicit.compatibility || '官方命令（锁定版本元数据）',
        options,
      };
      if (Number.isInteger(positionalLimits[scope]?.[path])) {
        result[path].maxPositionals = positionalLimits[scope][path];
      }
    }
    for (const [path, explicit] of Object.entries(overrides)) {
      if (!result[path]) result[path] = explicit;
    }
    for (const [path, spec] of Object.entries(result)) {
      if (path.includes(' ')) continue;
      for (const alias of spec.aliases || []) if (!result[alias]) result[alias] = spec;
    }
    return result;
  }

  const server = mergeScope('server', serverOverrides);
  server.listeners = server.jobs;
  server.wireguard = server.wg;
  server.stager = server['stage-listener'];

  const agent = mergeScope('agent', agentOverrides);
  agent.reg = agent.registry;
  agent.pivot = agent.pivots;
  agent.socks = agent.socks5;

  return { server, agent };
});
