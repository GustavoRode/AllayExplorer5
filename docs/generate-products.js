const fs = require('node:fs/promises');
const path = require('node:path');

const docsDirectory = __dirname;
const productsPath = path.join(docsDirectory, 'products.json');
const templatePath = path.join(docsDirectory, 'templates', 'product.html');
const outputDirectory = path.join(docsDirectory, 'productos');
const defaultSiteUrl = 'https://gustavorode.github.io/AllayExplorer5';
const availabilityValues = {
  in_stock: 'InStock',
  out_of_stock: 'OutOfStock',
  preorder: 'PreOrder',
  discontinued: 'Discontinued'
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function escapeJsonForHtml(value) {
  return JSON.stringify(value, null, 2).replace(/</g, '\\u003c');
}

function validateProducts(products) {
  if (!Array.isArray(products)) {
    throw new Error('products.json debe contener una lista de productos.');
  }

  const slugs = new Set();
  for (const [index, product] of products.entries()) {
    const label = `Producto ${index + 1}`;
    if (!product || typeof product !== 'object') {
      throw new Error(`${label}: se esperaba un objeto.`);
    }

    for (const field of ['name', 'slug', 'description', 'imageUrl', 'currency']) {
      if (typeof product[field] !== 'string' || !product[field].trim()) {
        throw new Error(`${label}: falta el campo obligatorio "${field}".`);
      }
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.slug)) {
      throw new Error(`${label}: el slug "${product.slug}" no es válido.`);
    }
    if (slugs.has(product.slug)) {
      throw new Error(`El slug "${product.slug}" está duplicado.`);
    }
    slugs.add(product.slug);

    if (!Number.isFinite(product.price) || product.price < 0) {
      throw new Error(`${label}: el precio debe ser un número no negativo.`);
    }
    if (!/^[A-Z]{3}$/.test(product.currency)) {
      throw new Error(`${label}: la moneda debe usar un código ISO de tres letras.`);
    }

    let imageUrl;
    try {
      imageUrl = new URL(product.imageUrl);
    } catch {
      throw new Error(`${label}: imageUrl debe ser una URL absoluta.`);
    }
    if (!['http:', 'https:'].includes(imageUrl.protocol)) {
      throw new Error(`${label}: imageUrl debe usar HTTP o HTTPS.`);
    }
  }
}

function getProductStructuredData(product, canonicalUrl, description) {
  const availability = availabilityValues[product.availability];
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description,
    image: product.imageUrl,
    ...(product.sku ? { sku: product.sku } : {}),
    ...(product.category ? { category: product.category } : {}),
    brand: { '@type': 'Brand', name: 'ALLAY' },
    ...(product.glutenFree
      ? { suitableForDiet: 'https://schema.org/GlutenFreeDiet' }
      : {}),
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: product.currency,
      ...(availability
        ? { availability: `https://schema.org/${availability}` }
        : {}),
      url: canonicalUrl
    }
  };
}

function renderProduct(template, product, siteUrl) {
  const canonicalUrl = `${siteUrl}/productos/${product.slug}.html`;
  const title = product.metaTitle || `${product.name} | ALLAY`;
  const description = product.metaDescription || product.shortDescription || product.description;
  const imageAlt = product.imageAlt || product.name;
  const price = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: product.currency,
    maximumFractionDigits: 0
  }).format(product.price);
  const structuredData = escapeJsonForHtml(
    getProductStructuredData(product, canonicalUrl, description)
  );
  const values = {
    TITLE: escapeHtml(title),
    META_DESCRIPTION: escapeHtml(description),
    CANONICAL_URL: escapeHtml(canonicalUrl),
    IMAGE_URL: escapeHtml(product.imageUrl),
    NAME: escapeHtml(product.name),
    IMAGE_ALT: escapeHtml(imageAlt),
    DESCRIPTION: escapeHtml(product.description),
    PRICE: String(product.price),
    CURRENCY: escapeHtml(product.currency),
    PRICE_DISPLAY: escapeHtml(price),
    YEAR: String(new Date().getFullYear()),
    PRODUCT_JSON_LD: structuredData
  };

  return template.replace(/\{\{([A-Z_]+)\}\}/g, (placeholder, key) => {
    if (!(key in values)) {
      throw new Error(`Placeholder desconocido en la plantilla: ${placeholder}`);
    }
    return values[key];
  });
}

async function main() {
  const configuredSiteUrl = process.env.SITE_URL || defaultSiteUrl;
  let siteUrl;
  try {
    const parsedSiteUrl = new URL(configuredSiteUrl);
    if (parsedSiteUrl.protocol !== 'https:' || parsedSiteUrl.search || parsedSiteUrl.hash) {
      throw new Error();
    }
    siteUrl = parsedSiteUrl.href.replace(/\/+$/, '');
  } catch {
    throw new Error('SITE_URL debe ser una URL HTTPS válida, sin parámetros ni fragmento.');
  }

  const [productsContent, template] = await Promise.all([
    fs.readFile(productsPath, 'utf8'),
    fs.readFile(templatePath, 'utf8')
  ]);
  const products = JSON.parse(productsContent);
  validateProducts(products);

  const pages = products.map((product) => ({
    filename: `${product.slug}.html`,
    content: renderProduct(template, product, siteUrl)
  }));

  await fs.mkdir(outputDirectory, { recursive: true });
  const existingFiles = await fs.readdir(outputDirectory, { withFileTypes: true });
  await Promise.all(existingFiles
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => fs.unlink(path.join(outputDirectory, entry.name))));
  await Promise.all(pages.map(({ filename, content }) =>
    fs.writeFile(path.join(outputDirectory, filename), content, 'utf8')
  ));

  console.log(`Se generaron ${pages.length} fichas en docs/productos/.`);
}

main().catch((error) => {
  console.error(`No se pudieron generar las fichas: ${error.message}`);
  process.exitCode = 1;
});
