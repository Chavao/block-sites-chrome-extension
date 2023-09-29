// https://developer.chrome.com/docs/extensions/mv3/options/

// Saves options to chrome.storage
const saveOptions = () => {
  const sites = document.getElementById('sites').value;

  chrome.storage.sync.set(
    { sites: sites },
    () => {
      // Update status to let user know options were saved.
      const status = document.getElementById('status');
      status.textContent = 'Options saved.';
      setTimeout(() => {
        status.textContent = '';
      }, 750);
    }
  );
};

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
const restoreOptions = () => {
  chrome.storage.sync.get(
    { sites: 'foo' },
    (items) => {
      document.getElementById('sites').value = items.sites;
    }
  );
};

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
