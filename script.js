/* ============================================================
LE PERLÉ — SCRIPT.JS
============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const FAVORITES_KEY = 'leperle_favorites_v1';

  function normalizeText(value = '') {
    return value
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function readFavorites() {
    try {
      return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
    } catch (error) {
      return [];
    }
  }

  function writeFavorites(favorites) {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }

  function getProductInfoFromButton(button) {
    const productId = button.dataset.productId?.trim();
    const productName = button.dataset.productName?.trim();
    const productVariant = button.dataset.productVariant?.trim() || '';
    const productUrl = button.dataset.productUrl?.trim() || 'product.html';

    if (productId && productName) {
      return {
        id: productId,
        name: productName,
        variant: productVariant,
        url: productUrl
      };
    }

    const card = button.closest('.product-card, .product-info, article, section');
    const name =
      card?.querySelector('.product-cardname, .product-infoname, h1, h2, h3')?.textContent?.trim() ||
      'Producto';

    const variant =
      card?.querySelector('.product-cardvariant, .product-infoeyebrow, p')?.textContent?.trim() ||
      '';

    const fallbackId = normalizeText(`${name}-${variant}`).replace(/[^a-z0-9]+/g, '-');

    return {
      id: productId || fallbackId,
      name,
      variant,
      url: productUrl
    };
  }

  function isFavorite(productId) {
    return readFavorites().some(item => item.id === productId);
  }

  function updateFavoriteButtonsUI() {
    const favoriteButtons = document.querySelectorAll('[data-fav][data-product-id]');
    const favorites = readFavorites();

    favoriteButtons.forEach(button => {
      const productId = button.dataset.productId;
      const active = favorites.some(item => item.id === productId);

      button.classList.toggle('is-fav', active);
      button.setAttribute(
        'aria-label',
        active ? 'Eliminar de favoritos' : 'Añadir a favoritos'
      );
    });
  }

  function updateHeaderFavoriteBadge() {
    const favoritesCount = readFavorites().length;
    document.querySelectorAll('[data-favorites-count]').forEach(el => {
      el.textContent = favoritesCount;
      el.style.display = favoritesCount > 0 ? 'flex' : 'none';
    });
  }

  function toggleFavorite(button) {
    const product = getProductInfoFromButton(button);
    let favorites = readFavorites();

    if (!product.id) return;

    if (favorites.some(item => item.id === product.id)) {
      favorites = favorites.filter(item => item.id !== product.id);
    } else {
      favorites.push(product);
    }

    writeFavorites(favorites);
    updateFavoriteButtonsUI();
    updateHeaderFavoriteBadge();
  }

  function bindFavoriteButtons() {
    const favBtns = document.querySelectorAll('[data-fav]');

    favBtns.forEach(btn => {
      btn.addEventListener('click', () => toggleFavorite(btn));
    });

    updateFavoriteButtonsUI();
    updateHeaderFavoriteBadge();
  }

  function getAllSearchableProducts() {
    const map = new Map();

    document.querySelectorAll('[data-product-id][data-product-name]').forEach(el => {
      const product = {
        id: el.dataset.productId.trim(),
        name: (el.dataset.productName || '').trim(),
        variant: (el.dataset.productVariant || '').trim(),
        url: (el.dataset.productUrl || 'product.html').trim()
      };

      if (product.id && !map.has(product.id)) {
        map.set(product.id, product);
      }
    });

    return [...map.values()];
  }

  function findProducts(query) {
    const term = normalizeText(query);
    if (!term) return [];

    return getAllSearchableProducts().filter(product => {
      const haystack = normalizeText(`${product.name} ${product.variant}`);
      return haystack.includes(term);
    });
  }

  function ensureSearchResultsContainer(searchPanel) {
    let results = searchPanel.querySelector('.search-results');

    if (!results) {
      results = document.createElement('div');
      results.className = 'search-results';
      searchPanel.appendChild(results);
    }

    return results;
  }

  function renderSearchResults(results, query, container) {
    if (!query.trim()) {
      container.innerHTML = '';
      return;
    }

    if (!results.length) {
      container.innerHTML = `
        <p class="search-empty">No se han encontrado productos para "<strong>${query}</strong>".</p>
      `;
      return;
    }

    container.innerHTML = results
      .map(
        product => `
          <a class="search-result-item" href="${product.url}">
            <span class="search-result-name">${product.name}</span>
            <span class="search-result-variant">${product.variant}</span>
          </a>
        `
      )
      .join('');
  }

  // ============================================================
  // MENÚ HAMBURGUESA / MENÚ LATERAL
  // ============================================================
  const menuToggle = document.querySelectorAll('[data-menu-toggle]');
  const menuClose = document.querySelectorAll('[data-menu-close]');
  const sideMenu = document.getElementById('side-menu');
  const menuOverlay = document.getElementById('menu-overlay');

  function openMenu() {
    sideMenu?.classList.add('is-open');
    menuOverlay?.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    sideMenu?.classList.remove('is-open');
    menuOverlay?.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  menuToggle.forEach(btn => btn.addEventListener('click', openMenu));
  menuClose.forEach(btn => btn.addEventListener('click', closeMenu));
  menuOverlay?.addEventListener('click', closeMenu);

  // ============================================================
  // PANEL DE BÚSQUEDA
  // ============================================================
  const searchToggles = document.querySelectorAll('[data-search-toggle]');
  const searchPanel = document.getElementById('search-panel');
  const searchClose = document.getElementById('search-close-btn');
  const searchInput = searchPanel?.querySelector('input[type="search"], input');
  const searchResults = searchPanel ? ensureSearchResultsContainer(searchPanel) : null;

  function openSearch() {
    searchPanel?.classList.add('is-open');
    setTimeout(() => searchInput?.focus(), 250);
  }

  function closeSearch() {
    searchPanel?.classList.remove('is-open');
    if (searchInput) searchInput.value = '';
    if (searchResults) searchResults.innerHTML = '';
  }

  searchToggles.forEach(btn => btn.addEventListener('click', openSearch));
  searchClose?.addEventListener('click', closeSearch);

  searchInput?.addEventListener('input', e => {
    const query = e.target.value;
    const results = findProducts(query);
    renderSearchResults(results, query, searchResults);
  });

  searchInput?.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;

    const query = e.target.value.trim();
    const results = findProducts(query);

    if (results.length > 0) {
      window.location.href = results[0].url;
    }
  });

  // La tecla Escape cierra el menú y la búsqueda
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeMenu();
      closeSearch();
    }
  });

  // ============================================================
  // MINIATURAS DE LA GALERÍA DE PRODUCTO
  // ============================================================
  const thumbs = document.querySelectorAll('.gallery-thumb');
  const mainImage = document.getElementById('main-product-image');

  thumbs.forEach(thumb => {
    thumb.addEventListener('click', () => {
      thumbs.forEach(t => t.classList.remove('is-active'));
      thumb.classList.add('is-active');

      const thumbImage = thumb.querySelector('img');
      const newSrc = thumbImage?.src;

      if (mainImage && mainImage.tagName === 'IMG' && newSrc) {
        mainImage.style.opacity = '0';
        setTimeout(() => {
          mainImage.src = newSrc;
          mainImage.style.opacity = '1';
        }, 200);
      }
    });
  });

  // ============================================================
  // SELECTOR DE TALLA / TAMAÑO
  // ============================================================
  const sizeBtns = document.querySelectorAll('.size-btn');

  sizeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('.size-selector');
      group?.querySelectorAll('.size-btn').forEach(b => {
        b.classList.remove('is-active');
        b.setAttribute('aria-pressed', 'false');
      });

      btn.classList.add('is-active');
      btn.setAttribute('aria-pressed', 'true');
    });
  });

  // ============================================================
  // PESTAÑAS (DESCRIPCIÓN / INGREDIENTES)
  // ============================================================
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      tabBtns.forEach(b => {
        b.classList.remove('is-active');
        b.setAttribute('aria-selected', 'false');
      });

      tabPanels.forEach(panel => panel.classList.remove('is-active'));

      btn.classList.add('is-active');
      btn.setAttribute('aria-selected', 'true');
      document.getElementById(target)?.classList.add('is-active');
    });
  });

  // ============================================================
  // NAVEGACIÓN DE LA PÁGINA LEGAL
  // ============================================================
  const legalNavBtns = document.querySelectorAll('.legal-nav-btn');
  const legalPanels = document.querySelectorAll('.legal-panel');

  legalNavBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.legal;

      legalNavBtns.forEach(b => b.classList.remove('is-active'));
      legalPanels.forEach(panel => panel.classList.remove('is-active'));

      btn.classList.add('is-active');
      document.getElementById(target)?.classList.add('is-active');
    });
  });

  // ============================================================
  // FORMULARIO DE CONTACTO
  // ============================================================
  const contactForm = document.getElementById('contact-form');

  if (contactForm) {
    contactForm.addEventListener('submit', e => {
      e.preventDefault();
      const btn = contactForm.querySelector('[type="submit"]');
      if (!btn) return;

      const original = btn.textContent;
      btn.textContent = 'Enviado ✓';
      btn.style.background = '#3a3632';

      setTimeout(() => {
        btn.textContent = original;
        btn.style.background = '';
        contactForm.reset();
      }, 2500);
    });
  }

  // ============================================================
  // FORMULARIOS DE NEWSLETTER
  // ============================================================
  const newsletterForms = document.querySelectorAll('.newsletter-form');

  newsletterForms.forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const btn = form.querySelector('[type="submit"]');

      if (btn) {
        const original = btn.textContent;
        btn.textContent = '¡Registrada!';

        setTimeout(() => {
          btn.textContent = original;
          form.reset();
        }, 2500);
      }
    });
  });

  // ============================================================
  // DESPLAZAMIENTO SUAVE PARA ENLACES INTERNOS
  // ============================================================
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href');
      if (!href || href === '#') return;

      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ============================================================
  // INIT
  // ============================================================
  bindFavoriteButtons();
  document.body.classList.add('page-fade-in');
});