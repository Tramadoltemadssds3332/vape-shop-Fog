let tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

console.log("✅ Fog Shop загружен");

// ========== НАСТРОЙКИ ТЕМЫ ==========
let darkMode = localStorage.getItem('darkMode') === 'true';

// Данные пользователя
let user = {
    id: tg.initDataUnsafe?.user?.id || Math.floor(Math.random() * 1000000),
    username: tg.initDataUnsafe?.user?.username || 'user_' + Math.floor(Math.random() * 1000),
    firstName: tg.initDataUnsafe?.user?.first_name || 'Пользователь',
    promoCode: generatePromoCode(),
    orders: []
};

// Админы (твой ID)
const MAIN_ADMIN_ID = 1439146971;
let admins = [MAIN_ADMIN_ID];

function isAdmin() {
    return admins.includes(user.id);
}

// ========== ТОВАРЫ ==========
let products = [];

// Загружаем товары из localStorage
const savedProducts = localStorage.getItem('products');
if (savedProducts) {
    products = JSON.parse(savedProducts);
} else {
    // Товары по умолчанию
    products = [
        {id: 1, name: "HS Bank 100ml", price: 890, category: "liquids", image: "🥤", desc: "Фруктовый микс", stock: 15, date: "2024-01-01"},
        {id: 2, name: "Sadboy 60ml", price: 690, category: "liquids", image: "🍓", desc: "Клубничный джем", stock: 8, date: "2024-01-02"},
        {id: 3, name: "Pod System X", price: 2490, category: "pods", image: "💨", desc: "Компактная pod-система", stock: 5, date: "2024-01-03"},
        {id: 4, name: "Elf Bar 1500", price: 1290, category: "disposable", image: "⚡", desc: "1500 затяжек", stock: 12, date: "2024-01-04"}
    ];
}

let cart = [];
let favorites = [];
let currentCategory = 'all';
let currentSort = 'default';
let appliedPromo = null;
let currentPage = 'home';
let workHours = '10:00 - 22:00';

// ========== ФУНКЦИИ ==========

function generatePromoCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// ========== СИНХРОНИЗАЦИЯ ТОВАРОВ ==========
function startSync() {
    // Запрашиваем товары каждые 3 секунды
    setInterval(() => {
        console.log("🔄 Проверка новых товаров...");
        tg.sendData(JSON.stringify({
            action: 'get_products'
        }));
    }, 3000);
}

// Обновление товаров из бота
function updateProducts(newProducts) {
    if (JSON.stringify(products) !== JSON.stringify(newProducts)) {
        products = newProducts;
        localStorage.setItem('products', JSON.stringify(products));
        showNotification('📦 Новые товары!', 'sync');
        if (currentPage === 'home') showHome();
    }
}

// Отправка обновлений (для админа)
function broadcastProducts() {
    if (!isAdmin()) return;

    tg.sendData(JSON.stringify({
        action: 'update_products',
        products: products
    }));

    localStorage.setItem('products', JSON.stringify(products));
    showNotification('✅ Товары отправлены всем!', 'success');
}

// ========== ПЕРЕКЛЮЧЕНИЕ ТЕМЫ ==========
function toggleTheme() {
    darkMode = !darkMode;
    localStorage.setItem('darkMode', darkMode);
    applyTheme();
}

function applyTheme() {
    if (darkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

// ========== ПОИСК ==========
function showSearch() {
    currentPage = 'search';
    toggleFilters(false);

    const content = document.getElementById('main-content');
    if (!content) return;

    content.innerHTML = `
        <div class="search-page">
            <div class="search-header">
                <input type="text" id="searchInput" placeholder="🔍 Поиск товаров..." autofocus>
                <button onclick="performSearch()" class="search-button">Найти</button>
            </div>
            <div id="searchResults" class="search-results"></div>
        </div>
    `;

    document.getElementById('searchInput').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') performSearch();
    });
}

function performSearch() {
    const query = document.getElementById('searchInput')?.value.toLowerCase().trim();
    if (!query) return;

    const results = products.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.desc.toLowerCase().includes(query)
    );

    const resultsDiv = document.getElementById('searchResults');
    if (results.length === 0) {
        resultsDiv.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>Ничего не найдено</h3>
                <p>Попробуйте изменить запрос</p>
            </div>
        `;
        return;
    }

    let html = '<div class="products-grid">';
    results.forEach(product => {
        const inFav = favorites.some(f => f.id === product.id);
        html += `
            <div class="product-card" onclick="showProductDetails(${product.id})">
                <div class="product-image">${product.image}</div>
                <div class="product-title">${product.name}</div>
                <div class="product-price">${product.price} ₽</div>
                <div class="stock-indicator">
                    ✅ В наличии: ${product.stock}
                </div>
                <div style="display: flex; gap: 5px;" onclick="event.stopPropagation()">
                    <button class="add-to-cart" style="flex: 2;" onclick="addToCart(${product.id})" ${product.stock <= 0 ? 'disabled' : ''}>
                        🛒 В корзину
                    </button>
                    <button class="add-to-cart" style="flex: 1; background: ${inFav ? '#FF6B6B' : 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%)'}" onclick="toggleFavorite(${product.id})">
                        ${inFav ? '❤️' : '🤍'}
                    </button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    resultsDiv.innerHTML = html;
}

// ========== ДЕТАЛЬНАЯ ИНФОРМАЦИЯ О ТОВАРЕ ==========
function showProductDetails(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const content = document.getElementById('main-content');
    const inFav = favorites.some(f => f.id === product.id);

    content.innerHTML = `
        <div class="product-details-page">
            <button class="back-button" onclick="showHome()">
                <i class="fas fa-arrow-left"></i> Назад
            </button>
            
            <div class="product-details-card">
                <div class="product-details-image">
                    <div class="product-emoji">${product.image}</div>
                </div>
                
                <h2 class="product-details-title">${product.name}</h2>
                <div class="product-details-price">${product.price} ₽</div>
                
                <div class="product-details-stock in-stock">
                    ✅ В наличии: ${product.stock} шт
                </div>
                
                <div class="product-details-desc">
                    <h3>Описание</h3>
                    <p>${product.desc}</p>
                </div>
                
                <div class="product-details-actions">
                    <button class="add-to-cart-btn" onclick="addToCart(${product.id})">
                        🛒 Добавить в корзину
                    </button>
                    <button class="favorite-btn ${inFav ? 'active' : ''}" onclick="toggleFavorite(${product.id})">
                        ${inFav ? '❤️ В избранном' : '🤍 В избранное'}
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ========== ГЛАВНАЯ СТРАНИЦА ==========
function showHome() {
    currentPage = 'home';
    toggleFilters(true);

    const content = document.getElementById('main-content');
    if (!content) return;

    let filtered = products;
    if (currentCategory !== 'all') {
        filtered = products.filter(p => p.category === currentCategory);
    }

    let html = '<div class="products-grid">';
    filtered.forEach(product => {
        const inFav = favorites.some(f => f.id === product.id);

        html += `
            <div class="product-card" onclick="showProductDetails(${product.id})">
                <div class="product-image">${product.image}</div>
                <div class="product-title">${product.name}</div>
                <div class="product-price">${product.price} ₽</div>
                <div class="stock-indicator">
                    ✅ В наличии: ${product.stock}
                </div>
                <div style="display: flex; gap: 5px;" onclick="event.stopPropagation()">
                    <button class="add-to-cart" style="flex: 2;" onclick="addToCart(${product.id})">
                        🛒 В корзину
                    </button>
                    <button class="add-to-cart" style="flex: 1; background: ${inFav ? '#FF6B6B' : 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%)'}" onclick="toggleFavorite(${product.id})">
                        ${inFav ? '❤️' : '🤍'}
                    </button>
                </div>
                ${isAdmin() ? `
                <div style="display: flex; gap: 5px; margin-top: 10px;" onclick="event.stopPropagation()">
                    <button class="admin-btn edit-btn" style="flex:1;" onclick="quickEditProduct(${product.id})">✏️ Ред.</button>
                    <button class="admin-btn delete-btn" style="flex:1;" onclick="deleteProduct(${product.id})">🗑️</button>
                </div>
                ` : ''}
            </div>
        `;
    });
    html += '</div>';

    content.innerHTML = html;
}

// ========== БЫСТРОЕ РЕДАКТИРОВАНИЕ ==========
function quickEditProduct(productId) {
    if (!isAdmin()) return;

    const product = products.find(p => p.id === productId);
    if (!product) return;

    const newName = prompt('Название:', product.name);
    if (newName) product.name = newName;

    const newPrice = prompt('Цена:', product.price);
    if (newPrice) product.price = parseInt(newPrice);

    const newStock = prompt('Количество:', product.stock);
    if (newStock) product.stock = parseInt(newStock);

    const newDesc = prompt('Описание:', product.desc);
    if (newDesc) product.desc = newDesc;

    broadcastProducts();
    showHome();
    showNotification('✅ Товар обновлен!', 'success');
}

function deleteProduct(id) {
    if (!isAdmin()) return;

    if (confirm('Удалить товар?')) {
        products = products.filter(p => p.id !== id);
        broadcastProducts();
        showHome();
        showNotification('✅ Товар удален!', 'success');
    }
}

function addNewProduct() {
    if (!isAdmin()) return;

    const name = prompt('Название:');
    if (!name) return;

    const price = parseInt(prompt('Цена:'));
    if (!price) return;

    const stock = parseInt(prompt('Количество:', '10'));
    const desc = prompt('Описание:') || '';

    const newId = Math.max(...products.map(p => p.id), 0) + 1;

    products.push({
        id: newId,
        name: name,
        price: price,
        category: 'liquids',
        image: '📦',
        desc: desc,
        stock: stock,
        date: new Date().toISOString().split('T')[0]
    });

    broadcastProducts();
    showHome();
    showNotification('✅ Товар добавлен!', 'success');
}

// ========== КОРЗИНА ==========
function showCart() {
    currentPage = 'cart';
    toggleFilters(false);

    const content = document.getElementById('main-content');
    if (!content) return;

    if (cart.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-cart"></i>
                <h3>В корзине пусто</h3>
                <p>Добавьте товары из каталога</p>
                <button onclick="navigateTo('home')">Вернуться к покупкам</button>
            </div>
        `;
        return;
    }

    const grouped = {};
    cart.forEach(item => {
        if (!grouped[item.id]) {
            grouped[item.id] = {...item, count: 0};
        }
        grouped[item.id].count++;
    });

    let subtotal = 0;
    let html = `
        <div class="cart-page">
            <div class="cart-header">
                <h2>Корзина</h2>
                <button class="clear-cart" onclick="clearCart()">Очистить</button>
            </div>
    `;

    Object.values(grouped).forEach(item => {
        const itemTotal = item.price * item.count;
        subtotal += itemTotal;

        html += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <div>
                        <span style="color: #FF6B6B;">${item.price} ₽</span>
                        ${item.count > 1 ? `<span class="old-price">${itemTotal} ₽</span>` : ''}
                    </div>
                </div>
                <div class="cart-item-controls">
                    <button onclick="updateCartItem(${item.id}, -1)">−</button>
                    <span>${item.count}</span>
                    <button onclick="updateCartItem(${item.id}, 1)">+</button>
                </div>
            </div>
        `;
    });

    html += `
            <div class="promo-section">
                <input type="text" id="promoInput" placeholder="Промокод">
                <button onclick="applyPromo()">Применить</button>
            </div>
            
            <div class="cart-summary">
                <div class="summary-row total">
                    <span>Итого</span>
                    <span>${subtotal} ₽</span>
                </div>
            </div>
            
            <button class="checkout-btn" onclick="checkout()">
                Перейти к оформлению · ${subtotal} ₽
            </button>
        </div>
    `;

    content.innerHTML = html;
}

function showFavorites() {
    currentPage = 'favorites';
    toggleFilters(false);

    const content = document.getElementById('main-content');
    if (!content) return;

    if (favorites.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-heart"></i>
                <h3>В избранном пусто</h3>
                <p>Добавляйте товары в избранное</p>
                <button onclick="navigateTo('home')">Вернуться к покупкам</button>
            </div>
        `;
        return;
    }

    let html = '<div class="products-grid">';
    favorites.forEach(product => {
        html += `
            <div class="product-card" onclick="showProductDetails(${product.id})">
                <div class="product-image">${product.image}</div>
                <div class="product-title">${product.name}</div>
                <div class="product-price">${product.price} ₽</div>
                <button class="add-to-cart" onclick="addToCart(${product.id})">
                    🛒 В корзину
                </button>
            </div>
        `;
    });
    html += '</div>';

    content.innerHTML = html;
}

function showProfile() {
    currentPage = 'profile';
    toggleFilters(false);

    const content = document.getElementById('main-content');
    if (!content) return;

    content.innerHTML = `
        <div class="profile-page">
            <div class="profile-header">
                <div class="profile-avatar">${user.firstName.charAt(0)}</div>
                <div class="profile-info">
                    <h3>${user.firstName}</h3>
                    <p>@${user.username}</p>
                </div>
            </div>
            
            <div class="promo-card">
                <div>🎁 Ваш промокод</div>
                <div class="promo-code">${user.promoCode}</div>
            </div>
            
            <div class="history-section">
                <h3>📜 История заказов</h3>
                ${user.orders.length === 0 ? '<p>Нет заказов</p>' : ''}
            </div>
            
            ${isAdmin() ? `
            <button class="checkout-btn" style="margin-top:20px;" onclick="addNewProduct()">
                ➕ Добавить товар
            </button>
            ` : ''}
        </div>
    `;
}

function showRaffle() {
    tg.openTelegramLink('https://t.me/c/3867496075/42');
}

// ========== ДЕЙСТВИЯ ==========

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    cart.push({...product});
    updateCartBadge();
    showNotification(`${product.name} добавлен`, 'success');
}

function updateCartItem(productId, delta) {
    const index = cart.findIndex(item => item.id === productId);
    if (index === -1) return;

    if (delta > 0) {
        const product = products.find(p => p.id === productId);
        cart.push({...product});
    } else {
        cart.splice(index, 1);
    }

    updateCartBadge();
    showCart();
}

function clearCart() {
    cart = [];
    updateCartBadge();
    showCart();
}

function toggleFavorite(productId) {
    const index = favorites.findIndex(f => f.id === productId);
    if (index === -1) {
        const product = products.find(p => p.id === productId);
        favorites.push({...product});
        showNotification('❤️ В избранном');
    } else {
        favorites.splice(index, 1);
        showNotification('💔 Удалено');
    }
}

function updateCartBadge() {
    document.getElementById('cartBadge').textContent = cart.length;
}

function showNotification(text, type) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = text;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
}

function applyPromo() {
    showNotification('Промокод применен', 'success');
}

function checkout() {
    const modal = document.getElementById('orderModal');
    modal.classList.add('show');
}

function closeModal() {
    document.getElementById('orderModal').classList.remove('show');
}

function completeOrder() {
    const name = document.getElementById('orderName').value;
    if (!name) {
        showNotification('Введите имя', 'error');
        return;
    }

    const orderText = `🆕 ЗАКАЗ от @${user.username} (${name})\n\nТоваров: ${cart.length}`;

    tg.sendData(JSON.stringify({
        action: 'new_order',
        text: orderText
    }));

    cart = [];
    updateCartBadge();
    closeModal();
    showNotification('✅ Заказ отправлен!');
    showHome();
}

// ========== ФИЛЬТРЫ ==========
function toggleFilters(show) {
    const cats = document.querySelector('.categories-wrapper');
    const sort = document.querySelector('.sort-section');
    const banner = document.querySelector('.banner');
    if (cats && sort && banner) {
        cats.style.display = show ? 'block' : 'none';
        sort.style.display = show ? 'block' : 'none';
        banner.style.display = show ? 'block' : 'none';
    }
}

// ========== НАВИГАЦИЯ ==========
function navigateTo(page) {
    if (page === 'home') showHome();
    else if (page === 'favorites') showFavorites();
    else if (page === 'cart') showCart();
    else if (page === 'profile') showProfile();
    else if (page === 'raffle') showRaffle();
    else if (page === 'search') showSearch();

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.page === page) btn.classList.add('active');
    });
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
(function init() {
    applyTheme();
    startSync(); // ← Запускаем синхронизацию!
    showHome();

    if (isAdmin()) {
        document.getElementById('adminBtn').style.display = 'flex';
    }
})();

// ========== СОБЫТИЯ ==========
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
});

document.querySelector('.search-icon')?.addEventListener('click', () => navigateTo('search'));
document.querySelector('.banner')?.addEventListener('click', () => navigateTo('raffle'));

document.getElementById('adminBtn')?.addEventListener('click', () => {
    if (isAdmin()) addNewProduct();
});