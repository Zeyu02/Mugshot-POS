// Global State
let products = [];
let cart = [];
let sales = [];
let currentEditProductId = null;
let categories = [];
let lastSale = null; // Store last sale for reprinting
let currentSalesFilter = 'today'; // Track current filter for printing
let currentFilteredSales = []; // Store filtered sales for printing

// Thermal Printer State
let connectedPrinterDevice = null;
let isPrinterConnected = false;

// Generate daily order ID (#01, #02, etc.)
function generateDailyOrderId() {
    const today = new Date().toDateString();
    const lastOrderDate = localStorage.getItem('lastOrderDate');
    let orderCounter = parseInt(localStorage.getItem('orderCounter') || '0');
    
    // Reset counter if it's a new day
    if (lastOrderDate !== today) {
        orderCounter = 0;
        localStorage.setItem('lastOrderDate', today);
    }
    
    // Increment counter
    orderCounter++;
    localStorage.setItem('orderCounter', orderCounter.toString());
    
    // Format as #01, #02, etc.
    return '#' + orderCounter.toString().padStart(2, '0');
}

// ===== THERMAL PRINTER FUNCTIONS =====

// Connect to PT-210 Bluetooth thermal printer
async function connectThermalPrinter() {
    try {
        if (!window.bluetoothSerial) {
            alert('⚠️ Bluetooth only works in the APK\n\nbluetoothSerial not available');
            console.error('window.bluetoothSerial is undefined');
            return false;
        }

        // First check if Bluetooth is enabled
        window.bluetoothSerial.isEnabled(
            function() {
                // Bluetooth is enabled, list devices
                listPairedDevices();
            },
            function() {
                // Bluetooth is not enabled, ask to enable
                alert('📱 Bluetooth is OFF\n\nPlease enable Bluetooth and try again.');
                
                // Try to enable Bluetooth
                window.bluetoothSerial.enable(
                    function() {
                        alert('✅ Bluetooth enabled!\n\nNow listing devices...');
                        listPairedDevices();
                    },
                    function() {
                        alert('❌ Could not enable Bluetooth.\n\nPlease enable it manually in Settings.');
                    }
                );
            }
        );
        
    } catch (error) {
        console.error('Printer connection error:', error);
        alert('❌ Connection failed: ' + error.message);
        return false;
    }
}

function listPairedDevices() {
    alert('📡 Scanning for paired devices...\n\nMake sure PT-210 is:\n✓ Turned ON\n✓ Already paired in Bluetooth Settings');
    
    // List paired devices
    window.bluetoothSerial.list(
        function(devices) {
            console.log('Found devices:', devices);
            console.log('Number of devices:', devices.length);
            
            if (devices.length === 0) {
                alert('⚠️ No paired devices found!\n\nPlease:\n1. Turn ON the PT-210 printer\n2. Go to Android Settings → Bluetooth\n3. Pair with PT-210\n4. Come back and try again');
                return;
            }
            
            // Show all device names for debugging
            const deviceNames = devices.map(d => d.name || d.address).join('\n');
            console.log('Device names:', deviceNames);
            
            // Find PT-210
            const pt210 = devices.find(d => d.name && (d.name.includes('PT-210') || d.name.includes('PT210') || d.name.includes('Inner')));
            
            if (pt210) {
                // Found PT-210, try to connect
                alert('✅ Found: ' + pt210.name + '\n\nConnecting...');
                connectToDevice(pt210);
            } else {
                // Show all devices to help user identify
                alert('❌ PT-210 not found.\n\nFound these devices:\n' + deviceNames + '\n\nIf your printer is listed above, let me know its exact name.');
            }
        },
        function(error) {
            console.error('List devices error:', error);
            alert('❌ Could not list Bluetooth devices.\n\nError: ' + error + '\n\nMake sure Bluetooth permissions are granted.');
        }
    );
}

async function connectToDevice(device) {
    try {
        alert('🔄 Connecting to ' + device.name + '...');
        
        window.bluetoothSerial.connect(
            device.address,
            function() {
                // Connected successfully
                connectedPrinterDevice = device;
                isPrinterConnected = true;
                
                // Save device for auto-reconnect
                localStorage.setItem('thermalPrinterDevice', JSON.stringify(device));
                
                // Update status display
                updatePrinterStatus();
                
                alert('✅ Connected to PT-210!\n\nReceipts will auto-print after each transaction (2 copies).');
            },
            function(error) {
                console.error('Connection error:', error);
                alert('❌ Failed to connect: ' + error + '\n\nMake sure printer is ON and close to the tablet.');
            }
        );
        
    } catch (error) {
        console.error('Connection error:', error);
        alert('❌ Failed to connect: ' + error.message);
    }
}

// Update printer status in settings
function updatePrinterStatus() {
    const statusEl = document.getElementById('printerStatus');
    if (statusEl) {
        if (isPrinterConnected) {
            statusEl.innerHTML = '✅ Connected - Auto-printing enabled';
            statusEl.style.color = '#27ae60';
        } else {
            statusEl.innerHTML = '⚠️ Not connected - Connect to enable auto-print';
            statusEl.style.color = '#e67e22';
        }
    }
}

// Test print function
function testPrint() {
    if (!isPrinterConnected || !connectedPrinterDevice) {
        alert('❌ Printer not connected!\n\nPlease connect to printer first.');
        return;
    }
    
    console.log('Testing printer connection...');
    
    // Check if connected
    window.bluetoothSerial.isConnected(
        function() {
            // Send test print
            const testData = '\x1B\x40' + // Initialize
                           '\x1B\x61\x01' + // Center align
                           '\x1B\x21\x30' + // Double size
                           'MUGSHOT CAFE\n' +
                           '\x1B\x21\x00' + // Normal size
                           'Test Print Successful!\n' +
                           new Date().toLocaleString() + '\n\n\n' +
                           '\x1D\x56\x41\x03'; // Cut paper
            
            window.bluetoothSerial.write(
                testData,
                function() {
                    alert('✅ Test print sent!\n\nCheck your printer.');
                },
                function(error) {
                    alert('❌ Test print failed: ' + error);
                }
            );
        },
        function() {
            alert('❌ Printer disconnected!\n\nPlease reconnect.');
            isPrinterConnected = false;
            updatePrinterStatus();
        }
    );
}

// Auto-reconnect to saved printer on app start
async function autoConnectPrinter() {
    const savedDevice = localStorage.getItem('thermalPrinterDevice');
    if (savedDevice && window.bluetoothSerial) {
        try {
            const device = JSON.parse(savedDevice);
            
            window.bluetoothSerial.connect(
                device.address,
                function() {
                    connectedPrinterDevice = device;
                    isPrinterConnected = true;
                    updatePrinterStatus();
                    console.log('Auto-connected to thermal printer');
                },
                function(error) {
                    console.log('Auto-connect failed, printer may be off');
                    isPrinterConnected = false;
                    updatePrinterStatus();
                }
            );
        } catch (error) {
            console.log('Auto-connect error:', error);
            isPrinterConnected = false;
            updatePrinterStatus();
        }
    } else {
        updatePrinterStatus();
    }
}

// Disconnect printer
async function disconnectThermalPrinter() {
    try {
        if (connectedPrinterDevice && window.bluetoothSerial) {
            window.bluetoothSerial.disconnect(
                function() {
                    isPrinterConnected = false;
                    connectedPrinterDevice = null;
                    localStorage.removeItem('thermalPrinterDevice');
                    updatePrinterStatus();
                    alert('✅ Printer disconnected');
                },
                function(error) {
                    console.error('Disconnect error:', error);
                    alert('❌ Disconnect failed: ' + error);
                }
            );
        } else {
            isPrinterConnected = false;
            connectedPrinterDevice = null;
            localStorage.removeItem('thermalPrinterDevice');
            updatePrinterStatus();
            alert('✅ Printer disconnected');
        }
    } catch (error) {
        console.error('Disconnect error:', error);
    }
}

// ESC/POS commands for thermal printing
function createESCPOSReceipt(sale) {
    const ESC = '\x1B';
    const GS = '\x1D';
    const LF = '\x0A';
    const date = new Date(sale.date);
    
    let receipt = '';
    
    // Initialize printer
    receipt += ESC + '@'; // Initialize
    receipt += ESC + 'a' + '\x01'; // Center align
    
    // Header
    receipt += ESC + '!' + '\x30'; // Double height + width
    receipt += 'MUGSHOT CAFE' + LF;
    receipt += ESC + '!' + '\x00'; // Normal size
    receipt += 'Thank You for Your Order!' + LF;
    receipt += LF;
    
    // Order number
    receipt += ESC + '!' + '\x20'; // Double width
    receipt += 'Order #' + sale.id + LF;
    receipt += ESC + '!' + '\x00'; // Normal
    receipt += '--------------------------------' + LF;
    
    // Info
    receipt += ESC + 'a' + '\x00'; // Left align
    receipt += 'Date: ' + date.toLocaleDateString() + LF;
    receipt += 'Time: ' + date.toLocaleTimeString() + LF;
    receipt += 'Type: ' + (sale.orderType || 'Dine In') + LF;
    receipt += 'Payment: ' + (sale.paymentMethod || 'Cash') + LF;
    receipt += '--------------------------------' + LF;
    
    // Items
    sale.items.forEach(item => {
        const itemTotal = item.price * item.quantity;
        receipt += item.name + LF;
        receipt += item.quantity + ' x P' + item.price.toFixed(2);
        receipt += ' '.repeat(Math.max(1, 32 - (item.quantity + ' x P' + item.price.toFixed(2) + 'P' + itemTotal.toFixed(2)).length));
        receipt += 'P' + itemTotal.toFixed(2) + LF;
        
        // Add-ons
        if (item.addons && item.addons.length > 0) {
            item.addons.forEach(addon => {
                const addonQty = addon.quantity || 1;
                const addonTotal = addon.price * addonQty;
                receipt += '  + ' + addon.name;
                if (addonQty > 1) receipt += ' (' + addonQty + 'x)';
                receipt += ' +P' + addonTotal.toFixed(2) + LF;
            });
        }
    });
    
    receipt += '--------------------------------' + LF;
    
    // Total
    receipt += ESC + '!' + '\x20'; // Double width
    receipt += 'TOTAL: P' + sale.total.toFixed(2) + LF;
    receipt += ESC + '!' + '\x00'; // Normal
    
    // Footer
    receipt += LF;
    receipt += ESC + 'a' + '\x01'; // Center
    receipt += 'Visit us again soon!' + LF;
    receipt += date.toLocaleTimeString() + LF;
    receipt += LF + LF + LF;
    
    // Cut paper
    receipt += GS + 'V' + '\x41' + '\x03'; // Partial cut
    
    return receipt;
}

// Send data to thermal printer
async function sendToPrinter(data) {
    try {
        if (!isPrinterConnected || !connectedPrinterDevice) {
            console.log('Printer not connected, skipping print');
            return false;
        }
        
        if (!window.bluetoothSerial) {
            console.log('Bluetooth Serial not available');
            return false;
        }
        
        return new Promise((resolve, reject) => {
            window.bluetoothSerial.write(
                data,
                function() {
                    console.log('✅ Data sent to printer');
                    resolve(true);
                },
                function(error) {
                    console.error('Print error:', error);
                    alert('⚠️ Print failed: ' + error + '\n\nCheck if printer is ON and connected.');
                    resolve(false);
                }
            );
        });
        
    } catch (error) {
        console.error('Print error:', error);
        alert('⚠️ Print failed: ' + error.message + '\n\nCheck if printer is ON and connected.');
        return false;
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    // Check if we need to reset (you can trigger this by adding ?reset to URL)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('reset') === 'true') {
        localStorage.clear();
        alert('System reset! Reloading...');
        window.location.href = window.location.pathname;
        return;
    }
    
    // Initialize storage database
    await initDB();
    
    await loadData(); // This will load or initialize products
    loadCategories();
    loadNotifications();
    
    // After products are loaded, update UI
    console.log('Products loaded:', products.length);
    loadProducts(); // Load products into POS UI
    updateCategoryButtons(); // Sync categories with products
    updateCategoryDropdown();
    
    // If still no products, force initialize
    if (products.length === 0) {
        console.warn('No products found, forcing initialization...');
        initializeDefaultProducts();
        saveProducts();
        loadProducts();
    }
    
    updateDateTime();
    setInterval(updateDateTime, 1000);
    updateDashboard();
    loadSalesHistory();
    
    // Auto-connect to thermal printer
    autoConnectPrinter();
    
    // Load dark mode preference
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        const toggle = document.getElementById('darkModeToggle');
        if (toggle) toggle.checked = true;
        
        // Force text colors on page load
        setTimeout(() => {
            document.querySelectorAll('h1, h2, h3, h4, .dashboard-header h2, .section-header h2, .stat-value').forEach(el => {
                el.style.color = '#ffffff';
            });
            document.querySelectorAll('.section-subtitle, .stat-label').forEach(el => {
                el.style.color = '#d0d0d0';
            });
        }, 100);
    }
});

// Date and Time
function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    document.getElementById('dateTime').textContent = now.toLocaleDateString('en-US', options);
}

// Section Navigation
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.main-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionName + '-section').classList.add('active');
    
    // Update sidebar active state
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Reload data for the section
    if (sectionName === 'dashboard') {
        updateDashboard();
    } else if (sectionName === 'products') {
        loadProductsTable();
    } else if (sectionName === 'sales') {
        loadSalesHistory();
    } else if (sectionName === 'pos') {
        // Activate menu item when going back to POS
        document.querySelector('.menu-item').classList.add('active');
    }
}

// Show POS (Menu) - main function to go back to products
function showPOS() {
    showSection('pos');
    
    // Update sidebar active state
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    document.querySelector('.menu-item').classList.add('active');
    
    // Show all products
    const cards = document.querySelectorAll('.product-card-new');
    cards.forEach(card => {
        card.style.display = 'block';
    });
    
    // Update section title
    const titleElement = document.querySelector('.section-title');
    if (titleElement) {
        titleElement.textContent = 'Menu';
    }
    
    // Set "All" category as active
    document.querySelectorAll('.category-tab').forEach(tab => {
        if (tab.textContent.trim() === 'All') {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
}

// Notification system
let notifications = [];

function loadNotifications() {
    const stored = localStorage.getItem('mugshotNotifications');
    if (stored) {
        notifications = JSON.parse(stored);
    }
    updateNotificationBadge();
}

function saveNotifications() {
    localStorage.setItem('mugshotNotifications', JSON.stringify(notifications));
    updateNotificationBadge();
}

function addNotification(message, orderData) {
    const notification = {
        id: Date.now(),
        message: message,
        timestamp: new Date().toISOString(),
        orderData: orderData,
        read: false
    };
    notifications.unshift(notification);
    
    // Keep only last 50 notifications
    if (notifications.length > 50) {
        notifications = notifications.slice(0, 50);
    }
    
    saveNotifications();
}

function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    const unreadCount = notifications.filter(n => !n.read).length;
    if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }
}

function toggleNotifications() {
    // Mark all as read
    notifications.forEach(n => n.read = true);
    saveNotifications();
    
    // Show enhanced notification modal
    showNotificationModal();
}

function showNotificationModal() {
    const recentNotifs = notifications.slice(0, 10);
    
    if (recentNotifs.length === 0) {
        alert('📋 No recent notifications');
        return;
    }
    
    let notifHTML = '<div class="notification-modal-enhanced">';
    notifHTML += '<div class="notification-modal-header">';
    notifHTML += '<h3>📋 Recent Orders</h3>';
    notifHTML += '<button class="notification-close-btn" onclick="closeNotificationModal()">×</button>';
    notifHTML += '</div>';
    notifHTML += '<div class="notification-modal-body">';
    
    recentNotifs.forEach(n => {
        const date = new Date(n.timestamp);
        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const orderType = n.message.includes('Dine In') ? 'Dine In' : n.message.includes('Take Out') ? 'Take Out' : 'Delivery';
        const payment = n.message.match(/₱([\d.]+)/)?.[0] || '';
        const method = n.message.includes('Cash') ? 'Cash' : 'GCash';
        
        // Determine action type from message
        let actionText = 'order completed!';
        let actionIcon = '🍽️';
        if (n.message.includes('deleted')) {
            actionText = 'order deleted!';
            actionIcon = '🗑️';
        } else if (n.message.includes('edited')) {
            actionText = 'order edited!';
            actionIcon = '✏️';
        } else if (orderType === 'Take Out') {
            actionIcon = '🛍️';
        } else if (orderType === 'Delivery') {
            actionIcon = '🚚';
        }
        
        // Get Order ID and items from orderData if available
        const orderId = n.orderData ? n.orderData.id : 'N/A';
        const items = n.orderData && n.orderData.items ? n.orderData.items : [];
        const itemsList = items.map(item => `${item.name} (${item.quantity}x)`).join(', ') || 'No items';
        
        notifHTML += `
            <div class="notification-order-card">
                <div class="notification-order-icon">${actionIcon}</div>
                <div class="notification-order-details">
                    <div class="notification-order-type">${orderType} ${actionText}</div>
                    <div class="notification-order-id" style="font-size: 12px; color: #6c757d; margin: 4px 0;">📋 Order ${orderId}</div>
                    <div class="notification-items" style="font-size: 11px; color: #888; margin: 4px 0; line-height: 1.4;">📦 ${itemsList}</div>
                    <div class="notification-order-meta">
                        <span class="notification-time">⏰ ${timeStr}</span>
                        <span class="notification-payment">${method} payment - ${payment}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    notifHTML += '</div>';
    notifHTML += '<div class="notification-modal-footer">';
    notifHTML += '<button class="btn-ok-notification" onclick="closeNotificationModal()">OK</button>';
    notifHTML += '</div>';
    notifHTML += '</div>';
    
    // Remove existing modal if any
    const existing = document.getElementById('notificationModalOverlay');
    if (existing) existing.remove();
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'notificationModalOverlay';
    overlay.className = 'notification-modal-overlay';
    overlay.innerHTML = notifHTML;
    document.body.appendChild(overlay);
    
    // Animate in
    setTimeout(() => overlay.classList.add('show'), 10);
}

function closeNotificationModal() {
    const overlay = document.getElementById('notificationModalOverlay');
    if (overlay) {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 300);
    }
}

function renderNotifications() {
    const container = document.getElementById('notificationList');
    if (!container) return;
    
    if (notifications.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">No notifications</div>';
        return;
    }
    
    container.innerHTML = notifications.map(n => {
        const date = new Date(n.timestamp);
        return `
            <div class="notification-item ${n.read ? '' : 'unread'}">
                <div class="notification-message">${n.message}</div>
                <div class="notification-time">${date.toLocaleString()}</div>
            </div>
        `;
    }).join('');
}

// Cart Tab Selection
document.addEventListener('DOMContentLoaded', function() {
    // Add click handlers to cart tabs
    setTimeout(() => {
        const cartTabs = document.querySelectorAll('.cart-tab');
        cartTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                cartTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                const orderType = this.textContent.trim();
                showNotification(`Order type changed to: ${orderType}`);
                
                // Update notification badge
                updateNotificationBadge();
            });
        });
    }, 500);
});

// Get trending product IDs based on sales data (top 2-3 per category)
function getTrendingProductIds() {
    // Calculate product sales from sales history
    const productSales = {};
    sales.forEach(sale => {
        sale.items.forEach(item => {
            if (!productSales[item.id]) {
                const productInfo = products.find(p => p.id === item.id);
                productSales[item.id] = { 
                    id: item.id,
                    name: item.name,
                    category: item.category || (productInfo ? productInfo.category : 'Other'),
                    totalQty: 0, 
                    totalRevenue: 0 
                };
            }
            productSales[item.id].totalQty += item.quantity;
            productSales[item.id].totalRevenue += item.price * item.quantity;
        });
    });
    
    // Group by category and get top 2-3 from each
    const categorySales = {};
    Object.values(productSales).forEach(product => {
        if (!categorySales[product.category]) {
            categorySales[product.category] = [];
        }
        categorySales[product.category].push(product);
    });
    
    // Get top 2-3 from each category based on total quantity sold
    const trendingIds = [];
    Object.keys(categorySales).forEach(category => {
        const topProducts = categorySales[category]
            .sort((a, b) => b.totalQty - a.totalQty)
            .slice(0, 3); // Top 3 from each category
        topProducts.forEach(p => trendingIds.push(p.id));
    });
    
    // If no sales data, show 2 products from each existing category
    if (trendingIds.length === 0) {
        const existingCategories = [...new Set(products.map(p => p.category))];
        existingCategories.forEach(cat => {
            const categoryProducts = products.filter(p => p.category === cat).slice(0, 2);
            categoryProducts.forEach(p => trendingIds.push(p.id));
        });
    }
    
    return trendingIds;
}

// Show Trends (now unified with menu - just calls showPOS)
function showTrends() {
    // Trends are now integrated into the menu view
    // Trending products are shown with 🔥 badges automatically
    showPOS();
}

// Toggle Settings Modal
function toggleSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
    }
}

// Reset System - Clear all data and reinitialize
function resetSystem() {
    if (confirm('⚠️ This will clear ALL data (products, sales, notifications) and reload default products. Continue?')) {
        localStorage.clear();
        alert('System reset! Page will reload.');
        window.location.reload();
    }
}

// Export Backup - Download all data as JSON file
function exportBackup() {
    const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        data: {
            products: products,
            sales: sales,
            categories: categories,
            notifications: notifications,
            settings: {
                darkMode: localStorage.getItem('darkMode'),
                orderCounter: localStorage.getItem('orderCounter'),
                lastOrderDate: localStorage.getItem('lastOrderDate')
            }
        }
    };
    
    const dataStr = JSON.stringify(backupData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    
    const date = new Date();
    const filename = `MugShots_Backup_${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.json`;
    link.download = filename;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showNotification('✅ Backup downloaded! Save it safely.', 'success');
}

// Import Backup - Restore data from JSON file
async function importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.json')) {
        alert('⚠️ Please select a valid backup file (.json)');
        return;
    }
    
    if (!confirm('⚠️ This will REPLACE all current data with the backup. Continue?')) {
        event.target.value = ''; // Reset file input
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const backupData = JSON.parse(e.target.result);
            
            // Validate backup structure
            if (!backupData.version || !backupData.data) {
                throw new Error('Invalid backup file format');
            }
            
            // Restore data
            if (backupData.data.products) {
                products = backupData.data.products;
                await saveProductsToStorage(products);
            }
            
            if (backupData.data.sales) {
                sales = backupData.data.sales;
                localStorage.setItem('mugshotSales', JSON.stringify(sales));
            }
            
            if (backupData.data.categories) {
                categories = backupData.data.categories;
                localStorage.setItem('mugshotCategories', JSON.stringify(categories));
            }
            
            if (backupData.data.notifications) {
                notifications = backupData.data.notifications;
                localStorage.setItem('mugshotNotifications', JSON.stringify(notifications));
            }
            
            if (backupData.data.settings) {
                if (backupData.data.settings.darkMode) {
                    localStorage.setItem('darkMode', backupData.data.settings.darkMode);
                }
                if (backupData.data.settings.orderCounter) {
                    localStorage.setItem('orderCounter', backupData.data.settings.orderCounter);
                }
                if (backupData.data.settings.lastOrderDate) {
                    localStorage.setItem('lastOrderDate', backupData.data.settings.lastOrderDate);
                }
            }
            
            alert('✅ Backup restored successfully! Page will reload.');
            window.location.reload();
            
        } catch (error) {
            console.error('Backup import error:', error);
            alert('❌ Failed to restore backup. File may be corrupted or invalid.');
        }
        
        event.target.value = ''; // Reset file input
    };
    
    reader.onerror = function() {
        alert('❌ Failed to read backup file.');
        event.target.value = '';
    };
    
    reader.readAsText(file);
}

// Toggle Dark Mode
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) {
        toggle.checked = isDark;
    }
    
    // Force text colors in dark mode
    if (isDark) {
        document.querySelectorAll('h1, h2, h3, h4, .dashboard-header h2, .section-header h2, .stat-value').forEach(el => {
            el.style.color = '#ffffff';
        });
        document.querySelectorAll('.section-subtitle, .stat-label').forEach(el => {
            el.style.color = '#d0d0d0';
        });
    } else {
        document.querySelectorAll('h1, h2, h3, h4, .dashboard-header h2, .section-header h2, .stat-value, .section-subtitle, .stat-label').forEach(el => {
            el.style.color = '';
        });
    }
}

// Load and Save Data to LocalStorage
async function loadData() {
    const storedSales = localStorage.getItem('mugshotSales');
    
    console.log('Loading data...');
    
    // Load products from new storage system (IndexedDB + localStorage)
    try {
        const loadedProducts = await loadProductsFromStorage();
        if (loadedProducts && loadedProducts.length > 0) {
            // Ensure all products have active and inStock properties
            // Clean up any via.placeholder URLs or empty images
            products = loadedProducts.map(p => ({
                ...p,
                active: p.active !== false,
                inStock: p.inStock !== false,
                image: (p.image && p.image.trim() && !p.image.includes('via.placeholder')) ? p.image : ''
            }));
            console.log('Loaded products from storage:', products.length);
        } else {
            // Initialize with default menu items
            initializeDefaultProducts();
            await saveProductsToStorage(products); // Save immediately after initialization
            console.log('Initialized default products:', products.length);
        }
    } catch (error) {
        console.error('Error loading products:', error);
        initializeDefaultProducts();
        await saveProductsToStorage(products);
        console.log('Initialized default products:', products.length);
    }
    
    if (storedSales) {
        try {
            sales = JSON.parse(storedSales);
        } catch (e) {
            console.error('Error parsing stored sales:', e);
            sales = [];
        }
    }
}

function saveProducts() {
    localStorage.setItem('mugshotProducts', JSON.stringify(products));
}

function saveSales() {
    localStorage.setItem('mugshotSales', JSON.stringify(sales));
}

// Clear all sales data
function clearAllSales() {
    if (confirm('⚠️ Are you sure you want to delete ALL sales data?\n\nThis will:\n- Clear all transactions\n- Reset order counter\n- Clear sales history\n\nThis action CANNOT be undone!')) {
        if (confirm('Final confirmation: Delete ALL sales data?')) {
            // Clear sales array
            sales = [];
            saveSales();
            
            // Reset order counter
            localStorage.setItem('orderCounter', '0');
            localStorage.setItem('lastOrderDate', '');
            
            // Clear notifications
            notifications = [];
            saveNotifications();
            
            // Update all displays
            updateDashboard();
            loadHistory();
            updateNotificationCount();
            
            alert('✅ All sales data has been cleared successfully!');
        }
    }
}

// Initialize default products (empty - will load from localStorage)
function initializeDefaultProducts() {
    products = [];
}

// Products Display
function loadProducts() {
    try {
        console.log('loadProducts called');
        const grid = document.getElementById('productsGrid');
        
        if (!grid) {
            console.error('productsGrid element not found!');
            alert('Products display error: grid not found');
            return;
        }
        
        grid.innerHTML = '';
        
        if (products.length === 0) {
            console.warn('No products available');
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;">No products available.</div>';
            return;
        }
        
        const availableProducts = products.filter(p => p.active !== false);
        console.log('Available products:', availableProducts.length);
        
        availableProducts.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card-new';
            card.setAttribute('data-category', product.category);
            
            if (product.inStock === false) {
                card.classList.add('out-of-stock');
            }
            
            const defaultPlaceholder = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22140%22%20height%3D%22140%22%3E%3Crect%20fill%3D%22%23f0e9e3%22%20width%3D%22140%22%20height%3D%22140%22/%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%22%20font-size%3D%2240%22%20fill%3D%22%23d4a574%22%3E%E2%98%95%3C/text%3E%3C/svg%3E';
            
            let imgSrc = defaultPlaceholder;
            if (product.image && product.image.trim()) {
                imgSrc = product.image;
            }
            
            card.innerHTML = `
                ${product.inStock === false ? '<div class="out-of-stock-badge">Out of stock</div>' : ''}
                <div class="product-image-container" data-product-id="${product.id}" style="cursor: pointer;">
                    <img src="${imgSrc}" alt="${product.name}" class="product-image-new" loading="lazy">
                </div>
                <h3 class="product-title">${product.name}</h3>
                <p class="product-price">₱${product.price.toFixed(2)}</p>
            `;
            
            // Add click event listener to the image container
            const imageContainer = card.querySelector('.product-image-container');
            if (imageContainer) {
                imageContainer.addEventListener('click', function() {
                    console.log('Product clicked, ID:', product.id);
                    addToCartNew(product.id);
                });
            } else {
                console.error('Image container not found for product:', product.name);
            }
            
            grid.appendChild(card);
        });
        
        console.log('loadProducts completed, products added:', availableProducts.length);
    } catch (error) {
        console.error('Error in loadProducts:', error);
        alert('Error loading products: ' + error.message);
    }
}

// Quantity controls
function increaseQty(productId) {
    const qtySpan = document.querySelector(`.qty-num[data-id="${productId}"]`);
    if (qtySpan) {
        let qty = parseInt(qtySpan.textContent);
        qtySpan.textContent = qty + 1;
    }
}

function decreaseQty(productId) {
    const qtySpan = document.querySelector(`.qty-num[data-id="${productId}"]`);
    if (qtySpan) {
        let qty = parseInt(qtySpan.textContent);
        if (qty > 1) qtySpan.textContent = qty - 1;
    }
}

// Add to cart by clicking product image (adds 1 item each click)
function addToCartNew(productId) {
    try {
        console.log('addToCartNew called with productId:', productId);
        console.log('Current cart:', cart);
        console.log('Products array:', products);
        
        const product = products.find(p => p.id === productId);
        if (!product) {
            console.error('Product not found with id:', productId);
            alert('Product not found!');
            return;
        }
        
        console.log('Product found:', product);
        
        // Check if product is out of stock
        if (product.inStock === false) {
            showNotification(`⚠️ ${product.name} is currently out of stock`, 'warning');
            return;
        }
        
        // Categories that have add-ons
        const categoriesWithAddons = ['MilkTea Series'];
        const mealCategories = ['Solo Meals', 'Mugshot Silog', 'mugshot rice bowls', 'Ala Carte'];
        const burgerCategories = ['Burger'];
        const allAddonCategories = [...categoriesWithAddons, ...mealCategories, ...burgerCategories];
        
        // Check if product category has add-ons OR specific product name
        const isPancakePlain = product.name === 'Pancake (Plain)';
        
        if (allAddonCategories.includes(product.category) || isPancakePlain) {
            console.log('Showing add-ons modal for category:', product.category);
            showAddOnsModal(product);
            return;
        }
        
        const existingItem = cart.find(item => item.id === productId);
        
        if (existingItem) {
            existingItem.quantity += 1;
            console.log('Increased quantity for existing item:', existingItem);
        } else {
            const newItem = {
                id: product.id,
                name: product.name,
                price: product.price,
                category: product.category,
                quantity: 1
            };
            cart.push(newItem);
            console.log('Added new item to cart:', newItem);
        }
        
        console.log('Cart after adding:', cart);
        console.log('Calling updateCart()...');
        updateCart();
        showNotification(` ${product.name} added to cart`);
    } catch (error) {
        console.error('Error in addToCartNew:', error);
        alert('Error adding to cart: ' + error.message);
    }
}

// Add-ons for MilkTea Series
const milkTeaAddOns = [
    { id: 'pearls', name: 'Pearls', price: 15 },
    { id: 'popping_bobba', name: 'Popping Bobba', price: 15 },
    { id: 'natade_coco', name: 'Natade Coco', price: 15 },
];

// Add-ons for Meals (SOLO MEALS, Mugshot Silog, mugshot rice bowls, Ala Carte)
const mealAddOns = [
    { id: 'slice_cheese', name: 'Slice Cheese', price: 15, category: 'Add on' },
    { id: 'rice', name: 'Rice', price: 20, category: 'Add on' },
    { id: 'egg', name: 'Egg', price: 20, category: 'Add on' },
    { id: 'beef', name: 'Beef (Shawarma Wrap and Rice)', price: 25, category: 'Add on' },
    { id: 'bottled_water', name: 'Bottled Water', price: 20, category: 'Others' },
    { id: 'coke_can', name: 'Coke (can)', price: 65, category: 'Others' },
];

// Add-ons for Snacks
const snackAddOns = [
    { id: 'cheese_filling', name: 'Cheese', price: 10, category: 'Add on Filling' },
    { id: 'biscoff_filling', name: 'Biscoff', price: 25, category: 'Add on Filling' },
    { id: 'nutella_filling', name: 'Nutella', price: 25, category: 'Add on Filling' },
];

// Add-ons for Burger
const burgerAddOns = [
    { id: 'slice_cheese_burger', name: 'Slice Cheese', price: 15, category: 'Extras' },
    { id: 'fried_egg', name: 'Fried Egg', price: 20, category: 'Extras' },
    { id: 'bacon', name: 'Bacon', price: 25, category: 'Extras' },
];

function showAddOnsModal(product) {
    // Determine which add-ons to show based on category or product name
    const mealCategories = ['Solo Meals', 'Mugshot Silog', 'mugshot rice bowls', 'Ala Carte'];
    const burgerCategories = ['Burger'];
    
    const isMealCategory = mealCategories.includes(product.category);
    const isPancakePlain = product.name === 'Pancake (Plain)';
    const isBurgerCategory = burgerCategories.includes(product.category);
    
    let emoji = '🧋'; // Default
    let selectedAddOns = milkTeaAddOns; // Default
    
    if (isMealCategory) {
        emoji = '🍽️';
        selectedAddOns = mealAddOns;
    } else if (isPancakePlain) {
        emoji = '🥞';
        selectedAddOns = snackAddOns;
    } else if (isBurgerCategory) {
        emoji = '🍔';
        selectedAddOns = burgerAddOns;
    }
    
    let addonsHTML = '';
    
    if (isMealCategory || isPancakePlain || isBurgerCategory) {
        // Show add-ons with sections and quantity
        const sections = {};
        
        // Group add-ons by category
        selectedAddOns.forEach(addon => {
            const cat = addon.category || 'Add on';
            if (!sections[cat]) sections[cat] = [];
            sections[cat].push(addon);
        });
        
        // Generate HTML for each section
        Object.keys(sections).forEach(sectionName => {
            addonsHTML += `<h4 class="addons-section-title">${sectionName}:</h4>`;
            sections[sectionName].forEach(addon => {
                addonsHTML += `
                    <div class="addon-item-with-qty" style="padding: 14px 0; display: flex; justify-content: space-between; align-items: center;">
                        <div class="addon-info" style="display: flex; flex-direction: column; gap: 4px;">
                            <span class="addon-name" style="font-size: 15px; font-weight: 500;">${addon.name}</span>
                            <span class="addon-price" style="font-size: 14px; color: #d4a574; font-weight: 600;">₱${addon.price.toFixed(2)}</span>
                        </div>
                        <div class="addon-qty-controls" style="display: flex; align-items: center; gap: 12px;">
                            <button class="qty-btn minus" onclick="changeAddonQty('${addon.id}', -1)" style="width: 42px; height: 42px; font-size: 20px; border-radius: 8px; border: 2px solid #d4a574; background: white; color: #d4a574; cursor: pointer; font-weight: bold;">-</button>
                            <input type="number" class="addon-qty" id="qty-${addon.id}" value="0" min="0" data-id="${addon.id}" data-name="${addon.name}" data-price="${addon.price}" onchange="updateAddonsTotal()" style="width: 70px; height: 42px; font-size: 16px; text-align: center; border: 2px solid #e0e0e0; border-radius: 8px;">
                            <button class="qty-btn plus" onclick="changeAddonQty('${addon.id}', 1)" style="width: 42px; height: 42px; font-size: 20px; border-radius: 8px; border: none; background: #d4a574; color: white; cursor: pointer; font-weight: bold;">+</button>
                        </div>
                    </div>`;
            });
        });
    } else {
        // Show milk tea add-ons with quantity
        addonsHTML = milkTeaAddOns.map(addon => `
            <div class="addon-item-with-qty" style="padding: 14px 0; display: flex; justify-content: space-between; align-items: center;">
                <div class="addon-info" style="display: flex; flex-direction: column; gap: 4px;">
                    <span class="addon-name" style="font-size: 15px; font-weight: 500;">${addon.name}</span>
                    <span class="addon-price" style="font-size: 14px; color: #d4a574; font-weight: 600;">₱${addon.price.toFixed(2)}</span>
                </div>
                <div class="addon-qty-controls" style="display: flex; align-items: center; gap: 12px;">
                    <button class="qty-btn minus" onclick="changeAddonQty('${addon.id}', -1)" style="width: 42px; height: 42px; font-size: 20px; border-radius: 8px; border: 2px solid #d4a574; background: white; color: #d4a574; cursor: pointer; font-weight: bold;">-</button>
                    <input type="number" class="addon-qty" id="qty-${addon.id}" value="0" min="0" data-id="${addon.id}" data-name="${addon.name}" data-price="${addon.price}" onchange="updateAddonsTotal()" style="width: 70px; height: 42px; font-size: 16px; text-align: center; border: 2px solid #e0e0e0; border-radius: 8px;">
                    <button class="qty-btn plus" onclick="changeAddonQty('${addon.id}', 1)" style="width: 42px; height: 42px; font-size: 20px; border-radius: 8px; border: none; background: #d4a574; color: white; cursor: pointer; font-weight: bold;">+</button>
                </div>
            </div>
        `).join('');
    }
    
    const modalHTML = `
        <div class="addons-modal-overlay" id="addonsModalOverlay">
            <div class="addons-modal">
                <div class="addons-header">
                    <h3>${emoji} Customize Your ${product.name}</h3>
                    <button class="close-btn" id="closeAddonsBtn">&times;</button>
                </div>
                <div class="addons-body">
                    <p class="addons-subtitle">Select your add-ons (optional)</p>
                    <div class="addons-list">
                        ${addonsHTML}
                    </div>
                    <div class="addons-summary">
                        <div class="summary-item">
                            <span>Base Price:</span>
                            <span>₱${product.price.toFixed(2)}</span>
                        </div>
                        <div class="summary-item" id="addonsTotalRow" style="display: none;">
                            <span>Add-ons:</span>
                            <span id="addonsTotal">₱0.00</span>
                        </div>
                        <div class="summary-item total-item">
                            <span>Total:</span>
                            <span id="itemTotal">₱${product.price.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                <div class="addons-footer">
                    <button class="btn-skip" id="skipAddonsBtn" data-product-id="${product.id}">Skip Add-ons</button>
                    <button class="btn-add-to-cart" id="addToCartWithAddonsBtn" data-product-id="${product.id}">Add to Cart</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listener to close button
    document.getElementById('closeAddonsBtn').addEventListener('click', function() {
        closeAddOnsModal();
    });
    
    // Add event listener to overlay (click outside to close)
    document.getElementById('addonsModalOverlay').addEventListener('click', function(event) {
        if (event.target === this) {
            closeAddOnsModal();
        }
    });
    
    // Add event listener to skip button
    document.getElementById('skipAddonsBtn').addEventListener('click', function() {
        addToCartSkipAddons(parseInt(this.getAttribute('data-product-id')));
    });
    
    // Add event listener to add to cart button
    document.getElementById('addToCartWithAddonsBtn').addEventListener('click', function() {
        addToCartWithAddons(parseInt(this.getAttribute('data-product-id')));
    });
    
    setTimeout(() => {
        document.getElementById('addonsModalOverlay').classList.add('show');
    }, 10);
}

// Function to change addon quantity
function changeAddonQty(addonId, change) {
    const input = document.getElementById(`qty-${addonId}`);
    const currentValue = parseInt(input.value) || 0;
    const newValue = Math.max(0, currentValue + change);
    input.value = newValue;
    updateAddonsTotal();
}

function updateAddonsTotal() {
    const product = products.find(p => {
        const modal = document.querySelector('.addons-header h3');
        if (modal) {
            const productName = modal.textContent.replace(/^[🧋🍽️🥞🍔]\s+Customize Your /, '');
            return p.name === productName;
        }
        return false;
    });
    
    if (!product) return;
    
    let addonsTotal = 0;
    const selectedAddons = [];
    
    document.querySelectorAll('.addon-qty').forEach(input => {
        const qty = parseInt(input.value) || 0;
        if (qty > 0) {
            const price = parseFloat(input.dataset.price);
            addonsTotal += price * qty;
            selectedAddons.push({
                id: input.dataset.id,
                name: input.dataset.name,
                price: price,
                quantity: qty
            });
        }
    });
    
    const total = product.price + addonsTotal;
    
    document.getElementById('addonsTotal').textContent = `₱${addonsTotal.toFixed(2)}`;
    document.getElementById('itemTotal').textContent = `₱${total.toFixed(2)}`;
    
    if (addonsTotal > 0) {
        document.getElementById('addonsTotalRow').style.display = 'flex';
    } else {
        document.getElementById('addonsTotalRow').style.display = 'none';
    }
}

function addToCartSkipAddons(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existingItem = cart.find(item => item.id === productId && !item.addons);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            category: product.category,
            quantity: 1
        });
    }
    
    closeAddOnsModal();
    updateCart();
    showNotification(` ${product.name} added to cart`);
}

function addToCartWithAddons(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const selectedAddons = [];
    let addonsPrice = 0;
    
    document.querySelectorAll('.addon-qty').forEach(input => {
        const qty = parseInt(input.value) || 0;
        if (qty > 0) {
            const price = parseFloat(input.dataset.price);
            const addon = {
                id: input.dataset.id,
                name: input.dataset.name,
                price: price,
                quantity: qty
            };
            selectedAddons.push(addon);
            addonsPrice += price * qty;
        }
    });
    
    const totalPrice = product.price + addonsPrice;
    
    // Check if same product with same addons exists
    const existingItem = cart.find(item => {
        if (item.id !== productId) return false;
        if (!item.addons && selectedAddons.length === 0) return true;
        if (!item.addons || !selectedAddons) return false;
        if (item.addons.length !== selectedAddons.length) return false;
        
        // Check if all addons match (including quantities)
        return item.addons.every(addon => {
            const match = selectedAddons.find(a => a.id === addon.id);
            return match && match.quantity === addon.quantity;
        });
    });
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: totalPrice,
            basePrice: product.price,
            category: product.category,
            quantity: 1,
            addons: selectedAddons.length > 0 ? selectedAddons : undefined
        });
    }
    
    closeAddOnsModal();
    updateCart();
    
    const addonsText = selectedAddons.length > 0 
        ? ` with ${selectedAddons.map(a => a.quantity > 1 ? `${a.name} (${a.quantity}x)` : a.name).join(', ')}` 
        : '';
    showNotification(` ${product.name}${addonsText} added to cart`);
}

function closeAddOnsModal() {
    const overlay = document.getElementById('addonsModalOverlay');
    if (overlay) {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 300);
    }
}

function searchProducts() {
    const searchTerm = document.getElementById('searchProduct').value.toLowerCase();
    const cards = document.querySelectorAll('.product-card-new');
    
    cards.forEach(card => {
        const productName = card.querySelector('.product-title').textContent.toLowerCase();
        if (productName.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Filter products by category
function filterCategory(category, event) {
    // Prevent default behavior
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    // Use requestAnimationFrame to batch DOM updates
    requestAnimationFrame(() => {
        // Update active button - only change what's needed
        const buttons = document.querySelectorAll('.category-tab');
        buttons.forEach(btn => {
            const isTargetButton = (category === 'all' && btn.textContent.trim() === 'All') || 
                                  btn.textContent.trim() === category;
            
            if (isTargetButton && !btn.classList.contains('active')) {
                btn.classList.add('active');
            } else if (!isTargetButton && btn.classList.contains('active')) {
                btn.classList.remove('active');
            }
        });
        
        // Update section title based on category (keep consistent without emojis)
        const titleElement = document.querySelector('.section-title');
        if (titleElement) {
            const newTitle = category === 'all' ? 'Menu' : category;
            if (titleElement.textContent !== newTitle) {
                titleElement.textContent = newTitle;
            }
        }
        
        // Filter products by category (case-insensitive comparison)
        const cards = document.querySelectorAll('.product-card-new');
        cards.forEach(card => {
            const cardCategory = card.getAttribute('data-category');
            const shouldShow = (category === 'all' || 
                              (cardCategory && cardCategory.toLowerCase() === category.toLowerCase()));
            const currentDisplay = card.style.display;
            const newDisplay = shouldShow ? 'block' : 'none';
            
            if (currentDisplay !== newDisplay) {
                card.style.display = newDisplay;
            }
        });
    });
}

// Cart Management
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1
        });
    }
    
    updateCart();
    
    // Show feedback notification
    showNotification(` ${product.name} added to cart`);
}

function updateCart() {
    try {
        console.log('updateCart called');
        const cartItemsDiv = document.getElementById('cartItems');
        console.log('cartItems div:', cartItemsDiv);
        
        if (!cartItemsDiv) {
            console.error('cartItems div not found!');
            alert('Cart display error: element not found');
            return;
        }
        
        console.log('Current cart length:', cart.length);
        
        if (cart.length === 0) {
            cartItemsDiv.innerHTML = '<p class="empty-cart">Cart is empty</p>';
            document.getElementById('subtotal').textContent = '₱0.00';
            document.getElementById('total').textContent = '₱0.00';
            updateNotificationBadge();
            console.log('Cart is empty, display updated');
            return;
        }
        
        cartItemsDiv.innerHTML = '';
        console.log('Building cart items...');
        
        cart.forEach((item, index) => {
            console.log('Adding cart item:', item, 'at index:', index);
            const itemDiv = document.createElement('div');
            itemDiv.className = 'cart-item-new';
            
            // Build add-ons text if available
            let addonsText = '';
            if (item.addons && item.addons.length > 0) {
                addonsText = `<p class="cart-item-addons">+ ${item.addons.map(a => 
                    a.quantity > 1 ? `${a.name} (${a.quantity}x)` : a.name
                ).join(', ')}</p>`;
            }
            
            itemDiv.innerHTML = `
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Crect fill='%23f0e9e3' width='60' height='60' rx='8'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='24'%3E☕%3C/text%3E%3C/svg%3E" alt="${item.name}" class="cart-item-img">
                <div class="cart-item-info-new">
                    <h4>${item.name}</h4>
                    ${addonsText}
                    <p class="cart-item-price">₱${item.price.toFixed(2)}</p>
                </div>
                <div class="cart-item-qty">
                    <button class="cart-qty-btn cart-qty-minus" data-index="${index}">−</button>
                    <span>${item.quantity}</span>
                    <button class="cart-qty-btn cart-qty-plus" data-index="${index}">+</button>
                </div>
            `;
            
            // Add event listeners directly to buttons
            const minusBtn = itemDiv.querySelector('.cart-qty-minus');
            const plusBtn = itemDiv.querySelector('.cart-qty-plus');
            
            if (minusBtn && plusBtn) {
                minusBtn.addEventListener('click', function() {
                    console.log('Minus clicked for index:', index);
                    decreaseQuantity(parseInt(this.getAttribute('data-index')));
                });
                
                plusBtn.addEventListener('click', function() {
                    console.log('Plus clicked for index:', index);
                    increaseQuantity(parseInt(this.getAttribute('data-index')));
                });
            } else {
                console.error('Button not found for item:', item);
            }
            
            cartItemsDiv.appendChild(itemDiv);
        });
        
        console.log('Cart items built, updating summary...');
        updateCartSummary();
        updateNotificationBadge();
        console.log('updateCart completed successfully');
    } catch (error) {
        console.error('Error in updateCart:', error);
        alert('Error updating cart display: ' + error.message);
    }
}

function increaseQuantity(itemIndex) {
    if (cart[itemIndex]) {
        cart[itemIndex].quantity++;
        updateCart();
    }
}

function decreaseQuantity(itemIndex) {
    if (cart[itemIndex]) {
        if (cart[itemIndex].quantity > 1) {
            cart[itemIndex].quantity--;
        } else {
            // Remove item from cart when quantity is 1
            cart.splice(itemIndex, 1);
        }
        updateCart();
    }
}

function removeFromCart(itemIndex) {
    cart.splice(itemIndex, 1);
    updateCart();
}

function clearCart() {
    if (cart.length === 0) return;
    
    if (confirm('Are you sure you want to clear the cart?')) {
        cart = [];
        updateCart();
    }
}

function updateCartSummary() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal;
    
    document.getElementById('subtotal').textContent = '₱' + subtotal.toFixed(2);
    document.getElementById('total').textContent = '₱' + total.toFixed(2);
}

// Checkout
function processCheckout() {
    if (cart.length === 0) {
        alert('Cart is empty!');
        return;
    }
    
    // Get selected order type from cart tabs
    const selectedTab = document.querySelector('.cart-tab.active');
    const orderType = selectedTab ? selectedTab.textContent.trim() : 'Dine In';
    
    // Update order type display
    const orderTypeDisplay = document.getElementById('selectedOrderType');
    if (orderTypeDisplay) orderTypeDisplay.textContent = orderType;
    
    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal;
    
    // Update payment modal totals
    document.getElementById('paymentSubtotal').textContent = '₱' + subtotal.toFixed(2);
    document.getElementById('paymentTotal').textContent = '₱' + total.toFixed(2);
    
    // Show notification about order type
    showNotification(`📋 Order Type: ${orderType}`);
    
    // Show payment method modal
    document.getElementById('paymentModal').style.display = 'block';
}

function closePaymentModal() {
    document.getElementById('paymentModal').style.display = 'none';
}

let pendingPaymentMethod = null;

function selectPayment(method) {
    console.log('selectPayment called with method:', method);
    const methodName = method === 'cash' ? 'Cash' : 'GCash';
    console.log('Setting pendingPaymentMethod to:', methodName);
    pendingPaymentMethod = methodName;
    
    // Get order type
    const selectedTab = document.querySelector('.cart-tab.active');
    const orderType = selectedTab ? selectedTab.textContent.trim() : 'Dine In';
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Show custom confirmation modal
    document.getElementById('confirmMethod').textContent = methodName;
    document.getElementById('confirmOrderType').textContent = orderType;
    document.getElementById('confirmTotal').textContent = `₱${subtotal.toFixed(2)}`;
    document.getElementById('confirmPaymentModal').style.display = 'block';
}

function closeConfirmPaymentModal() {
    document.getElementById('confirmPaymentModal').style.display = 'none';
    // Don't reset pendingPaymentMethod here - it will be reset after sale is created
}

function cancelConfirmPayment() {
    closeConfirmPaymentModal();
    pendingPaymentMethod = null; // Reset when user cancels
}

function confirmPaymentAction() {
    console.log('confirmPaymentAction called, pendingPaymentMethod is:', pendingPaymentMethod);
    if (!pendingPaymentMethod) return;
    
    closeConfirmPaymentModal();
    closePaymentModal();
    
    // Get order type
    const selectedTab = document.querySelector('.cart-tab.active');
    const orderType = selectedTab ? selectedTab.textContent.trim() : 'Dine In';
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal;
    
    const sale = {
        id: editingOrderId || generateDailyOrderId(),  // Use existing ID if editing, otherwise generate new
        date: new Date().toISOString(),
        items: [...cart],
        total: total,
        orderType: orderType,
        paymentMethod: pendingPaymentMethod
    };
    
    console.log('Creating sale with payment method:', pendingPaymentMethod);
    console.log('Sale object:', sale);
    
    sales.push(sale);
    saveSales();
    
    // Store as last sale for reprinting
    lastSale = sale;
    
    // Create detailed notification message with product names and add-ons
    const itemsList = sale.items.map(item => {
        let itemText = `${item.name} (${item.quantity}x)`;
        if (item.addons && item.addons.length > 0) {
            const addonsText = item.addons.map(a => a.name).join(', ');
            itemText += ` + ${addonsText}`;
        }
        return itemText;
    }).join(', ');
    
    // Check if we're editing an existing order or creating a new one
    if (editingOrderId) {
        // Update existing notification instead of creating a new one
        const notificationIndex = notifications.findIndex(n => n.orderData && (n.orderData.id === editingOrderId || n.orderData.id === parseInt(editingOrderId)));
        if (notificationIndex !== -1) {
            const notifMessage = `✏️ Order ${sale.id} edited! ${orderType} - ${itemsList} - ${pendingPaymentMethod} - ₱${total.toFixed(2)}`;
            notifications[notificationIndex].message = notifMessage;
            notifications[notificationIndex].orderData = { ...sale };
            notifications[notificationIndex].timestamp = new Date().toISOString();
            saveNotifications();
        } else {
            // Notification doesn't exist, create one with edit flag
            const notifMessage = `✏️ Order ${sale.id} edited! ${orderType} - ${itemsList} - ${pendingPaymentMethod} - ₱${total.toFixed(2)}`;
            addNotification(notifMessage, sale);
        }
    } else {
        // New order - create notification with completion message
        const notifMessage = `🎉 ${orderType} order completed! Order ${sale.id} - ${itemsList} - ${pendingPaymentMethod} payment - ₱${total.toFixed(2)}`;
        addNotification(notifMessage, sale);
    }
    
    showReceipt(sale);
    cart = [];
    updateCart();
    updateDashboard();
    
    showNotification(`🎉 Order ${sale.id} completed! Payment via ${pendingPaymentMethod}`);
    pendingPaymentMethod = null;
    editingOrderId = null;  // Reset editing flag after order is complete
}

async function printReceiptThermal(sale) {
    console.log('printReceiptThermal called with sale:', sale);
    console.log('Payment method in thermal print:', sale.paymentMethod);
    console.log('Printer connected:', isPrinterConnected);
    console.log('Connected device:', connectedPrinterDevice);
    
    // Check if printer is still connected before printing
    if (isPrinterConnected && connectedPrinterDevice && window.bluetoothSerial) {
        // Verify connection is still active
        window.bluetoothSerial.isConnected(
            async function() {
                // Still connected, proceed with printing
                console.log('✅ Printer is connected, starting print...');
                try {
                    const escposData = createESCPOSReceipt(sale);
                    
                    // Print first copy
                    console.log('Sending copy 1...');
                    const success1 = await sendToPrinter(escposData);
                    
                    if (success1) {
                        console.log('✅ Copy 1 sent to thermal printer');
                        
                        // Wait 1 second before printing second copy
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                        // Print second copy
                        console.log('Sending copy 2...');
                        const success2 = await sendToPrinter(escposData);
                        
                        if (success2) {
                            console.log('✅ Copy 2 sent to thermal printer');
                        }
                    }
                } catch (error) {
                    console.error('Thermal print error:', error);
                    alert('⚠️ Print failed: ' + error + '\n\nTrying to reconnect...');
                    
                    // Try to reconnect
                    isPrinterConnected = false;
                    autoConnectPrinter();
                }
            },
            function() {
                // Connection lost, try to reconnect
                console.log('❌ Printer disconnected, trying to reconnect...');
                alert('⚠️ Printer disconnected!\n\nReconnecting...');
                isPrinterConnected = false;
                autoConnectPrinter();
            }
        );
    } else {
        console.log('⚠️ Printer not connected, skipping thermal print');
    }
}

// Test print function
function testPrint() {
    if (!isPrinterConnected || !connectedPrinterDevice) {
        alert('❌ Printer not connected!\n\nPlease connect to printer first.');
        return;
    }
    
    console.log('Testing printer connection...');
    
    // Check if connected
    window.bluetoothSerial.isConnected(
        function() {
            // Send test print
            const testData = '\x1B\x40' + // Initialize
                           '\x1B\x61\x01' + // Center align
                           '\x1B\x21\x30' + // Double size
                           'MUGSHOT CAFE\n' +
                           '\x1B\x21\x00' + // Normal size
                           'Test Print Successful!\n' +
                           new Date().toLocaleString() + '\n\n\n' +
                           '\x1D\x56\x41\x03'; // Cut paper
            
            window.bluetoothSerial.write(
                testData,
                function() {
                    alert('✅ Test print sent!\n\nCheck your printer.');
                },
                function(error) {
                    alert('❌ Test print failed: ' + error);
                }
            );
        },
        function() {
            alert('❌ Printer disconnected!\n\nPlease reconnect.');
            isPrinterConnected = false;
            updatePrinterStatus();
        }
    );
}

function showReceipt(sale, isViewingHistory = false) {
    console.log('showReceipt called with sale:', sale);
    console.log('Payment method in sale:', sale.paymentMethod);
    
    // Store the sale being viewed for printing
    currentViewedSale = sale;
    
    const modal = document.getElementById('receiptModal');
    const receiptContent = document.getElementById('receiptContent');
    
    // Hide/show buttons based on whether viewing from history
    const editBtn = modal.querySelector('.btn-secondary');
    const newOrderBtn = modal.querySelector('.btn-new-order');
    if (editBtn) editBtn.style.display = isViewingHistory ? 'none' : 'inline-block';
    if (newOrderBtn) newOrderBtn.style.display = isViewingHistory ? 'none' : 'inline-block';
    
    const date = new Date(sale.date);
    
    let itemsHTML = '';
    sale.items.forEach(item => {
        const itemTotal = item.price * item.quantity;
        let addonsHTML = '';
        if (item.addons && item.addons.length > 0) {
            const addonsList = item.addons.map(a => {
                const qtyText = a.quantity > 1 ? ` (${a.quantity}x)` : '';
                return `${a.name}${qtyText} (+₱${(a.price * (a.quantity || 1)).toFixed(2)})`;
            }).join(', ');
            addonsHTML = `<div style="font-size: 11px; color: #999; margin-top: 2px;">+ ${addonsList}</div>`;
        }
        itemsHTML += `
            <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                    <div style="font-weight: 600; margin-bottom: 2px;">${item.name}</div>
                    ${addonsHTML}
                    <div style="font-size: 12px; color: #666;">${item.quantity} x ₱${item.price.toFixed(2)}</div>
                </td>
                <td style="padding: 8px 0; text-align: right; font-weight: 700; border-bottom: 1px solid #f0f0f0;">₱${itemTotal.toFixed(2)}</td>
            </tr>
        `;
    });
    
    receiptContent.innerHTML = `
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px dashed #dee2e6;">
            <img src="img/mugshot.jpg" alt="MugShots Cafe" style="width: 80px; height: 80px; border-radius: 12px; margin-bottom: 10px;">
            <h2 style="margin: 8px 0 4px 0; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">MUGSHOT CAFE</h2>
            <p style="margin: 0; font-size: 13px; color: #666;">Thank You for Your Order!</p>
        </div>
        
        <div style="padding: 20px 0; border-bottom: 2px dashed #dee2e6;">
            <div style="text-align: center; margin-bottom: 15px;">
                <strong style="font-size: 16px;">Order #${sale.id}</strong>
            </div>
            <table style="width: 100%; font-size: 13px;">
                <tr>
                    <td style="padding: 5px 0; width: 100px;"><strong>Date:</strong></td>
                    <td style="padding: 5px 0;">${date.toLocaleDateString()}</td>
                </tr>
                <tr>
                    <td style="padding: 5px 0;"><strong>Time:</strong></td>
                    <td style="padding: 5px 0;">${date.toLocaleTimeString()}</td>
                </tr>
                <tr>
                    <td style="padding: 5px 0;"><strong>Type:</strong></td>
                    <td style="padding: 5px 0;">${sale.orderType || 'Dine In'}</td>
                </tr>
                <tr>
                    <td style="padding: 5px 0;"><strong>Payment:</strong></td>
                    <td style="padding: 5px 0;">${sale.paymentMethod || 'Cash'}</td>
                </tr>
            </table>
        </div>
        
        <div style="padding: 20px 0;">
            <table style="width: 100%; font-size: 14px;">
                <thead>
                    <tr>
                        <th style="text-align: left; padding-bottom: 12px; border-bottom: 2px solid #333; font-weight: 700;">Item</th>
                        <th style="text-align: right; padding-bottom: 12px; border-bottom: 2px solid #333; font-weight: 700;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHTML}
                </tbody>
            </table>
        </div>
        
        <div style="border-top: 2px dashed #dee2e6; padding-top: 15px; margin-top: 10px;">
            <table style="width: 100%; font-size: 15px;">
                <tr>
                    <td style="padding: 8px 0;"><strong>SUBTOTAL:</strong></td>
                    <td style="text-align: right; padding: 8px 0;"><strong>₱${sale.total.toFixed(2)}</strong></td>
                </tr>
                <tr style="border-top: 2px solid #333;">
                    <td style="padding: 12px 0 8px 0; font-size: 18px;"><strong>TOTAL:</strong></td>
                    <td style="text-align: right; padding: 12px 0 8px 0; font-size: 18px;"><strong>₱${sale.total.toFixed(2)}</strong></td>
                </tr>
            </table>
        </div>
        
        <div style="text-align: center; margin-top: 25px; padding-top: 20px; border-top: 2px dashed #dee2e6;">
            <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">Visit us again soon!</p>
            <p style="margin: 0; font-size: 11px; color: #999;">Transaction completed at ${date.toLocaleTimeString()}</p>
        </div>
    `;
    
    modal.style.display = 'block';
}

function closeReceiptModal() {
    document.getElementById('receiptModal').style.display = 'none';
    currentViewedSale = null; // Clear when closing
}

// Manual print button - prints to thermal printer
// Track currently viewed sale for printing from history
let currentViewedSale = null;

function printReceipt() {
    const saleToPrint = currentViewedSale || lastSale;
    if (saleToPrint) {
        printReceiptThermal(saleToPrint);
        showNotification('🖨️ Sending to printer...', 'info');
    } else {
        showNotification('⚠️ No receipt to print', 'warning');
    }
}

// Track if we're editing an existing order
let editingOrderId = null;

function editLastOrder() {
    if (!lastSale) {
        showNotification('⚠️ No order to edit', 'warning');
        return;
    }
    
    // Store the order ID we're editing
    editingOrderId = lastSale.id;
    
    // Remove the sale from history since we're editing it
    const saleIndex = sales.findIndex(s => s.id === lastSale.id);
    if (saleIndex !== -1) {
        sales.splice(saleIndex, 1);
        saveSales();
        updateDashboard();
    }
    
    // Reload items back into cart
    cart = [...lastSale.items];
    updateCart();
    
    // Close receipt modal and go back to POS
    closeReceiptModal();
    showSection('pos');
    
    showNotification('✏️ Order loaded for editing', 'info');
    lastSale = null;
}

function newOrder() {
    closeReceiptModal();
    showSection('pos');
}

// Product Management functions moved to products.js

// Dashboard
function updateDashboard() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay(), 0, 0, 0, 0);
    const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - now.getDay()), 23, 59, 59, 999);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    // Calculate stats with precise date ranges
    const todaySales = sales.filter(s => {
        const saleDate = new Date(s.date);
        return saleDate >= todayStart && saleDate <= todayEnd;
    });
    const weekSales = sales.filter(s => {
        const saleDate = new Date(s.date);
        return saleDate >= weekStart && saleDate <= weekEnd;
    });
    const monthSales = sales.filter(s => {
        const saleDate = new Date(s.date);
        return saleDate >= monthStart && saleDate <= monthEnd;
    });
    
    const todayTotal = todaySales.reduce((sum, s) => sum + s.total, 0);
    const weekTotal = weekSales.reduce((sum, s) => sum + s.total, 0);
    const monthTotal = monthSales.reduce((sum, s) => sum + s.total, 0);
    
    document.getElementById('todaySales').textContent = '₱' + todayTotal.toFixed(2);
    document.getElementById('todayOrders').textContent = todaySales.length + ' orders';
    
    document.getElementById('weekSales').textContent = '₱' + weekTotal.toFixed(2);
    document.getElementById('weekOrders').textContent = weekSales.length + ' orders';
    
    document.getElementById('monthSales').textContent = '₱' + monthTotal.toFixed(2);
    document.getElementById('monthOrders').textContent = monthSales.length + ' orders';
    
    document.getElementById('totalProducts').textContent = products.length;
    
    // Top selling items
    updateTopItems(todaySales);
    
    // Recent transactions
    updateRecentTransactions();
}

function updateTopItems(todaySales) {
    const itemSales = {};
    
    todaySales.forEach(sale => {
        sale.items.forEach(item => {
            if (!itemSales[item.name]) {
                itemSales[item.name] = {
                    name: item.name,
                    quantity: 0,
                    revenue: 0
                };
            }
            itemSales[item.name].quantity += item.quantity;
            itemSales[item.name].revenue += item.price * item.quantity;
        });
    });
    
    const topItems = Object.values(itemSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    
    const container = document.getElementById('topItems');
    
    if (topItems.length === 0) {
        container.innerHTML = '<p class="no-data">No sales data yet</p>';
        return;
    }
    
    container.innerHTML = '';
    topItems.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'top-item';
        div.innerHTML = `
            <div class="top-item-info">
                <div class="top-item-rank">${index + 1}</div>
                <div>
                    <strong>${item.name}</strong><br>
                    <span class="top-item-qty">${item.quantity} sold</span>
                </div>
            </div>
            <div class="top-item-sales">
                <strong>₱${item.revenue.toFixed(2)}</strong>
            </div>
        `;
        container.appendChild(div);
    });
}

function updateRecentTransactions() {
    const container = document.getElementById('recentTransactions');
    const recent = [...sales].reverse().slice(0, 10);
    
    if (recent.length === 0) {
        container.innerHTML = '<p class="no-data">No transactions yet</p>';
        return;
    }
    
    container.innerHTML = '';
    recent.forEach(sale => {
        const date = new Date(sale.date);
        const div = document.createElement('div');
        div.className = 'transaction-item';
        div.innerHTML = `
            <div>
                <strong>Order #${sale.id}</strong><br>
                <span class="transaction-time">${date.toLocaleString()}</span>
            </div>
            <div>
                <strong>₱${sale.total.toFixed(2)}</strong>
            </div>
        `;
        container.appendChild(div);
    });
}

// Sales History
function loadSalesHistory(filter = 'today') {
    const tbody = document.getElementById('salesTableBody');
    tbody.innerHTML = '';
    
    let filteredSales = [...sales];
    const now = new Date();
    
    if (filter === 'today') {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        filteredSales = sales.filter(s => {
            const saleDate = new Date(s.date);
            return saleDate >= todayStart && saleDate <= todayEnd;
        });
    } else if (filter === 'week') {
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay(), 0, 0, 0, 0);
        const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - now.getDay()), 23, 59, 59, 999);
        filteredSales = sales.filter(s => {
            const saleDate = new Date(s.date);
            return saleDate >= weekStart && saleDate <= weekEnd;
        });
    } else if (filter === 'month') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        filteredSales = sales.filter(s => {
            const saleDate = new Date(s.date);
            return saleDate >= monthStart && saleDate <= monthEnd;
        });
    }
    
    // Update sales summary for filtered period
    updateSalesSummary(filteredSales);
    
    // Store filtered sales for printing
    currentFilteredSales = filteredSales;
    currentSalesFilter = filter;
    
    if (filteredSales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #adb5bd;">No sales records found</td></tr>';
        return;
    }
    
    filteredSales.reverse().forEach(sale => {
        const date = new Date(sale.date);
        // Include addons in items list
        const itemsList = sale.items.map(item => {
            let itemText = `${item.name} (${item.quantity})`;
            if (item.addons && item.addons.length > 0) {
                const addonsList = item.addons.map(a => 
                    a.quantity > 1 ? `${a.name} (${a.quantity}x)` : a.name
                ).join(', ');
                itemText += ` +${addonsList}`;
            }
            return itemText;
        }).join(', ');
        const totalQuantity = sale.items.reduce((sum, item) => sum + item.quantity, 0);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${sale.id}</td>
            <td>${date.toLocaleString()}</td>
            <td>${itemsList}</td>
            <td>${totalQuantity}</td>
            <td>₱${sale.total.toFixed(2)}</td>
            <td>${sale.paymentMethod || 'Cash'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-view-details" onclick="viewSaleDetails('${sale.id}')">View</button>
                    <button class="btn-edit-sale" onclick="editSale('${sale.id}')">Edit</button>
                    <button class="btn-delete-sale" onclick="deleteSale('${sale.id}')">Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateSalesSummary(filteredSales) {
    const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalOrders = filteredSales.length;
    const avgOrder = totalOrders > 0 ? totalSales / totalOrders : 0;
    const totalItems = filteredSales.reduce((sum, sale) => {
        return sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);
    
    document.getElementById('filterTotalSales').textContent = '₱' + totalSales.toFixed(2);
    document.getElementById('filterTotalOrders').textContent = totalOrders + ' orders';
    document.getElementById('filterAvgOrder').textContent = '₱' + avgOrder.toFixed(2);
    document.getElementById('filterTotalItems').textContent = totalItems;
}

function filterSales(filter) {
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    loadSalesHistory(filter);
}

function viewSaleDetails(saleId) {
    const sale = sales.find(s => s.id === saleId || s.id === parseInt(saleId));
    if (sale) {
        showReceipt(sale, true); // Pass true to indicate viewing from history
    }
}

// Edit Sale - Enhanced Modal
function editSale(saleId) {
    const sale = sales.find(s => s.id === saleId || s.id === parseInt(saleId));
    if (!sale) return;
    
    // Create modal HTML
    const modalHTML = `
        <div class="edit-sale-modal-overlay" id="editSaleModalOverlay" onclick="closeEditSaleModal(event)">
            <div class="edit-sale-modal" onclick="event.stopPropagation()">
                <div class="edit-sale-header">
                    <h3>✏️ Edit Order #${sale.id}</h3>
                    <button class="close-btn" onclick="closeEditSaleModal()">&times;</button>
                </div>
                <div class="edit-sale-body">
                    <div class="edit-sale-info">
                        <div class="info-row">
                            <span class="info-label">📅 Date:</span>
                            <span class="info-value">${new Date(sale.date).toLocaleString()}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">🏷️ Order Type:</span>
                            <select class="payment-method-select" id="editOrderType" onchange="updateEditOrderType('${saleId}', this.value)">
                                <option value="Dine In" ${(sale.orderType || 'Dine In') === 'Dine In' ? 'selected' : ''}>Dine In</option>
                                <option value="Take Out" ${sale.orderType === 'Take Out' ? 'selected' : ''}>Take Out</option>
                                <option value="Delivery" ${sale.orderType === 'Delivery' ? 'selected' : ''}>Delivery</option>
                            </select>
                        </div>
                        <div class="info-row">
                            <span class="info-label">💳 Payment Method:</span>
                            <select class="payment-method-select" id="editPaymentMethod" onchange="updateEditPaymentMethod('${saleId}', this.value)">
                                <option value="Cash" ${(sale.paymentMethod || 'Cash') === 'Cash' ? 'selected' : ''}>Cash</option>
                                <option value="GCash" ${sale.paymentMethod === 'GCash' ? 'selected' : ''}>GCash</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="add-item-section">
                        <h4>➕ Add Item to Order</h4>
                        <div class="add-item-search">
                            <input type="text" class="search-product-input" id="addItemSearch" placeholder="🔍 Search products..." oninput="searchProductsForAdd('${saleId}')">
                            <div class="search-results" id="searchResults_${saleId}" style="display: none;"></div>
                        </div>
                    </div>
                    
                    <div class="edit-items-section">
                        <h4>📦 Order Items</h4>
                        <div class="edit-items-list" id="editItemsList">
                            ${sale.items.map((item, index) => `
                                <div class="edit-item-row">
                                    <div class="item-info">
                                        <span class="item-name">${item.name}</span>
                                        <span class="item-price">₱${item.price.toFixed(2)} each</span>
                                    </div>
                                    <div class="item-controls">
                                        <button class="qty-btn" onclick="updateEditItemQty('${saleId}', ${index}, -1)">−</button>
                                        <input type="number" class="edit-qty-input" id="editQty_${index}" value="${item.quantity}" min="1" onchange="updateEditItemQtyDirect('${saleId}', ${index}, this.value)">
                                        <button class="qty-btn" onclick="updateEditItemQty('${saleId}', ${index}, 1)">+</button>
                                        <button class="remove-item-btn" onclick="removeEditItem('${saleId}', ${index})" title="Remove item">🗑️</button>
                                    </div>
                                    <div class="item-subtotal" id="editSubtotal_${index}">₱${(item.price * item.quantity).toFixed(2)}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="edit-total-section">
                        <div class="total-row">
                            <span class="total-label">Total Amount:</span>
                            <span class="total-value" id="editTotalDisplay">₱${sale.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                <div class="edit-sale-footer">
                    <button class="btn-cancel" onclick="closeEditSaleModal()">Cancel</button>
                    <button class="btn-save-edit" onclick="saveEditedSale('${saleId}')">💾 Save Changes</button>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existing = document.getElementById('editSaleModalOverlay');
    if (existing) existing.remove();
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Animate in
    setTimeout(() => {
        document.getElementById('editSaleModalOverlay').classList.add('show');
    }, 10);
}

// Update payment method in edit modal
function updateEditPaymentMethod(saleId, newMethod) {
    const sale = sales.find(s => s.id === saleId || s.id === parseInt(saleId));
    if (!sale) return;
    
    sale.paymentMethod = newMethod;
    showNotification(`💳 Payment method changed to ${newMethod}`);
}

// Update order type in edit modal
function updateEditOrderType(saleId, newType) {
    const sale = sales.find(s => s.id === saleId || s.id === parseInt(saleId));
    if (!sale) return;
    
    sale.orderType = newType;
    showNotification(`🏷️ Order type changed to ${newType}`);
}

// Search products for adding to order
function searchProductsForAdd(saleId) {
    const searchInput = document.getElementById('addItemSearch');
    const searchResults = document.getElementById(`searchResults_${saleId}`);
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (searchTerm.length === 0) {
        searchResults.style.display = 'none';
        return;
    }
    
    // Filter active and in-stock products
    const availableProducts = products.filter(p => 
        p.active !== false && 
        p.inStock !== false &&
        p.name.toLowerCase().includes(searchTerm)
    );
    
    if (availableProducts.length === 0) {
        searchResults.innerHTML = '<div class="no-results">No products found</div>';
        searchResults.style.display = 'block';
        return;
    }
    
    searchResults.innerHTML = availableProducts.map(product => `
        <div class="search-result-item" onclick="addProductToEdit('${saleId}', ${product.id})">
            <span class="result-name">${product.name}</span>
            <span class="result-price">₱${product.price.toFixed(2)}</span>
        </div>
    `).join('');
    searchResults.style.display = 'block';
}

// Add product to edited order
function addProductToEdit(saleId, productId) {
    const sale = sales.find(s => s.id === saleId || s.id === parseInt(saleId));
    const product = products.find(p => p.id === productId);
    
    if (!sale || !product) return;
    
    // Check if item already exists in order
    const existingItem = sale.items.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        sale.items.push({
            id: product.id,
            name: product.name,
            price: product.price,
            category: product.category,
            quantity: 1
        });
    }
    
    // Clear search and refresh modal
    document.getElementById('addItemSearch').value = '';
    document.getElementById(`searchResults_${saleId}`).style.display = 'none';
    
    // Refresh the modal
    closeEditSaleModal();
    editSale(saleId);
    
    showNotification(`✅ ${product.name} added to order`);
}

// Update item quantity in edit modal
function updateEditItemQty(saleId, itemIndex, change) {
    const sale = sales.find(s => s.id === saleId || s.id === parseInt(saleId));
    if (!sale || !sale.items[itemIndex]) return;
    
    const item = sale.items[itemIndex];
    const newQty = item.quantity + change;
    
    if (newQty < 1) {
        if (confirm('Remove this item from the order?')) {
            removeEditItem(saleId, itemIndex);
        }
        return;
    }
    
    item.quantity = newQty;
    document.getElementById(`editQty_${itemIndex}`).value = newQty;
    document.getElementById(`editSubtotal_${itemIndex}`).textContent = `₱${(item.price * newQty).toFixed(2)}`;
    updateEditTotal(sale);
}

// Update item quantity directly from input
function updateEditItemQtyDirect(saleId, itemIndex, value) {
    const sale = sales.find(s => s.id === saleId || s.id === parseInt(saleId));
    if (!sale || !sale.items[itemIndex]) return;
    
    const qty = parseInt(value);
    if (isNaN(qty) || qty < 1) {
        alert('Quantity must be at least 1');
        document.getElementById(`editQty_${itemIndex}`).value = sale.items[itemIndex].quantity;
        return;
    }
    
    sale.items[itemIndex].quantity = qty;
    document.getElementById(`editSubtotal_${itemIndex}`).textContent = `₱${(sale.items[itemIndex].price * qty).toFixed(2)}`;
    updateEditTotal(sale);
}

// Remove item from edit modal
function removeEditItem(saleId, itemIndex) {
    const sale = sales.find(s => s.id === saleId || s.id === parseInt(saleId));
    if (!sale || !sale.items[itemIndex]) return;
    
    if (sale.items.length === 1) {
        alert('Cannot remove the last item. Delete the entire order instead.');
        return;
    }
    
    sale.items.splice(itemIndex, 1);
    
    // Refresh the modal
    closeEditSaleModal();
    editSale(saleId);
}

// Update total display in edit modal
function updateEditTotal(sale) {
    const newTotal = sale.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    sale.total = newTotal;
    document.getElementById('editTotalDisplay').textContent = `₱${newTotal.toFixed(2)}`;
}

// Save edited sale
function saveEditedSale(saleId) {
    const sale = sales.find(s => s.id === saleId || s.id === parseInt(saleId));
    if (!sale) return;
    
    // Get order type from selector
    const orderTypeSelect = document.getElementById('editOrderType');
    if (orderTypeSelect) {
        sale.orderType = orderTypeSelect.value;
    }
    
    // Get payment method from selector
    const paymentSelect = document.getElementById('editPaymentMethod');
    if (paymentSelect) {
        sale.paymentMethod = paymentSelect.value;
    }
    
    // Recalculate total
    sale.total = sale.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Update notification with new data (items, total, AND payment method)
    const notificationIndex = notifications.findIndex(n => n.orderData && (n.orderData.id === saleId || n.orderData.id === parseInt(saleId)));
    if (notificationIndex !== -1) {
        const orderType = sale.orderType || 'Dine In';
        const itemsList = sale.items.map(item => `${item.name} (${item.quantity}x)`).join(', ');
        const notifMessage = `🎉 ${orderType} order completed! Order ${sale.id} - ${itemsList} - ${sale.paymentMethod || 'Cash'} payment - ₱${sale.total.toFixed(2)}`;
        
        notifications[notificationIndex].message = notifMessage;
        notifications[notificationIndex].orderData = { ...sale };
        saveNotifications();
    } else {
        // If notification doesn't exist, create a new one
        const orderType = sale.orderType || 'Dine In';
        const itemsList = sale.items.map(item => `${item.name} (${item.quantity}x)`).join(', ');
        const notifMessage = `✏️ Order ${sale.id} edited! ${orderType} - ${itemsList} - ${sale.paymentMethod || 'Cash'} - ₱${sale.total.toFixed(2)}`;
        addNotification(notifMessage, sale);
    }
    
    // Save to localStorage
    saveSales();
    
    // Refresh displays
    loadSalesHistory();
    updateDashboard();
    
    // Close modal
    closeEditSaleModal();
    
    // Show success message with payment method
    showNotification(`✅ Order ${sale.id} updated successfully! Payment: ${sale.paymentMethod} | Total: ₱${sale.total.toFixed(2)}`);
}

// Close edit sale modal
function closeEditSaleModal(event) {
    if (event && event.target !== event.currentTarget) return;
    
    const overlay = document.getElementById('editSaleModalOverlay');
    if (overlay) {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 300);
    }
}

// Delete Sale - Enhanced Modal
function deleteSale(saleId) {
    const sale = sales.find(s => s.id === saleId || s.id === parseInt(saleId));
    if (!sale) return;
    
    const date = new Date(sale.date);
    const itemsList = sale.items.map(item => `${item.name} (${item.quantity}x)`).join(', ');
    
    // Create delete confirmation modal
    const modalHTML = `
        <div class="delete-modal-overlay" id="deleteModalOverlay" onclick="closeDeleteModal(event)">
            <div class="delete-modal" onclick="event.stopPropagation()">
                <div class="delete-modal-header">
                    <div class="delete-icon">⚠️</div>
                    <h3>Delete Order Confirmation</h3>
                </div>
                <div class="delete-modal-body">
                    <p class="delete-warning">Are you sure you want to delete this order?</p>
                    <div class="delete-order-details">
                        <div class="delete-detail-row">
                            <span class="detail-label">Order Number:</span>
                            <span class="detail-value">#${sale.id}</span>
                        </div>
                        <div class="delete-detail-row">
                            <span class="detail-label">Date & Time:</span>
                            <span class="detail-value">${date.toLocaleString()}</span>
                        </div>
                        <div class="delete-detail-row">
                            <span class="detail-label">Items:</span>
                            <span class="detail-value">${itemsList}</span>
                        </div>
                        <div class="delete-detail-row">
                            <span class="detail-label">Total Amount:</span>
                            <span class="detail-value highlight">₱${sale.total.toFixed(2)}</span>
                        </div>
                        <div class="delete-detail-row">
                            <span class="detail-label">Payment Method:</span>
                            <span class="detail-value">${sale.paymentMethod || 'Cash'}</span>
                        </div>
                    </div>
                    <div class="delete-warning-note">
                        <strong>⚠️ Warning:</strong> This action cannot be undone. The order will be permanently removed from your records.
                    </div>
                </div>
                <div class="delete-modal-footer">
                    <button class="btn-cancel-delete" onclick="closeDeleteModal()">Cancel</button>
                    <button class="btn-confirm-delete" onclick="confirmDeleteSale('${saleId}')">🗑️ Delete Order</button>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existing = document.getElementById('deleteModalOverlay');
    if (existing) existing.remove();
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Animate in
    setTimeout(() => {
        document.getElementById('deleteModalOverlay').classList.add('show');
    }, 10);
}

// Confirm delete sale
function confirmDeleteSale(saleId) {
    // Find sale by ID (comparing as strings since IDs are "#01", "#02", etc.)
    const index = sales.findIndex(s => s.id === saleId || s.id === parseInt(saleId));
    
    if (index > -1) {
        const deletedOrder = sales[index];
        
        // Create a copy of the order for notification
        const orderCopy = { ...deletedOrder };
        
        sales.splice(index, 1);
        
        // Remove old notification for this order
        const notifIndex = notifications.findIndex(n => n.orderData && (n.orderData.id === saleId || n.orderData.id === parseInt(saleId)));
        if (notifIndex !== -1) {
            notifications.splice(notifIndex, 1);
            saveNotifications();
        }
        
        // Add notification about deletion with order details
        const itemsList = deletedOrder.items.map(item => `${item.name} (${item.quantity}x)`).join(', ');
        const deleteMessage = `🗑️ ${deletedOrder.orderType || 'Dine In'} order deleted! Order ${deletedOrder.id} - ${itemsList} - ${deletedOrder.paymentMethod || 'Cash'} - ₱${deletedOrder.total.toFixed(2)}`;
        addNotification(deleteMessage, orderCopy);
        
        saveSales();
        loadSalesHistory();
        updateDashboard();
        
        closeDeleteModal();
        showNotification(`✅ Order ${deletedOrder.id} deleted successfully!`);
    } else {
        closeDeleteModal();
        showNotification(`❌ Order not found!`);
    }
}

// Close delete modal
function closeDeleteModal(event) {
    if (event && event.target !== event.currentTarget) return;
    
    const overlay = document.getElementById('deleteModalOverlay');
    if (overlay) {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 300);
    }
}

// Close modals when clicking outside
window.onclick = function(event) {
    const productModal = document.getElementById('productModal');
    const categoryModal = document.getElementById('categoryModal');
    
    if (event.target == productModal) {
        closeProductModal();
    }
    if (event.target == receiptModal) {
        closeReceiptModal();
    }
    if (event.target == categoryModal) {
        closeCategoryModal();
    }
}

// Category Management Functions
function loadCategories() {
    const storedCategories = localStorage.getItem('mugshotCategories');
    
    if (storedCategories) {
        categories = JSON.parse(storedCategories);
    } else {
        // Start with empty categories - will be populated from products
        categories = [];
    }
    updateCategoryButtons();
    updateCategoryDropdown();
}

function saveCategories() {
    localStorage.setItem('mugshotCategories', JSON.stringify(categories));
}

function updateCategoryButtons() {
    const categoriesDiv = document.getElementById('categoriesContainer');
    if (!categoriesDiv) {
        console.log('Categories container not found - skipping category button update');
        return;
    }
    
    // Clear existing buttons
    categoriesDiv.innerHTML = '';
    
    // Add "All" button first
    const allBtn = document.createElement('button');
    allBtn.className = 'category-tab active';
    allBtn.onclick = (e) => filterCategory('all', e);
    allBtn.textContent = 'All';
    categoriesDiv.appendChild(allBtn);
    
    // Get unique categories from actual products
    const productCategories = [...new Set(products.map(p => p.category).filter(c => c))];
    
    // Combine all categories (predefined + product-based)
    const allCategoryNames = new Set();
    
    // Add predefined categories
    categories.forEach(cat => allCategoryNames.add(cat.name));
    
    // Add product categories
    productCategories.forEach(catName => allCategoryNames.add(catName));
    
    // Sort all categories alphabetically (case-insensitive)
    const sortedCategoryNames = [...allCategoryNames].sort((a, b) => 
        a.toLowerCase().localeCompare(b.toLowerCase())
    );
    
    // Create buttons for all categories in sorted order
    sortedCategoryNames.forEach(catName => {
        const btn = document.createElement('button');
        btn.className = 'category-tab';
        btn.onclick = (e) => filterCategory(catName, e);
        btn.textContent = catName;
        categoriesDiv.appendChild(btn);
    });
}

function updateCategoryDropdown() {
    const datalist = document.getElementById('categoryDatalist');
    if (!datalist) return;
    
    // Clear datalist
    datalist.innerHTML = '';
    
    // Get unique categories from products and saved categories
    const productCategories = [...new Set(products.map(p => p.category).filter(c => c))];
    const allCategoryNames = [...new Set([...categories.map(c => c.name), ...productCategories])];
    
    allCategoryNames.forEach(catName => {
        const option = document.createElement('option');
        option.value = catName;
        datalist.appendChild(option);
    });
    
    // Also update the filter dropdown in Products section
    const filterSelect = document.getElementById('categoryFilter');
    if (filterSelect) {
        const currentValue = filterSelect.value;
        filterSelect.innerHTML = '<option value="all">All Categories</option>';
        
        allCategoryNames.forEach(catName => {
            const option = document.createElement('option');
            option.value = catName;
            option.textContent = catName;
            filterSelect.appendChild(option);
        });
        
        // Restore previous selection if it still exists
        if (currentValue) filterSelect.value = currentValue;
    }
}

function openCategoryModal() {
    document.getElementById('categoryModal').style.display = 'block';
    loadCategoryList();
}

function closeCategoryModal() {
    document.getElementById('categoryModal').style.display = 'none';
    document.getElementById('newCategoryName').value = '';
}

function loadCategoryList() {
    const listDiv = document.getElementById('existingCategoryList');
    console.log('loadCategoryList called');
    console.log('categories array:', categories);
    console.log('categories length:', categories.length);
    
    listDiv.innerHTML = '';
    
    if (categories.length === 0) {
        listDiv.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">No categories yet. Add categories above or they will be created automatically when you add products.</div>';
        return;
    }
    
    categories.forEach(cat => {
        const div = document.createElement('div');
        div.className = 'category-item';
        div.innerHTML = `
            <span class="category-display">${cat.name}</span>
            <button class="btn-delete-cat" onclick="deleteCategory(${cat.id})">Delete</button>
        `;
        listDiv.appendChild(div);
    });
}

function addNewCategory(event) {
    event.preventDefault();
    
    const name = document.getElementById('newCategoryName').value.trim();
    
    if (!name) {
        showNotification('⚠️ Please enter a category name', 'warning');
        return;
    }
    
    // Check if category already exists
    if (categories.find(c => c.name.toLowerCase() === name.toLowerCase())) {
        showNotification('⚠️ This category already exists!', 'warning');
        return;
    }
    
    const newCategory = {
        id: categories.length > 0 ? Math.max(...categories.map(c => c.id)) + 1 : 1,
        name: name
    };
    
    categories.push(newCategory);
    saveCategories();
    updateCategoryButtons();
    updateCategoryDropdown();
    loadCategoryList();
    
    // Clear form
    document.getElementById('newCategoryName').value = '';
    
    showNotification(`Category "${name}" added successfully!`, 'success');
}

function deleteCategory(categoryId) {
    const category = categories.find(c => c.id === categoryId);
    
    if (!category) return;
    
    // Check if any products use this category
    const productsInCategory = products.filter(p => p.category === category.name);
    
    if (productsInCategory.length > 0) {
        if (!confirm(`There are ${productsInCategory.length} product(s) in this category. Are you sure you want to delete it? The products will remain but will be uncategorized.`)) {
            return;
        }
    } else {
        if (!confirm(`Delete category "${category.name}"?`)) {
            return;
        }
    }
    
    categories = categories.filter(c => c.id !== categoryId);
    saveCategories();
    updateCategoryButtons();
    updateCategoryDropdown();
    loadCategoryList();
    loadProducts();
    
    alert('Category deleted successfully!');
}

// Notification Function
function showNotification(message, type = 'success') {
    // Remove existing notification if any
    const existing = document.querySelector('.notification-enhanced');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification-enhanced notification-${type}`;
    
    // Determine icon based on type
    let icon = '✓';
    if (type === 'error') icon = '✗';
    if (type === 'warning') icon = '⚠';
    if (type === 'info') icon = 'ℹ';
    if (message.includes('🎉')) icon = '🎉';
    if (message.includes('🛒')) icon = '🛒';
    if (message.includes('📋')) icon = '📋';
    
    notification.innerHTML = `
        <div class="notification-icon">${icon}</div>
        <div class="notification-content">
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Auto-remove after 3.5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3500);
}

// Enhanced Dashboard Functions
function updateDashboardEnhanced() {
    updateDashboard(); // Call existing function
    updateCategoryStats();
    updateSalesChart();
    calculateAverageOrder();
    findPeakHour();
}

function updateCategoryStats() {
    const container = document.getElementById('categoryStats');
    if (!container) return;
    
    // Calculate sales by category
    const categorySales = {};
    sales.forEach(sale => {
        sale.items.forEach(item => {
            if (!categorySales[item.category || 'Other']) {
                categorySales[item.category || 'Other'] = 0;
            }
            categorySales[item.category || 'Other'] += item.price * item.quantity;
        });
    });
    
    const total = Object.values(categorySales).reduce((sum, val) => sum + val, 0);
    const sortedCategories = Object.entries(categorySales)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    container.innerHTML = '';
    sortedCategories.forEach(([category, amount]) => {
        const percentage = total > 0 ? (amount / total * 100) : 0;
        const div = document.createElement('div');
        div.className = 'category-stat-item';
        div.innerHTML = `
            <span class="category-stat-label">${category}</span>
            <div class="category-stat-bar">
                <div class="category-stat-fill" style="width: ${percentage}%"></div>
            </div>
            <span class="category-stat-value">₱${amount.toFixed(0)}</span>
        `;
        container.appendChild(div);
    });
}

function updateSalesChart() {
    const container = document.getElementById('salesChartBars');
    if (!container) return;
    
    // Get last 7 days sales
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailySales = new Array(7).fill(0);
    
    sales.forEach(sale => {
        const date = new Date(sale.date);
        const dayIndex = date.getDay();
        dailySales[dayIndex] += sale.total;
    });
    
    const maxSale = Math.max(...dailySales, 1);
    const maxHeight = 180; // Maximum height in pixels for the tallest bar (leaves 20px for labels)
    
    container.innerHTML = '';
    dailySales.forEach((amount, index) => {
        const heightPx = Math.max(20, (amount / maxSale * maxHeight)); // Minimum 20px height
        const div = document.createElement('div');
        div.className = 'chart-bar';
        div.style.height = heightPx + 'px';
        div.innerHTML = `<span class="chart-bar-label">${days[index]}</span>`;
        div.title = `₱${amount.toFixed(2)}`;
        container.appendChild(div);
    });
}

function calculateAverageOrder() {
    const avgOrderElem = document.getElementById('avgOrder');
    const avgChangeElem = document.getElementById('avgChange');
    
    if (!avgOrderElem) return;
    
    if (sales.length === 0) {
        avgOrderElem.textContent = '₱0.00';
        if (avgChangeElem) avgChangeElem.textContent = 'No data';
        return;
    }
    
    const total = sales.reduce((sum, s) => sum + s.total, 0);
    const average = total / sales.length;
    avgOrderElem.textContent = '₱' + average.toFixed(2);
}

function findPeakHour() {
    const peakHourElem = document.getElementById('peakHour');
    if (!peakHourElem) return;
    
    if (sales.length === 0) {
        peakHourElem.textContent = 'N/A';
        return;
    }
    
    const hourSales = new Array(24).fill(0);
    sales.forEach(sale => {
        const hour = new Date(sale.date).getHours();
        hourSales[hour] += sale.total;
    });
    
    const peakHour = hourSales.indexOf(Math.max(...hourSales));
    const peakHourFormatted = peakHour === 0 ? '12 AM' : 
                             peakHour < 12 ? `${peakHour} AM` :
                             peakHour === 12 ? '12 PM' : `${peakHour - 12} PM`;
    peakHourElem.textContent = peakHourFormatted;
}

// Search sales table
function searchSalesTable() {
    const searchTerm = document.getElementById('salesSearchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#salesTableBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// Filter sales by date range
function filterSalesByDate() {
    const startDateValue = document.getElementById('startDate').value;
    const endDateValue = document.getElementById('endDate').value;
    
    if (!startDateValue && !endDateValue) {
        loadSalesHistory('all');
        return;
    }
    
    const tbody = document.getElementById('salesTableBody');
    tbody.innerHTML = '';
    
    let filteredSales = [...sales];
    
    if (startDateValue && endDateValue) {
        const start = new Date(startDateValue);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDateValue);
        end.setHours(23, 59, 59, 999);
        
        filteredSales = sales.filter(s => {
            const saleDate = new Date(s.date);
            return saleDate >= start && saleDate <= end;
        });
    } else if (startDateValue) {
        const start = new Date(startDateValue);
        start.setHours(0, 0, 0, 0);
        
        filteredSales = sales.filter(s => {
            const saleDate = new Date(s.date);
            return saleDate >= start;
        });
    } else if (endDateValue) {
        const end = new Date(endDateValue);
        end.setHours(23, 59, 59, 999);
        
        filteredSales = sales.filter(s => {
            const saleDate = new Date(s.date);
            return saleDate <= end;
        });
    }
    
    // Store filtered sales for printing
    currentFilteredSales = filteredSales;
    currentSalesFilter = 'custom';
    
    // Update sales summary for filtered period
    updateSalesSummary(filteredSales);
    
    // Remove active class from filter buttons when using date range
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    
    if (filteredSales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #adb5bd;">No sales records found for selected date range</td></tr>';
        return;
    }
    
    filteredSales.reverse().forEach(sale => {
        const date = new Date(sale.date);
        const itemsList = sale.items.map(item => `${item.name} (${item.quantity})`).join(', ');
        const totalQuantity = sale.items.reduce((sum, item) => sum + item.quantity, 0);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${sale.id}</td>
            <td>${date.toLocaleString()}</td>
            <td>${itemsList}</td>
            <td>${totalQuantity}</td>
            <td>₱${sale.total.toFixed(2)}</td>
            <td>
                <button class="btn-view" onclick="viewSaleDetails(${sale.id})">View</button>
                <button class="btn-edit" onclick="editSale(${sale.id})">Edit</button>
                <button class="btn-delete" onclick="deleteSale(${sale.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Export sales report
function exportSalesReport() {
    let csv = 'Order ID,Date & Time,Items,Quantity,Total\n';
    
    sales.forEach(sale => {
        const itemsList = sale.items.map(item => `${item.name} (${item.quantity}x)`).join('; ');
        const totalQty = sale.items.reduce((sum, item) => sum + item.quantity, 0);
        csv += `${sale.id},"${new Date(sale.date).toLocaleString()}","${itemsList}",${totalQty},${sale.total}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showNotification(' Sales report exported successfully!');
}

// Print sales report
function printSalesReport() {
    // Check if running in Capacitor (mobile app)
    const isCapacitor = window.Capacitor !== undefined;
    
    // Create print view in same window (APK compatible)
    const now = new Date();
    
    // Store page state in window object (accessible from inline scripts)
    window.originalContent = document.body.innerHTML;
    window.originalTitle = document.title;
    
    let filterTitle = '';
    if (currentSalesFilter === 'today') filterTitle = 'Today';
    else if (currentSalesFilter === 'week') filterTitle = 'This Week';
    else if (currentSalesFilter === 'month') filterTitle = 'This Month';
    else if (currentSalesFilter === 'all') filterTitle = 'All Time';
    else if (currentSalesFilter === 'custom') {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        filterTitle = `Custom Range: ${startDate || 'Start'} to ${endDate || 'End'}`;
    }
    
    const totalRevenue = currentFilteredSales.reduce((sum, s) => sum + s.total, 0);
    const totalOrders = currentFilteredSales.length;
    const totalItems = currentFilteredSales.reduce((sum, sale) => {
        return sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);
    
    let salesHTML = '';
    currentFilteredSales.forEach(sale => {
        const date = new Date(sale.date);
        const itemsList = sale.items.map(item => {
            let itemText = `${item.name} (${item.quantity}x ₱${item.price.toFixed(2)})`;
            if (item.addons && item.addons.length > 0) {
                const addonsList = item.addons.map(a => `${a.name} (+₱${a.price.toFixed(2)})`).join(', ');
                itemText += `<br><small style="color:#666; margin-left:15px;">+ ${addonsList}</small>`;
            }
            return itemText;
        }).join('<br>');
        
        salesHTML += `
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd;">#${sale.id}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${date.toLocaleString()}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${itemsList}</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${sale.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">₱${sale.total.toFixed(2)}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${sale.orderType || 'Dine In'}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${sale.paymentMethod || 'Cash'}</td>
            </tr>
        `;
    });
    
    // Generate print HTML with proper structure
    const printHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sales Report - ${filterTitle}</title>
    <style>
        @media print {
            body { margin: 0; padding: 20px; }
            .no-print { display: none !important; }
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            padding: 20px;
            max-width: 1200px;
            margin: 0 auto;
            background: #f5f5f5;
            color: #333;
        }
        .action-buttons {
            display: flex;
            gap: 12px;
            margin-bottom: 20px;
            padding: 15px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 15px;
            font-weight: 600;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        .back-btn {
            background: #6c757d;
            color: white;
        }
        .back-btn:active {
            background: #5a6268;
            transform: scale(0.98);
        }
        .print-btn {
            background: #ff6b35;
            color: white;
            flex: 1;
        }
        .print-btn:active {
            background: #e55a2b;
            transform: scale(0.98);
        }
        .report-container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #333;
            position: relative;
        }
        .header .logo-watermark {
            width: 80px;
            height: 80px;
            margin: 0 auto 15px;
            opacity: 0.8;
        }
        .header .logo-watermark img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
        .header h1 {
            margin: 0 0 10px 0;
            color: #333;
            font-size: 28px;
            font-weight: 600;
        }
        .header .filter-info {
            color: #666;
            font-size: 14px;
            margin: 6px 0;
            font-weight: 400;
        }
        .header .date-info {
            color: #999;
            font-size: 13px;
            margin-top: 8px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1px;
            background: #ddd;
            border: 1px solid #ddd;
            margin-bottom: 40px;
        }
        .summary-item {
            background: white;
            padding: 20px;
            text-align: center;
        }
        .summary-item .label {
            font-size: 12px;
            color: #666;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 400;
        }
        .summary-item .value {
            font-size: 24px;
            font-weight: 600;
            color: #333;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #ddd;
        }
        thead {
            background: #f8f8f8;
        }
        th {
            color: #333;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 2px solid #ddd;
        }
        tbody tr {
            border-bottom: 1px solid #eee;
        }
        tbody tr:hover {
            background: #fafafa;
        }
        td {
            padding: 12px;
            color: #333;
            font-size: 14px;
        }
        tbody tr:last-child {
            border-bottom: none;
        }
        small {
            display: block;
            margin-top: 4px;
            color: #999;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="action-buttons no-print">
        <button class="btn back-btn" onclick="window.goBack()">
            <span>←</span>
            <span>Back</span>
        </button>
        <button class="btn print-btn" onclick="window.downloadReport()">
            <span>🖨️</span>
            <span>Print / Save as PDF</span>
        </button>
    </div>
    
    <div class="report-container">
        <div class="header">
            <div class="logo-watermark">
                <img src="MugshotPOS/www/img/logo.png" alt="MugShots Cafe Logo">
            </div>
            <h1>MugShots Cafe - Sales Report</h1>
            <div class="filter-info">Period: ${filterTitle}</div>
            <div class="date-info">${now.toLocaleString()}</div>
        </div>
        
        <div class="summary">
            <div class="summary-item">
                <div class="label">Total Revenue</div>
                <div class="value">₱${totalRevenue.toFixed(2)}</div>
            </div>
            <div class="summary-item">
                <div class="label">Total Orders</div>
                <div class="value">${totalOrders}</div>
            </div>
            <div class="summary-item">
                <div class="label">Total Items</div>
                <div class="value">${totalItems}</div>
            </div>
            <div class="summary-item">
                <div class="label">Average Order</div>
                <div class="value">₱${(totalOrders > 0 ? totalRevenue / totalOrders : 0).toFixed(2)}</div>
            </div>
        </div>
    
        <table>
            <thead>
                <tr>
                    <th>Order ID</th>
                    <th>Date & Time</th>
                    <th>Items</th>
                    <th style="text-align:center;">Qty</th>
                    <th style="text-align:right;">Total</th>
                    <th>Type</th>
                    <th>Payment</th>
                </tr>
            </thead>
            <tbody>
                ${salesHTML}
            </tbody>
        </table>
    </div>
</body>
</html>
    `;
    
    // Store the report HTML for downloading
    const reportHTMLContent = printHTML;
    
    // DEFINE FUNCTIONS FIRST - before document.write()
    window.goBack = function() {
        window.location.reload();
    };
    
    window.downloadReport = async function() {
        try {
            // Generate PDF directly using html2pdf
            if (typeof html2pdf !== 'undefined') {
                const fileName = `Sales_Report_${filterTitle.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
                
                // Create a temporary container with the report content
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = reportHTMLContent;
                const reportContainer = tempDiv.querySelector('.report-container');
                
                if (reportContainer) {
                    // PDF options
                    const opt = {
                        margin: 10,
                        filename: fileName,
                        image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: { scale: 2, useCORS: true },
                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                    };
                    
                    // Generate PDF as blob
                    const pdfBlob = await html2pdf().set(opt).from(reportContainer).outputPdf('blob');
                    
                    // Check if running in Capacitor (mobile)
                    if (window.Capacitor && window.Capacitor.Plugins.Filesystem) {
                        try {
                            const { Filesystem } = window.Capacitor.Plugins;
                            
                            // Convert blob to base64
                            const reader = new FileReader();
                            reader.onloadend = async function() {
                                const base64Data = reader.result.split(',')[1];
                                
                                try {
                                    // Save to Documents folder
                                    await Filesystem.writeFile({
                                        path: fileName,
                                        data: base64Data,
                                        directory: 'DOCUMENTS'
                                    });
                                    
                                    alert(`✅ PDF saved successfully!\n\nFile: ${fileName}\nLocation: Documents folder\n\nOpen your File Manager > Documents to view it.`);
                                } catch (err) {
                                    console.error('Filesystem error:', err);
                                    alert('❌ Error saving PDF: ' + err.message);
                                }
                            };
                            reader.readAsDataURL(pdfBlob);
                        } catch (err) {
                            console.error('Capacitor error:', err);
                            // Fallback to browser download
                            const url = URL.createObjectURL(pdfBlob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = fileName;
                            a.click();
                            URL.revokeObjectURL(url);
                            alert('✅ PDF download started! Check your Downloads folder.');
                        }
                    } else {
                        // Desktop/Browser - Download directly
                        const url = URL.createObjectURL(pdfBlob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = fileName;
                        a.click();
                        URL.revokeObjectURL(url);
                        alert('✅ PDF download started!');
                    }
                } else {
                    alert('❌ Error: Could not generate PDF');
                }
            } else {
                // Fallback for desktop browsers
                window.print();
            }
        } catch(e) {
            console.error('PDF Error:', e);
            alert('❌ Error generating PDF: ' + e.message);
        }
    };
    
    // NOW write the document
    document.open();
    document.write(printHTML);
    document.close();
}

// Update dashboard based on date range
function updateDashboard() {
    const range = document.getElementById('dashboardRange')?.value || 'week';
    const now = new Date();
    let startDate;
    
    if (range === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === 'week') {
        startDate = new Date(now.setDate(now.getDate() - 7));
    } else if (range === 'month') {
        startDate = new Date(now.setMonth(now.getMonth() - 1));
    } else if (range === 'year') {
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
    }
    
    const filteredSales = startDate ? sales.filter(s => new Date(s.date) >= startDate) : sales;
    
    // Update stats
    const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total, 0);
    const totalOrders = filteredSales.length;
    
    const todaySalesElem = document.getElementById('todaySales');
    const todayOrdersElem = document.getElementById('todayOrders');
    const totalProductsElem = document.getElementById('totalProducts');
    
    if (todaySalesElem) todaySalesElem.textContent = '₱' + totalRevenue.toFixed(2);
    if (todayOrdersElem) todayOrdersElem.textContent = totalOrders;
    if (totalProductsElem) totalProductsElem.textContent = products.length;
    
    // Update top items
    updateTopItemsEnhanced(filteredSales);
    updateRecentTransactionsEnhanced(filteredSales);
    updateCategoryStats();
    updateSalesChart();
    calculateAverageOrder();
    findPeakHour();
}

function updateTopItemsEnhanced(filteredSales) {
    const container = document.getElementById('topItems');
    if (!container) return;
    
    const itemSales = {};
    filteredSales.forEach(sale => {
        sale.items.forEach(item => {
            if (!itemSales[item.name]) {
                itemSales[item.name] = { name: item.name, quantity: 0, revenue: 0 };
            }
            itemSales[item.name].quantity += item.quantity;
            itemSales[item.name].revenue += item.price * item.quantity;
        });
    });
    
    const topItems = Object.values(itemSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    
    if (topItems.length === 0) {
        container.innerHTML = '<p class="no-data">No sales data yet</p>';
        return;
    }
    
    container.innerHTML = '';
    topItems.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'top-item';
        div.innerHTML = `
            <span class="top-item-name">${index + 1}. ${item.name}</span>
            <span class="top-item-sales">₱${item.revenue.toFixed(2)}</span>
        `;
        container.appendChild(div);
    });
    
    // Update business insights with real data
    updateBusinessInsights(filteredSales, itemSales);
}

function updateRecentTransactionsEnhanced(filteredSales) {
    const container = document.getElementById('recentTransactions');
    if (!container) return;
    
    const recent = [...filteredSales].reverse().slice(0, 8);
    
    if (recent.length === 0) {
        container.innerHTML = '<p class="no-data">No transactions yet</p>';
        return;
    }
    
    container.innerHTML = '';
    recent.forEach(sale => {
        const date = new Date(sale.date);
        const itemsText = sale.items.map(item => `${item.name} (${item.quantity}x)`).join(', ');
        const itemCount = sale.items.reduce((sum, item) => sum + item.quantity, 0);
        
        const div = document.createElement('div');
        div.className = 'transaction-item';
        div.innerHTML = `
            <div class="transaction-header">
                <div class="transaction-id">${sale.id}</div>
                <div class="transaction-amount">₱${sale.total.toFixed(2)}</div>
            </div>
            <div class="transaction-details">
                <div class="transaction-items">📦 ${itemsText}</div>
                <div class="transaction-meta">
                    <span class="transaction-time">⏰ ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span class="transaction-count">${itemCount} item${itemCount > 1 ? 's' : ''}</span>
                    <span class="transaction-method">${sale.paymentMethod || 'Cash'}</span>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

// Generate business insights from real data
function updateBusinessInsights(filteredSales, itemSales) {
    const insightsContainer = document.getElementById('insightsList');
    if (!insightsContainer) return;
    
    const insights = [];
    
    // 1. Peak hour analysis
    if (sales.length > 0) {
        const hourSales = {};
        sales.forEach(sale => {
            const hour = new Date(sale.date).getHours();
            if (!hourSales[hour]) hourSales[hour] = { count: 0, revenue: 0 };
            hourSales[hour].count++;
            hourSales[hour].revenue += sale.total;
        });
        
        const peakHour = Object.entries(hourSales)
            .sort((a, b) => b[1].revenue - a[1].revenue)[0];
        
        if (peakHour) {
            const hour = parseInt(peakHour[0]);
            const timeStr = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
            const nextHour = (hour + 1) % 24;
            const nextTimeStr = nextHour === 0 ? '12 AM' : nextHour < 12 ? `${nextHour} AM` : nextHour === 12 ? '12 PM' : `${nextHour - 12} PM`;
            insights.push(`⏰ Peak sales time: ${timeStr} - ${nextTimeStr} (₱${peakHour[1].revenue.toFixed(2)} revenue)`);
        }
    }
    
    // 2. Top selling product
    if (itemSales && Object.keys(itemSales).length > 0) {
        const topProduct = Object.values(itemSales)
            .sort((a, b) => b.revenue - a.revenue)[0];
        const totalRevenue = Object.values(itemSales).reduce((sum, item) => sum + item.revenue, 0);
        const percentage = totalRevenue > 0 ? ((topProduct.revenue / totalRevenue) * 100).toFixed(1) : 0;
        insights.push(`🏆 "${topProduct.name}" is your top seller (${percentage}% of revenue)`);
    }
    
    // 3. Average customer spending
    if (sales.length > 0) {
        const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
        const avgSpend = totalRevenue / sales.length;
        insights.push(`💰 Average customer spends ₱${avgSpend.toFixed(2)} per visit`);
    }
    
    // 4. Category performance
    const categorySales = {};
    sales.forEach(sale => {
        sale.items.forEach(item => {
            const cat = item.category || 'Other';
            if (!categorySales[cat]) categorySales[cat] = 0;
            categorySales[cat] += item.price * item.quantity;
        });
    });
    
    if (Object.keys(categorySales).length > 0) {
        const topCategory = Object.entries(categorySales)
            .sort((a, b) => b[1] - a[1])[0];
        const totalCatRevenue = Object.values(categorySales).reduce((sum, rev) => sum + rev, 0);
        const catPercentage = totalCatRevenue > 0 ? ((topCategory[1] / totalCatRevenue) * 100).toFixed(1) : 0;
        insights.push(`📊 ${topCategory[0]} category leads with ${catPercentage}% of sales`);
    }
    
    // Display insights or default message
    if (insights.length === 0) {
        insightsContainer.innerHTML = '<li>💡 Start making sales to see business insights</li>';
    } else {
        insightsContainer.innerHTML = insights.map(insight => `<li>${insight}</li>`).join('');
    }
}
