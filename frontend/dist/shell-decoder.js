(function (root) {
  function base64Bytes(value) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  function createShellOutputDecoder(isWindows) {
    if (!isWindows) {
      const decoder = new TextDecoder('utf-8');
      return {
        decode(value, stream) { return decoder.decode(base64Bytes(value), { stream: stream !== false }); },
        flush() { return decoder.decode(); },
      };
    }

    let decoder = null;
    let pending = [];
    const utf8State = bytes => {
      for (let index = 0; index < bytes.length;) {
        const first = bytes[index];
        if (first < 0x80) { index += 1; continue; }
        let size = 0;
        if (first >= 0xc2 && first <= 0xdf) size = 2;
        else if (first >= 0xe0 && first <= 0xef) size = 3;
        else if (first >= 0xf0 && first <= 0xf4) size = 4;
        else return 'invalid';
        if (index + size > bytes.length) return 'incomplete';
        for (let offset = 1; offset < size; offset += 1) {
          if ((bytes[index + offset] & 0xc0) !== 0x80) return 'invalid';
        }
        if (size === 3 && first === 0xe0 && bytes[index + 1] < 0xa0) return 'invalid';
        if (size === 3 && first === 0xed && bytes[index + 1] >= 0xa0) return 'invalid';
        if (size === 4 && first === 0xf0 && bytes[index + 1] < 0x90) return 'invalid';
        if (size === 4 && first === 0xf4 && bytes[index + 1] >= 0x90) return 'invalid';
        index += size;
      }
      return 'valid';
    };

    return {
      decode(value, stream) {
        const incoming = base64Bytes(value);
        if (decoder) return decoder.decode(incoming, { stream: stream !== false });
        pending.push(...incoming);
        let asciiEnd = 0;
        while (asciiEnd < pending.length && pending[asciiEnd] < 0x80) asciiEnd += 1;
        const ascii = String.fromCharCode(...pending.splice(0, asciiEnd));
        if (!pending.length) return ascii;
        const state = utf8State(pending);
        if (state === 'incomplete' && stream !== false) return ascii;
        decoder = new TextDecoder(state === 'valid' ? 'utf-8' : 'gb18030');
        const buffered = Uint8Array.from(pending);
        pending = [];
        return ascii + decoder.decode(buffered, { stream: stream !== false });
      },
      flush() {
        if (!decoder && pending.length) {
          const state = utf8State(pending);
          decoder = new TextDecoder(state === 'valid' ? 'utf-8' : 'gb18030');
          const buffered = Uint8Array.from(pending);
          pending = [];
          return decoder.decode(buffered);
        }
        return decoder ? decoder.decode() : '';
      },
    };
  }

  root.createShellOutputDecoder = createShellOutputDecoder;
  if (typeof module !== 'undefined') module.exports = { base64Bytes, createShellOutputDecoder };
})(typeof window !== 'undefined' ? window : globalThis);
