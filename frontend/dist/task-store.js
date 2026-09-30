(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TaskStore = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const terminalStatuses = new Set(['success', 'failed', 'cancelled']);

  function createTaskStore(options = {}) {
    const limit = Math.max(1, Number(options.limit) || 100);
    const now = typeof options.now === 'function' ? options.now : () => Date.now();
    const listeners = new Set();
    let sequence = 0;
    let tasks = [];

    function emit() {
      const snapshot = list();
      listeners.forEach(listener => listener(snapshot));
    }

    function create(input) {
      const timestamp = now();
      const task = {
        id: input.id || `local-${timestamp}-${++sequence}`,
        type: input.type || 'unknown',
        title: input.title || '未命名任务',
        target: input.target || '-',
        status: input.status || 'queued',
        startedAt: input.startedAt ?? timestamp,
        finishedAt: input.finishedAt ?? null,
        summary: input.summary || '',
        error: input.error || '',
        remoteTaskId: input.remoteTaskId || '',
        agentId: input.agentId || '',
        canCancel: Boolean(input.canCancel),
        canRetry: Boolean(input.canRetry),
        timeoutMs: Math.max(0, Number(input.timeoutMs) || 0),
        policy: input.policy || '',
      };
      if (terminalStatuses.has(task.status) && task.finishedAt == null) task.finishedAt = timestamp;
      tasks = [task, ...tasks].slice(0, limit);
      emit();
      return { ...task };
    }

    function update(id, changes) {
      const index = tasks.findIndex(task => task.id === id);
      if (index < 0) return null;
      if (terminalStatuses.has(tasks[index].status) && !changes.allowTerminalTransition) {
        return { ...tasks[index] };
      }
      const { allowTerminalTransition, ...safeChanges } = changes;
      const next = { ...tasks[index], ...safeChanges };
      if (terminalStatuses.has(next.status) && next.finishedAt == null) next.finishedAt = now();
      tasks = tasks.map((task, taskIndex) => taskIndex === index ? next : task);
      emit();
      return { ...next };
    }

    function get(id) {
      const task = tasks.find(item => item.id === id);
      return task ? { ...task } : null;
    }

    function list(filter = 'all') {
      const selected = filter === 'active'
        ? tasks.filter(task => !terminalStatuses.has(task.status))
        : filter === 'completed'
          ? tasks.filter(task => task.status === 'success')
          : filter === 'failed'
            ? tasks.filter(task => task.status === 'failed' || task.status === 'cancelled')
            : tasks;
      return selected.map(task => ({ ...task }));
    }

    function clearCompleted() {
      const before = tasks.length;
      tasks = tasks.filter(task => !terminalStatuses.has(task.status));
      if (tasks.length !== before) emit();
      return before - tasks.length;
    }

    function subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }

    return { create, update, get, list, clearCompleted, subscribe };
  }

  function durationMs(task, currentTime = Date.now()) {
    if (task?.startedAt == null) return 0;
    return Math.max(0, (task.finishedAt || currentTime) - task.startedAt);
  }

  return { createTaskStore, durationMs, terminalStatuses };
});
