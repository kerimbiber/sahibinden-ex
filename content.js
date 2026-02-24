// content.js - Sahibinden.com Araba Veri Çekme

console.log("AI Property Helper: Content script loaded");

// Siteye göre veri çekme fonksiyonları
const extractors = {
  // Sahibinden.com (Otomobil)
  'sahibinden.com': {
    getPropertyData: () => {
      const data = {
        site: 'sahibinden',
        url: window.location.href,
        
        // Ana bilgiler
        title: '',
        price: '',
        
        // Detaylı bilgiler
        listing_no: '',        // İlan No
        listing_date: '',      // İlan Tarihi
        brand: '',            // Marka
        series: '',           // Seri
        model: '',            // Model
        year: '',             // Yıl
        fuel_type: '',        // Yakıt Tipi
        gear_type: '',        // Vites
        status: '',          // Araç Durumu
        kilometer: '',       // KM
        body_type: '',        // Kasa Tipi
        engine_power: '',     // Motor Gücü
        engine_volume: '',    // Motor Hacmi
        traction: '',        // Çekiş
        color: '',           // Renk
        warranty: '',        // Garanti
        heavy_damage: '',    // Ağır Hasar Kayıtlı
        plate: '',          // Plaka
        from_who: '',       // Kimden
        exchange: '',        // Takas
        
        // Hasar bilgileri
        painted_parts: [],    // Boyalı Parçalar
        changed_parts: [],   // Değişen Parçalar
        
        details: {},
        rawData: {}
      };

      try {
        // Fiyat
        const priceEl = document.querySelector('.classified-price-wrapper');
        data.price = priceEl?.innerText?.trim() || '';
        
        // Başlık
        const titleEl = document.querySelector('.classifiedTitle') || 
                        document.querySelector('h1');
        data.title = titleEl?.innerText?.trim() || '';

        // İlan No
        const noEl = document.querySelector('.classifiedId');
        data.listing_no = noEl?.innerText?.trim() || noEl?.dataset?.classifiedid || '';

        // Tüm özellikler (ul.classifiedInfoList içinde)
        const infoList = document.querySelector('ul.classifiedInfoList');
        if (infoList) {
          const items = infoList.querySelectorAll('li');
          items.forEach(item => {
            const strong = item.querySelector('strong');
            const span = item.querySelector('span:not(.classifiedId)');
            if (strong && span) {
              const key = strong.innerText.trim().replace(/\s+/g, '_').toLowerCase();
              const value = span.innerText.trim();
              
              // Alanları eşle
              switch(key) {
                case 'ilan_no': data.listing_no = value; break;
                case 'ilan_tarihi': data.listing_date = value; break;
                case 'marka': data.brand = value; break;
                case 'seri': data.series = value; break;
                case 'model': data.model = value; break;
                case 'yıl': data.year = value; break;
                case 'yakıt_tipi': data.fuel_type = value; break;
                case 'vites': data.gear_type = value; break;
                case 'araç_durumu': data.status = value; break;
                case 'km': data.kilometer = value; break;
                case 'kasa_tipi': data.body_type = value; break;
                case 'motor_gücü': data.engine_power = value; break;
                case 'motor_hacmi': data.engine_volume = value; break;
                case 'çekiş': data.traction = value; break;
                case 'renk': data.color = value; break;
                case 'garanti': data.warranty = value; break;
                case 'ağır_hasar_kayıtlı': data.heavy_damage = value; break;
                case 'plaka_/_uyruk': data.plate = value; break;
                case 'kimden': data.from_who = value; break;
                case 'takas': data.exchange = value; break;
              }
            }
          });
        }

        // Hasar bilgileri
        const damageList = document.querySelector('.car-damage-info-list');
        if (damageList) {
          // Boyalı parçalar
          const paintedTitle = damageList.querySelector('.pair-title.painted-new');
          if (paintedTitle) {
            const paintedLis = damageList.querySelectorAll('.selected-damage');
            data.painted_parts = Array.from(paintedLis).map(li => li.innerText.trim());
          }
          
          // Değişen parçalar
          const changedTitle = damageList.querySelector('.pair-title.changed-new');
          if (changedTitle) {
            const changedLis = damageList.querySelectorAll('.selected-damage');
            // Değişen parçalar painted'den sonra geliyor, tekrar çek
            const allDmg = damageList.querySelectorAll('li.selected-damage');
            let foundChanged = false;
            data.changed_parts = [];
            Array.from(allDmg).forEach(li => {
              if (li.innerText.trim() === 'Değişen Parçalar' || foundChanged) {
                if (li.innerText.trim() !== 'Değişen Parçalar') {
                  data.changed_parts.push(li.innerText.trim());
                }
                foundChanged = true;
              }
            });
          }
        }

        console.log('Sahibinden data extracted:', data);

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
        details: {},
        rawData: {}
      };

      try {
        const titleEl = document.querySelector('h1') || document.querySelector('[class*="title"]');
        data.title = titleEl?.innerText?.trim() || '';

        const priceEl = document.querySelector('[class*="price"]') || document.querySelector('.product-price');
        data.price = priceEl?.innerText?.trim() || '';

      } catch (e) {
        console.error('Arabam data extraction error:', e);
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
      if (data.price || data.title || data.listing_no) {
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
    if (data.price || data.title || data.listing_no) {
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
