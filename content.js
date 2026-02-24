// content.js - Sahibinden.com Araba Veri Çekme (Liste + Detay)

console.log("AI Property Helper: Content script loaded");

// Siteye göre veri çekme fonksiyonları
const extractors = {
  // Sahibinden.com - Detay Sayfası
  'sahibinden.com-detay': {
    isDetailPage: () => {
      return window.location.href.includes('/detay');
    },
    getPropertyData: () => {
      const data = {
        site: 'sahibinden',
        url: window.location.href,
        page_type: 'detail',
        
        // Ana bilgiler
        title: '',
        price: '',
        
        // Detaylı bilgiler
        listing_no: '',
        listing_date: '',
        brand: '',
        series: '',
        model: '',
        year: '',
        fuel_type: '',
        gear_type: '',
        status: '',
        kilometer: '',
        body_type: '',
        engine_power: '',
        engine_volume: '',
        traction: '',
        color: '',
        warranty: '',
        heavy_damage: '',
        plate: '',
        from_who: '',
        exchange: '',
        
        // Hasar bilgileri
        painted_parts: [],
        changed_parts: [],
        
        details: {},
        rawData: {}
      };

      try {
        // Fiyat
        const priceEl = document.querySelector('.classified-price-wrapper');
        data.price = priceEl?.innerText?.trim() || '';
        
        // Başlık
        const titleEl = document.querySelector('.classifiedTitle') || document.querySelector('h1');
        data.title = titleEl?.innerText?.trim() || '';

        // İlan No
        const noEl = document.querySelector('.classifiedId');
        data.listing_no = noEl?.innerText?.trim() || noEl?.dataset?.classifiedid || '';

        // Tüm özellikler
        const infoList = document.querySelector('ul.classifiedInfoList');
        if (infoList) {
          const items = infoList.querySelectorAll('li');
          items.forEach(item => {
            const strong = item.querySelector('strong');
            const span = item.querySelector('span:not(.classifiedId)');
            if (strong && span) {
              const key = strong.innerText.trim().replace(/\s+/g, '_').toLowerCase();
              const value = span.innerText.trim();
              
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
          const allDmg = damageList.querySelectorAll('li.selected-damage');
          let foundChanged = false;
          data.painted_parts = [];
          data.changed_parts = [];
          
          allDmg.forEach(li => {
            const text = li.innerText.trim();
            if (text === 'Değişen Parçalar') {
              foundChanged = true;
            } else if (!foundChanged) {
              data.painted_parts.push(text);
            } else {
              data.changed_parts.push(text);
            }
          });
        }

        console.log('Sahibinden DETAIL data extracted:', data);

      } catch (e) {
        console.error('Sahibinden detail extraction error:', e);
      }

      return data;
    }
  },

  // Sahibinden.com - Liste Sayfası
  'sahibinden.com-liste': {
    isListPage: () => {
      return window.location.href.includes('/vasita') && !window.location.href.includes('/detay');
    },
    getAllListings: () => {
      const listings = [];
      
      try {
        // Tüm ilan satırlarını bul
        const rows = document.querySelectorAll('tr.searchResultsItem');
        
        rows.forEach(row => {
          try {
            const listing = {
              site: 'sahibinden',
              page_type: 'list',
              url: '',
              listing_no: '',
              title: '',
              year: '',
              kilometer: '',
              color: '',
              price: '',
              location: '',
              listing_date: '',
              // Boş alanlar - detay sayfasından doldurulacak
              brand: '',
              series: '',
              model: '',
              fuel_type: '',
              gear_type: '',
              body_type: '',
              engine_power: '',
              engine_volume: '',
              status: '',
              traction: '',
              warranty: '',
              heavy_damage: '',
              plate: '',
              from_who: '',
              exchange: '',
              painted_parts: [],
              changed_parts: []
            };

            // data-id (listing no)
            listing.listing_no = row.dataset?.id || '';

            // Link ve başlık
            const linkEl = row.querySelector('a.classifiedTitle');
            if (linkEl) {
              listing.title = linkEl.innerText?.trim() || '';
              listing.url = 'https://www.sahibinden.com' + linkEl.getAttribute('href');
            }

            // Yıl (genellikle 3. sütun)
            const yearEl = row.querySelector('td.searchResultsAttributeValue');
            if (yearEl) {
              const text = yearEl.innerText?.trim();
              if (text && /^\d{4}$/.test(text)) {
                listing.year = text;
              }
            }

            // KM (4. sütun)
            const kmEl = row.querySelectorAll('td.searchResultsAttributeValue')[1];
            if (kmEl) {
              listing.kilometer = kmEl.innerText?.trim() || '';
            }

            // Renk (5. sütun)
            const colorEl = row.querySelectorAll('td.searchResultsAttributeValue')[2];
            if (colorEl) {
              listing.color = colorEl.innerText?.trim() || '';
            }

            // Fiyat
            const priceEl = row.querySelector('.classified-price-container span');
            if (priceEl) {
              listing.price = priceEl.innerText?.trim() || '';
            }

            // Tarih
            const dateEl = row.querySelector('.searchResultsDateValue');
            if (dateEl) {
              const spans = dateEl.querySelectorAll('span');
              if (spans.length >= 2) {
                listing.listing_date = `${spans[0].innerText?.trim()} ${spans[1].innerText?.trim()}`;
              }
            }

            // Konum
            const locationEl = row.querySelector('.searchResultsLocationValue');
            if (locationEl) {
              listing.location = locationEl.innerText?.replace(/\n/g, ', ')?.trim() || '';
            }

            if (listing.listing_no || listing.title) {
              listings.push(listing);
            }
          } catch (e) {
            console.error('Error parsing row:', e);
          }
        });

        console.log(`Sahibinden LIST: Found ${listings.length} listings`);
      } catch (e) {
        console.error('Sahibinden list extraction error:', e);
      }

      return listings;
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
  const path = window.location.pathname;
  
  if (hostname.includes('sahibinden.com')) {
    if (path.includes('/detay')) {
      return extractors['sahibinden.com-detay'];
    } else if (path.includes('/vasita')) {
      return extractors['sahibinden.com-liste'];
    }
  }
  
  if (hostname.includes('arabam.com')) {
    return extractors['arabam.com'];
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

// Liste verilerini gönder
function sendListToExtension(listings) {
  chrome.runtime.sendMessage({
    type: 'LIST_DATA',
    data: listings
  });
}

// Sayfa yüklendiğinde otomatik çalıştır
document.addEventListener('DOMContentLoaded', () => {
  console.log('AI Property Helper: DOM ready');
  
  const extractor = getCurrentSiteExtractor();
  
  if (!extractor) return;

  // Liste sayfası mı detay sayfası mı?
  if (extractor.isListPage) {
    // Liste sayfası - tüm ilanları çek
    const checkInterval = setInterval(() => {
      const listings = extractor.getAllListings();
      if (listings.length > 0) {
        console.log('Listings found:', listings.length);
        sendListToExtension(listings);
        clearInterval(checkInterval);
      }
    }, 3000);
    
    setTimeout(() => clearInterval(checkInterval), 15000);
  } else {
    // Detay sayfası
    const checkInterval = setInterval(() => {
      const data = extractor.getPropertyData();
      if (data.price || data.title || data.listing_no) {
        console.log('Detail data found:', data);
        sendToExtension(data);
        clearInterval(checkInterval);
      }
    }, 3000);
    
    setTimeout(() => clearInterval(checkInterval), 30000);
  }
});

// MutationObserver ile dinamik içerik kontrolü
const observer = new MutationObserver((mutations) => {
  const extractor = getCurrentSiteExtractor();
  if (!extractor) return;

  if (extractor.isListPage) {
    const listings = extractor.getAllListings();
    if (listings.length > 0) {
      sendListToExtension(listings);
    }
  } else {
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
  const extractor = getCurrentSiteExtractor();
  
  if (message.type === 'GET_DATA') {
    if (extractor?.getPropertyData) {
      sendResponse(extractor.getPropertyData());
    } else {
      sendResponse({ error: 'Unsupported site' });
    }
  } else if (message.type === 'GET_LIST') {
    if (extractor?.getAllListings) {
      sendResponse(extractor.getAllListings());
    } else {
      sendResponse({ error: 'Not a list page' });
    }
  }
  
  return true;
});

console.log('AI Property Helper: Content script initialized');
