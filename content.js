const storageKey = window.BLOCK_SITES_STORAGE_KEY || "blockedUrlPatterns";
const blockMessageKey = window.BLOCK_SITES_BLOCK_MESSAGE_KEY || "blockPageMessage";
const pauseKey = "blockSitesPausedUntil";
const defaultPatterns = window.BLOCK_SITES_DEFAULTS || [];
const defaultBlockMessage = window.BLOCK_SITES_DEFAULT_BLOCK_MESSAGE || "Go back to work!";
const maxTimerDelay = 2147483647;
const countdownWindowMs = 30 * 1000;
const extendPauseMs = 5 * 60 * 1000;
const fontBaseUrl = chrome.runtime.getURL("assets/fonts/");

let pauseTimer = null;
let isBlocked = false;
let extensionContextInvalidated = false;

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
  isBlocked = true;

  const safeMessage = escapeHtml(normalizeBlockMessage(message));
  const renderBlockPage = () => {
    const html = document.documentElement;
    if (!html) {
      setTimeout(renderBlockPage, 0);
      return;
    }

    clearPauseTimer();
    hideCountdown();
    window.stop();

    html.setAttribute("lang", "en");
    html.innerHTML = `
      <head>
        <title>Blocked</title>
        <style>
          @font-face {
            font-family: "Manrope";
            font-style: normal;
            font-weight: 400;
            font-display: swap;
            src: url("${fontBaseUrl}manrope-400.ttf") format("truetype");
          }

          @font-face {
            font-family: "Manrope";
            font-style: normal;
            font-weight: 700;
            font-display: swap;
            src: url("${fontBaseUrl}manrope-700.ttf") format("truetype");
          }

          body { font-family: "Manrope", Arial, sans-serif; font-style: normal; display: grid; place-items: center; min-height: 100vh; margin: 0; background: #111827; color: #fff; }
          h1 { font-family: "Manrope", Arial, sans-serif !important; font-size: 50px !important; font-style: normal !important; font-weight: 700 !important; letter-spacing: 0 !important; line-height: 1.08 !important; margin: 0; }
        </style>
      </head>
      <body>
        <h1>${safeMessage}</h1>
      </body>
    `;
  };

  renderBlockPage();
}

function clearPauseTimer() {
  if (pauseTimer) {
    clearTimeout(pauseTimer);
    pauseTimer = null;
  }
}

function hideCountdown() {
  window.BlockSitesCountdownOverlay?.hide();
}

function isExtensionContextInvalidatedError(error) {
  return error?.message?.includes("Extension context invalidated");
}

function markExtensionContextInvalidated() {
  extensionContextInvalidated = true;
  clearPauseTimer();
  hideCountdown();
}

function getStorageValues(keys) {
  return new Promise((resolve) => {
    if (extensionContextInvalidated) {
      resolve({ contextInvalidated: true, result: null });
      return;
    }

    try {
      chrome.storage.sync.get(keys, (result) => {
        const error = chrome.runtime.lastError;
        if (error) {
          if (isExtensionContextInvalidatedError(error)) {
            markExtensionContextInvalidated();
          }

          resolve({ contextInvalidated: extensionContextInvalidated, result: null });
          return;
        }

        resolve({ contextInvalidated: false, result });
      });
    } catch (error) {
      if (isExtensionContextInvalidatedError(error)) {
        markExtensionContextInvalidated();
      }

      resolve({ contextInvalidated: extensionContextInvalidated, result: null });
    }
  });
}

function getPausedUntil() {
  return new Promise((resolve) => {
    getStorageValues([pauseKey]).then(({ result }) => {
      if (!result) {
        resolve(0);
        return;
      }

      resolve(result[pauseKey] || 0);
    });
  });
}

function getBlockedPatterns() {
  return new Promise((resolve) => {
    getStorageValues([storageKey]).then(({ contextInvalidated, result }) => {
      if (!result) {
        resolve(contextInvalidated ? [] : defaultPatterns);
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
    getStorageValues([blockMessageKey]).then(({ result }) => {
      if (!result) {
        resolve(defaultBlockMessage);
        return;
      }

      resolve(normalizeBlockMessage(result[blockMessageKey]));
    });
  });
}

function setPausedUntil(pausedUntil) {
  return new Promise((resolve) => {
    if (extensionContextInvalidated) {
      resolve(false);
      return;
    }

    try {
      chrome.storage.sync.set({ [pauseKey]: pausedUntil }, () => {
        const error = chrome.runtime.lastError;
        if (error && isExtensionContextInvalidatedError(error)) {
          markExtensionContextInvalidated();
        }

        resolve(!error);
      });
    } catch (error) {
      if (isExtensionContextInvalidatedError(error)) {
        markExtensionContextInvalidated();
      }

      resolve(false);
    }
  });
}

function scheduleEvaluation(delay) {
  clearPauseTimer();
  pauseTimer = setTimeout(evaluateBlocking, Math.min(Math.max(0, delay), maxTimerDelay));
}

async function extendPause(pausedUntil) {
  const latestPausedUntil = await getPausedUntil();
  const basePausedUntil = Math.max(latestPausedUntil, pausedUntil);
  const nextPausedUntil = basePausedUntil + extendPauseMs;
  const didSave = await setPausedUntil(nextPausedUntil);

  if (didSave) {
    hideCountdown();
    scheduleEvaluation(nextPausedUntil - Date.now() - countdownWindowMs);
  }
}

function showCountdown(pausedUntil) {
  window.BlockSitesCountdownOverlay?.show(pausedUntil, () => {
    extendPause(pausedUntil);
  });

  scheduleEvaluation(pausedUntil - Date.now());
}

async function evaluateBlocking() {
  if (isBlocked || extensionContextInvalidated) {
    return;
  }

  const url = window.location.href;
  const patterns = await getBlockedPatterns();
  const shouldBlock = patterns.some((pattern) => matchesBlockedPattern(url, pattern));

  if (!shouldBlock) {
    clearPauseTimer();
    hideCountdown();
    return;
  }

  const pausedUntil = await getPausedUntil();
  const remainingPauseMs = pausedUntil - Date.now();

  if (remainingPauseMs > countdownWindowMs) {
    hideCountdown();
    scheduleEvaluation(remainingPauseMs - countdownWindowMs);
    return;
  }

  if (remainingPauseMs > 0) {
    showCountdown(pausedUntil);
    return;
  }

  clearPauseTimer();
  hideCountdown();
  const blockMessage = await getBlockMessage();
  blockPage(blockMessage);
}

function evaluateWhenVisible() {
  if (!document.hidden) {
    evaluateBlocking();
  }
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") {
    return;
  }

  if (changes[pauseKey] || changes[storageKey] || changes[blockMessageKey]) {
    evaluateBlocking();
  }
});

document.addEventListener("visibilitychange", evaluateWhenVisible);
window.addEventListener("focus", evaluateBlocking);
window.addEventListener("pageshow", evaluateBlocking);

evaluateBlocking();
