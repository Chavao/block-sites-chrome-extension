(() => {
  const overlayId = "block-sites-countdown-overlay";
  const styleId = "block-sites-countdown-style";
  const apiName = "BlockSitesCountdownOverlay";
  const fontBaseUrl = chrome.runtime.getURL("assets/fonts/");

  let countdownInterval = null;
  let extendHandler = null;
  let dismissHandler = null;

  function ensureStyles() {
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
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

      #${overlayId} {
        position: fixed;
        right: 20px;
        bottom: 20px;
        z-index: 2147483647;
        width: min(320px, calc(100vw - 40px));
        padding: 18px;
        border: 1px solid rgba(248, 250, 252, 0.18);
        border-radius: 8px;
        background: #111827;
        box-shadow: 0 20px 45px rgba(15, 23, 42, 0.35);
        color: #f9fafb;
        font-family: "Manrope", Arial, sans-serif;
        font-style: normal;
        line-height: 1.4;
      }

      #${overlayId} .block-sites-countdown-title {
        margin: 0 0 6px;
        padding-right: 28px;
        font-size: 15px;
        font-weight: 700;
      }

      #${overlayId} .block-sites-countdown-copy {
        margin: 0 0 14px;
        color: #d1d5db;
        font-size: 13px;
      }

      #${overlayId} .block-sites-countdown-seconds {
        color: #fbbf24;
        font-size: 24px;
        font-weight: 700;
      }

      #${overlayId} .block-sites-countdown-close {
        position: absolute;
        top: 10px;
        right: 10px;
        width: 28px;
        height: 28px;
        padding: 0;
        border: 0;
        background: transparent;
        color: #d1d5db;
        cursor: pointer;
        font-size: 20px;
        line-height: 1;
      }

      #${overlayId} .block-sites-countdown-close:hover {
        color: #fff;
      }

      #${overlayId} .block-sites-countdown-close[hidden] {
        display: none;
      }

      #${overlayId} .block-sites-countdown-extend {
        width: 100%;
        min-height: 42px;
        border: 0;
        border-radius: 6px;
        background: #2563eb;
        color: #fff;
        cursor: pointer;
        font-size: 14px;
        font-weight: 700;
      }

      #${overlayId} .block-sites-countdown-extend:hover {
        background: #1d4ed8;
      }
    `;

    (document.head || document.documentElement).appendChild(style);
  }

  function getOverlay() {
    return document.getElementById(overlayId);
  }

  function removeOverlay() {
    clearInterval(countdownInterval);
    countdownInterval = null;
    extendHandler = null;
    dismissHandler = null;
    getOverlay()?.remove();
  }

  function formatTimeRemaining(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function renderCountdown(pausedUntil) {
    const overlay = getOverlay();
    if (!overlay) {
      return;
    }

    const totalSeconds = Math.max(0, Math.ceil((pausedUntil - Date.now()) / 1000));
    overlay.querySelector(".block-sites-countdown-seconds").textContent =
      formatTimeRemaining(totalSeconds);
    overlay.querySelector(".block-sites-countdown-close").hidden = totalSeconds <= 30;
  }

  function createOverlay(onExtend, onDismiss) {
    ensureStyles();

    const overlay = document.createElement("section");
    overlay.id = overlayId;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-live", "polite");
    overlay.innerHTML = `
      <button class="block-sites-countdown-close" type="button" aria-label="Close countdown">&times;</button>
      <p class="block-sites-countdown-title">Blocking resumes soon</p>
      <p class="block-sites-countdown-copy">
        This page will lock in <span class="block-sites-countdown-seconds">00:30</span>.
      </p>
      <button class="block-sites-countdown-extend" type="button">Add 5 minutes</button>
    `;

    overlay.querySelector(".block-sites-countdown-extend").addEventListener("click", () => {
      onExtend();
    });
    overlay.querySelector(".block-sites-countdown-close").addEventListener("click", () => {
      onDismiss();
    });

    (document.body || document.documentElement).appendChild(overlay);
  }

  window[apiName] = {
    hide: removeOverlay,
    show(pausedUntil, onExtend, onDismiss) {
      extendHandler = onExtend;
      dismissHandler = onDismiss;

      if (!getOverlay()) {
        createOverlay(
          () => extendHandler?.(),
          () => dismissHandler?.()
        );
      }

      renderCountdown(pausedUntil);
      clearInterval(countdownInterval);
      countdownInterval = setInterval(() => renderCountdown(pausedUntil), 1000);
    }
  };
})();
