// popup.js - AI Araba Asistanı Mantığı

let currentPropertyData = null;

const propertyInfoEl = document.getElementById('propertyInfo');
const analyzeBtn = document.getElementById('analyzeBtn');
const loadingEl = document.getElementById('loading');
const resultEl = document.getElementById('result');
const resultTextEl = document.getElementById('resultText');

async function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['apiKey', 'apiProvider'], (result) => {
      resolve(result.apiKey || '');
    });
  });
}

async function getApiProvider() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['apiProvider'], (result) => {
      resolve(result.apiProvider || 'deepseek');
    });
  });
}

async function getCurrentTabData() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id, { type: 'GET_DATA' }, (response) => {
      resolve(response || { error: 'Veri bulunamadı' });
    });
  });
}

function updatePropertyUI(data) {
  if (data.error) {
    propertyInfoEl.innerHTML = `
      <div class="no-data">
        <div class="no-data-icon">⚠️</div>
        <p>${data.error}</p>
      </div>
    `;
    analyzeBtn.disabled = true;
    return;
  }

  currentPropertyData = data;

  let html = `<h3>🚗 Araç Bilgileri</h3>`;
  
  const fields = [
    { key: 'price', label: 'Fiyat', icon: '💰' },
    { key: 'brand', label: 'Marka', icon: '🏷️' },
    { key: 'series', label: 'Seri', icon: '🏷️' },
    { key: 'model', label: 'Model', icon: '🏷️' },
    { key: 'year', label: 'Yıl', icon: '📅' },
    { key: 'kilometer', label: 'KM', icon: '🛣️' },
    { key: 'fuel_type', label: 'Yakıt', icon: '⛽' },
    { key: 'gear_type', label: 'Vites', icon: '⚙️' },
    { key: 'body_type', label: 'Kasa', icon: '🚗' },
    { key: 'color', label: 'Renk', icon: '🎨' },
    { key: 'engine_power', label: 'Motor Gücü', icon: '🐎' },
    { key: 'engine_volume', label: 'Motor Hacmi', icon: '🔧' },
    { key: 'traction', label: 'Çekiş', icon: '🔩' },
    { key: 'status', label: 'Durumu', icon: '✅' },
    { key: 'warranty', label: 'Garanti', icon: '🛡️' },
    { key: 'heavy_damage', label: 'Ağır Hasar', icon: '⚠️' },
    { key: 'plate', label: 'Plaka', icon: '🔢' },
    { key: 'from_who', label: 'Kimden', icon: '👤' },
    { key: 'exchange', label: 'Takas', icon: '🔄' },
    { key: 'listing_no', label: 'İlan No', icon: '📋' },
    { key: 'listing_date', label: 'İlan Tarihi', icon: '📆' },
  ];

  let hasData = false;
  fields.forEach(field => {
    const value = data[field.key];
    if (value) {
      hasData = true;
      html += `
        <div class="property-row">
          <span class="label">${field.icon} ${field.label}</span>
          <span class="value">${value}</span>
        </div>
      `;
    }
  });

  if (data.painted_parts && data.painted_parts.length > 0) {
    hasData = true;
    html += `
      <div class="property-row damage-row">
        <span class="label">🎨 Boyalı</span>
        <span class="value damage">${data.painted_parts.join(', ')}</span>
      </div>
    `;
  }
  
  if (data.changed_parts && data.changed_parts.length > 0) {
    hasData = true;
    html += `
      <div class="property-row damage-row">
        <span class="label">🔧 Değişen</span>
        <span class="value damage">${data.changed_parts.join(', ')}</span>
      </div>
    `;
  }

  if (!hasData) {
    html += `
      <div class="no-data">
        <div class="no-data-icon">🤔</div>
        <p>İlan bilgileri çekilemedi.<br>Sayfayı yenileyip tekrar deneyin.</p>
      </div>
    `;
    analyzeBtn.disabled = true;
  } else {
    analyzeBtn.disabled = false;
  }

  propertyInfoEl.innerHTML = html;
}

async function analyzeWithAI(data) {
  const apiKey = await getApiKey();
  const apiProvider = await getApiProvider();
  
  if (!apiKey) {
    resultTextEl.innerText = 'API Key ayarlanmamış. Lütfen ayarlardan DeepSeek API Key girin.';
    resultEl.classList.add('show');
    return;
  }

  const prompt = createAnalysisPrompt(data);

  let apiUrl = 'https://api.deepseek.com/v1/chat/completions';
  let model = 'deepseek-chat';

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: `Sen otomobil uzmanısın. Türkiye'de satılan araçları iyi biliyorsun.
Kullanıcıya kısa, net ve faydalı bilgiler veriyorsun.
Türkçe yanıt ver. Emoji kullan.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error('API hatası: ' + response.status);
    }

    const result = await response.json();
    const analysis = result.choices[0].message.content;

    resultTextEl.innerText = analysis;
    resultEl.classList.add('show');

    // Also inject to page
    injectToPage(analysis);

  } catch (error) {
    resultTextEl.innerText = 'Hata oluştu: ' + error.message;
    resultEl.classList.add('show');
  }
}

function injectToPage(analysis) {
  // Sayfa içine overlay ekle
  const script = `
    (function() {
      // Varsa eski paneli kaldır
      const existing = document.getElementById('ai-car-panel');
      if (existing) existing.remove();

      const panel = document.createElement('div');
      panel.id = 'ai-car-panel';
      panel.innerHTML = \`
        <div class="ai-car-header">
          <span>🤖 AI Analiz</span>
          <button class="ai-car-close">&times;</button>
        </div>
        <div class="ai-car-content">
          \${analysis.replace(/\\n/g, '<br>')}
        </div>
      \`;
      
      const style = document.createElement('style');
      style.textContent = \`
        #ai-car-panel {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 350px;
          max-height: 400px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          overflow: hidden;
        }
        #ai-car-panel .ai-car-header {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 12px 15px;
          font-weight: 600;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        #ai-car-panel .ai-car-close {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          line-height: 1;
        }
        #ai-car-panel .ai-car-content {
          padding: 15px;
          font-size: 13px;
          line-height: 1.6;
          color: #333;
          max-height: 320px;
          overflow-y: auto;
        }
      \`;

      document.head.appendChild(style);
      document.body.appendChild(panel);

      // Kapatma butonu
      panel.querySelector('.ai-car-close').addEventListener('click', () => panel.remove());
    })();
  `;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.executeScript(tabs[0].id, { code: script });
  });
}

function createAnalysisPrompt(data) {
  // Yaşı hesapla
  const currentYear = 2026;
  const carYear = parseInt(data.year) || 0;
  const carAge = currentYear - carYear;

  let carInfo = '';
  
  if (data.brand) carInfo += `Marka: ${data.brand}\n`;
  if (data.series) carInfo += `Seri: ${data.series}\n`;
  if (data.model) carInfo += `Model: ${data.model}\n`;
  if (data.year) carInfo += `Yıl: ${data.year} (${carAge} yaşında)\n`;
  if (data.kilometer) carInfo += `Kilometre: ${data.kilometer} km\n`;
  if (data.fuel_type) carInfo += `Yakıt: ${data.fuel_type}\n`;
  if (data.gear_type) carInfo += `Vites: ${data.gear_type}\n`;
  if (data.engine_volume) carInfo += `Motor: ${data.engine_volume}\n`;
  if (data.engine_power) carInfo += `Güç: ${data.engine_power}\n`;
  if (data.color) carInfo += `Renk: ${data.color}\n`;
  if (data.body_type) carInfo += `Kasa: ${data.body_type}\n`;
  if (data.painted_parts && data.painted_parts.length > 0) {
    carInfo += `Boyalı Parçalar: ${data.painted_parts.join(', ')}\n`;
  }
  if (data.changed_parts && data.changed_parts.length > 0) {
    carInfo += `Değişen Parçalar: ${data.changed_parts.join(', ')}\n`;
  }

  return `
Aşağıdaki araba hakkında kısa ve faydalı bir analiz yap (maksimum 300 kelime):

${carInfo}

Şunları söyle:
1. 🚗 MODELİN ÖZELLİKLERİ: Bu modelin motor kodunu ve şanzıman seçeneklerini söyle
2. ✅ AVANTAJLARI: Bu aracın güçlü yönleri neler?
3. ⚠️ DİKKAT: Bu modelin kronik/sık karşılaşılan arızaları neler? (varsa)
4. 🔧 BAKIM: Bu yaş ve km'de nelere dikkat edilmeli?
5. 📊 DEĞERLENDİRME: Genel olarak bu ilanı almalı mı?

Kısa, madde madde yaz. Gereksiz bilgi verme.
  `;
}

document.getElementById('settingsLink').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const data = await getCurrentTabData();
    if (data && !data.error) {
      updatePropertyUI(data);
    }
  } catch (e) {
    console.log('Veri alınamadı:', e);
  }

  analyzeBtn.addEventListener('click', async () => {
    if (!currentPropertyData) {
      currentPropertyData = await getCurrentTabData();
    }

    analyzeBtn.style.display = 'none';
    loadingEl.classList.add('show');
    resultEl.classList.remove('show');

    await analyzeWithAI(currentPropertyData);

    loadingEl.classList.remove('show');
    analyzeBtn.style.display = 'block';
  });
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const data = await getCurrentTabData();
    if (data && !data.error) {
      updatePropertyUI(data);
    } else {
      propertyInfoEl.innerHTML = `
        <div class="no-data">
          <div class="no-data-icon">🔍</div>
          <p>Henüz bir ilan tespit edilmedi.<br>Bir araba ilanına gidin.</p>
        </div>
      `;
      analyzeBtn.disabled = true;
      resultEl.classList.remove('show');
      currentPropertyData = null;
    }
  } catch (e) {
    console.log('Tab değişti:', e);
  }
});
