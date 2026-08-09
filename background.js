import { formatBadgeTime } from "./badge-counter.mjs";

const pauseKey = "blockSitesPausedUntil";
const badgeUpdateIntervalMs = 1000;
const badgeBackgroundColor = "#a9c4f5";

let badgeUpdateInterval = null;
let activePausedUntil = 0;

function stopBadgeCounter() {
  clearInterval(badgeUpdateInterval);
  badgeUpdateInterval = null;
  activePausedUntil = 0;
  chrome.action.setBadgeText({ text: "" });
}

function updateBadgeCounter(pausedUntil) {
  if (pausedUntil !== activePausedUntil) {
    return;
  }

  const remainingMs = pausedUntil - Date.now();
  if (remainingMs <= 0) {
    stopBadgeCounter();
    return;
  }

  chrome.action.setBadgeText({ text: formatBadgeTime(remainingMs) });
}

function startBadgeCounter(pausedUntil) {
  stopBadgeCounter();

  if (!Number.isFinite(pausedUntil) || pausedUntil <= Date.now()) {
    return;
  }

  activePausedUntil = pausedUntil;
  chrome.action.setBadgeBackgroundColor({ color: badgeBackgroundColor });
  updateBadgeCounter(pausedUntil);
  badgeUpdateInterval = setInterval(
    () => updateBadgeCounter(pausedUntil),
    badgeUpdateIntervalMs
  );
}

function restoreBadgeCounter() {
  chrome.storage.sync.get([pauseKey], (result) => {
    startBadgeCounter(result[pauseKey]);
  });
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync" && changes[pauseKey]) {
    startBadgeCounter(changes[pauseKey].newValue);
  }
});

chrome.runtime.onInstalled.addListener(restoreBadgeCounter);
chrome.runtime.onStartup.addListener(restoreBadgeCounter);

restoreBadgeCounter();
