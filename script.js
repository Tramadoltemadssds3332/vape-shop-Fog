let tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

console.log("✅ Fog Shop загружен");

// ========== СИНХРОНИЗАЦИЯ ==========
const SERVER_URL = 'http://10.0.4.30:8080/products'; // ЗАМЕНИ НА СВОЙ IP

async function loadFromServer() {
    try {
        let res = await fetch(SERVER_URL);
        let serverProducts = await res.json();
        if (serverProducts.length > 0) {
            products = serverProducts;
            localStorage.setItem('products', JSON.stringify(products));
            if (currentPage === 'home') showHome();
        }
    } catch(e) {
        console.log('Server error:', e);
    }
}

async function saveToServer() {
    if (!isAdmin()) return;
    await fetch(SERVER_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(products)
    });
}

// ========== ДАННЫЕ ==========
let darkMode = localStorage.getItem('darkMode') === 'true';
let user = {
    id: tg.initDataUnsafe?.user?.id || Math.floor(Math.random() * 1000000),
    username: tg.initDataUnsafe?.user?.username || 'user_' + Math.floor(Math.random() * 1000),
    firstName: tg.initDataUnsafe?.user?.first_name || 'Пользователь',
    promoCode: generatePromoCode(),
    orders: []
};

const MAIN_ADMIN_ID = 1439146971;
let admins = [MAIN_ADMIN_ID];

function isAdmin() {
    return admins.includes(user.id);
}

let products = [];
let cart = [];
let favorites = [];
let currentCategory = 'all';
let currentSort = 'default';
let appliedPromo = null;
let currentPage = 'home';
let workHours = '10:00 - 22:00';

// ========== ЗАГРУЗКА ==========
const savedProducts = localStorage.getItem('products');
if (savedProducts) {
    products = JSON.parse(savedProducts);
} else {
    products = [
        {id: 1, name: "HS Bank 100ml", price: 890, category: "liquids", image: "🥤", desc: "Фруктовый микс", stock: 15, date: "2024-01-01"},
        {id: 2, name: "Sadboy 60ml", price: 690, category: "liquids", image: "🍓", desc: "Клубничный джем", stock: 8, date: "2024-01-02"},
        {id: 3, name: "Elf Bar 1500", price: 1290, category: "disposable", image: "⚡", desc: "1500 затяжек", stock: 12, date: "2024-01-04"}
    ];
}

// ========== ФУНКЦИИ ==========
function generatePromoCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

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
    const results = products.filter(p => p.name.toLowerCase().includes(query) || p.desc.toLowerCase().includes(query));
    const resultsDiv = document.getElementById('searchResults');
    if (results.length === 0) {
        resultsDiv.innerHTML = `<div class="empty-state"><i class="fas fa-search"></i><h3>Ничего не найдено</h3><p>Попробуйте изменить запрос</p></div>`;
        return;
    }
    let html = '<div class="products-grid">';
    results.forEach(product => {
        const inFav = favorites.some(f => f.id === product.id);
        html += `
            <div class="product-card" onclick="showProductDetails(${product.id})">
                <div class="product-image ${isAdmin() ? 'admin-mode' : ''}" onclick="event.stopPropagation(); ${isAdmin() ? `uploadProductImage(${product.id})` : ''}">
                    ${product.image.startsWith('data:') ? `<img src="${product.image}">` : product.image}
                </div>
                <div class="product-title">${product.name}</div>
                <div class="product-price">${product.price} ₽</div>
                <div class="stock-indicator">✅ ${product.stock}</div>
                <div style="display: flex; gap: 5px;" onclick="event.stopPropagation()">
                    <button class="add-to-cart" style="flex: 2;" onclick="addToCart(${product.id})">🛒 В корзину</button>
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

// ========== ДЕТАЛЬНАЯ ==========
function showProductDetails(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const inFav = favorites.some(f => f.id === product.id);
    const content = document.getElementById('main-content');
    content.innerHTML = `
        <div class="product-details-page">
            <button class="back-button" onclick="showHome()"><i class="fas fa-arrow-left"></i> Назад</button>
            <div class="product-details-card">
                <div class="product-details-image">
                    <div class="product-emoji">${product.image}</div>
                </div>
                <h2 class="product-details-title">${product.name}</h2>
                <div class="product-details-price">${product.price} ₽</div>
                <div class="product-details-stock">✅ В наличии: ${product.stock} шт</div>
                <div class="product-details-desc"><h3>Описание</h3><p>${product.desc}</p></div>
                <div class="product-details-category"><span class="category-tag">${getCategoryName(product.category)}</span></div>
                <div class="product-details-actions">
                    <button class="add-to-cart-btn" onclick="addToCart(${product.id})">🛒 Добавить</button>
                    <button class="favorite-btn ${inFav ? 'active' : ''}" onclick="toggleFavorite(${product.id})">${inFav ? '❤️' : '🤍'}</button>
                </div>
            </div>
        </div>
    `;
}

function getCategoryName(category) {
    const categories = {
        'liquids': '💧 Жидкости', 'pods': '💨 Pod-системы', 'disposable': '⚡ Одноразовые',
        'accessories': '🔧 Аксессуары', 'snus': '❄️ Снюс', 'plates': '📦 Пластинки'
    };
    return categories[category] || category;
}

// ========== АДМИНКА ==========
function quickEditProduct(productId) {
    if (!isAdmin()) return;
    const product = products.find(p => p.id === productId);
    const newName = prompt('Название:', product.name);
    if (newName) product.name = newName;
    const newPrice = prompt('Цена:', product.price);
    if (newPrice) product.price = parseInt(newPrice);
    const newStock = prompt('Количество:', product.stock);
    if (newStock) product.stock = parseInt(newStock);
    const newDesc = prompt('Описание:', product.desc);
    if (newDesc) product.desc = newDesc;
    saveToStorage();
    saveToServer();
    showHome();
    showNotification('✅ Товар обновлен!');
}

function deleteProduct(id) {
    if (!isAdmin()) return;
    if (confirm('Удалить товар?')) {
        products = products.filter(p => p.id !== id);
        saveToStorage();
        saveToServer();
        showHome();
        showNotification('✅ Товар удален!');
    }
}

function addNewProduct() {
    if (!isAdmin()) return;
    const name = prompt('Название:');
    if (!name) return;
    const price = parseInt(prompt('Цена:'));
    const stock = parseInt(prompt('Количество:', '10'));
    const desc = prompt('Описание:') || '';
    const category = prompt('Категория (liquids/pods/disposable/accessories/snus/plates):') || 'liquids';
    const newId = Math.max(...products.map(p => p.id), 0) + 1;
    products.push({
        id: newId, name, price, stock, desc, category,
        image: '📦', date: new Date().toISOString().split('T')[0]
    });
    saveToStorage();
    saveToServer();
    showHome();
    showNotification('✅ Товар добавлен!');
}

// ========== ГЛАВНАЯ ==========
function showHome() {
    currentPage = 'home';
    toggleFilters(true);
    const content = document.getElementById('main-content');
    let filtered = products;
    if (currentCategory !== 'all') filtered = products.filter(p => p.category === currentCategory);
    if (currentSort === 'price_asc') filtered.sort((a, b) => a.price - b.price);
    if (currentSort === 'price_desc') filtered.sort((a, b) => b.price - a.price);
    if (currentSort === 'newest') filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    let html = '<div class="products-grid">';
    filtered.forEach(product => {
        const inFav = favorites.some(f => f.id === product.id);
        html += `
            <div class="product-card" onclick="showProductDetails(${product.id})">
                <div class="product-image ${isAdmin() ? 'admin-mode' : ''}" onclick="event.stopPropagation(); ${isAdmin() ? `uploadProductImage(${product.id})` : ''}">
                    ${product.image}
                </div>
                <div class="product-title">${product.name}</div>
                <div class="product-price">${product.price} ₽</div>
                <div class="stock-indicator">✅ ${product.stock}</div>
                <div style="display: flex; gap: 5px;" onclick="event.stopPropagation()">
                    <button class="add-to-cart" style="flex: 2;" onclick="addToCart(${product.id})">🛒 В корзину</button>
                    <button class="add-to-cart" style="flex: 1; background: ${inFav ? '#FF6B6B' : 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%)'}" onclick="toggleFavorite(${product.id})">
                        ${inFav ? '❤️' : '🤍'}
                    </button>
                </div>
                ${isAdmin() ? `
                <div class="admin-controls" onclick="event.stopPropagation()">
                    <button class="admin-btn edit-btn" onclick="quickEditProduct(${product.id})">✏️ Ред.</button>
                    <button class="admin-btn delete-btn" onclick="deleteProduct(${product.id})">🗑️</button>
                </div>` : ''}
            </div>
        `;
    });
    html += '</div>';
    content.innerHTML = html;
}

// ========== КОРЗИНА ==========
function showCart() {
    currentPage = 'cart';
    toggleFilters(false);
    const content = document.getElementById('main-content');
    if (cart.length === 0) {
        content.innerHTML = `<div class="empty-state"><i class="fas fa-shopping-cart"></i><h3>В корзине пусто</h3><button onclick="navigateTo('home')">Вернуться</button></div>`;
        return;
    }
    const grouped = {};
    cart.forEach(item => {
        if (!grouped[item.id]) grouped[item.id] = {...item, count: 0};
        grouped[item.id].count++;
    });
    let subtotal = 0;
    let html = `<div class="cart-page"><div class="cart-header"><h2>Корзина</h2><button class="clear-cart" onclick="clearCart()">Очистить</button></div>`;
    Object.values(grouped).forEach(item => {
        const itemTotal = item.price * item.count;
        subtotal += itemTotal;
        html += `
            <div class="cart-item">
                <div><h4>${item.name}</h4><span style="color:#FF6B6B;">${item.price} ₽</span>${item.count > 1 ? `<span class="old-price">${itemTotal} ₽</span>` : ''}</div>
                <div class="cart-item-controls">
                    <button onclick="updateCartItem(${item.id}, -1)">−</button><span>${item.count}</span><button onclick="updateCartItem(${item.id}, 1)">+</button>
                </div>
            </div>
        `;
    });
    const total = subtotal - (appliedPromo ? subtotal * 0.05 : 0);
    html += `
        <div class="promo-section"><input type="text" id="promoInput" placeholder="Промокод"><button onclick="applyPromo()">Применить</button></div>
        <div class="cart-summary"><div class="summary-row total"><span>Итого</span><span>${total} ₽</span></div></div>
        <button class="checkout-btn" onclick="checkout()">Оформить · ${total} ₽</button>
    </div>`;
    content.innerHTML = html;
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    cart.push({...product});
    updateCartBadge();
    showNotification(`${product.name} добавлен`);
}

function updateCartItem(productId, delta) {
    const index = cart.findIndex(item => item.id === productId);
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
    appliedPromo = null;
    updateCartBadge();
    showCart();
}

function updateCartBadge() {
    document.getElementById('cartBadge').textContent = cart.length;
}

function applyPromo() {
    const code = document.getElementById('promoInput').value;
    if (code === user.promoCode) {
        showNotification('❌ Нельзя свой промокод');
        return;
    }
    appliedPromo = code || null;
    showCart();
}

// ========== ПРОФИЛЬ ==========
function showProfile() {
    currentPage = 'profile';
    toggleFilters(false);
    const content = document.getElementById('main-content');
    let ordersHtml = user.orders.length === 0 ? '<p>Нет заказов</p>' : '';
    content.innerHTML = `
        <div class="profile-page">
            <div class="profile-header">
                <div class="profile-avatar">${user.firstName.charAt(0)}</div>
                <div><h3>${user.firstName}</h3><p>@${user.username}</p></div>
            </div>
            <div class="promo-card"><div>Ваш промокод</div><div class="promo-code">${user.promoCode}</div></div>
            <div class="history-section"><h3>История заказов</h3>${ordersHtml}</div>
            ${isAdmin() ? `<button class="checkout-btn" onclick="addNewProduct()">➕ Добавить товар</button>` : ''}
        </div>
    `;
}

// ========== РОЗЫГРЫШ ==========
function showRaffle() {
    tg.openTelegramLink('https://t.me/c/3867496075/42');
}

// ========== ЗАКАЗ ==========
function checkout() {
    document.getElementById('orderModal').classList.add('show');
}

function closeModal() {
    document.getElementById('orderModal').classList.remove('show');
}

function completeOrder() {
    const name = document.getElementById('orderName').value.trim();
    if (!name) {
        showNotification('❌ Введите имя');
        return;
    }

    const total = cart.reduce((sum, i) => sum + i.price, 0);
    const order = {
        id: Date.now(),
        date: new Date().toLocaleString('ru-RU'),
        items: cart.length,
        total: total,
        name: name,
        comment: document.getElementById('orderComment').value
    };

    user.orders.push(order);
    const orderText = `🆕 ЗАКАЗ\n👤 @${user.username}\n📦 ${cart.length} товаров\n💰 ${total} ₽`;

    tg.sendData(JSON.stringify({action: 'new_order', text: orderText}));

    cart = [];
    updateCartBadge();
    closeModal();
    showNotification('✅ Заказ отправлен!');
    showHome();
}

function showNotification(text) {
    const n = document.createElement('div');
    n.className = 'notification';
    n.textContent = text;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 2000);
}

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

// ========== МЕНЮ ==========
const menuButton = document.getElementById('menuButton');
const sideMenu = document.getElementById('sideMenu');
const closeMenu = document.getElementById('closeMenu');
const overlay = document.getElementById('overlay');

menuButton?.addEventListener('click', () => {
    sideMenu.classList.add('open');
    overlay.classList.add('show');
});

closeMenu?.addEventListener('click', () => {
    sideMenu.classList.remove('open');
    overlay.classList.remove('show');
});

overlay?.addEventListener('click', () => {
    sideMenu.classList.remove('open');
    overlay.classList.remove('show');
});

function updateSideMenu() {
    const menuItems = document.querySelector('.side-menu-items');
    if (!menuItems) return;
    const themeIcon = darkMode ? 'fa-sun' : 'fa-moon';
    const themeText = darkMode ? 'Светлая' : 'Темная';
    menuItems.innerHTML = `
        <a href="https://t.me/+ydkHgm09g5hhOTMy" target="_blank" class="side-menu-item"><i class="fab fa-telegram"></i><span>Наш канал</span><i class="fas fa-external-link-alt external-icon"></i></a>
        <div class="side-menu-item" onclick="toggleTheme()"><i class="fas ${themeIcon}"></i><span>${themeText} тема</span></div>
    `;
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
(function init() {
    applyTheme();
    showHome();
    updateSideMenu();
    setInterval(loadFromServer, 3000);
    loadFromServer();
    if (isAdmin()) document.getElementById('adminBtn').style.display = 'flex';

    const savedCart = localStorage.getItem(`cart_${user.id}`);
    if (savedCart) cart = JSON.parse(savedCart);
    const savedFav = localStorage.getItem(`fav_${user.id}`);
    if (savedFav) favorites = JSON.parse(savedFav);
    const savedOrders = localStorage.getItem(`orders_${user.id}`);
    if (savedOrders) user.orders = JSON.parse(savedOrders);
    updateCartBadge();
})();

function saveToStorage() {
    localStorage.setItem(`cart_${user.id}`, JSON.stringify(cart));
    localStorage.setItem(`fav_${user.id}`, JSON.stringify(favorites));
    localStorage.setItem(`orders_${user.id}`, JSON.stringify(user.orders));
    localStorage.setItem('products', JSON.stringify(products));
}

// ========== СОБЫТИЯ ==========
document.querySelectorAll('.category').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.category').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.dataset.cat;
        showHome();
    });
});

document.querySelector('.sort-header')?.addEventListener('click', () => {
    document.querySelector('.sort-menu').classList.toggle('show');
});

document.querySelectorAll('.sort-item').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.sort-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        currentSort = item.dataset.sort;
        document.querySelector('.sort-menu').classList.remove('show');
        showHome();
    });
});

document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
});

document.querySelector('.search-icon')?.addEventListener('click', () => navigateTo('search'));
document.querySelector('.banner')?.addEventListener('click', () => navigateTo('raffle'));
document.getElementById('adminBtn')?.addEventListener('click', () => isAdmin() && addNewProduct());