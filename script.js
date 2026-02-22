let tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Данные пользователя
let user = {
    id: tg.initDataUnsafe?.user?.id || Math.floor(Math.random() * 1000000),
    username: tg.initDataUnsafe?.user?.username || 'user_' + Math.floor(Math.random() * 1000),
    firstName: tg.initDataUnsafe?.user?.first_name || 'Пользователь',
    promoCode: generatePromoCode(),
    orders: []
};

// Товары
let products = [
    {id: 1, name: "HS Bank 100ml", price: 890, category: "liquids", image: "🥤", desc: "Фруктовый микс", stock: true},
    {id: 2, name: "Sadboy 60ml", price: 690, category: "liquids", image: "🍓", desc: "Клубничный джем", stock: true},
    {id: 3, name: "Pod System X", price: 2490, category: "pods", image: "💨", desc: "Компактная pod-система", stock: true},
    {id: 4, name: "Elf Bar 1500", price: 1290, category: "disposable", image: "⚡", desc: "1500 затяжек", stock: true},
    {id: 5, name: "GeekVape Hero", price: 3300, category: "pods", image: "🦸", desc: "Влагозащита IP68", stock: true},
    {id: 6, name: "Шейкер-брелок", price: 500, category: "accessories", image: "🔑", desc: "Для жидкости Pink", stock: true}
];

// Корзина и избранное
let cart = [];
let favorites = [];
let currentCategory = 'all';
let appliedPromo = null;
let isAdmin = false;

// Генерация промокода
function generatePromoCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Проверка админа (для теста)
async function checkAdmin() {
    return false; // В реальности проверять через бота
}

// Инициализация
(async function init() {
    isAdmin = await checkAdmin();
    if (isAdmin) {
        document.getElementById('adminBtn').style.display = 'flex';
    }
    loadFromStorage();
    showHome();
})();

// Загрузка из localStorage
function loadFromStorage() {
    const savedCart = localStorage.getItem(`cart_${user.id}`);
    if (savedCart) cart = JSON.parse(savedCart);

    const savedFav = localStorage.getItem(`fav_${user.id}`);
    if (savedFav) favorites = JSON.parse(savedFav);

    const savedOrders = localStorage.getItem(`orders_${user.id}`);
    if (savedOrders) user.orders = JSON.parse(savedOrders);

    updateCartBadge();
}

// Сохранение
function saveToStorage() {
    localStorage.setItem(`cart_${user.id}`, JSON.stringify(cart));
    localStorage.setItem(`fav_${user.id}`, JSON.stringify(favorites));
    localStorage.setItem(`orders_${user.id}`, JSON.stringify(user.orders));
}

// Обновление бейджа корзины
function updateCartBadge() {
    document.getElementById('cartBadge').textContent = cart.length;
}

// ========== СТРАНИЦЫ ==========

// Главная (товары)
function showHome() {
    const content = document.getElementById('main-content');

    let filtered = products;
    if (currentCategory !== 'all') {
        filtered = products.filter(p => p.category === currentCategory);
    }

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
                    <button class="add-to-cart" style="flex: 1; background: ${inFav ? '#ff4757' : '#667eea'}" onclick="toggleFavorite(${product.id})">
                        ${inFav ? '❤️' : '🤍'}
                    </button>
                </div>
            </div>
        `;
    });
    html += '</div>';

    content.innerHTML = html;
}

// Избранное
function showFavorites() {
    const content = document.getElementById('main-content');

    if (favorites.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-heart-broken"></i>
                <h3>Избранное пусто</h3>
                <p>Добавьте товары в избранное</p>
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
                <div style="display: flex; gap: 5px;">
                    <button class="add-to-cart" style="flex: 2;" onclick="addToCart(${product.id})">
                        🛒 В корзину
                    </button>
                    <button class="add-to-cart" style="flex: 1; background: #ff4757" onclick="toggleFavorite(${product.id})">
                        ❤️
                    </button>
                </div>
            </div>
        `;
    });
    html += '</div>';

    content.innerHTML = html;
}

// Корзина
function showCart() {
    const content = document.getElementById('main-content');

    if (cart.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-cart"></i>
                <h3>Корзина пуста</h3>
                <p>Добавьте товары из каталога</p>
            </div>
        `;
        return;
    }

    // Группировка товаров
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
                        <span class="product-price">${item.price} ₽</span>
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

// Профиль
function showProfile() {
    const content = document.getElementById('main-content');

    const totalSpent = user.orders.reduce((sum, order) => sum + order.total, 0);

    content.innerHTML = `
        <div class="profile-page">
            <div class="profile-header">
                <div class="profile-avatar">
                    ${user.firstName.charAt(0)}
                </div>
                <div class="profile-info">
                    <h3>${user.firstName}</h3>
                    <p>@${user.username}</p>
                    <p>Всего заказов: ${user.orders.length}</p>
                </div>
            </div>
            
            <div class="promo-card">
                <div>Промокод за рекомендацию</div>
                <div class="promo-code">${user.promoCode}</div>
                <div class="promo-hint">Дайте другу — получит скидку 5%</div>
            </div>
            
            <div class="history-section">
                <h3>История заказов</h3>
                ${user.orders.length === 0 ? `
                    <p style="text-align: center; color: #999; padding: 20px;">У вас пока нет заказов</p>
                ` : user.orders.map(order => `
                    <div class="order-item">
                        <div class="order-header">
                            <span>Заказ #${order.id}</span>
                            <span>${order.date}</span>
                        </div>
                        <div>${order.items} товаров · ${order.total} ₽</div>
                        <div class="order-status">${order.status}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Розыгрыш
function showRaffle() {
    const content = document.getElementById('main-content');

    content.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-gift"></i>
            <h3>РОЗЫГРЫШ</h3>
            <p>Fog Shop</p>
            <p style="margin-top: 20px;">Участвуй и выигрывай!</p>
            <button class="checkout-btn" style="margin-top: 20px;" onclick="participateRaffle()">
                Участвовать
            </button>
        </div>
    `;
}

// ========== ДЕЙСТВИЯ ==========

// Добавление в корзину
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    cart.push({...product});
    saveToStorage();
    updateCartBadge();

    tg.HapticFeedback.impactOccurred('light');
    tg.showAlert(`${product.name} добавлен в корзину`);
}

// Обновление количества в корзине
function updateCartItem(productId, delta) {
    const index = cart.findIndex(item => item.id === productId);
    if (index === -1) return;

    if (delta > 0) {
        cart.push({...products.find(p => p.id === productId)});
    } else {
        cart.splice(index, 1);
    }

    saveToStorage();
    updateCartBadge();
    showCart();
}

// Очистка корзины
function clearCart() {
    if (confirm('Очистить корзину?')) {
        cart = [];
        appliedPromo = null;
        saveToStorage();
        updateCartBadge();
        showCart();
    }
}

// Избранное
function toggleFavorite(productId) {
    const product = products.find(p => p.id === productId);
    const index = favorites.findIndex(f => f.id === productId);

    if (index === -1) {
        favorites.push({...product});
        tg.showAlert('Добавлено в избранное');
    } else {
        favorites.splice(index, 1);
        tg.showAlert('Удалено из избранного');
    }

    saveToStorage();
    tg.HapticFeedback.impactOccurred('light');
    showFavorites();
}

// Применение промокода
function applyPromo() {
    const input = document.getElementById('promoInput').value;

    if (!input) {
        appliedPromo = null;
        showCart();
        return;
    }

    // Проверяем, не свой ли промокод
    if (input === user.promoCode) {
        tg.showAlert('Нельзя использовать свой промокод');
        return;
    }

    appliedPromo = input;
    tg.HapticFeedback.impactOccurred('light');
    showCart();
}

// Оформление заказа
function checkout() {
    document.getElementById('orderModal').classList.add('show');

    // Заполняем данные пользователя
    document.getElementById('orderName').value = user.firstName;
}

// Выбор доставки
function selectDelivery() {
    tg.showAlert('Выберите способ доставки в чате с менеджером @fog_shop_manager');
}

// Завершение заказа
function completeOrder() {
    const name = document.getElementById('orderName').value;
    const comment = document.getElementById('orderComment').value;

    if (!name) {
        tg.showAlert('Введите имя');
        return;
    }

    const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
    const discount = appliedPromo ? subtotal * 0.05 : 0;
    const total = subtotal - discount;

    // Сохраняем заказ
    const order = {
        id: Date.now(),
        date: new Date().toLocaleDateString(),
        items: cart.length,
        total: total,
        status: 'Новый',
        name: name,
        comment: comment,
        promo: appliedPromo
    };

    user.orders.push(order);
    saveToStorage();

    // Отправляем в Telegram
    const orderText = `
🆕 Новый заказ!
👤 Пользователь: @${user.username}
📦 Товаров: ${cart.length}
💰 Сумма: ${total} ₽
📝 Комментарий: ${comment || 'нет'}
🎫 Промокод: ${appliedPromo || 'нет'}
    `;

    tg.sendData(JSON.stringify({
        action: 'new_order',
        order: order,
        cart: cart,
        user: user
    }));

    // Очищаем корзину
    cart = [];
    appliedPromo = null;
    saveToStorage();
    updateCartBadge();

    closeModal();
    tg.showAlert('Заказ отправлен! Менеджер свяжется с вами');
    showHome();
}

// Закрытие модального окна
function closeModal() {
    document.getElementById('orderModal').classList.remove('show');
}

// Участие в розыгрыше
function participateRaffle() {
    tg.showAlert('Вы участвуете в розыгрыше! Следите за новостями');
}

// Навигация
function navigateTo(page) {
    if (page === 'home') showHome();
    else if (page === 'favorites') showFavorites();
    else if (page === 'cart') showCart();
    else if (page === 'profile') showProfile();
    else if (page === 'raffle') showRaffle();
}

// ========== СОБЫТИЯ ==========

// Переключение категорий
document.querySelectorAll('.category').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.category').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.dataset.cat;
        showHome();
    });
});

// Нижняя навигация
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        navigateTo(btn.dataset.page);
        tg.HapticFeedback.impactOccurred('light');
    });
});

// Поиск
document.querySelector('.search-icon').addEventListener('click', () => {
    tg.showAlert('Поиск появится скоро');
});

// Баннер
document.querySelector('.banner').addEventListener('click', () => {
    navigateTo('raffle');
});

// Админка
document.getElementById('adminBtn').addEventListener('click', () => {
    tg.showAlert('Панель администратора');
});