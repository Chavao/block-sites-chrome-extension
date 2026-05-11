const storageKey = window.BLOCK_SITES_STORAGE_KEY || "blockedUrlPatterns";
const blockMessageKey = window.BLOCK_SITES_BLOCK_MESSAGE_KEY || "blockPageMessage";
const pauseKey = "blockSitesPausedUntil";
const defaultPatterns = window.BLOCK_SITES_DEFAULTS || [];
const defaultBlockMessage = window.BLOCK_SITES_DEFAULT_BLOCK_MESSAGE || "Go back to work!";

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

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeBlockMessage(value) {
  if (typeof value !== "string") {
    return defaultBlockMessage;
  }

  const trimmedValue = value.trim();
  return trimmedValue || defaultBlockMessage;
}

function blockPage(message) {
  window.stop();
  const html = document.documentElement;
  if (!html) {
    return;
  }

  const safeMessage = escapeHtml(normalizeBlockMessage(message));

  html.innerHTML = `
    <head>
      <title>Blocked</title>
      <style>
        body { font-family: Arial, sans-serif; display: grid; place-items: center; min-height: 100vh; margin: 0; background: #111827; color: #f9fafb; }
        h1 { font-size: 2rem; margin: 0; }
      </style>
    </head>
    <body>
      <h1>${safeMessage}</h1>
    </body>
  `;
}

function getPausedUntil() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([pauseKey], (result) => {
      if (chrome.runtime.lastError) {
        resolve(0);
        return;
      }

      resolve(result[pauseKey] || 0);
    });
  });
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

function getBlockMessage() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([blockMessageKey], (result) => {
      if (chrome.runtime.lastError) {
        resolve(defaultBlockMessage);
        return;
      }

      resolve(normalizeBlockMessage(result[blockMessageKey]));
    });
  });
}

(async () => {
  const url = window.location.href;
  const pausedUntil = await getPausedUntil();

  if (pausedUntil > Date.now()) {
    return;
  }

  const patterns = await getBlockedPatterns();
  const shouldBlock = patterns.some((pattern) => matchesBlockedPattern(url, pattern));

  if (shouldBlock) {
    const blockMessage = await getBlockMessage();
    blockPage(blockMessage);
  }
})();
