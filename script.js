let tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

console.log("✅ Fog Shop загружен");

// ========== ДАННЫЕ ПОЛЬЗОВАТЕЛЯ ИЗ TELEGRAM ==========
let user = {
    id: tg.initDataUnsafe?.user?.id || Math.floor(Math.random() * 1000000),
    username: tg.initDataUnsafe?.user?.username || 'user_' + Math.floor(Math.random() * 1000),
    firstName: tg.initDataUnsafe?.user?.first_name || 'Пользователь',
    photoUrl: tg.initDataUnsafe?.user?.photo_url,
    promoCode: generatePromoCode(),
    orders: []
};

// ========== НАСТРОЙКИ ТЕМЫ ==========
let darkMode = localStorage.getItem('darkMode') === 'true';

// ========== АДМИНЫ ==========
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
let workHours = '10:00 - 22:00';

// ========== СОСТОЯНИЕ ОФОРМЛЕНИЯ ==========
let checkoutStep = 1;
let deliveryState = {
    place: null,
    address: '',
    date: null,
    time: null
};

// ========== ФУНКЦИИ ==========
function generatePromoCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// ========== СИНХРОНИЗАЦИЯ С СЕРВЕРОМ ==========
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

// ========== ТЕМА ==========
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
    const results = products.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.desc.toLowerCase().includes(query)
    );
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
                <div class="product-image">${product.image}</div>
                <div class="product-title">${product.name}</div>
                <div class="product-price">${product.price} ₽</div>
                <div class="stock-indicator in-stock">✅ ${product.stock}</div>
                <div style="display: flex; gap: 5px;" onclick="event.stopPropagation()">
                    <button class="add-to-cart" style="flex: 2;" onclick="addToCart(${product.id})">🛒 В корзину</button>
                    <button class="add-to-cart" style="flex: 1; background: ${inFav ? '#ff6b6b' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}" onclick="toggleFavorite(${product.id})">
                        ${inFav ? '❤️' : '🤍'}
                    </button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    resultsDiv.innerHTML = html;
}

// ========== ДЕТАЛЬНАЯ СТРАНИЦА ТОВАРА ==========
function showProductDetails(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const inFav = favorites.some(f => f.id === product.id);
    const content = document.getElementById('main-content');
    content.innerHTML = `
        <div class="product-details-page" style="padding:15px;">
            <button class="back-button" onclick="showHome()" style="background:none; border:none; color:#667eea; font-size:16px; margin-bottom:15px;">
                <i class="fas fa-arrow-left"></i> Назад
            </button>
            <div style="background:white; border-radius:20px; padding:20px; border:1px solid #f0f0f0;">
                <div style="width:100%; height:250px; background:#f5f5f7; border-radius:20px; display:flex; align-items:center; justify-content:center; font-size:80px; margin-bottom:20px;">
                    ${product.image}
                </div>
                <h2 style="font-size:24px; margin-bottom:10px;">${product.name}</h2>
                <div style="font-size:32px; color:#667eea; font-weight:700; margin-bottom:15px;">${product.price} ₽</div>
                <div style="background:#f0f3ff; padding:12px; border-radius:15px; margin-bottom:20px; color:#4ECDC4;">
                    ✅ В наличии: ${product.stock} шт
                </div>
                <div style="margin-bottom:20px;">
                    <h3 style="margin-bottom:10px;">Описание</h3>
                    <p style="color:#666; line-height:1.6;">${product.desc}</p>
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="add-to-cart" style="flex:2;" onclick="addToCart(${product.id})">🛒 Добавить в корзину</button>
                    <button class="add-to-cart" style="flex:1; background:${inFav ? '#ff6b6b' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}" onclick="toggleFavorite(${product.id})">
                        ${inFav ? '❤️' : '🤍'}
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ========== ГЛАВНАЯ ==========
function showHome() {
    currentPage = 'home';
    toggleFilters(true);
    const content = document.getElementById('main-content');

    let filtered = products;
    if (currentCategory !== 'all') {
        filtered = products.filter(p => p.category === currentCategory);
    }

    if (currentSort === 'price_asc') {
        filtered.sort((a, b) => a.price - b.price);
    } else if (currentSort === 'price_desc') {
        filtered.sort((a, b) => b.price - a.price);
    } else if (currentSort === 'newest') {
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

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
                <div class="stock-indicator in-stock">✅ ${product.stock}</div>
                <div style="display: flex; gap: 5px;" onclick="event.stopPropagation()">
                    <button class="add-to-cart" style="flex: 2;" onclick="addToCart(${product.id})">🛒 В корзину</button>
                    <button class="add-to-cart" style="flex: 1; background: ${inFav ? '#ff6b6b' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}" onclick="toggleFavorite(${product.id})">
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

// ========== ИЗБРАННОЕ ==========
function showFavorites() {
    currentPage = 'favorites';
    toggleFilters(false);
    const content = document.getElementById('main-content');

    if (favorites.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-star" style="color: #FFD700;"></i>
                <h3>В избранном пусто</h3>
                <p>Добавляйте понравившиеся товары в избранное, чтобы не потерять</p>
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
                <button class="add-to-cart" onclick="addToCart(${product.id})">🛒 В корзину</button>
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
        content.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open" style="color: #4ECDC4;"></i>
                <h3>Корзина пуста</h3>
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
                        <span style="color: #667eea; font-weight: 600;">${item.price} ₽</span>
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

    const discount = appliedPromo ? subtotal * 0.05 : 0;
    const total = subtotal - discount;

    html += `
            <div class="promo-section">
                <input type="text" id="promoInput" placeholder="Промокод" value="${appliedPromo || ''}">
                <button onclick="applyPromo()">Применить</button>
            </div>
            
            <div class="cart-summary">
                <div class="summary-row">
                    <span>Товары (${cart.length})</span>
                    <span>${subtotal} ₽</span>
                </div>
                ${appliedPromo ? `<div class="summary-row"><span>Скидка 5%</span><span>-${discount} ₽</span></div>` : ''}
                <div class="summary-row total">
                    <span>Итого</span>
                    <span>${total} ₽</span>
                </div>
            </div>
            
            <button class="checkout-btn" onclick="startCheckout()">
                Перейти к оформлению · ${total} ₽
            </button>
        </div>
    `;

    content.innerHTML = html;
}

// ========== ПРОФИЛЬ ==========
function showProfile() {
    currentPage = 'profile';
    toggleFilters(false);
    const content = document.getElementById('main-content');

    let ordersHtml = '';
    if (user.orders.length === 0) {
        ordersHtml = '<p style="text-align:center; color:#888; padding:20px;">У вас пока нет заказов</p>';
    } else {
        ordersHtml = user.orders.map(order => `
            <div class="order-item">
                <div class="order-header">
                    <span>Заказ #${order.id}</span>
                    <span>${order.date}</span>
                </div>
                <div>${order.items} товаров · ${order.total} ₽</div>
                <div class="order-status">${order.status || 'Новый'}</div>
            </div>
        `).join('');
    }

    content.innerHTML = `
        <div class="profile-page">
            <div class="profile-header">
                <div class="profile-avatar">
                    ${user.photoUrl ? `<img src="${user.photoUrl}" style="width:100%; border-radius:50%;">` : user.firstName.charAt(0)}
                </div>
                <div class="profile-info">
                    <h3>${user.firstName}</h3>
                    <p>@${user.username}</p>
                </div>
            </div>
            
            <div class="promo-card">
                <div>🎁 Ваш промокод на 5%</div>
                <div class="promo-code">${user.promoCode}</div>
            </div>
            
            <div class="history-section">
                <h3>📜 История заказов</h3>
                ${ordersHtml}
            </div>
            
            ${isAdmin() ? `<button class="checkout-btn" style="margin-top:20px;" onclick="addNewProduct()">➕ Добавить товар</button>` : ''}
        </div>
    `;
}

// ========== ОФОРМЛЕНИЕ ЗАКАЗА ==========
function startCheckout() {
    checkoutStep = 1;
    deliveryState = { place: null, address: '', date: null, time: null };
    showDeliveryMap();
}

function showDeliveryMap() {
    const content = document.getElementById('main-content');
    content.innerHTML = `
        <div class="checkout-screen">
            <h2 class="screen-title">Где заберете заказ?</h2>
            <div class="map-container">
                <!-- Точка 1: Театральная, 30 -->
                <div class="map-marker" style="top: 40%; left: 30%;" onclick="selectDeliveryPlace('ул. Театральная, д. 30')">
                    📍
                    <span class="marker-info">ул. Театральная, д. 30</span>
                </div>
                <!-- Точка 2: Советский пр., 8 -->
                <div class="map-marker" style="top: 60%; left: 60%;" onclick="selectDeliveryPlace('Советский проспект, 8')">
                    📍
                    <span class="marker-info">Советский проспект, 8</span>
                </div>
            </div>
            <button class="continue-btn" id="mapContinueBtn" onclick="nextCheckoutStep()" disabled>Выберите точку на карте</button>
        </div>
    `;
}

function selectDeliveryPlace(place) {
    deliveryState.place = place;
    document.getElementById('mapContinueBtn').disabled = false;
    document.getElementById('mapContinueBtn').innerText = 'Продолжить';
}

function nextCheckoutStep() {
    if (checkoutStep === 1) {
        checkoutStep = 2;
        showDateTimeSelection();
    } else if (checkoutStep === 2) {
        checkoutStep = 3;
        showPaymentSelection();
    } else if (checkoutStep === 3) {
        finishCheckout();
    }
}

function showDateTimeSelection() {
    const tomorrow = getTomorrowDate();
    const content = document.getElementById('main-content');
    content.innerHTML = `
        <div class="checkout-screen">
            <h2 class="screen-title">Когда удобно?</h2>
            
            <div class="delivery-option">
                <h4>📅 Дата доставки</h4>
                <input type="date" id="deliveryDate" min="${tomorrow}" value="${tomorrow}">
                <p class="delivery-note">⚠️ Доставка на следующий день</p>
            </div>
            
            <div class="delivery-option">
                <h4>⏰ Время</h4>
                <select id="deliveryTime">
                    <option>10:00</option>
                    <option>12:00</option>
                    <option>14:00</option>
                    <option>16:00</option>
                    <option>18:00</option>
                    <option>20:00</option>
                </select>
            </div>
            
            <button class="continue-btn" onclick="nextCheckoutStep()">Продолжить</button>
        </div>
    `;
}

function showPaymentSelection() {
    const content = document.getElementById('main-content');
    content.innerHTML = `
        <div class="checkout-screen">
            <h2 class="screen-title">Как оплатите?</h2>
            
            <div class="delivery-option selected" onclick="selectPayment('Наличные')">
                <span>💵 Наличными</span>
                <p style="color:#666; margin-top:5px;">Строго наличные</p>
            </div>
            
            <div class="delivery-option" style="margin-top:20px;">
                <h4>📝 Примечание к заказу</h4>
                <textarea id="orderComment" placeholder="Комментарии к заказу" rows="3" style="width:100%; padding:12px; border:1px solid #f0f0f0; border-radius:10px;"></textarea>
                <small style="color:#999;">Мы передадим эту информацию продавцу</small>
            </div>
            
            <button class="continue-btn" onclick="nextCheckoutStep()">Завершить заказ</button>
        </div>
    `;
}

function selectPayment(method) {
    deliveryState.paymentMethod = method;
}

function finishCheckout() {
    const deliveryDate = document.getElementById('deliveryDate')?.value || 'Не выбрано';
    const deliveryTime = document.getElementById('deliveryTime')?.value || 'Не выбрано';
    const comment = document.getElementById('orderComment')?.value || '';

    const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
    const discount = appliedPromo ? subtotal * 0.05 : 0;
    const total = subtotal - discount;

    const grouped = {};
    cart.forEach(item => {
        if (!grouped[item.id]) grouped[item.id] = {...item, count: 0};
        grouped[item.id].count++;
    });

    let itemsList = '';
    Object.values(grouped).forEach(item => {
        itemsList += `• ${item.name} x${item.count} — ${item.price * item.count}₽\n`;
    });

    const order = {
        id: Date.now(),
        date: new Date().toLocaleString('ru-RU'),
        items: cart.length,
        total: total,
        name: user.firstName,
        username: user.username,
        comment: comment,
        deliveryPlace: deliveryState.place,
        deliveryDate: deliveryDate,
        deliveryTime: deliveryTime,
        promo: appliedPromo
    };

    user.orders.push(order);

    const orderText = `🆕 **НОВЫЙ ЗАКАЗ!**\n\n👤 **Клиент:** @${user.username} (${user.firstName})\n\n📦 **Заказ:**\n${itemsList}\n💰 **Сумма:** ${total} ₽\n📍 **Место:** ${deliveryState.place}\n📅 **Дата:** ${deliveryDate}\n⏰ **Время:** ${deliveryTime}\n${appliedPromo ? `🎫 **Промокод:** ${appliedPromo}\n` : ''}\n📝 **Пожелание:**\n${comment || '—'}\n\n🕐 **Время заказа:** ${order.date}`;

    // Отправка менеджеру через Telegram WebApp
    tg.sendData(JSON.stringify({
        action: 'new_order',
        text: orderText,
        order: order
    }));

    // Дублирующая отправка через HTTP
    fetch(`https://api.telegram.org/bot8384387938:AAEuhsPHVOAGZHDVOjCx9L9hqBMsTmDf-Rg/sendMessage`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            chat_id: 7602382626,
            text: orderText,
            parse_mode: 'HTML'
        })
    }).catch(err => console.log('HTTP error:', err));

    cart = [];
    appliedPromo = null;
    updateCartBadge();

    showNotification('✅ Заказ отправлен! Менеджер свяжется с вами');
    navigateTo('home');
}

// ========== РОЗЫГРЫШ ==========
function showRaffle() {
    tg.openTelegramLink('https://t.me/c/3867496075/42');
}

// ========== ДЕЙСТВИЯ С ТОВАРАМИ ==========
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    cart.push({...product});
    updateCartBadge();
    showNotification(`${product.name} добавлен в корзину`);
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
}

function applyPromo() {
    const input = document.getElementById('promoInput');
    const code = input.value.trim();
    if (code === user.promoCode) {
        showNotification('❌ Нельзя использовать свой промокод');
        return;
    }
    appliedPromo = code || null;
    showCart();
}

function showNotification(text) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = text;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
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
    saveToServer();
    showHome();
    showNotification('✅ Товар обновлен');
}

function deleteProduct(id) {
    if (!isAdmin()) return;
    if (confirm('Удалить товар?')) {
        products = products.filter(p => p.id !== id);
        saveToServer();
        showHome();
        showNotification('✅ Товар удален');
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
    saveToServer();
    showHome();
    showNotification('✅ Товар добавлен');
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
            saveToServer();
            showNotification('✅ Фото загружено');
            showHome();
        };
        reader.readAsDataURL(file);
    };
    input.click();
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

// ========== ВСПОМОГАТЕЛЬНЫЕ ==========
function getTomorrowDate() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
}

// ========== БОКОВОЕ МЕНЮ ==========
const menuButton = document.getElementById('menuButton');
const sideMenu = document.getElementById('sideMenu');
const closeMenu = document.getElementById('closeMenu');
const overlay = document.getElementById('overlay');

menuButton?.addEventListener('click', () => {
    sideMenu.classList.add('open');
    overlay.classList.add('show');
    updateSideMenu();
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
    const themeText = darkMode ? 'Светлая тема' : 'Темная тема';
    menuItems.innerHTML = `
        <a href="https://t.me/+ydkHgm09g5hhOTMy" target="_blank" class="side-menu-item">
            <i class="fab fa-telegram"></i>
            <span>Наш канал Telegram</span>
            <i class="fas fa-external-link-alt external-icon"></i>
        </a>
        <div class="side-menu-item" onclick="showAbout()">
            <i class="fas fa-info-circle"></i>
            <span>О нас</span>
        </div>
        <div class="side-menu-item" onclick="toggleTheme()">
            <i class="fas ${themeIcon}"></i>
            <span>${themeText}</span>
        </div>
    `;
}

function showAbout() {
    closeMenuFunc();
    const content = document.getElementById('main-content');
    content.innerHTML = `
        <div style="padding: 30px 20px; text-align: center;">
            <h2 style="margin-bottom: 20px;">О нас</h2>
            <p style="color: #666; line-height: 1.6;">По всем вопросам пишите @fog_shop_manager</p>
        </div>
    `;
}

function closeMenuFunc() {
    sideMenu.classList.remove('open');
    overlay.classList.remove('show');
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
(function init() {
    applyTheme();
    setInterval(loadFromServer, 3000);
    loadFromServer();
    showHome();
    updateSideMenu();
    if (isAdmin()) document.getElementById('adminBtn').style.display = 'flex';

    const savedCart = localStorage.getItem(`cart_${user.id}`);
    if (savedCart) cart = JSON.parse(savedCart);
    const savedFav = localStorage.getItem(`fav_${user.id}`);
    if (savedFav) favorites = JSON.parse(savedFav);
    const savedOrders = localStorage.getItem(`orders_${user.id}`);
    if (savedOrders) user.orders = JSON.parse(savedOrders);
    updateCartBadge();
})();

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