(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CommandContract = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function optionIndex(spec) {
    const index = new Map();
    for (const option of spec?.options || []) {
      index.set(`--${option.name}`, option);
      if (option.short) index.set(`-${option.short}`, option);
    }
    return index;
  }

  function resolve(command, tokens, specs) {
    const root = specs?.[command] || null;
    if (!root) return { spec: null, commandPath: command, subcommands: [], tokens };
    let spec = root;
    let commandPath = root.path || command;
    const subcommands = [];
    for (const token of tokens || []) {
      if (String(token).startsWith('-')) break;
      const candidate = `${commandPath} ${String(token).toLowerCase()}`;
      if (!specs[candidate]) break;
      commandPath = candidate;
      spec = specs[candidate];
      subcommands.push(String(token));
    }
    const merged = new Map();
    for (const item of [...(root.options || []), ...(spec.options || [])]) merged.set(item.name, item);
    return {
      spec: { ...spec, options: [...merged.values()], commandPath },
      commandPath,
      subcommands,
      tokens: (tokens || []).slice(subcommands.length),
    };
  }

  function parse(tokens, spec) {
    const options = {};
    const positionals = [];
    const index = optionIndex(spec);
    let optionsEnded = false;

    for (let offset = 0; offset < tokens.length; offset++) {
      const token = String(tokens[offset]);
      if (!optionsEnded && token === '--') {
        optionsEnded = true;
        continue;
      }
      if (optionsEnded || token === '-' || !token.startsWith('-')) {
        positionals.push(token);
        continue;
      }

      let spelling = token;
      let inlineValue;
      if (token.startsWith('--') && token.includes('=')) {
        const separator = token.indexOf('=');
        spelling = token.slice(0, separator);
        inlineValue = token.slice(separator + 1);
      }
      const option = index.get(spelling);
      if (!option) return { error: `未知参数 ${spelling}；本次命令未执行。`, positionals: [], options: {} };

      if (option.type === 'bool') {
        if (inlineValue !== undefined && !['true', 'false'].includes(inlineValue.toLowerCase())) {
          return { error: `参数 ${spelling} 只接受 true 或 false。`, positionals: [], options: {} };
        }
        options[option.name] = inlineValue === undefined ? true : inlineValue.toLowerCase() === 'true';
        continue;
      }

      const value = inlineValue === undefined ? tokens[++offset] : inlineValue;
      if (value === undefined) return { error: `参数 ${spelling} 缺少值；本次命令未执行。`, positionals: [], options: {} };
      if ((option.type === 'int' || option.type === 'uint') && !/^-?\d+$/.test(String(value))) {
        return { error: `参数 ${spelling} 需要整数值。`, positionals: [], options: {} };
      }
      if (option.type === 'uint' && Number(value) < 0) {
        return { error: `参数 ${spelling} 不能为负数。`, positionals: [], options: {} };
      }
      const normalized = option.type === 'int' || option.type === 'uint' ? Number(value) : String(value);
      if (['stringArray', 'stringSlice'].includes(option.type)) {
        if (!Array.isArray(options[option.name])) options[option.name] = [];
        options[option.name].push(...(option.type === 'stringSlice' ? String(normalized).split(',') : [normalized]));
      } else {
        options[option.name] = normalized;
      }
    }

    if (Number.isInteger(spec?.minPositionals) && positionals.length < spec.minPositionals) {
      return { error: `位置参数不足；用法：${spec.usage || spec.commandPath || '请查看帮助'}。`, positionals: [], options: {} };
    }
    if (Number.isInteger(spec?.maxPositionals) && positionals.length > spec.maxPositionals) {
      return { error: `多余参数：${positionals.slice(spec.maxPositionals).join(' ')}；本次命令未执行。`, positionals: [], options: {} };
    }
    return { error: '', positionals, options };
  }

  function formatHelp(command, spec) {
    if (!spec) return '';
    const lines = [
      `命令：${command}`,
      `用途：${spec.summary || '-'}`,
      `用法：${spec.usage || command}`,
      `兼容性：${spec.compatibility || 'GUI 封装'}`,
    ];
    if (spec.aliases?.length) lines.push(`别名：${spec.aliases.join(', ')}`);
    if (spec.options?.length) {
      lines.push('', '官方参数：');
      for (const option of spec.options) {
        const names = [`--${option.name}`, option.short ? `-${option.short}` : ''].filter(Boolean).join(', ');
        const value = option.type === 'bool' ? '' : ` <${option.valueName || 'value'}>`;
        const defaultValue = option.default === undefined ? '' : `（默认：${option.default}）`;
        const support = option.supported === false ? ' [当前 GUI 未映射，使用时会拒绝执行]' : '';
        lines.push(`  ${names}${value}  ${option.description || ''}${defaultValue}${support}`);
      }
    }
    if (spec.note) lines.push('', `说明：${spec.note}`);
    return lines.join('\n');
  }

  function optionCandidates(spec) {
    const values = [];
    for (const option of spec?.options || []) {
      values.push(`--${option.name}`);
      if (option.short) values.push(`-${option.short}`);
    }
    return values;
  }

  function unsupportedOptions(parsed, spec) {
    const unsupported = new Set((spec?.options || []).filter(option => option.supported === false).map(option => option.name));
    return Object.keys(parsed?.options || {}).filter(name => unsupported.has(name));
  }

  function helpTarget(command, tokens, registeredCommands) {
    const cmd = String(command || '').toLowerCase();
    const args = tokens || [];
    if (cmd === 'help') return args.join(' ');
    if (!(registeredCommands || []).includes(cmd)) return null;
    const marker = args.findIndex(value => ['help', '--help', '-h'].includes(String(value).toLowerCase()));
    if (marker < 0 || marker !== args.length - 1) return null;
    return [cmd, ...args.slice(0, marker)].join(' ');
  }

  function helpSpec(target, officialSpecs, guiSpecs) {
    const parts = String(target || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!parts.length) return null;
    const gui = guiSpecs?.[parts[0]] || null;
    if (gui?.overrideOfficialHelp) {
      if (parts.length > 1) return null;
      return { commandPath: parts[0], spec: gui };
    }
    const official = resolve(parts[0], parts.slice(1), officialSpecs || {}).spec;
    if (official && official.commandPath.split(' ').length === parts.length) {
      return { commandPath: official.commandPath, spec: official };
    }
    if (parts.length === 1 && gui) return { commandPath: parts[0], spec: gui };
    return null;
  }

  return { resolve, parse, formatHelp, optionCandidates, unsupportedOptions, helpTarget, helpSpec };
});
