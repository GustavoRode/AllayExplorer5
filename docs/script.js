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
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Abrir menú');
    siteNav.classList.remove('is-open');
  }
});

const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();

const productGrids = document.querySelectorAll('[data-products]');

function createProductCard(product, index, total) {
  const article = document.createElement('article');
  article.className = 'product-card';

  const imageLink = document.createElement('a');
  imageLink.className = 'product-image';
  const whatsappUrl = new URL('https://wa.me/541168854910');
  whatsappUrl.searchParams.set('text', product.msgCTA);
  imageLink.href = whatsappUrl.toString();
  imageLink.setAttribute('aria-label', `Consultar por ${product.name}`);
  imageLink.target = '_blank';
  imageLink.rel = 'noopener noreferrer';

  const image = document.createElement('img');
  image.src = product.href;
  image.alt = product.name;
  image.dataset.displayName = product.displayName;
  image.loading = 'lazy';
  imageLink.append(image);

  const arrow = document.createElement('span');
  arrow.className = 'product-arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '↗';
  imageLink.append(arrow);

  const meta = document.createElement('div');
  meta.className = 'product-meta';
  const name = document.createElement('h3');
  name.textContent = product.name;
  meta.append(name);

  if (document.body.classList.contains('catalog-page')) {
    const price = document.createElement('span');
    price.className = 'product-price';
    price.textContent = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(product.price);
    meta.append(price);
  } else {
    const position = document.createElement('span');
    position.textContent = `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
    meta.append(position);
  }

  const description = document.createElement('p');
  description.textContent = product.description;

  article.append(imageLink, meta, description);
  return article;
}

async function loadProducts() {
  if (!productGrids.length) return;

  try {
    const response = await fetch('./products.json');
    if (!response.ok) throw new Error(`Error HTTP ${response.status}`);

    const products = await response.json();
    if (!Array.isArray(products) || products.some((product) =>
      !product || typeof product.name !== 'string' ||
      typeof product.displayName !== 'string' || typeof product.href !== 'string' ||
      typeof product.description !== 'string' || !Number.isFinite(product.price) ||
      typeof product.msgCTA !== 'string'
    )) {
      throw new Error('El catálogo tiene un formato inválido');
    }

    productGrids.forEach((grid) => {
      const limit = Number(grid.dataset.limit) || products.length;
      grid.replaceChildren(...products.slice(0, limit).map((product, index) =>
        createProductCard(product, index, products.length)
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
