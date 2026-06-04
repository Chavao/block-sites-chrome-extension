const storageKey = window.BLOCK_SITES_STORAGE_KEY || "blockedUrlPatterns";
const pauseKey = "blockSitesPausedUntil";

const statusIndicator = document.getElementById("status-indicator");
const pauseOptions = document.getElementById("pause-options");
const pauseActive = document.getElementById("pause-active");
const timeRemaining = document.getElementById("time-remaining");
const resumeBtn = document.getElementById("resume-btn");
const addMinuteBtn = document.getElementById("add-minute-btn");
const timeButtons = document.querySelectorAll(".time-buttons button");

let timerInterval = null;
let currentPausedUntil = 0;

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
  clearInterval(timerInterval);

  chrome.storage.sync.get([pauseKey], (result) => {
    const pausedUntil = result[pauseKey] || 0;
    const now = Date.now();
    currentPausedUntil = pausedUntil;

    if (pausedUntil > now) {
      pauseOptions.classList.add("hidden");
      pauseActive.classList.remove("hidden");
      statusIndicator.querySelector(".status-icon").classList.remove("active");
      statusIndicator.querySelector(".status-text").textContent = "Blocking Paused";

      timerInterval = setInterval(() => {
        const remaining = currentPausedUntil - Date.now();
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
  currentPausedUntil = 0;
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

function addMinuteToPause() {
  const now = Date.now();

  if (currentPausedUntil <= now) {
    showActiveState();
    return;
  }

  currentPausedUntil += 60 * 1000;
  timeRemaining.textContent = formatTimeRemaining(currentPausedUntil - now);
  chrome.storage.sync.set({ [pauseKey]: currentPausedUntil }, updatePauseStatus);
}

timeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const minutes = parseInt(btn.dataset.minutes, 10);
    pauseBlocking(minutes);
  });
});

resumeBtn.addEventListener("click", resumeBlocking);
addMinuteBtn.addEventListener("click", addMinuteToPause);

updatePauseStatus();
