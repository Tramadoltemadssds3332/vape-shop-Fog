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

// Админы
const MAIN_ADMIN_ID = 1439146971;
let admins = [MAIN_ADMIN_ID];

function isAdmin() {
    return admins.includes(user.id);
}

// ========== ТОВАРЫ ==========
let products = [
    {id: 1, name: "HS Bank 100ml", price: 890, category: "liquids", image: "🥤", desc: "Фруктовый микс", stock: 15, date: "2024-01-01"},
    {id: 2, name: "Sadboy 60ml", price: 690, category: "liquids", image: "🍓", desc: "Клубничный джем", stock: 8, date: "2024-01-02"},
    {id: 3, name: "Pod System X", price: 2490, category: "pods", image: "💨", desc: "Компактная pod-система", stock: 5, date: "2024-01-03"},
    {id: 4, name: "Elf Bar 1500", price: 1290, category: "disposable", image: "⚡", desc: "1500 затяжек", stock: 12, date: "2024-01-04"},
    {id: 5, name: "GeekVape Hero", price: 3300, category: "pods", image: "🦸", desc: "Влагозащита IP68", stock: 3, date: "2024-01-05"},
    {id: 6, name: "Шейкер-брелок", price: 500, category: "accessories", image: "🔑", desc: "Для жидкости Pink", stock: 7, date: "2024-01-06"},
    {id: 7, name: "Siberia White Dry", price: 550, category: "snus", image: "❄️", desc: "Крепкий снюс", stock: 6, date: "2024-01-07"},
    {id: 8, name: "White Fox", price: 530, category: "plates", image: "🦊", desc: "Никотиновые пластинки", stock: 5, date: "2024-01-08"}
];

let cart = [];
let favorites = [];
let currentCategory = 'all';
let currentSort = 'default';
let appliedPromo = null;
let currentPage = 'home';
let searchQuery = '';
let workHours = '10:00 - 22:00';
let lastProductUpdate = Date.now();

// ========== СИНХРОНИЗАЦИЯ ==========
function startInstantSync() {
    setInterval(() => {
        console.log("🔄 Проверка обновлений...");
        tg.sendData(JSON.stringify({
            action: 'get_products',
            timestamp: lastProductUpdate
        }));
    }, 3000);
}

function syncProducts() {
    tg.sendData(JSON.stringify({
        action: 'get_products',
        timestamp: lastProductUpdate
    }));
}

function broadcastProducts() {
    if (!isAdmin()) return;
    lastProductUpdate = Date.now();
    tg.sendData(JSON.stringify({
        action: 'update_products',
        products: products,
        timestamp: lastProductUpdate
    }));
    localStorage.setItem('products', JSON.stringify(products));
    showNotification('✅ Товары отправлены всем!', 'success');
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
        resultsDiv.innerHTML = `<div class="empty-state"><i class="fas fa-search"></i><h3>Ничего не найдено</h3></div>`;
        return;
    }
    let html = '<div class="products-grid">';
    results.forEach(product => {
        const inFav = favorites.some(f => f.id === product.id);
        html += `
            <div class="product-card" onclick="showProductDetails(${product.id})">
                <div class="product-image ${isAdmin() ? 'admin-mode' : ''}" onclick="event.stopPropagation(); ${isAdmin() ? `uploadProductImage(${product.id})` : ''}">
                    ${product.image}
                </div>
                <div class="product-title">${product.name}</div>
                <div class="product-price">${product.price} ₽</div>
                <div class="stock-indicator">✅ В наличии: ${product.stock}</div>
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

// ========== ДЕТАЛЬНАЯ СТРАНИЦА ==========
function showProductDetails(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const inFav = favorites.some(f => f.id === product.id);
    const content = document.getElementById('main-content');
    content.innerHTML = `
        <div class="product-details-page">
            <button class="back-button" onclick="showHome()"><i class="fas fa-arrow-left"></i> Назад</button>
            <div class="product-details-card">
                <div class="product-details-image" onclick="${isAdmin() ? `uploadProductImage(${product.id})` : ''}">
                    <div class="product-emoji">${product.image}</div>
                </div>
                <h2 class="product-details-title">${product.name}</h2>
                <div class="product-details-price">${product.price} ₽</div>
                <div class="product-details-stock">✅ В наличии: ${product.stock} шт</div>
                <div class="product-details-desc"><h3>Описание</h3><p>${product.desc}</p></div>
                <div class="product-details-category">
                    <span class="category-tag ${product.category}">${getCategoryName(product.category)}</span>
                </div>
                <div class="product-details-actions">
                    <button class="add-to-cart-btn" onclick="addToCart(${product.id})">🛒 Добавить в корзину</button>
                    <button class="favorite-btn ${inFav ? 'active' : ''}" onclick="toggleFavorite(${product.id})">
                        ${inFav ? '❤️ В избранном' : '🤍 В избранное'}
                    </button>
                </div>
                ${isAdmin() ? `
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button class="admin-btn edit-btn" style="flex:1;" onclick="quickEditProduct(${product.id})">✏️ Быстрое редактирование</button>
                </div>` : ''}
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

// ========== БЫСТРОЕ РЕДАКТИРОВАНИЕ ==========
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
    broadcastProducts();
    showHome();
    showNotification('✅ Товар обновлен!', 'success');
}

function uploadProductImage(productId) {
    if (!isAdmin()) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            const product = products.find(p => p.id === productId);
            product.image = event.target.result;
            broadcastProducts();
            showNotification('✅ Фото загружено!', 'success');
        };
        reader.readAsDataURL(file);
    };
    input.click();
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
    const stock = parseInt(prompt('Количество:', '10'));
    const desc = prompt('Описание:') || '';
    const newId = Math.max(...products.map(p => p.id), 0) + 1;
    products.push({
        id: newId, name, price, stock, desc,
        category: 'liquids', image: '📦', date: new Date().toISOString().split('T')[0]
    });
    broadcastProducts();
    showHome();
    showNotification('✅ Товар добавлен!', 'success');
}

// ========== ИЗБРАННОЕ ==========
function showFavorites() {
    currentPage = 'favorites';
    toggleFilters(false);
    const content = document.getElementById('main-content');
    if (favorites.length === 0) {
        content.innerHTML = `<div class="empty-state"><i class="fas fa-heart"></i><h3>В избранном пусто</h3><p>Добавляйте товары в избранное</p><button onclick="navigateTo('home')">Вернуться к покупкам</button></div>`;
        return;
    }
    let html = '<div class="products-grid">';
    favorites.forEach(product => {
        html += `
            <div class="product-card" onclick="showProductDetails(${product.id})">
                <div class="product-image">${product.image}</div>
                <div class="product-title">${product.name}</div>
                <div class="product-price">${product.price} ₽</div>
                <button class="add-to-cart" onclick="addToCart(${product.id})">🛒 В корзину</button>
            </div>
        `;
    });
    html += '</div>';
    content.innerHTML = html;
}

function toggleFavorite(productId) {
    const product = products.find(p => p.id === productId);
    const index = favorites.findIndex(f => f.id === productId);
    if (index === -1) {
        favorites.push({...product});
        showNotification('❤️ Добавлено в избранное');
    } else {
        favorites.splice(index, 1);
        showNotification('💔 Удалено из избранного');
    }
    if (currentPage === 'favorites') showFavorites();
}

// ========== КОРЗИНА ==========
function showCart() {
    currentPage = 'cart';
    toggleFilters(false);
    const content = document.getElementById('main-content');
    if (cart.length === 0) {
        content.innerHTML = `<div class="empty-state"><i class="fas fa-shopping-cart"></i><h3>В корзине пусто</h3><button onclick="navigateTo('home')">Вернуться к покупкам</button></div>`;
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
    const discount = appliedPromo ? subtotal * 0.05 : 0;
    const total = subtotal - discount;
    html += `
        <div class="promo-section"><input type="text" id="promoInput" placeholder="Промокод"><button onclick="applyPromo()">Применить</button></div>
        <div class="cart-summary">
            <div class="summary-row"><span>Товары (${cart.length})</span><span>${subtotal} ₽</span></div>
            ${appliedPromo ? `<div class="summary-row"><span>Скидка 5%</span><span>-${discount} ₽</span></div>` : ''}
            <div class="summary-row total"><span>Итого</span><span>${total} ₽</span></div>
        </div>
        <button class="checkout-btn" onclick="checkout()">Перейти к оформлению · ${total} ₽</button>
    </div>`;
    content.innerHTML = html;
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    cart.push({...product});
    updateCartBadge();
    showNotification(`${product.name} добавлен`, 'success');
}

function updateCartItem(productId, delta) {
    const index = cart.findIndex(item => item.id === productId);
    if (delta > 0) cart.push({...products.find(p => p.id === productId)});
    else cart.splice(index, 1);
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
        showNotification('❌ Нельзя свой промокод', 'error');
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
    let ordersHtml = user.orders.length === 0 ? '<p>Нет заказов</p>' :
        user.orders.map(o => `<div class="order-item"><div class="order-header"><span>Заказ #${o.id}</span><span>${o.date}</span></div><div>${o.items} товаров · ${o.total} ₽</div><div class="order-status">${o.status}</div></div>`).join('');

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

// ========== ОФОРМЛЕНИЕ ЗАКАЗА ==========
function checkout() {
    document.getElementById('orderModal').classList.add('show');
    addDeliveryFields();
}

function addDeliveryFields() {
    const workHoursDiv = document.querySelector('.work-hours-info');
    if (document.getElementById('deliveryFields')) return;

    const deliveryHtml = `
        <div id="deliveryFields" class="delivery-fields">
            <div class="delivery-section">
                <h4>📍 Место встречи</h4>
                <div class="place-selector">
                    <label class="place-option"><input type="radio" name="deliveryPlace" value="Северный вокзал" checked><span>🚂 Северный вокзал</span></label>
                    <label class="place-option"><input type="radio" name="deliveryPlace" value="ТРЦ Европа"><span>🛍️ ТРЦ Европа</span></label>
                </div>
            </div>
            <div class="delivery-section">
                <h4>📅 Дата доставки</h4>
                <select id="deliveryDate" class="delivery-select">${generateDateOptions()}</select>
                <p class="delivery-note">⚠️ Доставка на следующий день</p>
            </div>
            <div class="delivery-section">
                <h4>⏰ Время</h4>
                <select id="deliveryTime" class="delivery-select">${generateTimeOptions(workHours)}</select>
            </div>
        </div>
    `;
    workHoursDiv.insertAdjacentHTML('afterend', deliveryHtml);
}

function generateDateOptions() {
    let options = '';
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        const weekday = weekdays[date.getDay()];
        options += `<option value="${day}.${month}.${year}">${weekday}, ${day}.${month}.${year}</option>`;
    }
    return options;
}

function generateTimeOptions(workHoursStr) {
    const [start, end] = workHoursStr.split('-').map(t => parseInt(t.trim()));
    let options = '';
    for (let hour = start; hour <= end; hour++) {
        options += `<option value="${hour}:00">${hour}:00</option>`;
        if (hour < end) options += `<option value="${hour}:30">${hour}:30</option>`;
    }
    return options;
}

function closeModal() {
    document.getElementById('orderModal').classList.remove('show');
}

function completeOrder() {
    const name = document.getElementById('orderName').value.trim();
    if (!name) {
        showNotification('❌ Введите имя', 'error');
        return;
    }

    const subtotal = cart.reduce((sum, i) => sum + i.price, 0);
    const discount = appliedPromo ? subtotal * 0.05 : 0;
    const total = subtotal - discount;

    const grouped = {};
    cart.forEach(i => {
        if (!grouped[i.id]) grouped[i.id] = {...i, count: 0};
        grouped[i.id].count++;
    });

    let itemsList = '';
    Object.values(grouped).forEach(i => itemsList += `• ${i.name} x${i.count} — ${i.price * i.count}₽\n`);

    const order = {
        id: Date.now(),
        date: new Date().toLocaleString('ru-RU'),
        items: cart.length,
        total: total,
        name: name,
        comment: document.getElementById('orderComment').value,
        promo: appliedPromo
    };

    user.orders.push(order);

    const orderText = `🆕 НОВЫЙ ЗАКАЗ!\n\n👤 @${user.username} (${name})\n\n📦 ${itemsList}\n💰 ${total} ₽\n${appliedPromo ? `🎫 Промокод: ${appliedPromo}\n` : ''}🕐 ${order.date}`;

    tg.sendData(JSON.stringify({action: 'new_order', text: orderText}));

    fetch(`https://api.telegram.org/bot8384387938:AAEuhsPHVOAGZHDVOjCx9L9hqBMsTmDf-Rg/sendMessage`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({chat_id: 7602382626, text: orderText})
    });

    cart = [];
    appliedPromo = null;
    updateCartBadge();
    closeModal();
    showNotification('✅ Заказ отправлен!');
    showHome();
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ==========
function showNotification(text, type) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = text;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
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

// ========== БОКОВОЕ МЕНЮ ==========
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
    menuItems.innerHTML = `
        <a href="https://t.me/+ydkHgm09g5hhOTMy" target="_blank" class="side-menu-item"><i class="fab fa-telegram"></i><span>Наш канал</span><i class="fas fa-external-link-alt external-icon"></i></a>
        <div class="side-menu-item" onclick="toggleTheme()"><i class="fas ${darkMode ? 'fa-sun' : 'fa-moon'}"></i><span>${darkMode ? 'Светлая' : 'Темная'} тема</span></div>
        <div class="side-menu-item" onclick="showNotification('ℹ️ Информация')"><i class="fas fa-info-circle"></i><span>О нас</span></div>
        <div class="side-menu-item" onclick="showNotification('❓ Помощь')"><i class="fas fa-question-circle"></i><span>Помощь</span></div>
    `;
}

// ========== ПОДВИЖНАЯ ЛИНИЯ ==========
const categoriesSlider = document.getElementById('categoriesSlider');
const indicator = document.getElementById('sliderIndicator');

function updateIndicator() {
    const active = document.querySelector('.category.active');
    if (!active || !indicator) return;
    const left = active.offsetLeft;
    const width = active.offsetWidth;
    indicator.style.left = left + 'px';
    indicator.style.width = width + 'px';
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
(function init() {
    applyTheme();
    startInstantSync();
    showHome();
    setTimeout(updateIndicator, 100);
    updateSideMenu();
    if (isAdmin()) document.getElementById('adminBtn').style.display = 'flex';

    // Загрузка из localStorage
    const saved = localStorage.getItem('products');
    if (saved) products = JSON.parse(saved);
    const savedCart = localStorage.getItem(`cart_${user.id}`);
    if (savedCart) cart = JSON.parse(savedCart);
    const savedFav = localStorage.getItem(`fav_${user.id}`);
    if (savedFav) favorites = JSON.parse(savedFav);
    const savedOrders = localStorage.getItem(`orders_${user.id}`);
    if (savedOrders) user.orders = JSON.parse(savedOrders);
    updateCartBadge();
})();

// ========== СОБЫТИЯ ==========
categoriesSlider?.addEventListener('scroll', updateIndicator);
window.addEventListener('resize', updateIndicator);

document.querySelectorAll('.category').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.category').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.dataset.cat;
        updateIndicator();
        showHome();
    });
});

document.querySelector('.sort-header')?.addEventListener('click', () => {
    document.querySelector('.sort-menu').classList.toggle('show');
    document.querySelector('.sort-header').classList.toggle('active');
});

document.querySelectorAll('.sort-item').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.sort-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        currentSort = item.dataset.sort;
        document.querySelector('.sort-menu').classList.remove('show');
        document.querySelector('.sort-header').classList.remove('active');
        showHome();
    });
});

document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
});

document.querySelector('.search-icon')?.addEventListener('click', () => navigateTo('search'));
document.querySelector('.banner')?.addEventListener('click', () => navigateTo('raffle'));
document.getElementById('adminBtn')?.addEventListener('click', () => isAdmin() && addNewProduct());