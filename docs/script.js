const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('#site-nav');

menuToggle?.addEventListener('click', () => {
  const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Abrir menú' : 'Cerrar menú');
  siteNav.classList.toggle('is-open', !isOpen);
});

siteNav?.addEventListener('click', (event) => {
  if (event.target.closest('a')) {
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', 'Abrir menú');
    siteNav.classList.remove('is-open');
  }
});

const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();

const CART_STORAGE_KEY = 'allay-cart';
const cartPriceFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0
});

function getProductCode(product) {
  const imageCode = product.displayName.match(/^([A-Z]+-\d+)/);
  return imageCode ? imageCode[1] : product.id;
}

function getProductUrl(product) {
  return `productos/${product.slug}.html`;
}

function readCart() {
  const storedCart = localStorage.getItem(CART_STORAGE_KEY);
  if (storedCart === null) return [];

  const cart = JSON.parse(storedCart);
  if (!Array.isArray(cart) || cart.some((item) =>
    !item || typeof item.id !== 'string' || typeof item.name !== 'string' ||
    typeof item.image !== 'string' || !Number.isFinite(item.price) ||
    !Number.isInteger(item.quantity) || item.quantity < 1
  )) {
    throw new Error('El pedido guardado tiene un formato inválido');
  }
  return cart;
}

function writeCart(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event('allay:cart-updated'));
}

function addToCart(product, quantity) {
  const id = getProductCode(product);
  const cart = readCart();
  const existingItem = cart.find((item) => item.id === id);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({
      id,
      name: product.name,
      price: product.price,
      quantity,
      image: product.imageUrl
    });
  }

  writeCart(cart);
}

window.AllayCart = {
  add: addToCart,
  formatPrice: (price) => cartPriceFormatter.format(price),
  getProductCode,
  read: readCart,
  write: writeCart
};

function renderCartAccess() {
  const cartLink = document.querySelector('.cart-fab');
  if (!cartLink) return;

  try {
    const items = readCart();
    const itemCount = items.reduce((total, item) => total + item.quantity, 0);
    const orderTotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
    cartLink.querySelector('.cart-fab-count').textContent = `Pedido (${itemCount})`;
    cartLink.querySelector('.cart-fab-total').textContent = cartPriceFormatter.format(orderTotal);
    cartLink.setAttribute('aria-label',
      `Abrir pedido, ${itemCount} productos, total ${cartPriceFormatter.format(orderTotal)}`);
  } catch (error) {
    console.error('No se pudo leer el pedido guardado.', error);
    cartLink.querySelector('.cart-fab-count').textContent = 'Pedido';
    cartLink.querySelector('.cart-fab-total').textContent = cartPriceFormatter.format(0);
    cartLink.setAttribute('aria-label', 'Abrir pedido');
  }
}

const cartAccess = document.createElement('a');
cartAccess.className = 'cart-fab';
cartAccess.href = './cart.html';
cartAccess.setAttribute('aria-label', 'Abrir pedido');
const cartIcon = document.createElement('span');
cartIcon.className = 'cart-fab-icon';
cartIcon.setAttribute('aria-hidden', 'true');
cartIcon.textContent = '🛒';
const cartCount = document.createElement('span');
cartCount.className = 'cart-fab-count';
cartCount.textContent = 'Pedido (0)';
const cartTotal = document.createElement('span');
cartTotal.className = 'cart-fab-total';
cartTotal.textContent = cartPriceFormatter.format(0);
cartAccess.append(cartIcon, cartCount);
const cartSeparator = document.createElement('span');
cartSeparator.className = 'cart-fab-separator';
cartSeparator.setAttribute('aria-hidden', 'true');
cartSeparator.textContent = '·';
cartAccess.append(cartSeparator, cartTotal);
document.body.append(cartAccess);
renderCartAccess();
window.addEventListener('storage', renderCartAccess);
window.addEventListener('allay:cart-updated', renderCartAccess);

const productGrids = document.querySelectorAll('[data-products]');
let productsPromise;

function createProductCard(product, index, total, isCatalog = document.body.classList.contains('catalog-page')) {
  const article = document.createElement('article');
  article.className = 'product-card';

  const imageLink = document.createElement('a');
  imageLink.className = 'product-image';
  imageLink.href = getProductUrl(product);
  imageLink.setAttribute('aria-label',
    `Ver producto: ${product.name}${product.featured ? '. Más elegido' : ''}`);

  if (product.featured) {
    const badge = document.createElement('span');
    badge.className = 'product-featured-badge';
    badge.textContent = '⭐ Más elegido';
    imageLink.append(badge);
  }

  const image = document.createElement('img');
  image.src = product.imageUrl;
  image.alt = product.imageAlt || product.name;
  image.dataset.displayName = product.displayName;
  image.loading = 'lazy';
  imageLink.append(image);

  if (!isCatalog) {
    const arrow = document.createElement('span');
    arrow.className = 'product-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '↗';
    imageLink.append(arrow);
  }

  const meta = document.createElement('div');
  meta.className = 'product-meta';
  const name = document.createElement('h3');
  name.textContent = product.name;
  meta.append(name);

  if (isCatalog) {
    const price = document.createElement('span');
    price.className = 'product-price';
    price.textContent = cartPriceFormatter.format(product.price);
    meta.append(price);
  } else {
    const position = document.createElement('span');
    position.textContent = `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
    meta.append(position);
  }

  article.append(imageLink, meta);
  if (isCatalog) {
    const detailLink = document.createElement('a');
    detailLink.className = 'button button-dark product-detail-link';
    detailLink.href = getProductUrl(product);
    detailLink.textContent = 'Ver producto';
    article.append(detailLink);
  } else {
    const description = document.createElement('p');
    description.textContent = product.shortDescription || product.description;
    article.append(description);
  }
  return article;
}

function validateProducts(products) {
  if (!Array.isArray(products) || products.some((product) =>
    !product || typeof product.id !== 'string' || typeof product.sku !== 'string' ||
    typeof product.slug !== 'string' || !product.slug || typeof product.name !== 'string' ||
    typeof product.displayName !== 'string' || typeof product.imageUrl !== 'string' ||
    typeof product.description !== 'string' || !Number.isFinite(product.price) ||
    typeof product.msgCTA !== 'string' || typeof product.imageAlt !== 'string' ||
    typeof product.shortDescription !== 'string' || typeof product.currency !== 'string' ||
    typeof product.category !== 'string' || typeof product.glutenFree !== 'boolean' ||
    typeof product.availability !== 'string' || typeof product.featured !== 'boolean' ||
    !Array.isArray(product.tags) ||
    (product.recommendations !== undefined &&
      (!Array.isArray(product.recommendations) ||
        product.recommendations.some((sku) => typeof sku !== 'string')))
  )) {
    throw new Error('El catálogo tiene un formato inválido');
  }
  return products;
}

function loadProductData() {
  if (!productsPromise) {
    productsPromise = fetch('./products.json').then((response) => {
      if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
      return response.json();
    }).then(validateProducts);
  }
  return productsPromise;
}

function renderProductRecommendations(product, products) {
  const section = document.querySelector('[data-product-recommendations]');
  const grid = section?.querySelector('[data-recommendation-grid]');
  if (!section || !grid) return;

  const productsBySku = new Map(products.map((item) => [item.sku, item]));
  const selectedSkus = new Set([product.sku]);
  const recommendations = [];
  const addProduct = (candidate) => {
    if (!candidate || selectedSkus.has(candidate.sku) || recommendations.length >= 3) return;
    selectedSkus.add(candidate.sku);
    recommendations.push(candidate);
  };

  if (Array.isArray(product.recommendations)) {
    product.recommendations.forEach((sku) => addProduct(productsBySku.get(sku)));
  }
  products.filter((item) => item.category === product.category).forEach(addProduct);
  products.filter((item) => item.featured).forEach(addProduct);

  if (recommendations.length === 0) {
    section.hidden = true;
    grid.replaceChildren();
    return;
  }

  grid.replaceChildren(...recommendations.map((item, index) =>
    createProductCard(item, index, recommendations.length, true)
  ));
  section.hidden = false;
}

window.AllayProducts = {
  load: loadProductData,
  renderRecommendations: renderProductRecommendations
};

async function loadProducts() {
  if (!productGrids.length) return;

  try {
    const products = await loadProductData();
    const sortedProducts = [...products].sort((a, b) => Number(b.featured) - Number(a.featured));
    productGrids.forEach((grid) => {
      const limit = Number(grid.dataset.limit) || sortedProducts.length;
      grid.replaceChildren(...sortedProducts.slice(0, limit).map((product, index) =>
        createProductCard(product, index, sortedProducts.length)
      ));
      grid.setAttribute('aria-busy', 'false');
    });
  } catch (error) {
    console.error('No se pudo cargar el catálogo de productos.', error);
    productGrids.forEach((grid) => {
      const message = document.createElement('p');
      message.className = 'catalog-error';
      message.textContent = 'No pudimos cargar los productos. Probá recargar la página.';
      grid.replaceChildren(message);
      grid.setAttribute('aria-busy', 'false');
    });
  }
}

loadProducts();
