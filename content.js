const storageKey = window.BLOCK_SITES_STORAGE_KEY || "blockedUrlPatterns";
const defaultPatterns = window.BLOCK_SITES_DEFAULTS || [];

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wildcardToRegExp(pattern) {
  const escaped = escapeRegExp(pattern).replace(/\\\*/g, ".*");
  return new RegExp(`^${escaped}$`, "i");
}

function matchesBlockedPattern(url, pattern) {
  try {
    return wildcardToRegExp(pattern).test(url);
  } catch (_error) {
    return false;
  }
}

function blockPage() {
  window.stop();
  const html = document.documentElement;
  if (!html) {
    return;
  }

  html.innerHTML = `
    <head>
      <title>Blocked</title>
      <style>
        body { font-family: Arial, sans-serif; display: grid; place-items: center; min-height: 100vh; margin: 0; background: #111827; color: #f9fafb; }
        h1 { font-size: 2rem; margin: 0; }
      </style>
    </head>
    <body>
      <h1>Go back to work!</h1>
    </body>
  `;
}

function getBlockedPatterns() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([storageKey], (result) => {
      if (chrome.runtime.lastError) {
        resolve(defaultPatterns);
        return;
      }

      const value = result[storageKey];
      if (Array.isArray(value)) {
        resolve(value);
        return;
      }

      resolve(defaultPatterns);
    });
  });
}

(async () => {
  const url = window.location.href;
  const patterns = await getBlockedPatterns();
  const shouldBlock = patterns.some((pattern) => matchesBlockedPattern(url, pattern));

  if (shouldBlock) {
    blockPage();
  }
})();
