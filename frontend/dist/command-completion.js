(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CommandCompletion = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function tokenAt(value, cursor) {
    const before = value.slice(0, cursor);
    const start = Math.max(before.lastIndexOf(' '), before.lastIndexOf('\t')) + 1;
    let end = cursor;
    while (end < value.length && !/\s/.test(value[end])) end++;
    const words = value.slice(0, start).trim().split(/\s+/).filter(Boolean);
    return { start, end, prefix: value.slice(start, cursor), index: words.length, words };
  }

  function uniqueSorted(values) {
    return [...new Set((values || []).filter(Boolean).map(String))].sort((a, b) => a.localeCompare(b));
  }

  function getCompletions(value, cursor, schema, dynamicCandidates) {
    const token = tokenAt(value, cursor);
    const command = (token.words[0] || token.prefix || '').toLowerCase();
    let candidates = token.index === 0 ? schema.commands : (schema.arguments?.[command]?.[token.index - 1] || []);
    if (typeof candidates === 'function') candidates = candidates({ value, cursor, token, command });
    if (typeof dynamicCandidates === 'function') {
      candidates = [...(candidates || []), ...(dynamicCandidates({ value, cursor, token, command }) || [])];
    }
    const prefix = token.prefix.toLowerCase();
    return { token, candidates: uniqueSorted(candidates).filter(item => item.toLowerCase().startsWith(prefix)) };
  }

  function replaceToken(value, token, candidate) {
    const suffix = token.end === value.length ? ' ' : '';
    const next = value.slice(0, token.start) + candidate + suffix + value.slice(token.end);
    return { value: next, cursor: token.start + candidate.length + suffix.length };
  }

  function attach(input, options) {
    const state = { matches: [], index: -1, source: '', active: null };
    const render = options.render || function () {};
    const reset = () => { state.matches = []; state.index = -1; state.source = ''; state.active = null; render([]); };
    input.addEventListener('input', reset);
    input.addEventListener('blur', () => setTimeout(reset, 100));
    input.addEventListener('keydown', event => {
      if (event.key === 'Escape') { reset(); return; }
      if (event.key !== 'Tab') return;
      const cursor = input.selectionStart ?? input.value.length;
      const source = `${input.value}\u0000${cursor}`;
      let result;
      if (state.source === source && state.matches.length && state.active) {
        result = { token: state.active, candidates: state.matches };
      } else {
        result = getCompletions(input.value, cursor, options.schema, options.dynamicCandidates);
      }
      if (!result.candidates.length) { reset(); return; }
      event.preventDefault();
      if (state.source !== source) {
        state.matches = result.candidates;
        state.index = event.shiftKey ? state.matches.length - 1 : 0;
      } else {
        state.index = (state.index + (event.shiftKey ? -1 : 1) + state.matches.length) % state.matches.length;
      }
      const replacement = replaceToken(input.value, result.token, state.matches[state.index]);
      input.value = replacement.value;
      input.setSelectionRange(replacement.cursor, replacement.cursor);
      state.source = `${input.value}\u0000${replacement.cursor}`;
      state.active = { start: result.token.start, end: result.token.start + state.matches[state.index].length, prefix: '', index: result.token.index, words: result.token.words };
      render(state.matches, state.index);
    });
    return { reset };
  }

  return { tokenAt, getCompletions, replaceToken, attach };
});
