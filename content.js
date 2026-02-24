// content.js - Emlak sitelerinden veri çekme

console.log("AI Property Helper: Content script loaded");

// Siteye göre veri çekme fonksiyonları
const extractors = {
  // Sahibinden.com
  'sahibinden.com': {
    getPropertyData: () => {
      const data = {
        site: 'sahibinden',
        url: window.location.href,
        title: '',
        price: '',
        location: '',
        details: {},
        rawData: {}
      };

      try {
        // Başlık
        const titleEl = document.querySelector('.classifiedTitle') || 
                        document.querySelector('h1[class*="title"]') ||
                        document.querySelector('h1');
        data.title = titleEl?.innerText?.trim() || '';

        // Fiyat
        const priceEl = document.querySelector('.priceContainer') ||
                        document.querySelector('[class*="price"]') ||
                        document.querySelector('.classifiedPrice');
        data.price = priceEl?.innerText?.trim() || '';

        // Konum
        const locationEl = document.querySelector('.location') ||
                           document.querySelector('[class*="location"]');
        data.location = locationEl?.innerText?.trim() || '';

        // Detaylar (özellikler)
        const detailRows = document.querySelectorAll('ul.classifiedFeatures li') ||
                          document.querySelectorAll('[class*="feature"]');
        data.details = {};
        detailRows.forEach(row => {
          const text = row.innerText?.trim();
          if (text) data.details[text.split(':')[0]] = text.split(':')[1]?.trim() || text;
        });

        // Alternatif: Tüm sayfa verilerini al ( fallback )
        data.rawData = {
          html: document.body.innerHTML.substring(0, 5000),
          url: window.location.href
        };

      } catch (e) {
        console.error('Sahibinden data extraction error:', e);
      }

      return data;
    }
  },

  // Arabam.com
  'arabam.com': {
    getPropertyData: () => {
      const data = {
        site: 'arabam',
        url: window.location.href,
        title: '',
        price: '',
        location: '',
        details: {},
        rawData: {}
      };

      try {
        const titleEl = document.querySelector('h1') || 
                        document.querySelector('[class*="title"]');
        data.title = titleEl?.innerText?.trim() || '';

        const priceEl = document.querySelector('[class*="price"]') ||
                        document.querySelector('.product-price');
        data.price = priceEl?.innerText?.trim() || '';

        const locationEl = document.querySelector('[class*="location"]') ||
                          document.querySelector('.city');
        data.location = locationEl?.innerText?.trim() || '';

      } catch (e) {
        console.error('Arabam data extraction error:', e);
      }

      return data;
    }
  },

  // Hepsiburada (genel ürünler için)
  'hepsiburada.com': {
    getPropertyData: () => {
      const data = {
        site: 'hepsiburada',
        url: window.location.href,
        title: '',
        price: '',
        location: '',
        details: {},
        rawData: {}
      };

      try {
        const titleEl = document.querySelector('h1') ||
                        document.querySelector('[data-testid="product-title"]');
        data.title = titleEl?.innerText?.trim() || '';

        const priceEl = document.querySelector('[data-testid="product-price"]') ||
                        document.querySelector('[class*="price"]');
        data.price = priceEl?.innerText?.trim() || '';

      } catch (e) {
        console.error('Hepsiburada data extraction error:', e);
      }

      return data;
    }
  }
};

// Siteye göre doğru extractor'ı seç
function getCurrentSiteExtractor() {
  const hostname = window.location.hostname;
  
  for (const [site, extractor] of Object.entries(extractors)) {
    if (hostname.includes(site.replace('www.', ''))) {
      return extractor;
    }
  }
  
  return null;
}

// Extension'a mesaj gönderme
function sendToExtension(data) {
  chrome.runtime.sendMessage({
    type: 'PROPERTY_DATA',
    data: data
  });
}

// Sayfa yüklendiğinde otomatik çalıştır
document.addEventListener('DOMContentLoaded', () => {
  console.log('AI Property Helper: DOM ready');
  
  // Her 3 saniyede bir kontrol et (SPA'lar için)
  const checkInterval = setInterval(() => {
    const extractor = getCurrentSiteExtractor();
    if (extractor) {
      const data = extractor.getPropertyData();
      if (data.title || data.price) {
        console.log('Property data found:', data);
        sendToExtension(data);
        clearInterval(checkInterval);
      }
    }
  }, 3000);
  
  // 30 saniye sonra durdur
  setTimeout(() => clearInterval(checkInterval), 30000);
});

// MutationObserver ile dinamik içerik de kontrol et
const observer = new MutationObserver((mutations) => {
  const extractor = getCurrentSiteExtractor();
  if (extractor) {
    const data = extractor.getPropertyData();
    if (data.title || data.price) {
      sendToExtension(data);
    }
  }
});

observer.observe(document.body, { 
  childList: true, 
  subtree: true,
  attributes: true 
});

// Extension'dan gelen mesajları dinle
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_DATA') {
    const extractor = getCurrentSiteExtractor();
    if (extractor) {
      sendResponse(extractor.getPropertyData());
    } else {
      sendResponse({ error: 'Unsupported site' });
    }
  }
  return true;
});

console.log('AI Property Helper: Content script initialized');
