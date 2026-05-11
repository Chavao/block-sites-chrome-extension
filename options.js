const storageKey = window.BLOCK_SITES_STORAGE_KEY || "blockedUrlPatterns";
const blockMessageKey = window.BLOCK_SITES_BLOCK_MESSAGE_KEY || "blockPageMessage";
const defaultPatterns = window.BLOCK_SITES_DEFAULTS || [];
const defaultBlockMessage = window.BLOCK_SITES_DEFAULT_BLOCK_MESSAGE || "Go back to work!";

const patternsField = document.getElementById("patterns");
const blockMessageField = document.getElementById("block-message");
const saveButton = document.getElementById("save");
const exportButton = document.getElementById("export");
const importButton = document.getElementById("import");
const importFileInput = document.getElementById("import-file");
const statusNode = document.getElementById("status");

function setStatus(message, isError = false) {
  statusNode.textContent = message;
  statusNode.classList.toggle("error", isError);
}

function parsePatterns(rawValue) {
  return rawValue
    .split("\n")
    .map((pattern) => pattern.trim())
    .filter(Boolean);
}

function isValidPattern(pattern) {
  if (!pattern.includes("://")) {
    return false;
  }

  try {
    new URL(pattern.replaceAll("*", "x"));
    return true;
  } catch (_error) {
    return false;
  }
}

function renderPatterns(patterns) {
  patternsField.value = patterns.join("\n");
}

function renderBlockMessage(message) {
  blockMessageField.value = message;
}

function normalizeBlockMessage(value) {
  if (typeof value !== "string") {
    return defaultBlockMessage;
  }

  const trimmedValue = value.trim();
  return trimmedValue || defaultBlockMessage;
}

function validatePatterns(patterns) {
  const invalidPattern = patterns.find((pattern) => !isValidPattern(pattern));
  if (invalidPattern) {
    setStatus(`Invalid pattern: ${invalidPattern}`, true);
    return false;
  }

  return true;
}

function validateBlockMessage(message) {
  if (typeof message !== "string") {
    setStatus("Invalid message.", true);
    return false;
  }

  const trimmedMessage = message.trim();
  if (!trimmedMessage) {
    setStatus("Message cannot be empty.", true);
    return false;
  }

  if (trimmedMessage.length > 120) {
    setStatus("Message must be at most 120 characters.", true);
    return false;
  }

  return true;
}

function saveSettings(patterns, blockMessage, successMessage) {
  if (!validatePatterns(patterns)) {
    return;
  }

  if (!validateBlockMessage(blockMessage)) {
    return;
  }

  chrome.storage.sync.set({ [storageKey]: patterns, [blockMessageKey]: blockMessage.trim() }, () => {
    if (chrome.runtime.lastError) {
      setStatus("Failed to save settings.", true);
      return;
    }

    setStatus(successMessage);
  });
}

function savePatterns() {
  const patterns = parsePatterns(patternsField.value);
  const blockMessage = normalizeBlockMessage(blockMessageField.value);
  saveSettings(patterns, blockMessage, "Settings saved.");
}

function exportBackup() {
  const patterns = parsePatterns(patternsField.value);
  if (!validatePatterns(patterns)) {
    return;
  }

  const blockMessage = normalizeBlockMessage(blockMessageField.value);
  if (!validateBlockMessage(blockMessage)) {
    return;
  }

  const backupJson = JSON.stringify({ [storageKey]: patterns, [blockMessageKey]: blockMessage }, null, 2);
  const blob = new Blob([backupJson], { type: "application/json" });
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = "block-sites-backup.json";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(downloadUrl);
  setStatus("Backup exported.");
}

function loadPatternsFromBackup(payload) {
  if (Array.isArray(payload)) {
    return {
      patterns: payload,
      blockMessage: defaultBlockMessage
    };
  }

  if (payload && typeof payload === "object" && Array.isArray(payload[storageKey])) {
    return {
      patterns: payload[storageKey],
      blockMessage: normalizeBlockMessage(payload[blockMessageKey])
    };
  }

  return null;
}

function importBackup() {
  importFileInput.click();
}

function handleImportFile(event) {
  const [file] = event.target.files || [];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || ""));
      const importedPatterns = loadPatternsFromBackup(parsed);

      if (!importedPatterns) {
        setStatus("Invalid backup format.", true);
        return;
      }

      const normalizedPatterns = importedPatterns.patterns
        .map((pattern) => String(pattern).trim())
        .filter(Boolean);
      const normalizedBlockMessage = normalizeBlockMessage(importedPatterns.blockMessage);

      if (!validatePatterns(normalizedPatterns)) {
        return;
      }

      if (!validateBlockMessage(normalizedBlockMessage)) {
        return;
      }

      renderPatterns(normalizedPatterns);
      renderBlockMessage(normalizedBlockMessage);
      saveSettings(normalizedPatterns, normalizedBlockMessage, "Backup imported and saved.");
    } catch (_error) {
      setStatus("Failed to parse backup JSON.", true);
    } finally {
      importFileInput.value = "";
    }
  };

  reader.onerror = () => {
    setStatus("Failed to read backup file.", true);
    importFileInput.value = "";
  };

  reader.readAsText(file);
}

function initialize() {
  chrome.storage.sync.get([storageKey, blockMessageKey], (result) => {
    if (chrome.runtime.lastError) {
      renderPatterns(defaultPatterns);
      renderBlockMessage(defaultBlockMessage);
      setStatus("Loaded defaults (storage unavailable).", true);
      return;
    }

    const storedPatterns = result[storageKey];
    const nextPatterns = Array.isArray(storedPatterns) ? storedPatterns : defaultPatterns;
    const nextBlockMessage = normalizeBlockMessage(result[blockMessageKey]);

    renderPatterns(nextPatterns);
    renderBlockMessage(nextBlockMessage);

    if (!Array.isArray(storedPatterns) || result[blockMessageKey] !== nextBlockMessage) {
      chrome.storage.sync.set({
        [storageKey]: nextPatterns,
        [blockMessageKey]: nextBlockMessage
      });
    }
  });
}

saveButton.addEventListener("click", savePatterns);
exportButton.addEventListener("click", exportBackup);
importButton.addEventListener("click", importBackup);
importFileInput.addEventListener("change", handleImportFile);
document.addEventListener("DOMContentLoaded", initialize);
