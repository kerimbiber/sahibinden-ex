// background.js - AI Araba Asistanı Service Worker

console.log("AI Property Helper: Background script loaded");

// Database: Chrome Storage kullanarak veri saklama
const DB = {
  // Tüm ilanları al
  getAllListings: async () => {
    return new Promise((resolve) => {
      chrome.storage.local.get(['carListings'], (result) => {
        resolve(result.carListings || []);
      });
    });
  },

  // İlan no ile tek ilan al
  getListing: async (listingNo) => {
    const listings = await DB.getAllListings();
    return listings.find(l => l.listing_no === listingNo);
  },

  // İlan ekle veya güncelle
  saveListing: async (listing) => {
    const listings = await DB.getAllListings();
    
    // Bu ilan var mı kontrol et
    const existingIndex = listings.findIndex(l => l.listing_no === listing.listing_no);
    
    if (existingIndex >= 0) {
      // Varsa, mevcut verileri koru ama yeni verilerle güncelle
      const existing = listings[existingIndex];
      listings[existingIndex] = {
        ...existing,
        ...listing,
        updated_at: new Date().toISOString()
      };
    } else {
      // Yoksa yeni ekle
      listing.created_at = new Date().toISOString();
      listing.updated_at = new Date().toISOString();
      listings.push(listing);
    }

    return new Promise((resolve) => {
      chrome.storage.local.set({ carListings: listings }, () => {
        resolve(listings.length);
      });
    });
  },

  // Çoklu ilan ekle/güncelle (liste sayfası için)
  saveListings: async (newListings) => {
    const listings = await DB.getAllListings();
    let added = 0;
    let updated = 0;

    for (const newListing of newListings) {
      const existingIndex = listings.findIndex(l => l.listing_no === newListing.listing_no);
      
      if (existingIndex >= 0) {
        // Mevcut verileri koru, boş alanları doldur
        const existing = listings[existingIndex];
        listings[existingIndex] = {
          ...existing,
          ...newListing,
          updated_at: new Date().toISOString()
        };
        updated++;
      } else {
        newListing.created_at = new Date().toISOString();
        newListing.updated_at = new Date().toISOString();
        listings.push(newListing);
        added++;
      }
    }

    return new Promise((resolve) => {
      chrome.storage.local.set({ carListings: listings }, () => {
        resolve({ added, updated, total: listings.length });
      });
    });
  },

  // İlan sil
  deleteListing: async (listingNo) => {
    const listings = await DB.getAllListings();
    const filtered = listings.filter(l => l.listing_no !== listingNo);
    
    return new Promise((resolve) => {
      chrome.storage.local.set({ carListings: filtered }, () => {
        resolve(filtered.length);
      });
    });
  },

  // Tüm verileri temizle
  clearAll: async () => {
    return new Promise((resolve) => {
      chrome.storage.local.remove(['carListings'], () => {
        resolve(true);
      });
    });
  },

  // DB istatistikleri
  getStats: async () => {
    const listings = await DB.getAllListings();
    const now = new Date();
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    
    const stats = {
      total: listings.length,
      thisWeek: listings.filter(l => new Date(l.created_at) > oneWeekAgo).length,
      byBrand: {},
      byYear: {}
    };

    // Marka bazlı say
    listings.forEach(l => {
      if (l.brand) {
        stats.byBrand[l.brand] = (stats.byBrand[l.brand] || 0) + 1;
      }
    });

    // Yıl bazlı say
    listings.forEach(l => {
      if (l.year) {
        stats.byYear[l.year] = (stats.byYear[l.year] || 0) + 1;
      }
    });

    return stats;
  }
};

// Mesajları dinle
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message.type);

  if (message.type === 'SAVE_LISTING') {
    DB.saveListing(message.data).then(count => {
      sendResponse({ success: true, total: count });
    });
    return true;
  }

  if (message.type === 'SAVE_LISTINGS') {
    DB.saveListings(message.data).then(result => {
      sendResponse({ success: true, ...result });
    });
    return true;
  }

  if (message.type === 'GET_ALL_LISTINGS') {
    DB.getAllListings().then(listings => {
      sendResponse({ success: true, listings });
    });
    return true;
  }

  if (message.type === 'GET_LISTING') {
    DB.getListing(message.listingNo).then(listing => {
      sendResponse({ success: true, listing });
    });
    return true;
  }

  if (message.type === 'DELETE_LISTING') {
    DB.deleteListing(message.listingNo).then(count => {
      sendResponse({ success: true, remaining: count });
    });
    return true;
  }

  if (message.type === 'CLEAR_ALL') {
    DB.clearAll().then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'GET_STATS') {
    DB.getStats().then(stats => {
      sendResponse({ success: true, stats });
    });
    return true;
  }

  return false;
});

// content.js'den gelen mesajları dinle
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Liste verisi geldiyse kaydet
  if (message.type === 'LIST_DATA') {
    console.log('Saving list data:', message.data.length, 'listings');
    DB.saveListings(message.data).then(result => {
      console.log('List saved:', result);
    });
  }

  // Detay verisi geldiyse kaydet
  if (message.type === 'PROPERTY_DATA') {
    console.log('Saving detail data:', message.data.listing_no);
    DB.saveListing(message.data).then(count => {
      console.log('Detail saved, total:', count);
    });
  }

  return false;
});

console.log("AI Property Helper: Background initialized");
