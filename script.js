let tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Данные
let products = [
    {id: 1, name: "HS Bank 100ml", price: 890, category: "liquids", image: "🥤", desc: "Фруктовый микс", stock: true},
    {id: 2, name: "Sadboy 60ml", price: 690, category: "liquids", image: "🍓", desc: "Клубничный джем", stock: true},
    {id: 3, name: "Pod System X", price: 2490, category: "pods", image: "💨", desc: "Компактная pod-система", stock: true},
    {id: 4, name: "Elf Bar 1500", price: 1290, category: "disposable", image: "⚡", desc: "1500 затяжек", stock: true},
    {id: 5, name: "GeekVape Hero", price: 3300, category: "pods", image: "🦸", desc: "Влагозащита IP68", stock: true},
    {id: 6, name: "Шейкер-брелок", price: 500, category: "accessories", image: "🔑", desc: "Для жидкости Pink", stock: true}
];

let cart = [];
let favorites = [];
let currentCategory = 'all';
let isAdmin = false;

// Проверка админа (здесь можно добавить проверку через Telegram)
async function checkAdmin() {
    // Временно включим для теста
    // В реальности нужно проверять через бота
    return true;
}

// Инициализация
(async function init() {
    isAdmin = await checkAdmin();
    if (isAdmin) {
        document.getElementById('adminBtn').style.display = 'flex';
    }
    showProducts();
})();

// Показать товары
function showProducts() {
    const container = document.getElementById('products');
    container.innerHTML = '';

    let filtered = products;
    if (currentCategory !== 'all') {
        filtered = products.filter(p => p.category === currentCategory);
    }

    filtered.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-image">${product.image}</div>
            <div class="product-title">${product.name}</div>
            <div class="product-price">${product.price} ₽</div>
            <button class="add-to-cart" onclick="addToCart(${product.id}, event)">
                <i class="fas fa-cart-plus"></i> В корзину
            </button>
            ${isAdmin ? `
                <div style="display: flex; gap: 5px; margin-top: 10px;">
                    <button onclick="editProduct(${product.id})" style="flex:1; padding:5px; background:#ffc107; border:none; border-radius:10px;">✏️</button>
                    <button onclick="deleteProduct(${product.id})" style="flex:1; padding:5px; background:#dc3545; border:none; border-radius:10px; color:white;">🗑️</button>
                </div>
            ` : ''}
        `;
        container.appendChild(card);
    });
}

// Добавление в корзину
function addToCart(id, event) {
    const product = products.find(p => p.id === id);
    cart.push(product);

    // Анимация
    const btn = event.target;
    btn.classList.add('cart-add-animation');
    setTimeout(() => btn.classList.remove('cart-add-animation'), 300);

    // Обновление бейджа
    document.getElementById('cartBadge').textContent = cart.length;

    // Виброотклик
    tg.HapticFeedback.impactOccurred('light');
}

// Редактирование товара (для админов)
function editProduct(id) {
    const product = products.find(p => p.id === id);
    const newName = prompt('Новое название:', product.name);
    if (newName) product.name = newName;

    const newPrice = prompt('Новая цена:', product.price);
    if (newPrice) product.price = parseInt(newPrice);

    showProducts();
}

// Удаление товара (для админов)
function deleteProduct(id) {
    if (confirm('Удалить товар?')) {
        products = products.filter(p => p.id !== id);
        showProducts();
    }
}

// Фильтр по категориям
document.querySelectorAll('.category').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.category').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        currentCategory = btn.dataset.cat;
        showProducts();

        // Анимация
        tg.HapticFeedback.impactOccurred('light');
    });
});

// Поиск
document.querySelector('.search-icon').addEventListener('click', () => {
    const searchTerm = prompt('Поиск товаров:');
    if (searchTerm) {
        const filtered = products.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        // Временно показываем результат
        console.log('Найдено:', filtered);
    }
});

// Переключение страниц
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const page = btn.dataset.page;

        if (page === 'cart') {
            if (cart.length === 0) {
                alert('Корзина пуста');
            } else {
                let total = cart.reduce((sum, p) => sum + p.price, 0);
                alert(`В корзине: ${cart.length} товаров\nСумма: ${total} ₽`);
            }
        } else if (page === 'favorites') {
            alert('Избранное пока пусто');
        } else if (page === 'profile') {
            alert('Профиль пользователя');
        }

        tg.HapticFeedback.impactOccurred('light');
    });
});

// Админка
document.getElementById('adminBtn').addEventListener('click', () => {
    const menu = `
        Fog Shop - Админка
        
        1. Добавить товар
        2. Изменить цену
        3. Удалить товар
    `;

    const choice = prompt(menu + '\n\nВыберите действие:');

    if (choice === '1') {
        const name = prompt('Название:');
        const price = prompt('Цена:');
        const category = prompt('Категория (liquids/pods/disposable/accessories):');
        if (name && price && category) {
            const newId = Math.max(...products.map(p => p.id)) + 1;
            products.push({
                id: newId,
                name: name,
                price: parseInt(price),
                category: category,
                image: '🆕',
                desc: '',
                stock: true
            });
            showProducts();
        }
    }
});