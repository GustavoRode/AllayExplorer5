const FREE_SHIPPING_NEIGHBORHOODS = [
  'Villa Urquiza',
  'Saavedra',
  'Belgrano',
  'Villa Ortúzar',
  'Parque Chas',
  'Villa Pueyrredón'
];
const FIXED_SHIPPING_COST = 6800;
const DELIVERY_STORAGE_KEY = 'allay-delivery-neighborhood';

const cartItemsContainer = document.querySelector('[data-cart-items]');
const cartSummary = document.querySelector('[data-cart-summary]');
const cartOrderSummary = document.querySelector('[data-cart-order-summary]');
const cartOrderQuantity = document.querySelector('[data-cart-quantity]');
const cartOrderSubtotal = document.querySelector('[data-cart-subtotal]');
const cartOrderShipping = document.querySelector('[data-cart-shipping]');
const cartOrderEstimatedTotal = document.querySelector('[data-cart-estimated-total]');
const whatsappOrderButton = document.querySelector('.whatsapp-order');
const deliveryNeighborhood = document.querySelector('#delivery-neighborhood');
const deliveryFeedback = document.querySelector('[data-delivery-feedback]');

function populateFreeShippingNeighborhoods() {
  const freeAreasList = document.querySelector('[data-delivery-free-areas]');
  const firstPaidOption = Array.from(deliveryNeighborhood.options)
    .find((option) => option.value === 'Palermo');
  const options = document.createDocumentFragment();
  const areas = document.createDocumentFragment();

  FREE_SHIPPING_NEIGHBORHOODS.forEach((neighborhood) => {
    const option = document.createElement('option');
    option.value = neighborhood;
    option.textContent = neighborhood;
    options.append(option);

    const area = document.createElement('li');
    area.textContent = neighborhood;
    areas.append(area);
  });

  deliveryNeighborhood.insertBefore(options, firstPaidOption);
  freeAreasList.replaceChildren(areas);
}

function getShippingCost(neighborhood) {
  if (!neighborhood) return null;
  return FREE_SHIPPING_NEIGHBORHOODS.includes(neighborhood) ? 0 : FIXED_SHIPPING_COST;
}

function updateOrderSummary(items) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((count, item) => count + item.quantity, 0);
  const neighborhood = deliveryNeighborhood.value;
  const shippingCost = getShippingCost(neighborhood);

  cartOrderQuantity.textContent = `${itemCount} ${itemCount === 1 ? 'producto seleccionado' : 'productos seleccionados'}`;
  cartOrderSubtotal.textContent = window.AllayCart.formatPrice(subtotal);
  cartOrderShipping.textContent = shippingCost === null
    ? 'Seleccioná barrio'
    : shippingCost === 0
      ? 'Gratis'
      : window.AllayCart.formatPrice(shippingCost);
  cartOrderEstimatedTotal.textContent = shippingCost === null
    ? 'A confirmar'
    : window.AllayCart.formatPrice(subtotal + shippingCost);
  updateDeliveryFeedback(neighborhood);
}

function updateDeliveryFeedback(neighborhood) {
  if (!neighborhood) {
    deliveryFeedback.textContent = 'Seleccioná tu barrio para conocer la información de entrega.';
    deliveryFeedback.classList.remove('has-cost');
  } else if (FREE_SHIPPING_NEIGHBORHOODS.includes(neighborhood)) {
    deliveryFeedback.textContent = '✅ Envío gratis para tu zona';
    deliveryFeedback.classList.remove('has-cost');
  } else {
    deliveryFeedback.textContent =
      `🚚 Costo estimado de entrega: ${window.AllayCart.formatPrice(FIXED_SHIPPING_COST)}`;
    deliveryFeedback.classList.add('has-cost');
  }
}

function restoreDeliveryNeighborhood() {
  try {
    const savedNeighborhood = localStorage.getItem(DELIVERY_STORAGE_KEY);
    const hasOption = Array.from(deliveryNeighborhood.options)
      .some((option) => option.value === savedNeighborhood);
    if (savedNeighborhood && hasOption) deliveryNeighborhood.value = savedNeighborhood;
    if (savedNeighborhood && !hasOption) {
      console.warn('El barrio guardado no es una opción disponible.');
    }
    updateDeliveryFeedback(deliveryNeighborhood.value);
  } catch (error) {
    console.error('No se pudo recuperar el barrio de entrega.', error);
    updateDeliveryFeedback('');
  }
}

populateFreeShippingNeighborhoods();

deliveryNeighborhood.addEventListener('change', () => {
  try {
    if (deliveryNeighborhood.value) {
      localStorage.setItem(DELIVERY_STORAGE_KEY, deliveryNeighborhood.value);
    } else {
      localStorage.removeItem(DELIVERY_STORAGE_KEY);
    }
  } catch (error) {
    console.error('No se pudo guardar el barrio de entrega.', error);
  }

  try {
    updateOrderSummary(window.AllayCart.read());
  } catch (error) {
    console.error('No se pudo actualizar el resumen del pedido.', error);
  }
});

restoreDeliveryNeighborhood();

function renderCart() {
  try {
    const items = window.AllayCart.read();
    cartItemsContainer.replaceChildren();

    if (items.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'cart-empty-state';
      const emptyIcon = document.createElement('span');
      emptyIcon.className = 'cart-empty-icon';
      emptyIcon.setAttribute('aria-hidden', 'true');
      emptyIcon.textContent = '🛒';
      const emptyMessage = document.createElement('p');
      emptyMessage.className = 'cart-empty';
      emptyMessage.textContent = 'Tu pedido está vacío.';
      const catalogLink = document.createElement('a');
      catalogLink.className = 'button button-dark';
      catalogLink.href = './products.html';
      catalogLink.textContent = 'Ver productos';
      emptyState.append(emptyIcon, emptyMessage, catalogLink);
      cartItemsContainer.append(emptyState);
      cartSummary.hidden = true;
      cartOrderSummary.hidden = true;
      cartItemsContainer.setAttribute('aria-busy', 'false');
      return;
    }

    items.forEach((item) => {
      const lineTotal = item.price * item.quantity;

      const row = document.createElement('article');
      row.className = 'cart-item';
      const image = document.createElement('img');
      image.className = 'cart-item-image';
      image.src = item.image;
      image.alt = item.name;

      const details = document.createElement('div');
      details.className = 'cart-item-details';
      const name = document.createElement('h2');
      name.textContent = item.name;
      const price = document.createElement('p');
      price.className = 'cart-item-price';
      price.textContent = `${window.AllayCart.formatPrice(item.price)} c/u`;
      const subtotal = document.createElement('p');
      subtotal.className = 'cart-item-subtotal';
      subtotal.textContent = `Subtotal: ${window.AllayCart.formatPrice(lineTotal)}`;
      details.append(name, price, subtotal);

      const actions = document.createElement('div');
      actions.className = 'cart-item-actions';
      const quantityGroup = document.createElement('div');
      quantityGroup.className = 'quantity-control';
      quantityGroup.setAttribute('aria-label', `Cantidad de ${item.name}`);
      const decrement = document.createElement('button');
      decrement.type = 'button';
      decrement.textContent = '−';
      decrement.setAttribute('aria-label', `Restar una unidad de ${item.name}`);
      decrement.dataset.cartAction = 'decrease';
      decrement.dataset.id = item.id;
      const quantity = document.createElement('span');
      quantity.className = 'quantity-value';
      quantity.textContent = String(item.quantity);
      const increment = document.createElement('button');
      increment.type = 'button';
      increment.textContent = '+';
      increment.setAttribute('aria-label', `Sumar una unidad de ${item.name}`);
      increment.dataset.cartAction = 'increase';
      increment.dataset.id = item.id;
      quantityGroup.append(decrement, quantity, increment);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'cart-remove';
      remove.textContent = 'Eliminar';
      remove.dataset.cartAction = 'remove';
      remove.dataset.id = item.id;
      actions.append(quantityGroup, remove);

      row.append(image, details, actions);
      cartItemsContainer.append(row);
    });

    updateOrderSummary(items);
    cartOrderSummary.hidden = false;
    cartSummary.hidden = false;
    cartItemsContainer.setAttribute('aria-busy', 'false');
  } catch (error) {
    console.error('No se pudo cargar el pedido.', error);
    const message = document.createElement('p');
    message.className = 'catalog-error';
    message.textContent = 'No pudimos leer el pedido guardado. Revisá el almacenamiento del navegador y recargá.';
    cartItemsContainer.replaceChildren(message);
    cartSummary.hidden = true;
    cartOrderSummary.hidden = true;
    cartItemsContainer.setAttribute('aria-busy', 'false');
  }
}

cartItemsContainer.addEventListener('click', (event) => {
  const button = event.target.closest('[data-cart-action]');
  if (!button) return;

  try {
    const items = window.AllayCart.read();
    const item = items.find((entry) => entry.id === button.dataset.id);
    if (!item) return;

    if (button.dataset.cartAction === 'increase') item.quantity += 1;
    if (button.dataset.cartAction === 'decrease') item.quantity = Math.max(1, item.quantity - 1);
    if (button.dataset.cartAction === 'remove') {
      window.AllayCart.write(items.filter((entry) => entry.id !== item.id));
    } else {
      window.AllayCart.write(items);
    }
    renderCart();
  } catch (error) {
    console.error('No se pudo actualizar el pedido.', error);
    renderCart();
  }
});

whatsappOrderButton.addEventListener('click', () => {
  try {
    const items = window.AllayCart.read();
    if (items.length === 0) return;

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingCost = getShippingCost(deliveryNeighborhood.value);
    const estimatedTotal = shippingCost === null ? null : subtotal + shippingCost;
    const lines = items.map((item) =>
      `• ${item.name} x${item.quantity} - ${window.AllayCart.formatPrice(item.price * item.quantity)}`
    );
    const message = [
      'Hola Allay!',
      '',
      'Quiero realizar el siguiente pedido:',
      '',
      ...lines,
      '',
      `Subtotal: ${window.AllayCart.formatPrice(subtotal)}`,
      '',
      `Barrio: ${deliveryNeighborhood.value || 'Sin especificar'}`,
      `Envío estimado: ${shippingCost === null ? 'A confirmar' : shippingCost === 0 ? 'Gratis' : window.AllayCart.formatPrice(shippingCost)}`,
      `Total estimado: ${estimatedTotal === null ? 'A confirmar' : window.AllayCart.formatPrice(estimatedTotal)}`,
      '',
      'Muchas gracias.'
    ].join('\n');
    const whatsappUrl = `https://wa.me/541168854910?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  } catch (error) {
    console.error('No se pudo preparar el pedido para WhatsApp.', error);
    window.alert('No pudimos preparar el mensaje. Probá recargar la página.');
  }
});

window.addEventListener('allay:cart-updated', renderCart);
window.addEventListener('storage', renderCart);
renderCart();
