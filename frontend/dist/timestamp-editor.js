(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TimestampEditor = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function unixSecondsToLocalInput(seconds) {
    if (seconds === undefined || seconds === null || seconds === '') return '';
    const date = new Date(Number(seconds) * 1000);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  function localInputToUnixSeconds(value) {
    const text = String(value || '').trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(text);
    if (!match) return { error: '请输入完整的本地日期和时间' };
    const parts = match.slice(1).map(Number);
    const [year, month, day, hour, minute, second = 0] = parts;
    const date = new Date(year, month - 1, day, hour, minute, second, 0);
    if (
      Number.isNaN(date.getTime()) ||
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day ||
      date.getHours() !== hour ||
      date.getMinutes() !== minute ||
      date.getSeconds() !== second
    ) {
      return { error: '日期或时间无效' };
    }
    return { seconds: Math.floor(date.getTime() / 1000) };
  }

  return { unixSecondsToLocalInput, localInputToUnixSeconds };
});
