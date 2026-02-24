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
  
  // Tüm alanları kontrol et ve göster
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

  // Hasar bilgileri varsa göster
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

function createAnalysisPrompt(data) {
  let carInfo = 'Araç Bilgileri:\n';
  
  const fields = [
    { key: 'price', label: 'Fiyat' },
    { key: 'brand', label: 'Marka' },
    { key: 'series', label: 'Seri' },
    { key: 'model', label: 'Model' },
    { key: 'year', label: 'Yıl' },
    { key: 'kilometer', label: 'Kilometre' },
    { key: 'fuel_type', label: 'Yakıt Tipi' },
    { key: 'gear_type', label: 'Vites' },
    { key: 'body_type', label: 'Kasa Tipi' },
    { key: 'color', label: 'Renk' },
    { key: 'engine_power', label: 'Motor Gücü' },
    { key: 'engine_volume', label: 'Motor Hacmi' },
    { key: 'traction', label: 'Çekiş' },
    { key: 'status', label: 'Durumu' },
    { key: 'warranty', label: 'Garanti' },
    { key: 'heavy_damage', label: 'Ağır Hasar' },
    { key: 'plate', label: 'Plaka' },
    { key: 'from_who', label: 'Kimden' },
    { key: 'exchange', label: 'Takas' },
    { key: 'listing_no', label: 'İlan No' },
    { key: 'listing_date', label: 'İlan Tarihi' },
  ];

  fields.forEach(field => {
    if (data[field.key]) {
      carInfo += `- ${field.label}: ${data[field.key]}\n`;
    }
  });

  // Hasar bilgileri
  if (data.painted_parts && data.painted_parts.length > 0) {
    carInfo += `- Boyalı Parçalar: ${data.painted_parts.join(', ')}\n`;
  }
  if (data.changed_parts && data.changed_parts.length > 0) {
    carInfo += `- Değişen Parçalar: ${data.changed_parts.join(', ')}\n`;
  }

  carInfo += `\nURL: ${data.url || 'Yok'}`;

  return `
Aşağıdaki araç ilanını detaylı analiz et:

${carInfo}

Lütfen şunları değerlendir:
1. Bu fiyat hakkında ne düşünüyorsun? (Pahalı/Ucuz/Makul)
2. Kilometre durumu nasıl? (Düşük/Orta/Yüksek)
3. Bu aracın avantajları neler?
4. Dikkat edilmesi gereken noktalar neler?
5. Boyalı/Değişen parçalar önemli mi?
6. Genel olarak bu ilanı tavsiye eder misin?

Kısa ve öz yanıt ver.
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
