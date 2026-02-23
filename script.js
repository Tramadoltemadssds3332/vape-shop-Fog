let tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

console.log("✅ Fog Shop загружен");

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

// Товары
let products = [
    {id: 1, name: "HS Bank 100ml", price: 890, category: "liquids", image: "🥤", desc: "Фруктовый микс", stock: true, date: "2024-01-01"},
    {id: 2, name: "Sadboy 60ml", price: 690, category: "liquids", image: "🍓", desc: "Клубничный джем", stock: true, date: "2024-01-02"},
    {id: 3, name: "Pod System X", price: 2490, category: "pods", image: "💨", desc: "Компактная pod-система", stock: true, date: "2024-01-03"},
    {id: 4, name: "Elf Bar 1500", price: 1290, category: "disposable", image: "⚡", desc: "1500 затяжек", stock: true, date: "2024-01-04"},
    {id: 5, name: "GeekVape Hero", price: 3300, category: "pods", image: "🦸", desc: "Влагозащита IP68", stock: true, date: "2024-01-05"},
    {id: 6, name: "Шейкер-брелок", price: 500, category: "accessories", image: "🔑", desc: "Для жидкости Pink", stock: true, date: "2024-01-06"}
];

let cart = [];
let favorites = [];
let currentCategory = 'all';
let currentSort = 'default';
let appliedPromo = null;
let currentPage = 'home';

// Генерация промокода
function generatePromoCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Боковое меню
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

// Подвижная линия категорий
const categoriesSlider = document.getElementById('categoriesSlider');
const indicator = document.getElementById('sliderIndicator');

function updateIndicator() {
    const activeCategory = document.querySelector('.category.active');
    if (activeCategory && indicator) {
        const container = categoriesSlider;
        const index = Array.from(container.children).indexOf(activeCategory);

        let left = 0;
        let width = 0;

        for (let i = 0; i <= index; i++) {
            const category = container.children[i];
            if (i < index) {
                left += category.offsetWidth + 15; // 15 - это gap
            } else {
                width = category.offsetWidth;
            }
        }

        indicator.style.left = left + 'px';
        indicator.style.width = width + 'px';
    }
}

// Инициализация
(function init() {
    loadFromStorage();
    showHome();
    setTimeout(updateIndicator, 100);

    if (isAdmin()) {
        const adminBtn = document.getElementById('adminBtn');
        if (adminBtn) adminBtn.style.display = 'flex';
    }
})();

// Загрузка из localStorage
function loadFromStorage() {
    try {
        const savedCart = localStorage.getItem(`cart_${user.id}`);
        if (savedCart) cart = JSON.parse(savedCart);

        const savedFav = localStorage.getItem(`fav_${user.id}`);
        if (savedFav) favorites = JSON.parse(savedFav);

        const savedOrders = localStorage.getItem(`orders_${user.id}`);
        if (savedOrders) user.orders = JSON.parse(savedOrders);
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
                <div class="product-image">${product.image}</div>
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
                    <button class="admin-btn edit-btn" onclick="editProduct(${product.id})">✏️</button>
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
        ordersHtml = '<p style="text-align: center; color: #999; padding: 20px;">У вас пока нет заказов</p>';
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

    // Анимированное уведомление (без алерта)
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%);
        color: white;
        padding: 12px 20px;
        border-radius: 25px;
        font-size: 14px;
        z-index: 2000;
        animation: slideDown 0.3s, fadeOut 0.3s 2.7s;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    `;
    notification.textContent = `${product.name} добавлен в корзину`;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
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

function showNotification(text, icon) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%);
        color: white;
        padding: 12px 20px;
        border-radius: 25px;
        font-size: 14px;
        z-index: 2000;
        animation: slideDown 0.3s, fadeOut 0.3s 1.7s;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    `;
    notification.innerHTML = `${icon === 'heart' ? '❤️' : '💔'} ${text}`;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 2000);
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
        alert('Нельзя использовать свой промокод');
        return;
    }

    appliedPromo = code;
    tg.HapticFeedback.impactOccurred('light');
    showCart();
}

function checkout() {
    const modal = document.getElementById('orderModal');
    const nameInput = document.getElementById('orderName');

    if (modal && nameInput) {
        modal.classList.add('show');
        nameInput.value = user.firstName;
    }
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

    if (!nameInput) return;

    const name = nameInput.value.trim();
    const comment = commentInput ? commentInput.value.trim() : '';

    if (!name) {
        alert('Введите имя');
        return;
    }

    if (cart.length === 0) {
        alert('Корзина пуста');
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
        promo: appliedPromo
    };

    user.orders.push(order);
    saveToStorage();

    const orderText = `🆕 НОВЫЙ ЗАКАЗ!\n\n👤 Клиент: @${user.username} (${name})\n\n📦 Заказ:\n${itemsList}\n💰 Сумма: ${total} ₽\n${appliedPromo ? `🎫 Промокод: ${appliedPromo} (скидка 5%)\n` : ''}\n📝 Пожелание:\n${comment || '—'}\n\n🕐 Время: ${order.date}`;

    // Отправляем через Telegram WebApp
    tg.sendData(JSON.stringify({
        action: 'new_order',
        text: orderText
    }));

    // Очищаем корзину
    cart = [];
    appliedPromo = null;
    saveToStorage();
    updateCartBadge();

    closeModal();

    // Показываем уведомление
    showNotification('✅ Заказ отправлен! Менеджер свяжется с вами', 'success');
    showHome();
}

function showNotification(text, type) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%);
        color: white;
        padding: 15px 25px;
        border-radius: 30px;
        font-size: 14px;
        z-index: 2000;
        animation: slideDown 0.3s, fadeOut 0.3s 2.7s;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        text-align: center;
        min-width: 200px;
    `;
    notification.textContent = text;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function participateRaffle() {
    showNotification('🎉 Вы участвуете в розыгрыше!', 'raffle');
}

// ========== АДМИНКА ==========

function showAdminPanel() {
    if (user.id !== MAIN_ADMIN_ID) {
        alert('Только главный админ');
        return;
    }

    let adminList = 'Текущие админы:\n\n';
    admins.forEach(id => {
        adminList += `• ${id}${id === MAIN_ADMIN_ID ? ' (главный)' : ''}\n`;
    });

    const action = prompt(adminList + '\n1. Добавить админа\n2. Удалить админа');

    if (action === '1') {
        const newAdmin = prompt('Введите ID нового админа:');
        if (newAdmin && !admins.includes(parseInt(newAdmin))) {
            admins.push(parseInt(newAdmin));
            alert('✅ Админ добавлен!');
        }
    } else if (action === '2') {
        const removeAdmin = prompt('Введите ID админа для удаления:');
        if (removeAdmin && parseInt(removeAdmin) !== MAIN_ADMIN_ID) {
            admins = admins.filter(id => id !== parseInt(removeAdmin));
            alert('✅ Админ удален!');
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

    saveToStorage();
    showHome();
}

function deleteProduct(id) {
    if (!isAdmin()) return;

    if (confirm('Удалить товар?')) {
        products = products.filter(p => p.id !== id);
        saveToStorage();
        showHome();
    }
}

function addNewProduct() {
    if (!isAdmin()) return;

    const name = prompt('Название товара:');
    if (!name) return;

    const price = parseInt(prompt('Цена:'));
    if (!price) return;

    const category = prompt('Категория (liquids/pods/disposable/accessories):') || 'liquids';
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
}

// ========== НАВИГАЦИЯ ==========

function navigateTo(page) {
    if (page === 'home') showHome();
    else if (page === 'favorites') showFavorites();
    else if (page === 'cart') showCart();
    else if (page === 'profile') showProfile();
    else if (page === 'raffle') showRaffle();

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
        showNotification('🔍 Поиск появится скоро', 'search');
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

// Добавляем анимации
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from { opacity: 0; transform: translate(-50%, -20px); }
        to { opacity: 1; transform: translate(-50%, 0); }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);