const storageKey = window.BLOCK_SITES_STORAGE_KEY || "blockedUrlPatterns";
const defaultPatterns = window.BLOCK_SITES_DEFAULTS || [];

const patternsField = document.getElementById("patterns");
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

function validatePatterns(patterns) {
  const invalidPattern = patterns.find((pattern) => !isValidPattern(pattern));
  if (invalidPattern) {
    setStatus(`Invalid pattern: ${invalidPattern}`, true);
    return false;
  }

  return true;
}

function savePatternList(patterns, successMessage) {
  if (!validatePatterns(patterns)) {
    return;
  }

  chrome.storage.sync.set({ [storageKey]: patterns }, () => {
    if (chrome.runtime.lastError) {
      setStatus("Failed to save settings.", true);
      return;
    }

    setStatus(successMessage);
  });
}

function savePatterns() {
  const patterns = parsePatterns(patternsField.value);
  savePatternList(patterns, "Settings saved.");
}

function exportBackup() {
  const patterns = parsePatterns(patternsField.value);
  if (!validatePatterns(patterns)) {
    return;
  }

  const backupJson = JSON.stringify({ [storageKey]: patterns }, null, 2);
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
    return payload;
  }

  if (payload && typeof payload === "object" && Array.isArray(payload[storageKey])) {
    return payload[storageKey];
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

      const normalizedPatterns = importedPatterns
        .map((pattern) => String(pattern).trim())
        .filter(Boolean);

      if (!validatePatterns(normalizedPatterns)) {
        return;
      }

      renderPatterns(normalizedPatterns);
      savePatternList(normalizedPatterns, "Backup imported and saved.");
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
  chrome.storage.sync.get([storageKey], (result) => {
    if (chrome.runtime.lastError) {
      renderPatterns(defaultPatterns);
      setStatus("Loaded defaults (storage unavailable).", true);
      return;
    }

    const storedPatterns = result[storageKey];
    if (Array.isArray(storedPatterns)) {
      renderPatterns(storedPatterns);
      return;
    }

    renderPatterns(defaultPatterns);
    chrome.storage.sync.set({ [storageKey]: defaultPatterns });
  });
}

saveButton.addEventListener("click", savePatterns);
exportButton.addEventListener("click", exportBackup);
importButton.addEventListener("click", importBackup);
importFileInput.addEventListener("change", handleImportFile);
document.addEventListener("DOMContentLoaded", initialize);
