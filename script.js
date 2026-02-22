let tg = window.Telegram.WebApp;
tg.expand();

// Товары
const products = [
    {id: 1, name: "HS Bank 100ml", price: 890, category: "liquids"},
    {id: 2, name: "Sadboy 60ml", price: 690, category: "liquids"},
    {id: 3, name: "Pod System X", price: 2490, category: "pods"},
    {id: 4, name: "Elf Bar 1500", price: 1290, category: "disposable"}
];

// Показать товары
function showProducts(category = 'all') {
    const container = document.getElementById('products');
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

// Корзина
let cart = [];
function addToCart(id) {
    cart.push(id);
    tg.MainButton.setText(`Корзина (${cart.length})`);
    tg.MainButton.show();
}

// Отправка
tg.MainButton.onClick(() => {
    tg.sendData(JSON.stringify(cart));
});

// Запуск
showProducts();