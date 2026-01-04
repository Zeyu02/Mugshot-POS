// ===================================
// PRODUCT MANAGEMENT MODULE
// ===================================

// Product Modal Functions
function openAddProductModal() {
    currentEditProductId = null;
    document.getElementById('modalTitle').textContent = 'Add New Product';
    document.getElementById('productForm').reset();
    document.getElementById('imagePreview').innerHTML = '';
    const imageInput = document.getElementById('productImage');
    if (imageInput) imageInput.value = '';
    
    // Set default values for new products
    document.getElementById('productActive').checked = true;
    document.getElementById('productInStock').checked = true;
    
    document.getElementById('productModal').style.display = 'block';
}

function closeProductModal() {
    document.getElementById('productModal').style.display = 'none';
    document.getElementById('productForm').reset();
    document.getElementById('imagePreview').innerHTML = '';
    const imageInput = document.getElementById('productImage');
    if (imageInput) imageInput.value = '';
}

async function previewImage(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('imagePreview');
    
    if (!file) {
        preview.innerHTML = '';
        return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showNotification('⚠️ Please select a valid image file', 'warning');
        event.target.value = '';
        preview.innerHTML = '';
        return;
    }
    
    // Validate file size (max 5MB before compression)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('⚠️ Image size must be less than 5MB', 'warning');
        event.target.value = '';
        preview.innerHTML = '';
        return;
    }
    
    try {
        // Show loading
        preview.innerHTML = '<div style="text-align: center; padding: 20px;">Compressing image...</div>';
        
        // Compress image
        const compressedImage = await compressImage(file);
        
        // Show preview
        preview.innerHTML = `<img src="${compressedImage}" alt="Preview" style="max-width: 100%; height: auto; border-radius: 8px;">`;
        showNotification('✓ Image compressed successfully!', 'success');
    } catch (error) {
        console.error('Error processing image:', error);
        showNotification('⚠️ Error processing image', 'error');
        preview.innerHTML = '';
    }
}

async function saveProduct(event) {
    event.preventDefault();
    
    const name = document.getElementById('productName').value.trim();
    const category = document.getElementById('productCategory').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const description = document.getElementById('productDescription').value.trim();
    const active = document.getElementById('productActive').checked;
    const inStock = document.getElementById('productInStock').checked;
    
    // Validation
    if (!name) {
        showNotification('⚠️ Please enter product name', 'warning');
        return;
    }
    
    if (!category) {
        showNotification('⚠️ Please select a category', 'warning');
        return;
    }
    
    if (isNaN(price) || price <= 0) {
        showNotification('⚠️ Please enter a valid price', 'warning');
        return;
    }
    
    // Get current product if editing to preserve existing image
    const currentProduct = currentEditProductId ? products.find(p => p.id === currentEditProductId) : null;
    
    // Get image
    const imageInput = document.getElementById('productImage');
    let imageData = currentProduct ? (currentProduct.image || '') : '';
    
    if (imageInput && imageInput.files && imageInput.files[0]) {
        // New image selected
        const file = imageInput.files[0];
        
        // Validate again before processing
        if (!file.type.startsWith('image/')) {
            showNotification('⚠️ Invalid image file', 'warning');
            return;
        }
        
        try {
            // Compress image before saving
            imageData = await compressImage(file);
        } catch (error) {
            console.error('Error compressing image:', error);
            showNotification('⚠️ Error processing image', 'error');
            return;
        }
    }
    
    // Save product data
    try {
        let productToSave;
        
        if (currentEditProductId) {
            // Edit existing product
            const product = products.find(p => p.id === currentEditProductId);
            if (product) {
                product.name = name;
                product.category = category;
                product.price = price;
                product.description = description;
                product.image = imageData;
                product.active = active;
                product.inStock = inStock;
                productToSave = product;
            }
        } else {
            // Add new product
            productToSave = {
                id: Date.now(),
                name: name,
                category: category,
                price: price,
                description: description,
                image: imageData,
                active: active,
                inStock: inStock
            };
        }
        
        // Save using new storage system
        await saveProductWithImage(productToSave);
        
        // If this is a new category, add it to categories array with default icon
        if (category && !categories.find(c => c.name === category)) {
            categories.push({
                id: Date.now(),
                name: category,
                icon: '📦' // Default icon for new categories
            });
            saveCategories();
        }
        
        // Wait a moment for the save to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        loadProducts();
        loadProductsTable();
        updateCategoryButtons();
        updateCategoryDropdown();
        closeProductModal();
        
        showNotification(`✓ Product ${currentEditProductId ? 'updated' : 'added'} successfully!`);
    } catch (error) {
        console.error('Error saving product:', error);
        showNotification('⚠️ Error saving product. Storage limit may be exceeded.', 'error');
    }
}

// Load Products Table
function loadProductsTable() {
    const tbody = document.getElementById('productsTableBody');
    console.log('loadProductsTable called');
    console.log('tbody element:', tbody);
    console.log('products array:', products);
    console.log('products length:', products.length);
    
    if (!tbody) {
        console.error('productsTableBody not found!');
        return;
    }
    
    // Save current filter and search state
    const categoryFilter = document.getElementById('categoryFilter');
    const searchInput = document.getElementById('productSearchInput');
    const savedCategory = categoryFilter ? categoryFilter.value : 'all';
    const savedSearch = searchInput ? searchInput.value : '';
    
    tbody.innerHTML = '';
    
    // Update product stats
    updateProductStats();
    
    if (products.length === 0) {
        console.warn('No products to display in table');
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">No products yet. Click "+ New Product" to add items.</td></tr>';
        return;
    }
    
    console.log('Loading', products.length, 'products into table...');
    
    // Sort products by category for easier navigation
    const sortedProducts = [...products].sort((a, b) => {
        // First sort by category
        const categoryCompare = a.category.localeCompare(b.category);
        if (categoryCompare !== 0) return categoryCompare;
        // Then by name within category
        return a.name.localeCompare(b.name);
    });
    
    sortedProducts.forEach(product => {
        const row = document.createElement('tr');
        const isActive = product.active !== false;
        const isInStock = product.inStock !== false;
        
        // Create image with error handling
        const imgSrc = product.image || `https://via.placeholder.com/60?text=${encodeURIComponent(product.name)}`;
        
        row.innerHTML = `
            <td>
                <img src="${imgSrc}" 
                     alt="${product.name}" 
                     class="product-img-table"
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22%3E%3Crect fill=%22%23f0e9e3%22 width=%2260%22 height=%2260%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22Arial%22 font-size=%2230%22 fill=%22%23d4a574%22%3E☕%3C/text%3E%3C/svg%3E'">
            </td>
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>₱${product.price.toFixed(2)}</td>
            <td>
                <button class="btn-stock ${isInStock ? 'in-stock' : 'out-stock'}" 
                        onclick="toggleStock(${product.id})">
                    ${isInStock ? '✓ In Stock' : '✗ Out of Stock'}
                </button>
            </td>
            <td>
                <button class="btn-status ${isActive ? 'status-active' : 'status-inactive'}" 
                        onclick="toggleActiveStatus(${product.id})">
                    ${isActive ? '● Active' : '○ Inactive'}
                </button>
            </td>
            <td>
                <button class="btn-edit" onclick="editProduct(${product.id})">✏️ Edit</button>
                <button class="btn-delete" onclick="deleteProduct(${product.id})">🗑️ Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Restore filter and search state
    setTimeout(() => {
        if (categoryFilter) categoryFilter.value = savedCategory;
        if (searchInput) searchInput.value = savedSearch;
        applySavedFilters();
    }, 50);
}

// Update product statistics
function updateProductStats() {
    const totalCount = document.getElementById('totalProductsCount');
    const categoriesCount = document.getElementById('categoriesCount');
    const avgPrice = document.getElementById('avgPrice');
    const topCategory = document.getElementById('topCategory');
    
    if (totalCount) totalCount.textContent = products.length;
    
    if (avgPrice) {
        const average = products.reduce((sum, p) => sum + p.price, 0) / products.length;
        avgPrice.textContent = '₱' + (average || 0).toFixed(0);
    }
    
    if (categoriesCount) {
        const uniqueCategories = [...new Set(products.map(p => p.category))];
        categoriesCount.textContent = uniqueCategories.length;
    }
    
    if (topCategory) {
        const categoryCounts = {};
        products.forEach(p => {
            categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
        });
        const top = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
        topCategory.textContent = top ? top[0] : '-';
    }
}

// Search products in table
function searchProductsTable() {
    const searchTerm = document.getElementById('productSearchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#productsTableBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// Filter products by category in table
function filterProductsTable() {
    const category = document.getElementById('categoryFilter').value;
    const rows = document.querySelectorAll('#productsTableBody tr');
    
    rows.forEach(row => {
        const rowCategory = row.children[2].textContent;
        if (category === 'all' || rowCategory === category) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}
// Apply saved filters to products table
function applySavedFilters() {
    const categoryFilter = document.getElementById('categoryFilter');
    const searchInput = document.getElementById('productSearchInput');
    
    if (categoryFilter && categoryFilter.value !== 'all') {
        filterProductsTable();
    }
    
    if (searchInput && searchInput.value.trim() !== '') {
        searchProductsTable();
    }
}
// Apply saved filters to products table
function applySavedFilters() {
    const categoryFilter = document.getElementById('categoryFilter');
    const searchInput = document.getElementById('productSearchInput');
    
    if (categoryFilter && categoryFilter.value !== 'all') {
        filterProductsTable();
    }
    
    if (searchInput && searchInput.value.trim() !== '') {
        searchProductsTable();
    }
}

// Toggle product active/inactive status
function toggleActiveStatus(productId) {
    const product = products.find(p => p.id === productId);
    if (product) {
        product.active = product.active === false ? true : false;
        saveProducts();
        loadProductsTable();
        loadProducts(); // Refresh POS display
        updateCategoryButtons();
        
        const status = product.active ? 'activated' : 'deactivated';
        showNotification(`✓ ${product.name} ${status}`, product.active ? 'success' : 'warning');
    }
}

// Toggle product stock status
function toggleStock(productId) {
    const product = products.find(p => p.id === productId);
    if (product) {
        product.inStock = product.inStock === false ? true : false;
        saveProducts();
        loadProductsTable();
        loadProducts(); // Refresh POS display
        
        const status = product.inStock ? 'back in stock' : 'marked as out of stock';
        showNotification(`📦 ${product.name} ${status}`, product.inStock ? 'success' : 'warning');
    }
}

// Edit Product
function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    currentEditProductId = productId;
    document.getElementById('modalTitle').textContent = 'Edit Product';
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productDescription').value = product.description || '';
    
    // Set active and stock status
    document.getElementById('productActive').checked = product.active !== false;
    document.getElementById('productInStock').checked = product.inStock !== false;
    
    // Show existing image if available
    const preview = document.getElementById('imagePreview');
    if (product.image) {
        preview.innerHTML = `<img src="${product.image}" alt="Preview" style="max-width: 100%; height: auto; border-radius: 8px;">`;
    } else {
        preview.innerHTML = '';
    }
    
    document.getElementById('productModal').style.display = 'block';
}

// Delete Product
async function deleteProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    if (confirm(`Are you sure you want to delete "${product.name}"?`)) {
        try {
            await deleteProductWithImage(productId);
            loadProducts(); // Refresh Menu display
            loadProductsTable(); // Refresh Products table
            updateCategoryButtons(); // Update category filters
            showNotification(`✓ ${product.name} deleted successfully!`, 'success');
        } catch (error) {
            console.error('Error deleting product:', error);
            showNotification('⚠️ Error deleting product', 'error');
        }
    }
}

// Initialize products table when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for products to load from storage
    setTimeout(() => {
        console.log('Products.js: Initializing products table with', products.length, 'products');
        loadProductsTable();
    }, 300);
});
