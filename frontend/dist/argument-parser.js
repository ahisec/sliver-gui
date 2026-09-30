(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ArgumentParser = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function parseArguments(value) {
    const text = String(value || '');
    const args = [];
    let current = '';
    let quote = null;
    let tokenStarted = false;

    for (let index = 0; index < text.length; index++) {
      const char = text[index];
      if (quote) {
        if (char === quote) {
          quote = null;
          tokenStarted = true;
        } else if (char === '\\' && (text[index + 1] === quote || text[index + 1] === '\\')) {
          current += text[++index];
          tokenStarted = true;
        } else {
          current += char;
          tokenStarted = true;
        }
        continue;
      }
      if (char === '"' || char === "'") {
        quote = char;
        tokenStarted = true;
      } else if (/\s/.test(char)) {
        if (tokenStarted) {
          args.push(current);
          current = '';
          tokenStarted = false;
        }
      } else if (char === '\\' && index + 1 < text.length && (/\s/.test(text[index + 1]) || text[index + 1] === '"' || text[index + 1] === "'" || text[index + 1] === '\\')) {
        current += text[++index];
        tokenStarted = true;
      } else {
        current += char;
        tokenStarted = true;
      }
    }
    if (quote) return { args: [], error: '参数中存在未闭合的引号' };
    if (tokenStarted) args.push(current);
    return { args, error: '' };
  }

  return { parseArguments };
});
