// popup.js - AI Emlak Asistanı Mantığı

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

  propertyInfoEl.innerHTML = `
    <h3>📋 İlan Bilgileri</h3>
    <div class="item">
      <span class="label">Site:</span>
      <span class="value">${data.site || 'Bilinmiyor'}</span>
    </div>
    <div class="item">
      <span class="label">Başlık:</span>
      <span class="value">${data.title?.substring(0, 30) || 'Yok'}...</span>
    </div>
    <div class="item">
      <span class="label">Fiyat:</span>
      <span class="value">${data.price || 'Yok'}</span>
    </div>
    <div class="item">
      <span class="label">Konum:</span>
      <span class="value">${data.location?.substring(0, 25) || 'Yok'}...</span>
    </div>
  `;

  analyzeBtn.disabled = false;
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

  // API sağlayıcıya göre ayarla
  if (apiProvider === 'deepseek') {
    apiUrl = 'https://api.deepseek.com/v1/chat/completions';
    model = 'deepseek-chat';
  } else if (apiProvider === 'anthropic') {
    // Anthropic farklı format kullanır
    resultTextEl.innerText = 'Anthropic desteği henüz eklenmedi. DeepSeek veya OpenAI kullanın.';
    resultEl.classList.add('show');
    return;
  } else if (apiProvider === 'google') {
    resultTextEl.innerText = 'Google Gemini desteği henüz eklenmedi. DeepSeek veya OpenAI kullanın.';
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
            content: 'Sen bir emlak uzmanıs. Türkiye piyasasını iyi biliyorsun. Kullanıcılara yardımcı, dürüst ve detaylı analizler sunuyorsun. Türkçe yanıt ver.'
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

// API Provider'ı storage'dan al
async function getApiProvider() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['apiProvider'], (result) => {
      resolve(result.apiProvider || 'deepseek');
    });
  });
}

// Analiz promptu oluştur
function createAnalysisPrompt(data) {
  return `
Aşağıdaki emlak ilanını analiz et ve Türkçe olarak yorumla:

İlan Bilgileri:
- Site: ${data.site || 'Bilinmiyor'}
- Başlık: ${data.title || 'Yok'}
- Fiyat: ${data.price || 'Yok'}
- Konum: ${data.location || 'Yok'}
- URL: ${data.url || 'Yok'}

Lütfen şunları değerlendir:
1. Bu fiyat hakkında ne düşünüyorsun? (Pahalı/Ucuz/Makul)
2. Bu bölgede genel olarak fiyatlar ne durumda?
3. Bu ilanın avantajları neler?
4. Dezavantajları neler?
5. Kullanıcıya önerilerin nedir?

Eğer yeterli bilgi yoksa, bunu belirt ve genel önerilerde bulun.
  `;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
  // Mevcut veriyi dene al
  try {
    const data = await getCurrentTabData();
    if (data && !data.error) {
      updatePropertyUI(data);
    }
  } catch (e) {
    console.log('Veri alınamadı:', e);
  }

  // Analiz butonu
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

  // Settings link
  document.getElementById('openSettings')?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
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
          <p>Henüz bir ilan tespit edilmedi.<br>Bir emlak ilanına gidin.</p>
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
