let tg = window.Telegram.WebApp;
tg.expand();

const products = [
    {id: 1, name: "HS Bank 100ml", price: 890},
    {id: 2, name: "Sadboy 60ml", price: 690},
    {id: 3, name: "Pod System X", price: 2490},
    {id: 4, name: "Elf Bar 1500", price: 1290}
];

let cart = [];

function showProducts() {
    const container = document.getElementById('products');
    container.innerHTML = '';
    products.forEach(p => {
        container.innerHTML += `
            <div class="product-card">
                <div class="product-img">📷</div>
                <div class="product-title">${p.name}</div>
                <div class="product-price">${p.price} ₽</div>
                <button onclick="addToCart(${p.id})">В корзину</button>
            </div>
        `;
    });
}

function addToCart(id) {
    const p = products.find(x => x.id === id);
    cart.push(p);
    tg.MainButton.setText(`Корзина (${cart.length})`);
    tg.MainButton.show();
}

tg.MainButton.onClick(() => {
    tg.sendData(JSON.stringify(cart));
});

showProducts();