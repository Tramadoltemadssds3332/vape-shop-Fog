let tg = window.Telegram.WebApp;
tg.expand();

// Товары
const products = [
    {id: 1, name: "HS Bank 100ml", price: 890, category: "liquids"},
    {id: 2, name: "Sadboy 60ml", price: 690, category: "liquids"},
    {id: 3, name: "Pod System X", price: 2490, category: "pods"},
    {id: 4, name: "Elf Bar 1500", price: 1290, category: "disposable"}
];

// Корзина
let cart = [];

// Показать товары
function showProducts() {
    const container = document.getElementById('products');
    if (!container) return;

    container.innerHTML = '';
    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-img">📷</div>
            <div class="product-title">${product.name}</div>
            <div class="product-price">${product.price} ₽</div>
            <button onclick="addToCart(${product.id})">В корзину</button>
        `;
        container.appendChild(card);
    });
}

// Добавить в корзину
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    cart.push(product);
    tg.MainButton.setText(`Корзина (${cart.length})`);
    tg.MainButton.show();
    tg.HapticFeedback.impactOccurred('light'); // вибрация
}

// Фильтр по категориям
document.querySelectorAll('.category').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.category').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // Здесь можно добавить фильтрацию товаров
    });
});

// Навигация
document.querySelectorAll('.nav-item').forEach((btn, index) => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (index === 2) { // Корзина
            tg.MainButton.show();
        }
    });
});

// Отправка заказа
tg.MainButton.onClick(() => {
    tg.sendData(JSON.stringify(cart));
    tg.MainButton.hide();
});

// Запуск
showProducts();