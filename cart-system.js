(function () {
  const STORAGE_KEY = 'leperle_cart_v1';
  const DEFAULT_IMAGE = 'Producto';

  function formatPrice(value) {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(Number(value) || 0);
  }

  function normalizeText(value, fallback = '') {
    return (value || fallback || '').toString().replace(/\s+/g, ' ').trim();
  }

  function readCart() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (error) {
      return [];
    }
  }

  function writeCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    updateBadges(cart);
    renderCartPage(cart);
  }

  function updateBadges(cart) {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    document.querySelectorAll('.cart-badge').forEach(badge => {
      badge.textContent = totalItems;
      badge.style.display = totalItems > 0 ? 'flex' : 'none';
    });
  }

  function getProductData(button) {
    const customName = normalizeText(button.dataset.productName);
    const customPrice = parseFloat((button.dataset.productPrice || '').replace(',', '.'));
    const customVariant = normalizeText(button.dataset.productVariant);
    const customImage = normalizeText(button.dataset.productImage);
    const customId = normalizeText(button.dataset.productId);

    if (customName && !Number.isNaN(customPrice)) {
      return {
        id: customId || customName.toLowerCase().replace(/[^a-z0-9]+/gi, '-'),
        name: customName,
        price: customPrice,
        variant: customVariant,
        image: customImage || DEFAULT_IMAGE
      };
    }

    const card = button.closest('.product-card, .product-info, .product-details, .product-main, .featured-product, article, section');

    const name = normalizeText(
      card?.querySelector('.product-card__name, .product-info__name, .product-title, h1, h2, h3')?.textContent,
      'Producto Le Perlé'
    );

    const variant = normalizeText(
      card?.querySelector('.product-card__variant, .product-info__eyebrow, .product-subtitle, .product-meta, .product-format')?.textContent,
      ''
    );

    const priceText = normalizeText(
      card?.querySelector('.product-card__price, .product-info__price, .product-price, [data-price]')?.textContent,
      '0'
    );

    const price = parseFloat(
      priceText.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.')
    ) || 0;

    const image = card?.querySelector('img')?.getAttribute('src') || DEFAULT_IMAGE;

    return {
      id: customId || name.toLowerCase().replace(/[^a-z0-9]+/gi, '-'),
      name,
      price,
      variant,
      image
    };
  }

  function addToCart(product) {
    const cart = readCart();
    const existing = cart.find(item => item.id === product.id);

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }

    writeCart(cart);
  }

  function changeQuantity(id, amount) {
    const cart = readCart()
      .map(item => item.id === id ? { ...item, quantity: item.quantity + amount } : item)
      .filter(item => item.quantity > 0);

    writeCart(cart);
  }

  function removeItem(id) {
    writeCart(readCart().filter(item => item.id !== id));
  }

  function clearCart() {
    writeCart([]);
  }

  function renderCartPage(cart) {
    const list = document.querySelector('[data-cart-list]');
    const empty = document.querySelector('[data-empty-cart]');

    if (!list || !empty) return;

    list.innerHTML = '';
    empty.classList.toggle('is-visible', cart.length === 0);

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    cart.forEach(item => {
      const article = document.createElement('article');
      article.className = 'cart-item';

      article.innerHTML = `
        <div class="cart-item__media">
          ${item.image && item.image !== DEFAULT_IMAGE
            ? `<img src="${item.image}" alt="${item.name}" loading="lazy">`
            : DEFAULT_IMAGE}
        </div>

        <div>
          <h3 class="cart-item__name">${item.name}</h3>
          <p class="cart-item__meta">${item.variant || 'Selección Le Perlé'}</p>

          <div class="cart-item__controls">
            <div class="qty-box" aria-label="Cantidad del producto">
              <button class="qty-btn" type="button" data-qty-minus="${item.id}">−</button>
              <span class="qty-value">${item.quantity}</span>
              <button class="qty-btn" type="button" data-qty-plus="${item.id}">+</button>
            </div>

            <button class="remove-btn" type="button" data-remove-item="${item.id}">
              Eliminar
            </button>
          </div>
        </div>

        <div class="cart-item__price">
          <div class="cart-item__unit">${formatPrice(item.price)} / unidad</div>
          <div class="cart-item__total">${formatPrice(item.price * item.quantity)}</div>
        </div>
      `;

      list.appendChild(article);
    });

    const itemsNode = document.querySelector('[data-summary-items]');
    const subtotalNode = document.querySelector('[data-summary-subtotal]');
    const totalNode = document.querySelector('[data-summary-total]');

    if (itemsNode) itemsNode.textContent = totalItems;
    if (subtotalNode) subtotalNode.textContent = formatPrice(subtotal);
    if (totalNode) totalNode.textContent = formatPrice(subtotal);
  }

  document.addEventListener('click', event => {
    const addButton = event.target.closest('[data-add-cart]');
    if (addButton) {
      const product = getProductData(addButton);
      addToCart(product);

      const original = addButton.dataset.originalLabel || addButton.textContent.trim();
      addButton.dataset.originalLabel = original;
      addButton.textContent = '✓ Añadido';
      addButton.style.background = '#3a3632';
      addButton.style.color = '#ffffff';

      setTimeout(() => {
        addButton.textContent = original;
        addButton.style.background = '';
        addButton.style.color = '';
      }, 1600);
    }

    const plus = event.target.closest('[data-qty-plus]');
    if (plus) changeQuantity(plus.dataset.qtyPlus, 1);

    const minus = event.target.closest('[data-qty-minus]');
    if (minus) changeQuantity(minus.dataset.qtyMinus, -1);

    const remove = event.target.closest('[data-remove-item]');
    if (remove) removeItem(remove.dataset.removeItem);

    const clear = event.target.closest('[data-clear-cart]');
    if (clear) clearCart();
  });

  window.LePerleCart = {
    add: addToCart,
    get: readCart,
    clear: clearCart,
    render: () => renderCartPage(readCart())
  };

  const currentCart = readCart();
  updateBadges(currentCart);
  renderCartPage(currentCart);
})();