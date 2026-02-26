let tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

console.log("✅ Fog Shop загружен");

// ========== ДАННЫЕ ПОЛЬЗОВАТЕЛЯ ==========
let user = {
    id: tg.initDataUnsafe?.user?.id || Math.floor(Math.random() * 1000000),
    username: tg.initDataUnsafe?.user?.username || 'user_' + Math.floor(Math.random() * 1000),
    firstName: tg.initDataUnsafe?.user?.first_name || 'Пользователь',
    photoUrl: tg.initDataUnsafe?.user?.photo_url,
    promoCode: generatePromoCode(),
    orders: []
};

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

// ========== РАБОЧЕЕ ВРЕМЯ (можно менять админом) ==========
let workHours = {
    start: 14, // 14:00
    end: 20    // 20:00
};

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

// ========== СИНХРОНИЗАЦИЯ ==========
const SERVER_URL = 'http://10.0.4.30:8080/products';

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
                <div class="product-image">${product.image}</div>
                <div class="product-title">${product.name}</div>
                <div class="product-price">${product.price} ₽</div>
                <div class="stock-indicator">✅ ${product.stock}</div>
                <div style="display: flex; gap: 5px;" onclick="event.stopPropagation()">
                    <button class="add-to-cart" onclick="addToCart(${product.id})">🛒 В корзину</button>
                    <button class="add-to-cart" style="background: ${inFav ? '#ff4444' : '#333'}" onclick="toggleFavorite(${product.id})">
                        ${inFav ? '❤️' : '🤍'}
                    </button>
                </div>
                ${isAdmin() ? `
                <div style="display:flex; gap:5px; margin-top:10px;">
                    <button onclick="quickEditProduct(${product.id})">✏️</button>
                    <button onclick="deleteProduct(${product.id})">🗑️</button>
                </div>` : ''}
            </div>
        `;
    });
    html += '</div>';
    content.innerHTML = html;
}

// ========== ДЕТАЛЬНАЯ СТРАНИЦА ==========
function showProductDetails(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const inFav = favorites.some(f => f.id === product.id);
    const content = document.getElementById('main-content');
    content.innerHTML = `
        <div class="product-details-page">
            <button class="back-button" onclick="showHome()">
                <i class="fas fa-arrow-left"></i> Назад
            </button>
            
            <div class="product-details-card">
                <div class="product-details-image">
                    ${product.image}
                </div>
                
                <h2 class="product-details-title">${product.name}</h2>
                <div class="product-details-price">${product.price} ₽</div>
                
                <div class="product-details-stock">
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
                        ${inFav ? '❤️' : '🤍'}
                    </button>
                </div>
            </div>
        </div>
    `;
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
                <button class="add-to-cart" onclick="event.stopPropagation(); addToCart(${product.id})">
                    🛒 В корзину
                </button>
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
                <i class="fas fa-gift" style="color: #4ECDC4;"></i>
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
                        <span style="font-weight:600;">${item.price} ₽</span>
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
        ordersHtml = '<p style="text-align:center; color:#999; padding:20px;">У вас пока нет заказов</p>';
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
            
            ${isAdmin() ? `
                <div style="margin-top:20px;">
                    <button class="checkout-btn" onclick="showAdminWorkHours()">⚙️ Настройки времени</button>
                </div>
            ` : ''}
        </div>
    `;
}

// ========== АДМИНКА: НАСТРОЙКА ВРЕМЕНИ ==========
function showAdminWorkHours() {
    if (!isAdmin()) return;

    const content = document.getElementById('main-content');
    content.innerHTML = `
        <div class="checkout-screen">
            <button class="back-button" onclick="showProfile()">
                <i class="fas fa-arrow-left"></i> Назад
            </button>
            
            <h2 class="screen-title">⚙️ Настройка времени работы</h2>
            
            <div class="delivery-option">
                <h4>Начало работы</h4>
                <select id="workStart">
                    ${generateHourOptions(workHours.start)}
                </select>
            </div>
            
            <div class="delivery-option">
                <h4>Конец работы</h4>
                <select id="workEnd">
                    ${generateHourOptions(workHours.end)}
                </select>
            </div>
            
            <button class="continue-btn" onclick="saveWorkHours()">
                Сохранить настройки
            </button>
        </div>
    `;
}

function generateHourOptions(selected) {
    let options = '';
    for (let hour = 0; hour <= 23; hour++) {
        const selectedAttr = (hour === selected) ? 'selected' : '';
        options += `<option value="${hour}" ${selectedAttr}>${hour.toString().padStart(2, '0')}:00</option>`;
    }
    return options;
}

function saveWorkHours() {
    const start = parseInt(document.getElementById('workStart').value);
    const end = parseInt(document.getElementById('workEnd').value);

    if (start >= end) {
        alert('Конец работы должен быть позже начала');
        return;
    }

    workHours.start = start;
    workHours.end = end;

    alert('✅ Время работы сохранено');
    showProfile();
}

// ========== РОЗЫГРЫШ ==========
function showRaffle() {
    tg.openTelegramLink('https://t.me/c/3867496075/42');
}

// ========== ПОИСК ==========
function showSearch() {
    currentPage = 'search';
    toggleFilters(false);
    const content = document.getElementById('main-content');
    content.innerHTML = `
        <div class="search-page" style="padding:15px;">
            <div style="display:flex; gap:10px; margin-bottom:20px;">
                <input type="text" id="searchInput" placeholder="🔍 Поиск товаров..." style="flex:1; padding:12px; border:1px solid #ddd; border-radius:8px;">
                <button onclick="performSearch()" style="padding:12px 20px; background:#333; color:white; border:none; border-radius:8px;">Найти</button>
            </div>
            <div id="searchResults"></div>
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
        resultsDiv.innerHTML = `<div class="empty-state"><i class="fas fa-search"></i><h3>Ничего не найдено</h3></div>`;
        return;
    }
    let html = '<div class="products-grid">';
    results.forEach(product => {
        html += `
            <div class="product-card" onclick="showProductDetails(${product.id})">
                <div class="product-image">${product.image}</div>
                <div class="product-title">${product.name}</div>
                <div class="product-price">${product.price} ₽</div>
                <button class="add-to-cart" onclick="event.stopPropagation(); addToCart(${product.id})">🛒 В корзину</button>
            </div>
        `;
    });
    html += '</div>';
    resultsDiv.innerHTML = html;
}

// ========== ГЕНЕРАЦИЯ ВРЕМЕНИ ДЛЯ ВЫПАДАЮЩЕГО СПИСКА ==========
function generateTimeOptions() {
    let options = '';
    for (let hour = workHours.start; hour <= workHours.end; hour++) {
        options += `<option value="${hour}:00">${hour.toString().padStart(2, '0')}:00</option>`;
        if (hour < workHours.end) {
            options += `<option value="${hour}:30">${hour.toString().padStart(2, '0')}:30</option>`;
        }
    }
    return options;
}

// ========== ОФОРМЛЕНИЕ ЗАКАЗА С КАРТОЙ ==========
function startCheckout() {
    checkoutStep = 1;
    deliveryState = { place: null, address: '', date: null, time: null };
    showDeliveryMap();
}

function showDeliveryMap() {
    const content = document.getElementById('main-content');
    content.innerHTML = `
        <div class="checkout-screen">
            <button class="back-button" onclick="showCart()" style="margin-bottom:15px;">
                <i class="fas fa-arrow-left"></i> Назад в корзину
            </button>
            
            <h2 class="screen-title">Где заберете заказ?</h2>
            
            <!-- Яндекс Карта -->
            <div id="map" style="width:100%; height:350px; margin-bottom:20px; border-radius:12px; overflow:hidden; border:1px solid #e0e0e0;"></div>
            
            <button class="continue-btn" id="mapContinueBtn" onclick="nextCheckoutStep()" disabled>
                Выберите точку на карте
            </button>
        </div>
    `;

    // Загружаем Яндекс Карты с API-ключом
    const script = document.createElement('script');
    script.src = "https://api-maps.yandex.ru/2.1/?apikey=d09bda33-f82a-4501-bfe6-84a386cf1f34&lang=ru_RU";
    script.onload = initMap;
    document.head.appendChild(script);
}

function initMap() {
    if (!window.ymaps) return;

    ymaps.ready(() => {
        // Центрируем карту между двумя точками в Калининграде
        const map = new ymaps.Map("map", {
            center: [54.7205, 20.5003],
            zoom: 16
        });

        // Точка 1: Северный вокзал
        const place1 = new ymaps.Placemark(
            [54.722716, 20.499544],
            {
                balloonContent: 'Северный вокзал, ул. Театральная, 30',
                hintContent: '🚂 Северный вокзал'
            },
            {
                preset: 'islands#redDotIcon',
                draggable: false
            }
        );

        // Точка 2: ТРЦ Европа
        const place2 = new ymaps.Placemark(
            [54.718551, 20.501129],
            {
                balloonContent: 'ТРЦ Европа, Советский проспект, 8',
                hintContent: '🛍️ ТРЦ Европа'
            },
            {
                preset: 'islands#redDotIcon',
                draggable: false
            }
        );

        map.geoObjects.add(place1);
        map.geoObjects.add(place2);

        place1.events.add('click', () => {
            deliveryState.place = 'ул. Театральная, 30 (Северный вокзал)';
            document.getElementById('mapContinueBtn').disabled = false;
            document.getElementById('mapContinueBtn').innerText = 'Продолжить (Северный вокзал)';
        });

        place2.events.add('click', () => {
            deliveryState.place = 'Советский проспект, 8 (ТРЦ Европа)';
            document.getElementById('mapContinueBtn').disabled = false;
            document.getElementById('mapContinueBtn').innerText = 'Продолжить (ТРЦ Европа)';
        });
    });
}

function nextCheckoutStep() {
    if (checkoutStep === 1) {
        if (!deliveryState.place) {
            alert('Выберите точку на карте');
            return;
        }
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
            <button class="back-button" onclick="showDeliveryMap()" style="margin-bottom:15px;">
                <i class="fas fa-arrow-left"></i> Назад к карте
            </button>
            
            <h2 class="screen-title">Когда удобно?</h2>
            
            <div class="delivery-option">
                <h4>📅 Дата доставки</h4>
                <input type="date" id="deliveryDate" min="${tomorrow}" value="${tomorrow}">
                <p class="delivery-note">⚠️ Заказы доставляются на следующий день</p>
            </div>
            
            <div class="delivery-option">
                <h4>⏰ Время (${workHours.start}:00 - ${workHours.end}:00)</h4>
                <select id="deliveryTime">
                    ${generateTimeOptions()}
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
            <button class="back-button" onclick="showDateTimeSelection()" style="margin-bottom:15px;">
                <i class="fas fa-arrow-left"></i> Назад к дате
            </button>
            
            <h2 class="screen-title">Как оплатите?</h2>
            
            <div class="delivery-option" onclick="selectPayment('Наличные')" style="cursor:pointer;">
                <span>💵 Наличными</span>
                <p style="color:#666; margin-top:5px;">Строго наличные</p>
            </div>
            
            <div class="delivery-option" style="margin-top:20px;">
                <h4>📝 Примечание к заказу</h4>
                <textarea id="orderComment" placeholder="Комментарии к заказу" rows="3" style="width:100%; padding:12px; border:1px solid #ddd; border-radius:8px;"></textarea>
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

    if (!deliveryState.place) {
        alert('Выберите точку на карте');
        return;
    }

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
    saveUserData();

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

    alert('✅ Заказ отправлен! Менеджер свяжется с вами');
    navigateTo('home');
}

function saveUserData() {
    localStorage.setItem(`cart_${user.id}`, JSON.stringify(cart));
    localStorage.setItem(`fav_${user.id}`, JSON.stringify(favorites));
    localStorage.setItem(`orders_${user.id}`, JSON.stringify(user.orders));
}

// ========== ДЕЙСТВИЯ ==========
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    cart.push({...product});
    saveUserData();
    updateCartBadge();
    alert(`${product.name} добавлен в корзину`);
}

function updateCartItem(productId, delta) {
    const index = cart.findIndex(item => item.id === productId);
    if (delta > 0) {
        const product = products.find(p => p.id === productId);
        cart.push({...product});
    } else {
        cart.splice(index, 1);
    }
    saveUserData();
    updateCartBadge();
    showCart();
}

function clearCart() {
    cart = [];
    appliedPromo = null;
    saveUserData();
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
        alert('❤️ Добавлено в избранное');
    } else {
        favorites.splice(index, 1);
        alert('💔 Удалено из избранного');
    }
    saveUserData();
    if (currentPage === 'favorites') showFavorites();
}

function applyPromo() {
    const input = document.getElementById('promoInput');
    const code = input.value.trim();
    if (code === user.promoCode) {
        alert('❌ Нельзя использовать свой промокод');
        return;
    }
    appliedPromo = code || null;
    showCart();
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
}

function deleteProduct(id) {
    if (!isAdmin()) return;
    if (confirm('Удалить товар?')) {
        products = products.filter(p => p.id !== id);
        saveToServer();
        showHome();
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
    menuItems.innerHTML = `
        <a href="https://t.me/+ydkHgm09g5hhOTMy" target="_blank" class="side-menu-item">
            <i class="fab fa-telegram"></i>
            <span>Наш канал Telegram</span>
        </a>
        <div class="side-menu-item" onclick="showAbout()">
            <i class="fas fa-info-circle"></i>
            <span>О нас</span>
        </div>
    `;
}

function showAbout() {
    sideMenu.classList.remove('open');
    overlay.classList.remove('show');
    const content = document.getElementById('main-content');
    content.innerHTML = `
        <div style="padding: 30px; text-align: center;">
            <h2 style="margin-bottom: 20px;">О нас</h2>
            <p style="color: #666;">По всем вопросам пишите @fog_shop_manager</p>
        </div>
    `;
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
(function init() {
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