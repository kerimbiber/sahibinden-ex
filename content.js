// content.js - Araba ve Emlak sitelerinden veri çekme

console.log("AI Property Helper: Content script loaded");

// Siteye göre veri çekme fonksiyonları
const extractors = {
  // Arabam.com
  'arabam.com': {
    getPropertyData: () => {
      const data = {
        site: 'arabam',
        url: window.location.href,
        // Ana bilgiler
        title: '',
        price: '',
        location: '',
        // Detaylı bilgiler
        brand_model: '',      // Marka/Model
        year: '',            // Yıl
        kilometer: '',       // Kilometre
        fuel_type: '',       // Yakıt Tipi
        gear_type: '',       // Vites
        color: '',           // Renk
        listing_date: '',    // İlan Tarihi
        listing_no: '',      // İlan No
        heavy_damage: '',    // Ağır Hasar Kayıtlı
        engine_power: '',    // Motor Gücü
        engine_volume: '',   // Motor Hacmi
        details: {},
        rawData: {}
      };

      try {
        // Başlık - Birden fazla selector dene
        const titleEl = document.querySelector('.product-title') || 
                        document.querySelector('h1.class-name') ||
                        document.querySelector('h1');
        data.title = titleEl?.innerText?.trim() || '';
        
        // Marka/Model
        const brandEl = document.querySelector('.brand-model') ||
                       document.querySelector('[class*="brand"]') ||
                       document.querySelector('[class*="make"]');
        data.brand_model = brandEl?.innerText?.trim() || '';

        // Fiyat
        const priceEl = document.querySelector('.product-price') ||
                        document.querySelector('[class*="price"]') ||
                        document.querySelector('.price');
        data.price = priceEl?.innerText?.trim() || '';

        // Kilometre
        const kmEl = document.querySelector('[class*="kilometer"]') ||
                    document.querySelector('[class*="km"]') ||
                    document.querySelector('[data-testid="kilometer"]');
        data.kilometer = kmEl?.innerText?.trim() || '';

        // Yakıt Tipi
        const fuelEl = document.querySelector('[class*="fuel"]') ||
                      document.querySelector('[data-testid="fuel-type"]');
        data.fuel_type = fuelEl?.innerText?.trim() || '';

        // Vites
        const gearEl = document.querySelector('[class*="gear"]') ||
                      document.querySelector('[class*="transmission"]') ||
                      document.querySelector('[data-testid="gear"]');
        data.gear_type = gearEl?.innerText?.trim() || '';

        // Renk
        const colorEl = document.querySelector('[class*="color"]') ||
                       document.querySelector('[data-testid="color"]');
        data.color = colorEl?.innerText?.trim() || '';

        // Konum
        const locationEl = document.querySelector('[class*="city"]') ||
                         document.querySelector('[class*="location"]') ||
                         document.querySelector('.province');
        data.location = locationEl?.innerText?.trim() || '';

        // Yıl
        const yearEl = document.querySelector('[class*="year"]') ||
                      document.querySelector('[data-testid="year"]') ||
                      document.querySelector('.model-year');
        data.year = yearEl?.innerText?.trim() || '';

        // İlan Tarihi
        const dateEl = document.querySelector('[class*="date"]') ||
                      document.querySelector('[class*="listing-date"]') ||
                      document.querySelector('.advert-date');
        data.listing_date = dateEl?.innerText?.trim() || '';

        // İlan No
        const noEl = document.querySelector('[class*="advert-no"]') ||
                    document.querySelector('[class*="listing-id"]') ||
                    document.querySelector('.ad-id');
        data.listing_no = noEl?.innerText?.trim() || '';

        // Ağır Hasar
        const damageEl = document.querySelector('[class*="damage"]') ||
                       document.querySelector('[class*="hasar"]');
        data.heavy_damage = damageEl?.innerText?.trim() || '';

        // Motor Gücü
        const powerEl = document.querySelector('[class*="power"]') ||
                       document.querySelector('[class*="engine-power"]');
        data.engine_power = powerEl?.innerText?.trim() || '';

        // Motor Hacmi
        const volumeEl = document.querySelector('[class*="volume"]') ||
                        document.querySelector('[class*="engine-volume"]') ||
                        document.querySelector('[class*="cc"]');
        data.engine_volume = volumeEl?.innerText?.trim() || '';

        // Tüm özellikler (detaylı bilgi)
        const allFeatures = {};
        const featureEls = document.querySelectorAll('[class*="spec"]') ||
                         document.querySelectorAll('.feature-item') ||
                         document.querySelectorAll('li');
        featureEls.forEach((el, i) => {
          const text = el.innerText?.trim();
          if (text && text.length < 100) {
            allFeatures[`feature_${i}`] = text;
          }
        });
        data.details = allFeatures;

        // Yedek: tüm sayfa bilgisi
        data.rawData = {
          html: document.body.innerHTML.substring(0, 10000),
          url: window.location.href
        };

        console.log('Arabam data extracted:', data);

      } catch (e) {
        console.error('Arabam data extraction error:', e);
      }

      return data;
    }
  },

  // Sahibinden.com (emlak)
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
        const titleEl = document.querySelector('.classifiedTitle') || 
                        document.querySelector('h1[class*="title"]') ||
                        document.querySelector('h1');
        data.title = titleEl?.innerText?.trim() || '';

        const priceEl = document.querySelector('.priceContainer') ||
                        document.querySelector('[class*="price"]') ||
                        document.querySelector('.classifiedPrice');
        data.price = priceEl?.innerText?.trim() || '';

        const locationEl = document.querySelector('.location') ||
                           document.querySelector('[class*="location"]');
        data.location = locationEl?.innerText?.trim() || '';

      } catch (e) {
        console.error('Sahibinden data extraction error:', e);
      }

      return data;
    }
  },

  // Hepsiburada
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
  
  const checkInterval = setInterval(() => {
    const extractor = getCurrentSiteExtractor();
    if (extractor) {
      const data = extractor.getPropertyData();
      if (data.title || data.price || data.brand_model) {
        console.log('Property data found:', data);
        sendToExtension(data);
        clearInterval(checkInterval);
      }
    }
  }, 3000);
  
  setTimeout(() => clearInterval(checkInterval), 30000);
});

// MutationObserver ile dinamik içerik kontrolü
const observer = new MutationObserver((mutations) => {
  const extractor = getCurrentSiteExtractor();
  if (extractor) {
    const data = extractor.getPropertyData();
    if (data.title || data.price || data.brand_model) {
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
