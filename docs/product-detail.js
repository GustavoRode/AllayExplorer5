const detailContainer = document.querySelector('[data-product-detail]');
const detailQuantity = 1;

function showProductError(message) {
  const error = document.createElement('p');
  error.className = 'catalog-error';
  error.textContent = message;
  detailContainer.replaceChildren(error);
  detailContainer.setAttribute('aria-busy', 'false');
}

function updateProductMetadata(product) {
  const title = product.metaTitle || `${product.name} — Allay`;
  const description = product.metaDescription || product.shortDescription || product.description;
  document.title = title;
  document.querySelector('meta[name="description"]').content = description;
  const socialMetadata = {
    'og:title': title,
    'og:description': description,
    'og:image': product.imageUrl,
    'twitter:title': title,
    'twitter:description': description,
    'twitter:image': product.imageUrl
  };
  Object.entries(socialMetadata).forEach(([name, content]) => {
    const selector = name.startsWith('og:')
      ? `meta[property="${name}"]`
      : `meta[name="${name}"]`;
    document.querySelector(selector).content = content;
  });

  const canonicalUrl = new URL('./product.html', window.location.href);
  canonicalUrl.searchParams.set('slug', product.slug);
  document.querySelector('link[rel="canonical"]').href = canonicalUrl.toString();
  document.querySelector('meta[property="og:url"]').content = canonicalUrl.toString();

  const availability = {
    in_stock: 'InStock',
    out_of_stock: 'OutOfStock',
    preorder: 'PreOrder',
    discontinued: 'Discontinued'
  }[product.availability];
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description,
    image: product.imageUrl,
    sku: product.sku,
    category: product.category,
    brand: { '@type': 'Brand', name: 'Allay' },
    ...(product.glutenFree ? { suitableForDiet: 'https://schema.org/GlutenFreeDiet' } : {}),
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: product.currency,
      ...(availability ? { availability: `https://schema.org/${availability}` } : {}),
      url: canonicalUrl.toString()
    }
  };
  document.querySelector('#product-structured-data').textContent = JSON.stringify(structuredData);
}

async function shareProduct(product, feedback) {
  const url = window.location.href;

  try {
    if (typeof navigator.share === 'function') {
      await navigator.share({
        title: product.name,
        text: 'Producto artesanal sin gluten de Allay',
        url
      });
      return;
    }

    await navigator.clipboard.writeText(url);
    feedback.textContent = '✅ Enlace copiado';
    window.setTimeout(() => {
      feedback.textContent = '';
    }, 2000);
  } catch (error) {
    if (error.name === 'AbortError') return;
    console.error('No se pudo compartir el producto.', error);
    feedback.textContent = typeof navigator.share === 'function'
      ? 'No se pudo compartir el producto.'
      : 'No se pudo copiar el enlace.';
  }
}

function renderProduct(product) {
  const image = document.createElement('img');
  image.className = 'product-detail-image';
  image.src = product.imageUrl;
  image.alt = product.imageAlt || product.name;

  const content = document.createElement('div');
  content.className = 'product-detail-content';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Hecho a mano, para disfrutar';

  const name = document.createElement('h1');
  name.textContent = product.name;

  const price = document.createElement('p');
  price.className = 'product-detail-price';
  price.textContent = window.AllayCart.formatPrice(product.price);

  const code = document.createElement('p');
  code.className = 'product-detail-code';
  code.textContent = `Código: ${window.AllayCart.getProductCode(product)}`;

  const shareAction = document.createElement('div');
  shareAction.className = 'product-share';
  const shareButton = document.createElement('button');
  shareButton.className = 'product-share-button';
  shareButton.type = 'button';
  shareButton.setAttribute('aria-label', 'Compartir producto');
  const shareIcon = document.createElement('span');
  shareIcon.setAttribute('aria-hidden', 'true');
  shareIcon.textContent = '↗';
  const shareLabel = document.createElement('span');
  shareLabel.textContent = 'Compartir producto';
  shareButton.append(shareIcon, shareLabel);
  const shareFeedback = document.createElement('span');
  shareFeedback.className = 'product-share-feedback';
  shareFeedback.setAttribute('role', 'status');
  shareFeedback.setAttribute('aria-live', 'polite');
  shareButton.addEventListener('click', () => shareProduct(product, shareFeedback));
  shareAction.append(shareButton, shareFeedback);

  const description = document.createElement('p');
  description.className = 'product-detail-description';
  description.textContent = product.description;

  const gluten = document.createElement('p');
  gluten.className = 'product-gluten';
  gluten.textContent = '✳ 100% libre de gluten';

  const controls = document.createElement('div');
  controls.className = 'product-detail-actions';
  const quantityGroup = document.createElement('div');
  quantityGroup.className = 'quantity-control';
  quantityGroup.setAttribute('aria-label', 'Cantidad');
  const decrement = document.createElement('button');
  decrement.type = 'button';
  decrement.textContent = '−';
  decrement.setAttribute('aria-label', 'Restar una unidad');
  const quantityValue = document.createElement('span');
  quantityValue.className = 'quantity-value';
  quantityValue.textContent = String(detailQuantity);
  const increment = document.createElement('button');
  increment.type = 'button';
  increment.textContent = '+';
  increment.setAttribute('aria-label', 'Sumar una unidad');

  let quantity = detailQuantity;
  decrement.addEventListener('click', () => {
    quantity = Math.max(1, quantity - 1);
    quantityValue.textContent = String(quantity);
  });
  increment.addEventListener('click', () => {
    quantity += 1;
    quantityValue.textContent = String(quantity);
  });
  quantityGroup.append(decrement, quantityValue, increment);

  const addButton = document.createElement('button');
  addButton.className = 'button button-dark';
  addButton.type = 'button';
  addButton.textContent = 'Agregar al pedido';
  addButton.addEventListener('click', () => {
    try {
      window.AllayCart.add(product, quantity);
      addButton.textContent = 'Agregado al pedido';
      window.setTimeout(() => {
        addButton.textContent = 'Agregar al pedido';
      }, 1800);
    } catch (error) {
      console.error('No se pudo agregar el producto al pedido.', error);
      addButton.textContent = 'No se pudo agregar';
    }
  });
  controls.append(quantityGroup, addButton);

  content.append(eyebrow, name, price, code, shareAction, description);
  if (product.glutenFree) content.append(gluten);
  content.append(controls);
  detailContainer.replaceChildren(image, content);
  detailContainer.setAttribute('aria-busy', 'false');
}

async function loadProductDetail() {
  const params = new URLSearchParams(window.location.search);
  const requestedSlug = params.get('slug');
  const requestedId = params.get('id');
  if (!requestedSlug && !requestedId) {
    showProductError('No encontramos el producto solicitado. Volvé a la vitrina para elegir uno.');
    return;
  }

  try {
    const products = await window.AllayProducts.load();

    const product = products.find((item) => {
      if (!item) return false;
      if (requestedSlug) return item.slug === requestedSlug;
      return typeof item.id === 'string' && typeof item.displayName === 'string' &&
        (item.id === requestedId || item.displayName.startsWith(`${requestedId}-`));
    });
    if (!product) {
      showProductError('No encontramos ese producto. Volvé a la vitrina para elegir otro.');
      return;
    }
    if (typeof product.name !== 'string' || typeof product.sku !== 'string' ||
      typeof product.displayName !== 'string' || typeof product.imageUrl !== 'string' ||
      typeof product.description !== 'string' || typeof product.slug !== 'string' ||
      typeof product.imageAlt !== 'string' || typeof product.metaTitle !== 'string' ||
      typeof product.metaDescription !== 'string' || typeof product.currency !== 'string' ||
      typeof product.category !== 'string' || typeof product.availability !== 'string' ||
      typeof product.glutenFree !== 'boolean' || !Number.isFinite(product.price)) {
      throw new Error('El producto tiene un formato inválido');
    }

    updateProductMetadata(product);
    renderProduct(product);
    window.AllayProducts.renderRecommendations(product, products);
  } catch (error) {
    console.error('No se pudo cargar el detalle del producto.', error);
    showProductError('No pudimos cargar el producto. Probá recargar la página.');
  }
}

loadProductDetail();
