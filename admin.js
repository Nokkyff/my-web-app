// =============================================
//  vpsgiare — Admin Panel (VPS & Game Services)
// =============================================

(function () {
  "use strict";

  // ---- STORAGE KEYS --------------------------
  const KEYS = {
    password: "vpsgiare_admin_password",
    accounts: "vpsgiare_accounts",
    prices: "vpsgiare_prices",
    inventory: "vpsgiare_inventory",
    settings: "vpsgiare_settings",
    loggedIn: "vpsgiare_admin_session",
    products: "vpsgiare_products",
    theme: "vpsgiare_theme",
    deposits: "vpsgiare_deposits",
  };

  const DEFAULT_PASSWORD = "admin";

  // ---- DEFAULT CATALOG CLEARED — Admin posts products manually ----
  const DEFAULT_CATALOG = [];

  // ---- HELPERS --------------------------------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function load(key, fallback) {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : fallback;
    } catch { return fallback; }
  }

  function save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  function formatVND(amount) {
    return (Math.round(amount) || 0).toLocaleString("vi-VN") + " ₫";
  }

  function toast(msg) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // ---- THEME MANAGEMENT -----------------------
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(KEYS.theme, theme);

    const btn = $("#btn-theme-toggle");
    if (btn) btn.textContent = theme === "light" ? "🌙" : "☀️";

    const sel = $("#setting-theme-select");
    if (sel) sel.value = theme;
  }

  const currentTheme = localStorage.getItem(KEYS.theme) || "dark";
  applyTheme(currentTheme);

  const themeToggleBtn = $("#btn-theme-toggle");
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const active = document.documentElement.getAttribute("data-theme") || "dark";
      const next = active === "light" ? "dark" : "light";
      applyTheme(next);
      toast(`🎨 Đã chuyển sang giao diện ${next === "light" ? "Sáng (Light)" : "Tối (Dark)"}`);
    });
  }

  const saveThemeBtn = $("#btn-save-theme");
  if (saveThemeBtn) {
    saveThemeBtn.addEventListener("click", () => {
      const sel = $("#setting-theme-select");
      if (sel) {
        applyTheme(sel.value);
        toast(`✅ Đã lưu giao diện ${sel.value === "light" ? "Sáng" : "Tối"}!`);
      }
    });
  }

  // ---- STATE ----------------------------------
  let accounts = load(KEYS.accounts, [
    { id: "acc_001", username: "admin",     email: "admin@vpsgiare098.com", password: "admin",    role: "admin",    balance: 50000000, status: "active"    },
    { id: "acc_002", username: "staff_duy", email: "duy@vpsgiare098.com",   password: "staff123", role: "staff",    balance: 10000000, status: "active"    },
    { id: "acc_003", username: "gamer_pro", email: "gamer99@gmail.com",     password: "pass123",  role: "customer", balance: 1200000,  status: "active"    },
    { id: "acc_004", username: "mmo_farmer",email: "mmo@gmail.com",         password: "pass456",  role: "customer", balance: 500000,   status: "suspended" },
  ]);

  let products = load(KEYS.products, []);

  // Combine default catalog + custom products
  function getAllCatalogItems() {
    const list = [...DEFAULT_CATALOG];
    products.forEach(p => {
      if (!list.some(x => x.id === p.id)) {
        list.push({
          id: p.id,
          name: p.name,
          category: p.category || "VPS Cloud",
          cost: p.cost,
          suggested: p.suggested || p.sell,
          emoji: p.emoji || "⚡",
          image: p.image || null,
          desc: p.desc || "",
          published: p.published !== false,
          isCustom: true,
        });
      }
    });
    return list;
  }

  let prices = load(KEYS.prices, {});
  // Initialize default prices in VND if missing
  DEFAULT_CATALOG.forEach(item => {
    if (!prices[item.id]) {
      prices[item.id] = item.suggested;
    }
  });

  let inventory = load(KEYS.inventory, {});
  DEFAULT_CATALOG.forEach(item => {
    if (inventory[item.id] === undefined) {
      inventory[item.id] = 10;
    }
  });

  let editingAccountId = null;
  let currentProductImage = null; // Base64 data URL

  // ---- LOGIN SESSION --------------------------
  function checkSession() {
    return sessionStorage.getItem(KEYS.loggedIn) === "true";
  }

  if (checkSession()) {
    showDashboard();
  }

  $("#btn-login").addEventListener("click", doLogin);
  $("#login-password").addEventListener("keydown", (e) => {
    if (e.key === "Enter") doLogin();
  });

  function doLogin() {
    const pwd = $("#login-password").value;
    const storedPwd = load(KEYS.password, DEFAULT_PASSWORD);
    if (pwd === storedPwd) {
      sessionStorage.setItem(KEYS.loggedIn, "true");
      showDashboard();
    } else {
      $("#login-error").classList.remove("hidden");
      $("#login-password").value = "";
      $("#login-password").focus();
    }
  }

  function showDashboard() {
    $("#login-screen").style.display = "none";
    $("#admin-dashboard").classList.remove("hidden");
    renderAccounts();
    renderProducts();
    renderPricing();
    renderInventory();
    renderDeposits();
  }

  $("#btn-logout").addEventListener("click", () => {
    sessionStorage.removeItem(KEYS.loggedIn);
    location.reload();
  });

  // ---- TABS -----------------------------------
  $$(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      $$(".tab").forEach(t => t.classList.remove("active"));
      $$(".tab-content").forEach(tc => tc.classList.remove("active"));
      tab.classList.add("active");
      const target = tab.dataset.tab;
      $(`#tab-${target}`).classList.add("active");

      if (target === "accounts") renderAccounts();
      if (target === "products") renderProducts();
      if (target === "pricing") renderPricing();
      if (target === "inventory") renderInventory();
      if (target === "deposits") renderDeposits();
    });
  });

  // =============================================
  //  IMAGE UPLOAD & PASTE HANDLER (Ctrl+V)
  // =============================================
  const imageDropZone = $("#product-image-drop");
  const imageFileInput = $("#product-image-file");
  const previewImg = $("#preview-img");
  const imagePlaceholder = $("#image-placeholder");
  const btnClearImage = $("#btn-clear-image");

  function processImageFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      toast("❌ Vui lòng chọn tệp hình ảnh hợp lệ!");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 480;
        const MAX_HEIGHT = 480;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        currentProductImage = dataUrl;

        previewImg.src = dataUrl;
        previewImg.classList.remove("hidden");
        imagePlaceholder.classList.add("hidden");
        btnClearImage.classList.remove("hidden");
        imageDropZone.querySelector(".image-preview-area").classList.add("has-image");
        toast("📷 Đã nhận hình ảnh thành công!");
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Click to upload
  if (imageDropZone) {
    imageDropZone.addEventListener("click", (e) => {
      if (e.target === btnClearImage) return;
      imageFileInput.click();
    });
  }

  if (imageFileInput) {
    imageFileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        processImageFile(e.target.files[0]);
      }
    });
  }

  // Drag and Drop
  if (imageDropZone) {
    const previewArea = imageDropZone.querySelector(".image-preview-area");
    previewArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      previewArea.classList.add("drag-over");
    });
    previewArea.addEventListener("dragleave", () => {
      previewArea.classList.remove("drag-over");
    });
    previewArea.addEventListener("drop", (e) => {
      e.preventDefault();
      previewArea.classList.remove("drag-over");
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processImageFile(e.dataTransfer.files[0]);
      }
    });
  }

  // Clear image button
  if (btnClearImage) {
    btnClearImage.addEventListener("click", (e) => {
      e.stopPropagation();
      resetImageUpload();
    });
  }

  function resetImageUpload() {
    currentProductImage = null;
    previewImg.src = "";
    previewImg.classList.add("hidden");
    imagePlaceholder.classList.remove("hidden");
    btnClearImage.classList.add("hidden");
    imageFileInput.value = "";
    const previewArea = imageDropZone.querySelector(".image-preview-area");
    if (previewArea) previewArea.classList.remove("has-image");
  }

  // GLOBAL PASTE (Ctrl+V) HANDLER
  window.addEventListener("paste", (e) => {
    const productsTab = $("#tab-products");
    if (!productsTab || !productsTab.classList.contains("active")) return;

    if (e.clipboardData && e.clipboardData.items) {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          processImageFile(blob);
          e.preventDefault();
          break;
        }
      }
    }
  });

  // =============================================
  //  POST PRODUCTS & PUBLISH TO STOREFRONT
  // =============================================
  const btnPostProduct = $("#btn-post-product");
  if (btnPostProduct) {
    btnPostProduct.addEventListener("click", () => {
      const name = $("#prod-name").value.trim();
      const category = $("#prod-category").value.trim() || "VPS Cloud";
      const cost = parseFloat($("#prod-cost").value) || 0;
      const sell = parseFloat($("#prod-sell").value) || 0;
      const desc = $("#prod-desc").value.trim();
      const stock = parseInt($("#prod-stock").value) || 10;
      const publishCheckbox = $("#prod-publish");
      const isPublished = publishCheckbox ? publishCheckbox.checked : true;

      if (!name) {
        toast("❌ Vui lòng nhập tên sản phẩm / dịch vụ!");
        $("#prod-name").focus();
        return;
      }
      if (cost <= 0) {
        toast("❌ Giá vốn phải lớn hơn 0 ₫!");
        $("#prod-cost").focus();
        return;
      }
      if (sell <= 0) {
        toast("❌ Giá bán phải lớn hơn 0 ₫!");
        $("#prod-sell").focus();
        return;
      }

      const newId = "vps_" + generateId();
      const newProduct = {
        id: newId,
        name: name,
        category: category,
        cost: cost,
        suggested: sell,
        sell: sell,
        stock: stock,
        desc: desc || "Dịch vụ VPS / Game chất lượng cao từ vpsgiare098.com",
        image: currentProductImage,
        emoji: category.toLowerCase().includes("game") ? "🎮" : "⚡",
        published: isPublished,
        createdAt: new Date().toISOString(),
      };

      products.unshift(newProduct);
      save(KEYS.products, products);

      prices[newId] = sell;
      save(KEYS.prices, prices);

      inventory[newId] = stock;
      save(KEYS.inventory, inventory);

      toast(`✅ Đã đăng & ${isPublished ? "xuất bản lên cửa hàng" : "lưu nháp"}: "${name}"!`);

      // Reset form
      $("#prod-name").value = "";
      $("#prod-cost").value = "";
      $("#prod-sell").value = "";
      $("#prod-desc").value = "";
      $("#prod-stock").value = "20";
      resetImageUpload();

      renderProducts();
      renderPricing();
      renderInventory();
    });
  }

  function renderProducts() {
    const grid = $("#posted-products-grid");
    const countEl = $("#posted-count");
    if (!grid) return;

    grid.innerHTML = "";
    if (countEl) countEl.textContent = products.length;

    const searchTerm = ($("#product-search") ? $("#product-search").value.trim().toLowerCase() : "");

    const filtered = products.filter(p => {
      if (!searchTerm) return true;
      return p.name.toLowerCase().includes(searchTerm) || (p.category && p.category.toLowerCase().includes(searchTerm));
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="posted-empty">
          <p>Chưa có sản phẩm nào được đăng hoặc không khớp tìm kiếm.</p>
          <p style="font-size:0.85rem;margin-top:6px;">Điền thông tin và dán ảnh (Ctrl+V) ở trên để đăng sản phẩm lên shop!</p>
        </div>
      `;
      return;
    }

    filtered.forEach(p => {
      const card = document.createElement("div");
      card.className = "posted-product-card";

      const imgHtml = p.image
        ? `<img src="${p.image}" class="posted-product-img" alt="${p.name}">`
        : `<div class="posted-product-img no-img">${p.emoji || "⚡"}</div>`;

      const margin = p.cost > 0 ? (((p.sell - p.cost) / p.cost) * 100).toFixed(1) : 0;
      const statusBadge = p.published !== false
        ? `<span class="status-badge status-active" title="Đang hiển thị trên storefront">🚀 Đã xuất bản</span>`
        : `<span class="status-badge status-suspended" title="Đang ẩn khỏi storefront">⏸️ Tạm ẩn</span>`;

      card.innerHTML = `
        ${imgHtml}
        <div class="posted-product-body">
          <div class="posted-product-cat">${p.category || "VPS Cloud"} · ${statusBadge}</div>
          <div class="posted-product-name" id="name-container-${p.id}">
            <span class="product-title-text" id="title-text-${p.id}">${p.name}</span>
            <button class="btn-icon btn-small btn-rename-toggle" data-id="${p.id}" title="Đổi tên sản phẩm">✏️</button>
          </div>
          <div class="posted-product-desc">${p.desc || ""}</div>
          <div class="posted-product-prices">
            <span class="cost-label">Vốn: ${formatVND(p.cost)}</span>
            <span class="sell-label">Bán: ${formatVND(p.sell)}</span>
          </div>
          <div class="posted-product-stock">Kho: <strong>${inventory[p.id] !== undefined ? inventory[p.id] : p.stock}</strong> máy chủ · Lợi nhuận: <strong>+${margin}%</strong></div>
          <div class="posted-product-actions">
            <button class="btn-secondary btn-small btn-toggle-publish" data-id="${p.id}">
              ${p.published !== false ? "⏸️ Ẩn khỏi Shop" : "🚀 Hiện lên Shop"}
            </button>
            <button class="btn-secondary btn-small btn-delete-product" data-id="${p.id}" style="color:var(--red);border-color:var(--red);">
              🗑️ Xóa
            </button>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });

    // Rename button handler
    grid.querySelectorAll(".btn-rename-toggle").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        startInlineRename(id);
      });
    });

    // Toggle publish button handler
    grid.querySelectorAll(".btn-toggle-publish").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const prod = products.find(x => x.id === id);
        if (prod) {
          prod.published = prod.published === false ? true : false;
          save(KEYS.products, products);
          toast(prod.published ? `🚀 Đã xuất bản "${prod.name}" lên cửa hàng!` : `⏸️ Đã ẩn "${prod.name}" khỏi cửa hàng!`);
          renderProducts();
        }
      });
    });

    // Delete product handler
    grid.querySelectorAll(".btn-delete-product").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const prod = products.find(x => x.id === id);
        if (!prod) return;
        if (!confirm(`Bạn có chắc muốn xóa dịch vụ "${prod.name}"?`)) return;

        products = products.filter(x => x.id !== id);
        save(KEYS.products, products);
        delete prices[id];
        save(KEYS.prices, prices);
        delete inventory[id];
        save(KEYS.inventory, inventory);

        toast(`🗑️ Đã xóa sản phẩm "${prod.name}"`);
        renderProducts();
        renderPricing();
        renderInventory();
      });
    });
  }

  // Inline Rename Logic
  function startInlineRename(productId) {
    const container = $(`#name-container-${productId}`);
    const prod = products.find(p => p.id === productId);
    if (!container || !prod) return;

    container.innerHTML = `
      <input type="text" class="rename-input" id="rename-input-${productId}" value="${prod.name}" style="flex:1;padding:4px 8px;font-size:0.95rem;font-weight:bold;border:1px solid var(--accent);border-radius:6px;background:var(--bg);color:var(--text);">
      <button class="btn-primary btn-small btn-save-rename" data-id="${productId}" style="padding:4px 8px;">Lưu</button>
      <button class="btn-secondary btn-small btn-cancel-rename" data-id="${productId}" style="padding:4px 8px;">✕</button>
    `;

    const input = $(`#rename-input-${productId}`);
    input.focus();
    input.select();

    const saveRename = () => {
      const newName = input.value.trim();
      if (!newName) {
        toast("❌ Tên sản phẩm không được để trống!");
        return;
      }
      prod.name = newName;
      save(KEYS.products, products);
      toast(`✅ Đã đổi tên thành: "${newName}"`);
      renderProducts();
      renderPricing();
      renderInventory();
    };

    container.querySelector(".btn-save-rename").addEventListener("click", saveRename);
    container.querySelector(".btn-cancel-rename").addEventListener("click", () => renderProducts());
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") saveRename();
      if (e.key === "Escape") renderProducts();
    });
  }

  const productSearchInput = $("#product-search");
  if (productSearchInput) {
    productSearchInput.addEventListener("input", () => {
      renderProducts();
    });
  }

  // =============================================
  //  PRICING TAB (VND ₫)
  // =============================================
  function renderPricing() {
    const tbody = $("#pricing-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const catalog = getAllCatalogItems();

    catalog.forEach(item => {
      const currentPrice = prices[item.id] || item.suggested;
      const margin = item.cost > 0 ? (((currentPrice - item.cost) / item.cost) * 100).toFixed(1) : 0;
      const marginClass = margin >= 0 ? "margin-positive" : "margin-negative";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.image ? `<img src="${item.image}" style="width:28px;height:28px;object-fit:cover;border-radius:4px;vertical-align:middle;margin-right:6px;">` : item.emoji + " "}<strong>${item.name}</strong></td>
        <td>${item.category}</td>
        <td>${formatVND(item.cost)}</td>
        <td>${formatVND(currentPrice)}</td>
        <td><input type="number" class="price-input" data-item="${item.id}" value="${Math.round(currentPrice)}" min="1000" step="1000" style="width:130px;"></td>
        <td class="${marginClass}">${margin}%</td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".price-input").forEach(input => {
      input.addEventListener("input", () => {
        const itemId = input.dataset.item;
        const catalog = getAllCatalogItems();
        const item = catalog.find(i => i.id === itemId);
        if (!item) return;

        const newPrice = parseFloat(input.value) || 0;
        const margin = item.cost > 0 ? (((newPrice - item.cost) / item.cost) * 100).toFixed(1) : 0;
        const td = input.closest("tr").querySelector("td:last-child");
        td.textContent = `${margin}%`;
        td.className = margin >= 0 ? "margin-positive" : "margin-negative";
      });
    });
  }

  const btnSavePrices = $("#btn-save-prices");
  if (btnSavePrices) {
    btnSavePrices.addEventListener("click", () => {
      $$(".price-input").forEach(input => {
        const val = parseFloat(input.value);
        if (!isNaN(val) && val > 0) {
          const itemId = input.dataset.item;
          prices[itemId] = val;

          const prod = products.find(p => p.id === itemId);
          if (prod) {
            prod.sell = val;
            prod.suggested = val;
          }
        }
      });
      save(KEYS.prices, prices);
      save(KEYS.products, products);
      renderPricing();
      renderProducts();
      toast("✅ Đã lưu bảng giá mới thành công!");
    });
  }

  const btnResetPrices = $("#btn-reset-prices");
  if (btnResetPrices) {
    btnResetPrices.addEventListener("click", () => {
      if (!confirm("Đặt lại toàn bộ giá bán về mức gợi ý ban đầu?")) return;
      const catalog = getAllCatalogItems();
      catalog.forEach(item => {
        prices[item.id] = item.suggested;
      });
      save(KEYS.prices, prices);
      renderPricing();
      toast("🔄 Đã khôi phục giá gợi ý ban đầu.");
    });
  }

  const btnApplyMarkup = $("#btn-apply-markup");
  if (btnApplyMarkup) {
    btnApplyMarkup.addEventListener("click", () => {
      const markup = parseFloat($("#bulk-markup").value) || 0;
      const catalog = getAllCatalogItems();
      catalog.forEach(item => {
        prices[item.id] = Math.round(item.cost * (1 + markup / 100));
      });
      save(KEYS.prices, prices);
      renderPricing();
      toast(`✅ Đã áp dụng biên độ lãi ${markup}% cho toàn bộ dịch vụ.`);
    });
  }

  // =============================================
  //  INVENTORY TAB
  // =============================================
  function renderInventory() {
    const tbody = $("#inventory-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const catalog = getAllCatalogItems();

    catalog.forEach(item => {
      const stock = inventory[item.id] !== undefined ? inventory[item.id] : 10;
      const price = prices[item.id] || item.suggested;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.image ? `<img src="${item.image}" style="width:28px;height:28px;object-fit:cover;border-radius:4px;vertical-align:middle;margin-right:6px;">` : item.emoji + " "}<strong>${item.name}</strong></td>
        <td><strong>${stock}</strong> máy chủ</td>
        <td><input type="number" class="inv-qty-input" data-item="${item.id}" value="${stock}" min="0" step="1" style="width:90px;"></td>
        <td>${formatVND(price)}</td>
        <td>
          <div class="table-actions">
            <button class="btn-icon btn-add-stock" data-item="${item.id}" title="Thêm +10 slot">➕</button>
            <button class="btn-icon btn-delete btn-clear-stock" data-item="${item.id}" title="Xóa hết kho">🗑️</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".btn-add-stock").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.item;
        inventory[id] = (inventory[id] || 0) + 10;
        save(KEYS.inventory, inventory);
        renderInventory();
        const catalog = getAllCatalogItems();
        const item = catalog.find(i => i.id === id);
        toast(`➕ Đã nhập thêm 10 slot cho ${item ? item.name : "dịch vụ"}`);
      });
    });

    tbody.querySelectorAll(".btn-clear-stock").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.item;
        inventory[id] = 0;
        save(KEYS.inventory, inventory);
        renderInventory();
      });
    });
  }

  const btnSaveInventory = $("#btn-save-inventory");
  if (btnSaveInventory) {
    btnSaveInventory.addEventListener("click", () => {
      $$(".inv-qty-input").forEach(input => {
        const val = parseInt(input.value);
        if (!isNaN(val) && val >= 0) {
          inventory[input.dataset.item] = val;
        }
      });
      save(KEYS.inventory, inventory);
      renderInventory();
      toast("✅ Đã cập nhật số lượng kho máy chủ!");
    });
  }

  // =============================================
  //  ACCOUNTS TAB
  // =============================================
  function renderAccounts() {
    const tbody = $("#accounts-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    accounts.forEach(acc => {
      const tr = document.createElement("tr");
      if (acc.status === "suspended") tr.className = "row-suspended";
      if (acc.status === "banned") tr.className = "row-banned";

      tr.innerHTML = `
        <td><code>${acc.id}</code></td>
        <td><strong>${acc.username}</strong></td>
        <td>${acc.email}</td>
        <td><span class="role-badge role-${acc.role}">${acc.role}</span></td>
        <td>${formatVND(acc.balance)}</td>
        <td><span class="status-badge status-${acc.status}">${acc.status}</span></td>
        <td>
          <div class="table-actions">
            <button class="btn-icon btn-edit" data-id="${acc.id}" title="Chỉnh sửa">✏️</button>
            <button class="btn-icon btn-delete" data-id="${acc.id}" title="Xóa">🗑️</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".btn-edit").forEach(btn => {
      btn.addEventListener("click", () => openAccountModal(btn.dataset.id));
    });

    tbody.querySelectorAll(".btn-delete").forEach(btn => {
      btn.addEventListener("click", () => deleteAccount(btn.dataset.id));
    });
  }

  const btnAddAccount = $("#btn-add-account");
  if (btnAddAccount) {
    btnAddAccount.addEventListener("click", () => openAccountModal(null));
  }

  function openAccountModal(accId) {
    editingAccountId = accId;
    const modal = $("#account-modal");

    if (accId) {
      const acc = accounts.find(a => a.id === accId);
      $("#account-modal-title").textContent = "✏️ Chỉnh Sửa Tài Khoản";
      $("#acc-username").value = acc.username;
      $("#acc-email").value = acc.email;
      $("#acc-password").value = acc.password;
      $("#acc-role").value = acc.role;
      $("#acc-balance").value = acc.balance;
      $("#acc-status").value = acc.status;
    } else {
      $("#account-modal-title").textContent = "➕ Thêm Tài Khoản Mới";
      $("#acc-username").value = "";
      $("#acc-email").value = "";
      $("#acc-password").value = "";
      $("#acc-role").value = "customer";
      $("#acc-balance").value = "500000";
      $("#acc-status").value = "active";
    }

    modal.classList.remove("hidden");
    $("#acc-username").focus();
  }

  const btnSaveAccount = $("#btn-save-account");
  if (btnSaveAccount) {
    btnSaveAccount.addEventListener("click", () => {
      const username = $("#acc-username").value.trim();
      const email = $("#acc-email").value.trim();
      const password = $("#acc-password").value;
      const role = $("#acc-role").value;
      const balance = parseFloat($("#acc-balance").value) || 0;
      const status = $("#acc-status").value;

      if (!username) { toast("❌ Vui lòng nhập Username!"); return; }
      if (!email) { toast("❌ Vui lòng nhập Email!"); return; }
      if (!password) { toast("❌ Vui lòng nhập Mật khẩu!"); return; }

      if (editingAccountId) {
        const acc = accounts.find(a => a.id === editingAccountId);
        acc.username = username;
        acc.email = email;
        acc.password = password;
        acc.role = role;
        acc.balance = balance;
        acc.status = status;
        toast(`✅ Đã cập nhật tài khoản "${username}"!`);
      } else {
        if (accounts.some(a => a.username.toLowerCase() === username.toLowerCase())) {
          toast("❌ Username đã tồn tại!"); return;
        }
        accounts.push({
          id: "acc_" + generateId(),
          username, email, password, role, balance, status
        });
        toast(`✅ Đã tạo tài khoản "${username}"!`);
      }

      save(KEYS.accounts, accounts);
      renderAccounts();
      $("#account-modal").classList.add("hidden");
    });
  }

  const btnCancelAccount = $("#btn-cancel-account");
  if (btnCancelAccount) {
    btnCancelAccount.addEventListener("click", () => {
      $("#account-modal").classList.add("hidden");
    });
  }

  function deleteAccount(accId) {
    const acc = accounts.find(a => a.id === accId);
    if (!acc) return;
    if (!confirm(`Xóa tài khoản "${acc.username}"?`)) return;
    accounts = accounts.filter(a => a.id !== accId);
    save(KEYS.accounts, accounts);
    renderAccounts();
    toast(`🗑️ Đã xóa tài khoản "${acc.username}".`);
  }

  // =============================================
  //  DEPOSITS TAB — Approve / Reject Customer Deposits
  // =============================================
  function renderDeposits() {
    const tbody = $("#deposits-tbody");
    const emptyEl = $("#deposits-empty");
    const statsEl = $("#deposits-stats");
    if (!tbody) return;

    let deposits = load(KEYS.deposits, []);
    const filterSelect = $("#deposit-filter");
    const filterVal = filterSelect ? filterSelect.value : "all";

    // Stats
    const pendingCount = deposits.filter(d => d.status === "pending").length;
    const approvedTotal = deposits.filter(d => d.status === "approved").reduce((s, d) => s + d.amount, 0);
    if (statsEl) {
      statsEl.textContent = `⏳ Chờ duyệt: ${pendingCount} · ✅ Đã duyệt tổng: ${formatVND(approvedTotal)}`;
    }

    // Filter
    const filtered = filterVal === "all"
      ? deposits
      : deposits.filter(d => d.status === filterVal);

    tbody.innerHTML = "";

    if (filtered.length === 0) {
      if (emptyEl) {
        emptyEl.style.display = "block";
        emptyEl.querySelector("p").textContent = deposits.length === 0
          ? "Chưa có yêu cầu nạp tiền nào."
          : `Không có yêu cầu nào ở trạng thái "${filterVal}".`;
      }
      return;
    }
    if (emptyEl) emptyEl.style.display = "none";

    // Sort: pending first, then by date descending
    const sorted = [...filtered].sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;
      return new Date(b.date) - new Date(a.date);
    });

    sorted.forEach(dep => {
      const tr = document.createElement("tr");
      const dateStr = new Date(dep.date).toLocaleString("vi-VN");

      let statusHtml = "";
      let actionsHtml = "";

      if (dep.status === "pending") {
        statusHtml = `<span class="status-badge status-suspended">⏳ Đang chờ</span>`;
        actionsHtml = `
          <button class="btn-primary btn-small btn-approve-deposit" data-id="${dep.id}" style="font-size:0.75rem;padding:4px 10px;">✅ Duyệt</button>
          <button class="btn-secondary btn-small btn-reject-deposit" data-id="${dep.id}" style="font-size:0.75rem;padding:4px 10px;color:var(--red);border-color:var(--red);">❌ Từ chối</button>
        `;
      } else if (dep.status === "approved") {
        statusHtml = `<span class="status-badge status-active">✅ Đã duyệt</span>`;
        actionsHtml = `<span style="font-size:0.75rem;color:var(--text-dim);">—</span>`;
      } else {
        statusHtml = `<span class="status-badge status-banned">❌ Từ chối</span>`;
        actionsHtml = `<span style="font-size:0.75rem;color:var(--text-dim);">—</span>`;
      }

      tr.innerHTML = `
        <td style="font-size:0.75rem;color:var(--text-dim);">${dep.id}</td>
        <td><strong>${dep.username}</strong></td>
        <td style="font-weight:700;color:var(--gold);">${formatVND(dep.amount)}</td>
        <td style="font-size:0.85rem;">${dep.note || "—"}</td>
        <td style="font-size:0.8rem;">${dateStr}</td>
        <td>${statusHtml}</td>
        <td style="display:flex;gap:4px;">${actionsHtml}</td>
      `;
      tbody.appendChild(tr);
    });

    // Approve handlers
    tbody.querySelectorAll(".btn-approve-deposit").forEach(btn => {
      btn.addEventListener("click", () => approveDeposit(btn.dataset.id));
    });

    // Reject handlers
    tbody.querySelectorAll(".btn-reject-deposit").forEach(btn => {
      btn.addEventListener("click", () => rejectDeposit(btn.dataset.id));
    });
  }

  function approveDeposit(depositId) {
    let deposits = load(KEYS.deposits, []);
    const dep = deposits.find(d => d.id === depositId);
    if (!dep || dep.status !== "pending") {
      toast("❌ Yêu cầu không hợp lệ hoặc đã được xử lý!");
      return;
    }

    if (!confirm(`Duyệt nạp ${formatVND(dep.amount)} cho tài khoản "${dep.username}"?`)) return;

    // Update deposit status
    dep.status = "approved";
    dep.approvedAt = new Date().toISOString();
    save(KEYS.deposits, deposits);

    // Add funds to user's account balance
    const acc = accounts.find(a => a.id === dep.userId);
    if (acc) {
      acc.balance = (acc.balance || 0) + dep.amount;
      save(KEYS.accounts, accounts);
      toast(`✅ Đã duyệt nạp ${formatVND(dep.amount)} cho "${dep.username}". Số dư mới: ${formatVND(acc.balance)}`);
    } else {
      toast(`⚠️ Đã duyệt nhưng không tìm thấy tài khoản userId: ${dep.userId}. Vui lòng kiểm tra!`);
    }

    renderDeposits();
    renderAccounts();
  }

  function rejectDeposit(depositId) {
    let deposits = load(KEYS.deposits, []);
    const dep = deposits.find(d => d.id === depositId);
    if (!dep || dep.status !== "pending") {
      toast("❌ Yêu cầu không hợp lệ hoặc đã được xử lý!");
      return;
    }

    if (!confirm(`Từ chối yêu cầu nạp ${formatVND(dep.amount)} của "${dep.username}"?`)) return;

    dep.status = "rejected";
    dep.rejectedAt = new Date().toISOString();
    save(KEYS.deposits, deposits);

    toast(`❌ Đã từ chối yêu cầu nạp ${formatVND(dep.amount)} của "${dep.username}".`);
    renderDeposits();
  }

  // Deposit filter listener
  const depositFilter = $("#deposit-filter");
  if (depositFilter) {
    depositFilter.addEventListener("change", () => renderDeposits());
  }

  // Refresh deposits button
  const btnRefreshDeposits = $("#btn-refresh-deposits");
  if (btnRefreshDeposits) {
    btnRefreshDeposits.addEventListener("click", () => {
      renderDeposits();
      toast("🔄 Đã cập nhật danh sách nạp tiền!");
    });
  }

  // =============================================
  //  SETTINGS TAB
  // =============================================
  const btnChangePassword = $("#btn-change-password");
  if (btnChangePassword) {
    btnChangePassword.addEventListener("click", () => {
      const newPwd = $("#new-password").value;
      const confirmPwd = $("#confirm-password").value;
      if (!newPwd) { toast("❌ Vui lòng nhập mật khẩu mới!"); return; }
      if (newPwd !== confirmPwd) { toast("❌ Mật khẩu xác nhận không khớp!"); return; }
      save(KEYS.password, newPwd);
      $("#new-password").value = "";
      $("#confirm-password").value = "";
      toast("✅ Đã cập nhật mật khẩu quản trị!");
    });
  }

  const btnSaveSettings = $("#btn-save-settings");
  if (btnSaveSettings) {
    btnSaveSettings.addEventListener("click", () => {
      const shopName = $("#setting-shop-name").value.trim();
      const shopUrl = $("#setting-shop-url").value.trim();
      save(KEYS.settings, { shopName, shopUrl });
      toast("✅ Đã lưu thông tin cửa hàng!");
    });
  }

  // Export Data
  const btnExportData = $("#btn-export-data");
  if (btnExportData) {
    btnExportData.addEventListener("click", () => {
      const data = {
        accounts,
        prices,
        inventory,
        products,
        deposits: load(KEYS.deposits, []),
        settings: load(KEYS.settings, {}),
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vpsgiare_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast("📤 Đã xuất file sao lưu dữ liệu!");
    });
  }

  // Import Data
  const btnImportData = $("#btn-import-data");
  const importFileInput = $("#import-file");
  if (btnImportData && importFileInput) {
    btnImportData.addEventListener("click", () => {
      importFileInput.click();
    });

    importFileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (data.accounts) { accounts = data.accounts; save(KEYS.accounts, accounts); }
          if (data.prices) { prices = data.prices; save(KEYS.prices, prices); }
          if (data.inventory) { inventory = data.inventory; save(KEYS.inventory, inventory); }
          if (data.products) { products = data.products; save(KEYS.products, products); }
          if (data.settings) { save(KEYS.settings, data.settings); }
          if (data.deposits) { save(KEYS.deposits, data.deposits); }
          renderAccounts();
          renderProducts();
          renderPricing();
          renderInventory();
          renderDeposits();
          toast("📥 Đã nhập dữ liệu thành công!");
        } catch {
          toast("❌ Tệp sao lưu không hợp lệ!");
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    });
  }

  // Reset All Data
  const btnResetAll = $("#btn-reset-all");
  if (btnResetAll) {
    btnResetAll.addEventListener("click", () => {
      if (!confirm("⚠️ Thao tác này sẽ xóa toàn bộ dữ liệu (tài khoản, sản phẩm đã đăng, giá, kho). Bạn có chắc chắn?")) return;
      if (!confirm("Hành động này KHÔNG THỂ hoàn tác. Bạn thực sự muốn đặt lại tất cả?")) return;
      Object.values(KEYS).forEach(k => localStorage.removeItem(k));
      sessionStorage.clear();
      location.reload();
    });
  }

})();
