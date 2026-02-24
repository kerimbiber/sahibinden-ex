// popup.js - AI Araba Asistanı Mantığı

let currentPropertyData = null;

// DOM elementleri
const propertyInfoEl = document.getElementById('propertyInfo');
const analyzeBtn = document.getElementById('analyzeBtn');
const loadingEl = document.getElementById('loading');
const resultEl = document.getElementById('result');
const resultTextEl = document.getElementById('resultText');

// API Key'i storage'dan al
async function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['apiKey', 'apiProvider'], (result) => {
      resolve(result.apiKey || '');
    });
  });
}

// API Provider'ı storage'dan al
async function getApiProvider() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['apiProvider'], (result) => {
      resolve(result.apiProvider || 'deepseek');
    });
  });
}

// Mevcut sekmeden veri çek
async function getCurrentTabData() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id, { type: 'GET_DATA' }, (response) => {
      resolve(response || { error: 'Veri bulunamadı' });
    });
  });
}

// UI'ı veri ile güncelle
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

  // Araba bilgilerini göster
  let html = `<h3>🚗 Araç Bilgileri</h3>`;
  
  // Tüm alanları kontrol et ve göster
  const fields = [
    { key: 'brand_model', label: 'Marka/Model', icon: '🏷️' },
    { key: 'price', label: 'Fiyat', icon: '💰' },
    { key: 'year', label: 'Yıl', icon: '📅' },
    { key: 'kilometer', label: 'Kilometre', icon: '🛣️' },
    { key: 'fuel_type', label: 'Yakıt', icon: '⛽' },
    { key: 'gear_type', label: 'Vites', icon: '⚙️' },
    { key: 'color', label: 'Renk', icon: '🎨' },
    { key: 'location', label: 'Konum', icon: '📍' },
    { key: 'listing_date', label: 'İlan Tarihi', icon: '📆' },
    { key: 'listing_no', label: 'İlan No', icon: '🔢' },
    { key: 'heavy_damage', label: 'Ağır Hasar', icon: '⚠️' },
    { key: 'engine_power', label: 'Motor Gücü', icon: '🐎' },
    { key: 'engine_volume', label: 'Motor Hacmi', icon: '🔧' },
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

// AI analizi yap
async function analyzeWithAI(data) {
  const apiKey = await getApiKey();
  const apiProvider = await getApiProvider();
  
  if (!apiKey) {
    resultTextEl.innerText = 'API Key ayarlanmamış. Lütfen ayarlardan DeepSeek API Key girin.';
    resultEl.classList.add('show');
    return;
  }

  // AI için prompt oluştur
  const prompt = createAnalysisPrompt(data);

  let apiUrl = 'https://api.openai.com/v1/chat/completions';
  let model = 'gpt-4o-mini';

  if (apiProvider === 'deepseek') {
    apiUrl = 'https://api.deepseek.com/v1/chat/completions';
    model = 'deepseek-chat';
  } else if (apiProvider === 'anthropic' || apiProvider === 'google') {
    resultTextEl.innerText = 'Şu anda DeepSeek kullanıyoruz. Ayarlardan DeepSeek seçili olduğundan emin olun.';
    resultEl.classList.add('show');
    return;
  }

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
            content: 'Sen bir otomobil uzmanısın. Türkiye pazarını iyi biliyorsun. Kullanıcılara yardımcı, dürüst ve detaylı analizler sunuyorsun. Türkçe yanıt ver.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
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

  } catch (error) {
    resultTextEl.innerText = 'Hata oluştu: ' + error.message;
    resultEl.classList.add('show');
  }
}

// Analiz promptu oluştur
function createAnalysisPrompt(data) {
  // Mevcut bilgileri formatla
  let carInfo = 'Araç Bilgileri:\n';
  
  const fields = [
    { key: 'brand_model', label: 'Marka/Model' },
    { key: 'price', label: 'Fiyat' },
    { key: 'year', label: 'Yıl' },
    { key: 'kilometer', label: 'Kilometre' },
    { key: 'fuel_type', label: 'Yakıt Tipi' },
    { key: 'gear_type', label: 'Vites' },
    { key: 'color', label: 'Renk' },
    { key: 'location', label: 'Konum' },
    { key: 'listing_date', label: 'İlan Tarihi' },
    { key: 'listing_no', label: 'İlan No' },
    { key: 'heavy_damage', label: 'Ağır Hasar' },
    { key: 'engine_power', label: 'Motor Gücü' },
    { key: 'engine_volume', label: 'Motor Hacmi' },
  ];

  fields.forEach(field => {
    if (data[field.key]) {
      carInfo += `- ${field.label}: ${data[field.key]}\n`;
    }
  });

  carInfo += `\nURL: ${data.url || 'Yok'}`;

  return `
Aşağıdaki araç ilanını detaylı analiz et:

${carInfo}

Lütfen şunları değerlendir:
1. Bu fiyat hakkında ne düşünüyorsun? (Pahalı/Ucuz/Makul)
2. Kilometre durumu nasıl? (Düşük/Orta/Yüksek)
3. Bu aracın avantajları neler?
4. Dikkat edilmesi gereken noktalar neler?
5. Genel olarak bu ilanı tavsiye eder misin?

Kısa ve öz yanıt ver.
  `;
}

// Settings link
document.getElementById('settingsLink').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

// Event Listeners
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

// Sayfa değiştiğinde veriyi yenile
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
