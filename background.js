// background.js - AI Emlak Asistanı Service Worker

console.log('AI Property Helper: Background script loaded');

// Extension yüklendiğinde
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
  
  // Varsayılan ayarları kaydet
  if (details.reason === 'install') {
    chrome.storage.local.set({
      apiProvider: 'deepseek',
      apiKey: '',
      settings: {
        autoAnalyze: false,
        showNotifications: true
      }
    });
  }
});

// Extension ikonuna tıklandığında
chrome.action.onClicked.addListener((tab) => {
  console.log('Icon clicked on tab:', tab.url);
});

// Mesaj dinleyicileri
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message.type);

  if (message.type === 'PROPERTY_DATA') {
    // İlandan veri geldi
    console.log('Property data received:', message.data);
    
    // Storage'a kaydet (popup'ta kullanmak için)
    chrome.storage.local.set({ currentProperty: message.data });
    
    sendResponse({ success: true });
  }

  if (message.type === 'ANALYZE_REQUEST') {
    // AI analizi isteği
    analyzeWithAI(message.data).then(result => {
      sendResponse(result);
    });
    return true; // Async response
  }

  return true;
});

// AI Analizi fonksiyonu
async function analyzeWithAI(data) {
  const { apiKey, apiProvider } = await chrome.storage.local.get(['apiKey', 'apiProvider']);
  
  if (!apiKey) {
    return { error: 'API Key not configured' };
  }

  // Prompt oluştur
  const prompt = `Aşağıdaki emlak ilanını analiz et ve Türkçe olarak kısa bir yorum yap:

İlan: ${data.title}
Fiyat: ${data.price}
Konum: ${data.location}

Değerlendir: Bu fiyat uygun mu?`;

  let apiUrl = 'https://api.openai.com/v1/chat/completions';
  let model = 'gpt-4o-mini';

  // DeepSeek
  if (apiProvider === 'deepseek' || !apiProvider) {
    apiUrl = 'https://api.deepseek.com/v1/chat/completions';
    model = 'deepseek-chat';
  }
  
  // API çağrısı
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500
      })
    });

    const result = await response.json();
    return { success: true, analysis: result.choices[0].message.content };
  } catch (error) {
    return { error: error.message };
  }
}

// Context menu oluştur
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'analyzeProperty',
    title: 'AI ile Analiz Et',
    contexts: ['page']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'analyzeProperty') {
    chrome.tabs.sendMessage(tab.id, { type: 'ANALYZE_CLICKED' });
  }
});

console.log('AI Property Helper: Background script ready');
