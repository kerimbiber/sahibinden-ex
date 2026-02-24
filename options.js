// options.js - Settings page logic

document.addEventListener('DOMContentLoaded', () => {
  // Load saved settings
  chrome.storage.local.get(['apiProvider', 'apiKey', 'settings'], (result) => {
    if (result.apiProvider) {
      document.getElementById('apiProvider').value = result.apiProvider;
    }
    if (result.apiKey) {
      document.getElementById('apiKey').value = result.apiKey;
    }
    if (result.settings?.autoAnalyze) {
      document.getElementById('autoAnalyze').checked = result.settings.autoAnalyze;
    }
  });

  // Save button
  document.getElementById('saveBtn').addEventListener('click', async () => {
    const apiProvider = document.getElementById('apiProvider').value;
    const apiKey = document.getElementById('apiKey').value;
    const autoAnalyze = document.getElementById('autoAnalyze').checked;

    // Basic validation
    if (!apiKey || apiKey.trim() === '') {
      showStatus('Lütfen bir API key girin!', 'error');
      return;
    }

    // Save to storage
    chrome.storage.local.set({
      apiProvider: apiProvider,
      apiKey: apiKey,
      settings: {
        autoAnalyze: autoAnalyze,
        showNotifications: true
      }
    }, () => {
      showStatus('Ayarlar kaydedildi! ✓', 'success');
    });
  });

  function showStatus(message, type) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = 'status ' + type;
    
    setTimeout(() => {
      statusEl.className = 'status';
    }, 3000);
  }
});
