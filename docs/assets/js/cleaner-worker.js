let cleanText;
let isNoiseLine;
self.addEventListener('message', async ({ data }) => {
  if (data.type === 'load') {
    try {
      const ruleCount = await loadContentScript(data.url);
      self.postMessage({ type: 'ready', ruleCount });
    } catch (error) {
      self.postMessage({ type: 'error', message: error.message });
    }
    return;
  }
  if (data.type === 'clean') {
    self.postMessage({ type: 'result', id: data.id, ...analyse(data.text) });
  }
});
async function loadContentScript(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const source = await response.text();
  const blobUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  try {
    importScripts(blobUrl);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
  cleanText = self.cleanExtractedPostContent;
  isNoiseLine = self.isLikelyThreadsFallbackDescription;
  if (typeof cleanText !== 'function' || typeof isNoiseLine !== 'function') {
    throw new Error('content.js 裡找不到 cleanExtractedPostContent 或 isLikelyThreadsFallbackDescription');
  }
  return traceRegexTests(() => isNoiseLine('\u0000')).tests.length;
}
function traceRegexTests(run) {
  const nativeTest = RegExp.prototype.test;
  const tests = [];
  RegExp.prototype.test = function (input) {
    const matched = nativeTest.call(this, input);
    tests.push({ pattern: String(this), matched });
    return matched;
  };
  try {
    return { value: run(), tests };
  } finally {
    RegExp.prototype.test = nativeTest;
  }
}
function analyse(text) {
  const output = cleanText(text);
  const normalize = (line) => line.replace(/\s+/g, ' ').trim();
  const survivors = output.split('\n').map(normalize).filter(Boolean);
  let next = 0;
  const lines = text.split('\n').map((raw) => {
    const line = normalize(raw);
    if (!line) return { state: 'blank', text: raw };
    const survivor = survivors[next];
    if (survivor !== undefined) {
      if (line === survivor) {
        next += 1;
        return { state: 'kept', text: raw };
      }
      const headTrimmed = next === 0 && line.endsWith(survivor);
      const tailTrimmed = next === survivors.length - 1 && line.startsWith(survivor);
      if (headTrimmed || tailTrimmed) {
        next += 1;
        return { state: 'trimmed', text: raw };
      }
    }
    const trace = traceRegexTests(() => isNoiseLine(line));
    const hit = trace.value ? trace.tests.find((test) => test.matched) : undefined;
    return {
      state: 'removed',
      text: raw,
      reason: hit ? { kind: 'rule', pattern: hit.pattern } : { kind: 'pipeline' }
    };
  });
  return { output, lines };
}