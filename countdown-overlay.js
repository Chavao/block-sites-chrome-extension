(() => {
  const overlayId = "block-sites-countdown-overlay";
  const styleId = "block-sites-countdown-style";
  const apiName = "BlockSitesCountdownOverlay";

  let countdownInterval = null;
  let extendHandler = null;

  function ensureStyles() {
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
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
        font-family: Arial, sans-serif;
        line-height: 1.4;
      }

      #${overlayId} .block-sites-countdown-title {
        margin: 0 0 6px;
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

      #${overlayId} button {
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

      #${overlayId} button:hover {
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
    getOverlay()?.remove();
  }

  function renderSeconds(pausedUntil) {
    const secondsNode = getOverlay()?.querySelector(".block-sites-countdown-seconds");
    if (!secondsNode) {
      return;
    }

    const seconds = Math.max(0, Math.ceil((pausedUntil - Date.now()) / 1000));
    secondsNode.textContent = String(seconds);
  }

  function createOverlay(onExtend) {
    ensureStyles();

    const overlay = document.createElement("section");
    overlay.id = overlayId;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-live", "polite");
    overlay.innerHTML = `
      <p class="block-sites-countdown-title">Blocking resumes soon</p>
      <p class="block-sites-countdown-copy">
        This page will lock in <span class="block-sites-countdown-seconds">30</span> seconds.
      </p>
      <button type="button">Add 5 minutes</button>
    `;

    overlay.querySelector("button").addEventListener("click", () => {
      onExtend();
    });

    (document.body || document.documentElement).appendChild(overlay);
  }

  window[apiName] = {
    hide: removeOverlay,
    show(pausedUntil, onExtend) {
      extendHandler = onExtend;

      if (!getOverlay()) {
        createOverlay(() => extendHandler?.());
      }

      renderSeconds(pausedUntil);
      clearInterval(countdownInterval);
      countdownInterval = setInterval(() => renderSeconds(pausedUntil), 1000);
    }
  };
})();
