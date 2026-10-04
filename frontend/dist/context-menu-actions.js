(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ContextMenuActions = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function fileActions(isDirectory) {
    const actions = [{ action: 'rename', label: '重命名' }];
    if (!isDirectory) actions.push({ action: 'execute', label: '运行程序' });
    actions.push(
      { action: 'download', label: isDirectory ? '下载文件夹 (.tar.gz)' : '下载' },
      { action: 'upload', label: '上传到当前目录' },
      { separator: true },
      { action: 'delete', label: '删除', danger: true },
    );
    return actions;
  }

  function processActions() {
    return [
      { action: 'refresh', label: '刷新' },
      { separator: true },
      { action: 'kill', label: '终止', danger: true },
      { action: 'dump', label: '转储' },
      { action: 'migrate', label: '迁移' },
    ];
  }

  function sessionHostActions(isWindows) {
    const actions = [
      { action: 'interactive-shell', label: '交互式 Shell（shell -i）' },
      { action: 'spawn', label: '生成新会话' },
    ];
    if (isWindows) actions.push({ action: 'screenshot', label: '截取屏幕' });
    actions.push(
      { action: 'network', label: '网络信息' },
      { action: 'files', label: '文件浏览器' },
      { action: 'processes', label: '进程浏览器' },
    );
    if (isWindows) actions.push({ action: 'integrity', label: '检查完整性级别' });
    return actions;
  }

  function beaconHostActions(isWindows) {
    const actions = [
      { action: 'interactive-session', label: '转为实时会话' },
      { action: 'beacon-timing', label: '回连间隔 / 抖动' },
      { action: 'beacon-tasks', label: '查看任务' },
    ];
    if (isWindows) actions.push({ action: 'integrity', label: '检查完整性级别' });
    return actions;
  }

  return { fileActions, processActions, sessionHostActions, beaconHostActions };
});
