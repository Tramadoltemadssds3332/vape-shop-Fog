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
    // Жидкости
    {id: 1, name: "HS Bank 100ml", price: 890, category: "liquids", image: "🥤", desc: "Фруктовый микс", stock: true, date: "2024-01-01"},
    {id: 2, name: "Sadboy 60ml", price: 690, category: "liquids", image: "🍓", desc: "Клубничный джем", stock: true, date: "2024-01-02"},

    // Pod-системы
    {id: 3, name: "Pod System X", price: 2490, category: "pods", image: "💨", desc: "Компактная pod-система", stock: true, date: "2024-01-03"},
    {id: 4, name: "GeekVape Hero", price: 3300, category: "pods", image: "🦸", desc: "Влагозащита IP68", stock: true, date: "2024-01-05"},

    // Одноразовые
    {id: 5, name: "Elf Bar 1500", price: 1290, category: "disposable", image: "⚡", desc: "1500 затяжек", stock: true, date: "2024-01-04"},
    {id: 6, name: "HQD Cuvie", price: 990, category: "disposable", image: "💨", desc: "Компактный", stock: true, date: "2024-01-06"},

    // Аксессуары
    {id: 7, name: "Шейкер-брелок", price: 500, category: "accessories", image: "🔑", desc: "Для жидкости Pink", stock: true, date: "2024-01-06"},
    {id: 8, name: "Испарители", price: 390, category: "accessories", image: "⚙️", desc: "Комплект 5 шт", stock: true, date: "2024-01-07"},

    // Снюс
    {id: 9, name: "Siberia White Dry", price: 550, category: "snus", image: "❄️", desc: "Крепкий снюс", stock: true, date: "2024-01-08"},
    {id: 10, name: "Odens Cold Dry", price: 520, category: "snus", image: "🧊", desc: "Экстра сильный", stock: true, date: "2024-01-08"},
    {id: 11, name: "Lyft Freeze", price: 480, category: "snus", image: "💙", desc: "Никотиновые пакеты", stock: true, date: "2024-01-09"},
    {id: 12, name: "Velo Ice Cool", price: 490, category: "snus", image: "🧊", desc: "Мятный", stock: true, date: "2024-01-09"},

    // Пластинки
    {id: 13, name: "White Fox", price: 530, category: "plates", image: "🦊", desc: "Никотиновые пластинки", stock: true, date: "2024-01-10"},
    {id: 14, name: "Zyn Spearmint", price: 510, category: "plates", image: "🌿", desc: "Мятные", stock: true, date: "2024-01-10"},
    {id: 15, name: "Skruf Cassice", price: 540, category: "plates", image: "🍊", desc: "Апельсин", stock: true, date: "2024-01-11"},
    {id: 16, name: "G.4 Deep Freeze", price: 560, category: "plates", image: "❄️", desc: "Экстра мятные", stock: true, date: "2024-01-11"}
];

let cart = [];
let favorites = [];
let currentCategory = 'all';
let currentSort = 'default';
let appliedPromo = null;
let currentPage = 'home';
let searchQuery = '';
let workHours = '10:00 - 22:00'; // Рабочее время по умолчанию

// ========== ФУНКЦИИ ==========

function generatePromoCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
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

    searchQuery = query;
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
            <div class="product-card">
                <div class="product-image">${product.image.startsWith('data:') ? `<img src="${product.image}" style="width:100%; height:100%; object-fit:cover; border-radius:15px;">` : product.image}</div>
                <div class="product-title">${product.name}</div>
                <div class="product-price">${product.price} ₽</div>
                <div style="display: flex; gap: 5px;">
                    <button class="add-to-cart" style="flex: 2;" onclick="addToCart(${product.id})">
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

// ========== ЗАГРУЗКА ФОТО ДЛЯ АДМИНОВ (фото видят ВСЕ пользователи) ==========
function uploadProductImage(productId) {
    if (!isAdmin()) {
        showNotification('⛔ Только для админов', 'error');
        return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const product = products.find(p => p.id === productId);
                if (product) {
                    // Сохраняем фото в товар (теперь увидят ВСЕ пользователи)
                    product.image = event.target.result;

                    // Сохраняем в localStorage чтобы фото не пропало
                    saveToStorage();

                    showNotification('✅ Фото загружено! Теперь его видят все', 'success');

                    // Обновляем отображение
                    if (currentPage === 'home') showHome();
                }
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
}

// ========== ГЕНЕРАЦИЯ ДАТ (начиная со следующего дня) ==========
function generateDateOptions() {
    const options = [];
    const today = new Date();

    // Генерируем даты на 14 дней вперед, начиная с ЗАВТРАШНЕГО дня
    for (let i = 1; i <= 14; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);

        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();

        // Название дня недели
        const weekdays = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
        const weekday = weekdays[date.getDay()];

        const dateStr = `${day}.${month}.${year}`;
        const displayStr = `${weekday}, ${dateStr}`;

        options.push(`<option value="${dateStr}">${displayStr}</option>`);
    }

    return options.join('');
}

// ========== ГЕНЕРАЦИЯ ВАРИАНТОВ ВРЕМЕНИ ==========
function generateTimeOptions(workHoursStr) {
    try {
        const times = workHoursStr.split('-').map(t => t.trim());
        const start = times[0];
        const end = times[1];

        if (!start || !end) return '<option value="">Не указано</option>';

        const startHour = parseInt(start.split(':')[0]);
        const endHour = parseInt(end.split(':')[0]);

        let options = '';
        for (let hour = startHour; hour <= endHour; hour++) {
            const timeStr = `${hour.toString().padStart(2, '0')}:00`;
            options += `<option value="${timeStr}">${timeStr}</option>`;
            if (hour < endHour) {
                const halfStr = `${hour.toString().padStart(2, '0')}:30`;
                options += `<option value="${halfStr}">${halfStr}</option>`;
            }
        }
        return options;
    } catch (e) {
        return '<option value="">Ошибка формата</option>';
    }
}

// ========== БОКОВОЕ МЕНЮ ==========
const menuButton = document.getElementById('menuButton');
const sideMenu = document.getElementById('sideMenu');
const closeMenu = document.getElementById('closeMenu');
const overlay = document.getElementById('overlay');

function openMenu() {
    sideMenu.classList.add('open');
    overlay.classList.add('show');
}

function closeMenuFunc() {
    sideMenu.classList.remove('open');
    overlay.classList.remove('show');
}

menuButton?.addEventListener('click', openMenu);
closeMenu?.addEventListener('click', closeMenuFunc);
overlay?.addEventListener('click', closeMenuFunc);

// Обновляем боковое меню с переключателем темы
function updateSideMenu() {
    const menuItems = document.querySelector('.side-menu-items');
    if (menuItems) {
        const themeIcon = darkMode ? '☀️' : '🌙';
        const themeText = darkMode ? 'Светлая тема' : 'Темная тема';

        menuItems.innerHTML = `
            <a href="https://t.me/+ydkHgm09g5hhOTMy" target="_blank" class="side-menu-item">
                <i class="fab fa-telegram"></i>
                <span>Наш канал Telegram</span>
                <i class="fas fa-external-link-alt external-icon"></i>
            </a>
            <div class="side-menu-item" onclick="toggleTheme()">
                <i class="fas ${darkMode ? 'fa-sun' : 'fa-moon'}"></i>
                <span>${themeText}</span>
            </div>
            <div class="side-menu-item" onclick="showNotification('ℹ️ О нас', 'info')">
                <i class="fas fa-info-circle"></i>
                <span>О нас</span>
            </div>
            <div class="side-menu-item" onclick="showNotification('❓ Помощь', 'info')">
                <i class="fas fa-question-circle"></i>
                <span>Помощь</span>
            </div>
        `;
    }
}

// ========== ПОДВИЖНАЯ ЛИНИЯ КАТЕГОРИЙ ==========
const categoriesSlider = document.getElementById('categoriesSlider');
const indicator = document.getElementById('sliderIndicator');

function updateIndicator() {
    const activeCategory = document.querySelector('.category.active');
    if (activeCategory && indicator && categoriesSlider) {
        const container = categoriesSlider;
        const index = Array.from(container.children).indexOf(activeCategory);

        let left = 0;
        let width = 0;

        for (let i = 0; i <= index; i++) {
            const category = container.children[i];
            if (i < index) {
                left += category.offsetWidth + 15;
            } else {
                width = category.offsetWidth;
            }
        }

        indicator.style.left = left + 'px';
        indicator.style.width = width + 'px';
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
(function init() {
    applyTheme();
    loadFromStorage();
    showHome();
    setTimeout(updateIndicator, 100);
    updateSideMenu();

    if (isAdmin()) {
        const adminBtn = document.getElementById('adminBtn');
        if (adminBtn) adminBtn.style.display = 'flex';
    }
})();

function loadFromStorage() {
    try {
        const savedCart = localStorage.getItem(`cart_${user.id}`);
        if (savedCart) cart = JSON.parse(savedCart);

        const savedFav = localStorage.getItem(`fav_${user.id}`);
        if (savedFav) favorites = JSON.parse(savedFav);

        const savedOrders = localStorage.getItem(`orders_${user.id}`);
        if (savedOrders) user.orders = JSON.parse(savedOrders);

        // Загружаем товары (включая фото от админов!)
        const savedProducts = localStorage.getItem('products');
        if (savedProducts) {
            products = JSON.parse(savedProducts);
        }
    } catch (e) {
        console.log('Ошибка загрузки');
    }

    updateCartBadge();
}

function saveToStorage() {
    try {
        localStorage.setItem(`cart_${user.id}`, JSON.stringify(cart));
        localStorage.setItem(`fav_${user.id}`, JSON.stringify(favorites));
        localStorage.setItem(`orders_${user.id}`, JSON.stringify(user.orders));

        // Сохраняем товары с фото, чтобы все пользователи их видели
        localStorage.setItem('products', JSON.stringify(products));
    } catch (e) {
        console.log('Ошибка сохранения');
    }
}

function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    if (badge) badge.textContent = cart.length;
}

function toggleFilters(show) {
    const categoriesSection = document.querySelector('.categories-wrapper');
    const sortSection = document.querySelector('.sort-section');
    const banner = document.querySelector('.banner');

    if (categoriesSection && sortSection && banner) {
        categoriesSection.style.display = show ? 'block' : 'none';
        sortSection.style.display = show ? 'block' : 'none';
        banner.style.display = show ? 'block' : 'none';
    }
}

function sortProducts(products) {
    switch(currentSort) {
        case 'price_asc':
            return [...products].sort((a, b) => a.price - b.price);
        case 'price_desc':
            return [...products].sort((a, b) => b.price - a.price);
        case 'newest':
            return [...products].sort((a, b) => new Date(b.date) - new Date(a.date));
        default:
            return products;
    }
}

// ========== СТРАНИЦЫ ==========

function showHome() {
    currentPage = 'home';
    toggleFilters(true);

    const content = document.getElementById('main-content');
    if (!content) return;

    let filtered = products;
    if (currentCategory !== 'all') {
        filtered = products.filter(p => p.category === currentCategory);
    }

    filtered = sortProducts(filtered);

    let html = '<div class="products-grid">';
    filtered.forEach(product => {
        const inFav = favorites.some(f => f.id === product.id);

        html += `
            <div class="product-card">
                <div class="product-image ${isAdmin() ? 'admin-mode' : ''}" onclick="${isAdmin() ? `uploadProductImage(${product.id})` : ''}">
                    ${product.image.startsWith('data:') ? `<img src="${product.image}" style="width:100%; height:100%; object-fit:cover; border-radius:15px;">` : product.image}
                </div>
                <div class="product-title">${product.name}</div>
                <div class="product-price">${product.price} ₽</div>
                <div style="display: flex; gap: 5px;">
                    <button class="add-to-cart" style="flex: 2;" onclick="addToCart(${product.id})">
                        🛒 В корзину
                    </button>
                    <button class="add-to-cart" style="flex: 1; background: ${inFav ? '#FF6B6B' : 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%)'}" onclick="toggleFavorite(${product.id})">
                        ${inFav ? '❤️' : '🤍'}
                    </button>
                </div>
                ${isAdmin() ? `
                <div class="admin-controls">
                    <button class="admin-btn edit-btn" onclick="editProduct(${product.id})">✏️ Ред.</button>
                    <button class="admin-btn delete-btn" onclick="deleteProduct(${product.id})">🗑️</button>
                </div>
                ` : ''}
            </div>
        `;
    });
    html += '</div>';

    content.innerHTML = html;
    setTimeout(updateIndicator, 100);
}

function showFavorites() {
    currentPage = 'favorites';
    toggleFilters(false);

    const content = document.getElementById('main-content');
    if (!content) return;

    if (favorites.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-heart" style="color: #FF6B6B;"></i>
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
            <div class="product-card">
                <div class="product-image">${product.image.startsWith('data:') ? `<img src="${product.image}" style="width:100%; height:100%; object-fit:cover; border-radius:15px;">` : product.image}</div>
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

function showCart() {
    currentPage = 'cart';
    toggleFilters(false);

    const content = document.getElementById('main-content');
    if (!content) return;

    if (cart.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-cart" style="color: #4ECDC4;"></i>
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
                        <span style="color: #FF6B6B; font-weight: 600;">${item.price} ₽</span>
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
                ${appliedPromo ? `
                <div class="summary-row">
                    <span>Скидка (5%)</span>
                    <span>-${discount} ₽</span>
                </div>
                ` : ''}
                <div class="summary-row total">
                    <span>Итого</span>
                    <span>${total} ₽</span>
                </div>
            </div>
            
            <button class="checkout-btn" onclick="checkout()">
                Перейти к оформлению · ${total} ₽
            </button>
        </div>
    `;

    content.innerHTML = html;
}

function showProfile() {
    currentPage = 'profile';
    toggleFilters(false);

    const content = document.getElementById('main-content');
    if (!content) return;

    let ordersHtml = '';
    if (user.orders.length === 0) {
        ordersHtml = '<p style="text-align: center; color: #888; padding: 20px;">У вас пока нет заказов</p>';
    } else {
        ordersHtml = user.orders.map(order => `
            <div class="order-item">
                <div class="order-header">
                    <span>Заказ #${order.id}</span>
                    <span>${order.date}</span>
                </div>
                <div>${order.items || 0} товаров · ${order.total || 0} ₽</div>
                <div class="order-status">${order.status || 'Новый'}</div>
            </div>
        `).join('');
    }

    content.innerHTML = `
        <div class="profile-page">
            <div class="profile-header">
                <div class="profile-avatar">
                    ${user.firstName.charAt(0)}
                </div>
                <div class="profile-info">
                    <h3>${user.firstName}</h3>
                    <p>@${user.username}</p>
                    <p>Заказов: ${user.orders.length}</p>
                </div>
            </div>
            
            <div class="promo-card">
                <div>🎁 Ваш промокод</div>
                <div class="promo-code">${user.promoCode}</div>
                <div style="font-size: 12px; opacity: 0.9;">Дайте другу — получит скидку 5%</div>
            </div>
            
            <div class="history-section">
                <h3>📜 История заказов</h3>
                ${ordersHtml}
            </div>
            
            ${isAdmin() && user.id === MAIN_ADMIN_ID ? `
            <div style="margin-top: 20px;">
                <button class="checkout-btn" onclick="showAdminPanel()">👥 Управление админами</button>
            </div>
            ` : ''}
        </div>
    `;
}

function showRaffle() {
    currentPage = 'raffle';
    toggleFilters(false);

    const content = document.getElementById('main-content');
    if (!content) return;

    content.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-gift" style="color: #4ECDC4;"></i>
            <h3>🎉 РОЗЫГРЫШ</h3>
            <p>Fog Shop</p>
            <p style="margin-top: 20px;">Участвуй и выигрывай!</p>
            <button style="margin-top: 20px;" onclick="participateRaffle()">
                Участвовать
            </button>
        </div>
    `;
}

// ========== ДЕЙСТВИЯ ==========

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    cart.push({...product});
    saveToStorage();
    updateCartBadge();

    tg.HapticFeedback.impactOccurred('light');
    showNotification(`${product.name} добавлен в корзину`, 'cart');
}

function updateCartItem(productId, delta) {
    const index = cart.findIndex(item => item.id === productId);
    if (index === -1) return;

    if (delta > 0) {
        const product = products.find(p => p.id === productId);
        if (product) cart.push({...product});
    } else {
        cart.splice(index, 1);
    }

    saveToStorage();
    updateCartBadge();
    if (currentPage === 'cart') showCart();
}

function clearCart() {
    if (confirm('Очистить корзину?')) {
        cart = [];
        appliedPromo = null;
        saveToStorage();
        updateCartBadge();
        showCart();
    }
}

function toggleFavorite(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const index = favorites.findIndex(f => f.id === productId);

    if (index === -1) {
        favorites.push({...product});
        showNotification('❤️ Добавлено в избранное', 'heart');
    } else {
        favorites.splice(index, 1);
        showNotification('💔 Удалено из избранного', 'heart-broken');
    }

    saveToStorage();
    tg.HapticFeedback.impactOccurred('light');
    if (currentPage === 'favorites') showFavorites();
    else if (currentPage === 'home') showHome();
}

function showNotification(text, type) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = text;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function applyPromo() {
    const input = document.getElementById('promoInput');
    if (!input) return;

    const code = input.value.trim();

    if (!code) {
        appliedPromo = null;
        showCart();
        return;
    }

    if (code === user.promoCode) {
        showNotification('❌ Нельзя использовать свой промокод', 'error');
        return;
    }

    appliedPromo = code;
    tg.HapticFeedback.impactOccurred('light');
    showCart();
}

// ========== ОФОРМЛЕНИЕ ЗАКАЗА ==========
function checkout() {
    const modal = document.getElementById('orderModal');
    const nameInput = document.getElementById('orderName');
    const workHoursInfo = document.querySelector('.work-hours-info');

    if (modal && nameInput) {
        // Обновляем рабочее время
        const workHoursSpan = document.getElementById('workHoursText');
        if (workHoursSpan) {
            workHoursSpan.textContent = workHours;
        }

        // Добавляем поля доставки если их нет
        if (!document.getElementById('deliveryFields')) {
            addDeliveryFields();
        }

        modal.classList.add('show');
        nameInput.value = user.firstName;
    }
}

// ========== ДОБАВЛЕНИЕ ПОЛЕЙ ДОСТАВКИ ==========
function addDeliveryFields() {
    const workHoursDiv = document.querySelector('.work-hours-info');
    if (!workHoursDiv) return;

    // Удаляем старые поля если есть
    const oldFields = document.getElementById('deliveryFields');
    if (oldFields) oldFields.remove();

    const deliveryHtml = `
        <div id="deliveryFields" class="delivery-fields">
            <div class="delivery-section">
                <h4>📍 Место встречи</h4>
                <div class="place-selector">
                    <label class="place-option">
                        <input type="radio" name="deliveryPlace" value="Северный вокзал" checked>
                        <span>🚂 Северный вокзал</span>
                    </label>
                    <label class="place-option">
                        <input type="radio" name="deliveryPlace" value="ТРЦ Европа">
                        <span>🛍️ ТРЦ Европа</span>
                    </label>
                </div>
            </div>
            
            <div class="delivery-section">
                <h4>📅 Дата доставки</h4>
                <select id="deliveryDate" class="delivery-select">
                    <option value="">-- Выберите дату --</option>
                    ${generateDateOptions()}
                </select>
                <p class="delivery-note">⚠️ Доставка осуществляется на следующий день после заказа</p>
            </div>
            
            <div class="delivery-section">
                <h4>⏰ Время</h4>
                <select id="deliveryTime" class="delivery-select">
                    <option value="">-- Выберите время --</option>
                    ${generateTimeOptions(workHours)}
                </select>
            </div>
        </div>
    `;

    workHoursDiv.insertAdjacentHTML('afterend', deliveryHtml);
}

function closeModal() {
    const modal = document.getElementById('orderModal');
    if (modal) modal.classList.remove('show');
}

// ========== ОТПРАВКА ЗАКАЗА ==========
function completeOrder() {
    console.log("🚀 НАЖАТА КНОПКА ЗАВЕРШИТЬ ЗАКАЗ");

    const nameInput = document.getElementById('orderName');
    const commentInput = document.getElementById('orderComment');
    const timeSelect = document.getElementById('deliveryTime');
    const dateSelect = document.getElementById('deliveryDate');
    const placeRadios = document.getElementsByName('deliveryPlace');

    if (!nameInput) return;

    const name = nameInput.value.trim();
    const comment = commentInput ? commentInput.value.trim() : '';
    const deliveryTime = timeSelect ? timeSelect.value : 'Не выбрано';
    const deliveryDate = dateSelect ? dateSelect.value : 'Не выбрана';

    // Получаем выбранное место
    let deliveryPlace = 'Не выбрано';
    for (const radio of placeRadios) {
        if (radio.checked) {
            deliveryPlace = radio.value;
            break;
        }
    }

    if (!name) {
        showNotification('❌ Введите имя', 'error');
        return;
    }

    if (!deliveryDate || deliveryDate === 'Не выбрана') {
        showNotification('❌ Выберите дату доставки', 'error');
        return;
    }

    if (!deliveryTime || deliveryTime === 'Не выбрано') {
        showNotification('❌ Выберите время доставки', 'error');
        return;
    }

    if (cart.length === 0) {
        showNotification('❌ Корзина пуста', 'error');
        closeModal();
        return;
    }

    const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
    const discount = appliedPromo ? subtotal * 0.05 : 0;
    const total = subtotal - discount;

    const grouped = {};
    cart.forEach(item => {
        if (!grouped[item.id]) {
            grouped[item.id] = {...item, count: 0};
        }
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
        status: 'Новый',
        name: name,
        comment: comment,
        deliveryPlace: deliveryPlace,
        deliveryDate: deliveryDate,
        deliveryTime: deliveryTime,
        promo: appliedPromo
    };

    user.orders.push(order);
    saveToStorage();

    const orderText = `🆕 НОВЫЙ ЗАКАЗ!\n\n👤 Клиент: @${user.username} (${name})\n\n📦 Заказ:\n${itemsList}\n💰 Сумма: ${total} ₽\n📍 Место: ${deliveryPlace}\n📅 Дата: ${deliveryDate}\n⏰ Время: ${deliveryTime}\n${appliedPromo ? `🎫 Промокод: ${appliedPromo} (скидка 5%)\n` : ''}\n📝 Пожелание:\n${comment || '—'}\n\n🕐 Время заказа: ${order.date}`;

    // ===== ОТПРАВКА ЧЕРЕЗ TELEGRAM WEBAPP =====
    tg.sendData(JSON.stringify({
        action: 'new_order',
        text: orderText
    }));

    // ===== ДУБЛИРУЮЩАЯ ОТПРАВКА ЧЕРЕЗ HTTP =====
    fetch(`https://api.telegram.org/bot8384387938:AAEuhsPHVOAGZHDVOjCx9L9hqBMsTmDf-Rg/sendMessage`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            chat_id: 7602382626,
            text: orderText,
            parse_mode: 'HTML'
        })
    })
    .then(response => response.json())
    .then(data => console.log('✅ HTTP отправка:', data))
    .catch(error => console.error('❌ HTTP ошибка:', error));

    console.log("✅ Данные отправлены в Telegram");

    cart = [];
    appliedPromo = null;
    saveToStorage();
    updateCartBadge();

    closeModal();
    showNotification('✅ Заказ отправлен! Менеджер свяжется с вами', 'success');
    showHome();
}

function participateRaffle() {
    showNotification('🎉 Вы участвуете в розыгрыше!', 'raffle');
}

// ========== АДМИНКА ==========

function showAdminPanel() {
    if (user.id !== MAIN_ADMIN_ID) {
        showNotification('⛔ Только главный админ', 'error');
        return;
    }

    let adminList = 'Текущие админы:\n\n';
    admins.forEach(id => {
        adminList += `• ${id}${id === MAIN_ADMIN_ID ? ' (главный)' : ''}\n`;
    });

    const action = prompt(adminList + '\n1. Добавить админа\n2. Удалить админа\n3. Изменить рабочее время');

    if (action === '1') {
        const newAdmin = prompt('Введите ID нового админа:');
        if (newAdmin && !admins.includes(parseInt(newAdmin))) {
            admins.push(parseInt(newAdmin));
            showNotification('✅ Админ добавлен!', 'success');
        }
    } else if (action === '2') {
        const removeAdmin = prompt('Введите ID админа для удаления:');
        if (removeAdmin && parseInt(removeAdmin) !== MAIN_ADMIN_ID) {
            admins = admins.filter(id => id !== parseInt(removeAdmin));
            showNotification('✅ Админ удален!', 'success');
        }
    } else if (action === '3') {
        const newHours = prompt('Введите рабочее время (например: 10:00 - 22:00):', workHours);
        if (newHours) {
            workHours = newHours;
            showNotification('✅ Рабочее время обновлено!', 'success');
        }
    }
}

function editProduct(id) {
    if (!isAdmin()) return;

    const product = products.find(p => p.id === id);
    if (!product) return;

    const newName = prompt('Название:', product.name);
    if (newName) product.name = newName;

    const newPrice = prompt('Цена:', product.price);
    if (newPrice) product.price = parseInt(newPrice);

    const newDesc = prompt('Описание:', product.desc);
    if (newDesc) product.desc = newDesc;

    const newCategory = prompt('Категория (liquids/pods/disposable/accessories/snus/plates):', product.category);
    if (newCategory) product.category = newCategory;

    saveToStorage();
    showHome();
    showNotification('✅ Товар обновлен', 'success');
}

function deleteProduct(id) {
    if (!isAdmin()) return;

    if (confirm('Удалить товар?')) {
        products = products.filter(p => p.id !== id);
        saveToStorage();
        showHome();
        showNotification('✅ Товар удален', 'success');
    }
}

function addNewProduct() {
    if (!isAdmin()) return;

    const name = prompt('Название товара:');
    if (!name) return;

    const price = parseInt(prompt('Цена:'));
    if (!price) return;

    const category = prompt('Категория (liquids/pods/disposable/accessories/snus/plates):') || 'liquids';
    const desc = prompt('Описание:') || '';
    const image = prompt('Эмодзи для фото:') || '📦';

    const newId = Math.max(...products.map(p => p.id), 0) + 1;

    products.push({
        id: newId,
        name: name,
        price: price,
        category: category,
        image: image,
        desc: desc,
        stock: true,
        date: new Date().toISOString().split('T')[0]
    });

    saveToStorage();
    showHome();
    showNotification('✅ Товар добавлен', 'success');
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
        if (btn.dataset.page === page) {
            btn.classList.add('active');
        }
    });
}

// ========== СОБЫТИЯ ==========

// Обновление индикатора при скролле
categoriesSlider?.addEventListener('scroll', updateIndicator);
window.addEventListener('resize', updateIndicator);

// Сортировка
const sortHeader = document.querySelector('.sort-header');
if (sortHeader) {
    sortHeader.addEventListener('click', () => {
        const menu = document.querySelector('.sort-menu');
        const header = document.querySelector('.sort-header');
        if (menu && header) {
            menu.classList.toggle('show');
            header.classList.toggle('active');
        }
    });
}

document.querySelectorAll('.sort-item').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.sort-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        currentSort = item.dataset.sort;

        const menu = document.querySelector('.sort-menu');
        const header = document.querySelector('.sort-header');
        if (menu) menu.classList.remove('show');
        if (header) header.classList.remove('active');

        if (currentPage === 'home') showHome();
    });
});

document.querySelectorAll('.category').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.category').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.dataset.cat;
        updateIndicator();

        if (currentPage === 'home') showHome();
    });
});

document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
        navigateTo(btn.dataset.page);
        tg.HapticFeedback.impactOccurred('light');
    });
});

const searchIcon = document.querySelector('.search-icon');
if (searchIcon) {
    searchIcon.addEventListener('click', () => {
        navigateTo('search');
    });
}

const banner = document.querySelector('.banner');
if (banner) {
    banner.addEventListener('click', () => {
        navigateTo('raffle');
    });
}

const adminBtn = document.getElementById('adminBtn');
if (adminBtn) {
    adminBtn.addEventListener('click', () => {
        if (isAdmin()) {
            addNewProduct();
        }
    });
}