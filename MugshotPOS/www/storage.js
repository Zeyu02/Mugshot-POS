// ===================================
// STORAGE MODULE - IndexedDB + LocalStorage
// ===================================

// IndexedDB for images (no size limit)
// LocalStorage for product data (lightweight)

const DB_NAME = 'MugshotDB';
const DB_VERSION = 1;
const STORE_NAME = 'productImages';

let db = null;

// Initialize IndexedDB
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => {
            console.error('Failed to open IndexedDB');
            reject(request.error);
        };
        
        request.onsuccess = () => {
            db = request.result;
            console.log('IndexedDB initialized successfully');
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                console.log('Created productImages store');
            }
        };
    });
}

// Save image to IndexedDB
function saveImageToDB(productId, imageData) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database not initialized');
            return;
        }
        
        if (!imageData) {
            resolve(); // No image to save
            return;
        }
        
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put({ id: productId, image: imageData });
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Get image from IndexedDB
function getImageFromDB(productId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            resolve(null);
            return;
        }
        
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(productId);
        
        request.onsuccess = () => {
            const result = request.result;
            resolve(result ? result.image : null);
        };
        request.onerror = () => resolve(null);
    });
}

// Delete image from IndexedDB
function deleteImageFromDB(productId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            resolve();
            return;
        }
        
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(productId);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Save products (without images) to localStorage
function saveProductsToStorage(products) {
    try {
        // Remove images from products before saving to localStorage
        const productsWithoutImages = products.map(p => {
            const { image, ...productData } = p;
            return productData;
        });
        
        localStorage.setItem('mugshotProducts', JSON.stringify(productsWithoutImages));
        return true;
    } catch (error) {
        console.error('Error saving products:', error);
        showNotification('⚠️ Error saving products. Storage limit exceeded.', 'error');
        return false;
    }
}

// Load products from localStorage and merge with images from IndexedDB
async function loadProductsFromStorage() {
    try {
        const stored = localStorage.getItem('mugshotProducts');
        if (!stored) return [];
        
        const products = JSON.parse(stored);
        
        // Load images from IndexedDB
        for (const product of products) {
            const image = await getImageFromDB(product.id);
            product.image = image || '';
        }
        
        return products;
    } catch (error) {
        console.error('Error loading products:', error);
        return [];
    }
}

// Save single product with image
async function saveProductWithImage(product) {
    try {
        // Save image to IndexedDB
        if (product.image) {
            await saveImageToDB(product.id, product.image);
        }
        
        // Update product in products array
        const index = products.findIndex(p => p.id === product.id);
        if (index !== -1) {
            products[index] = product;
        } else {
            products.push(product);
        }
        
        // Save products (without images) to localStorage
        return saveProductsToStorage(products);
    } catch (error) {
        console.error('Error saving product with image:', error);
        throw error;
    }
}

// Delete product and its image
async function deleteProductWithImage(productId) {
    try {
        // Delete image from IndexedDB
        await deleteImageFromDB(productId);
        
        // Remove from products array
        products = products.filter(p => p.id !== productId);
        
        // Save updated products
        return saveProductsToStorage(products);
    } catch (error) {
        console.error('Error deleting product:', error);
        throw error;
    }
}

// Compress image before saving (reduces size by ~70%)
function compressImage(file, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Resize if too large
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to compressed base64
                const compressedData = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedData);
            };
            
            img.onerror = reject;
            img.src = e.target.result;
        };
        
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Initialize database on load
initDB().catch(error => {
    console.error('Failed to initialize database:', error);
    showNotification('⚠️ Database initialization failed. Images may not save.', 'warning');
});
