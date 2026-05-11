const storageKey = window.BLOCK_SITES_STORAGE_KEY || "blockedUrlPatterns";
const pauseKey = "blockSitesPausedUntil";

const statusIndicator = document.getElementById("status-indicator");
const pauseOptions = document.getElementById("pause-options");
const pauseActive = document.getElementById("pause-active");
const timeRemaining = document.getElementById("time-remaining");
const resumeBtn = document.getElementById("resume-btn");
const timeButtons = document.querySelectorAll(".time-buttons button");

let timerInterval = null;

function refreshActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTabId = tabs[0]?.id;
    if (typeof activeTabId === "number") {
      chrome.tabs.reload(activeTabId);
    }
  });
}

function formatTimeRemaining(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function updatePauseStatus() {
  chrome.storage.sync.get([pauseKey], (result) => {
    const pausedUntil = result[pauseKey] || 0;
    const now = Date.now();

    if (pausedUntil > now) {
      pauseOptions.classList.add("hidden");
      pauseActive.classList.remove("hidden");
      statusIndicator.querySelector(".status-icon").classList.remove("active");
      statusIndicator.querySelector(".status-text").textContent = "Blocking Paused";

      timerInterval = setInterval(() => {
        const remaining = pausedUntil - Date.now();
        if (remaining <= 0) {
          clearInterval(timerInterval);
          showActiveState();
        } else {
          timeRemaining.textContent = formatTimeRemaining(remaining);
        }
      }, 1000);

      timeRemaining.textContent = formatTimeRemaining(pausedUntil - now);
    } else {
      showActiveState();
    }
  });
}

function showActiveState(onComplete) {
  clearInterval(timerInterval);
  chrome.storage.sync.remove(pauseKey, () => {
    pauseOptions.classList.remove("hidden");
    pauseActive.classList.add("hidden");
    statusIndicator.querySelector(".status-icon").classList.add("active");
    statusIndicator.querySelector(".status-text").textContent = "Blocking Active";
    onComplete?.();
  });
}

function pauseBlocking(minutes) {
  const pausedUntil = Date.now() + minutes * 60 * 1000;
  chrome.storage.sync.set({ [pauseKey]: pausedUntil }, () => {
    updatePauseStatus();
    refreshActiveTab();
  });
}

function resumeBlocking() {
  clearInterval(timerInterval);
  showActiveState(refreshActiveTab);
}

timeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const minutes = parseInt(btn.dataset.minutes, 10);
    pauseBlocking(minutes);
  });
});

resumeBtn.addEventListener("click", resumeBlocking);

updatePauseStatus();
