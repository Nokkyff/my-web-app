// =============================================
//  vpsgiare — Customer Storefront (Read-Only)
//  - Only shows admin-posted products
//  - New accounts start at 0 VND
//  - Deposit requests → admin approval
//  - Purchase history tracking
// =============================================

(function () {
  "use strict";

  const KEYS = {
    theme: "vpsgiare_theme",
    products: "vpsgiare_products",
    prices: "vpsgiare_prices",
    inventory: "vpsgiare_inventory",
    accounts: "vpsgiare_accounts",
    customerSession: "vpsgiare_customer_session",
    orders: "vpsgiare_orders",
    deposits: "vpsgiare_deposits",
  };

  // ---- NO DEFAULT CATALOG — only admin-posted products shown ----

  // ---- Helpers --------------------------------
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  function load(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  }
  function save(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

  function formatVND(n) {
    return (Math.round(n) || 0).toLocaleString("vi-VN") + " ₫";
  }

  function toast(msg, isSuccess) {
    const el = document.createElement("div");
    el.className = "toast" + (isSuccess ? " toast-success" : "");
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }

  // ---- Theme ----------------------------------
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(KEYS.theme, theme);
    $$(".theme-option").forEach(b => {
      b.classList.toggle("active", b.dataset.theme === theme);
    });
  }

  applyTheme(localStorage.getItem(KEYS.theme) || "dark");

  $$(".theme-option").forEach(btn => {
    btn.addEventListener("click", () => {
      applyTheme(btn.dataset.theme);
      toast(`🎨 Đã chuyển giao diện ${btn.dataset.theme === "light" ? "Sáng" : "Tối"}`, true);
    });
  });

  // ---- Settings Drawer ------------------------
  let backdrop = document.createElement("div");
  backdrop.className = "drawer-backdrop hidden";
  document.body.appendChild(backdrop);

  function openDrawer() {
    $("#settings-drawer").classList.remove("hidden");
    backdrop.classList.remove("hidden");
    updateDrawerAccountInfo();
  }
  function closeDrawer() {
    $("#settings-drawer").classList.add("hidden");
    backdrop.classList.add("hidden");
  }

  $("#btn-settings-gear").addEventListener("click", openDrawer);
  $("#btn-close-drawer").addEventListener("click", closeDrawer);
  backdrop.addEventListener("click", closeDrawer);

  function updateDrawerAccountInfo() {
    const session = getSession();
    const accSection = $("#drawer-account-section");
    const histSection = $("#drawer-history-section");
    if (session) {
      accSection.style.display = "block";
      histSection.style.display = "block";
      $("#drawer-account-info").textContent = `Đang đăng nhập: ${session.username} · Số dư: ${formatVND(session.balance)}`;
    } else {
      accSection.style.display = "none";
      histSection.style.display = "none";
    }
  }

  const btnDrawerLogout = $("#btn-drawer-logout");
  if (btnDrawerLogout) {
    btnDrawerLogout.addEventListener("click", () => {
      sessionStorage.removeItem(KEYS.customerSession);
      toast("🚪 Đã đăng xuất!", true);
      closeDrawer();
      renderUserArea();
    });
  }

  // ---- Auth: Session & Accounts ---------------
  function getSession() {
    try {
      const s = sessionStorage.getItem(KEYS.customerSession);
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  }
  function setSession(acc) {
    sessionStorage.setItem(KEYS.customerSession, JSON.stringify({
      id: acc.id,
      username: acc.username,
      email: acc.email || "",
      balance: acc.balance,
      role: acc.role || "customer",
    }));
  }
  function refreshSession() {
    const session = getSession();
    if (!session) return;
    const accounts = getAccounts();
    const acc = accounts.find(a => a.id === session.id);
    if (acc) {
      session.balance = acc.balance;
      setSession(acc);
    }
  }
  function getAccounts() { return load(KEYS.accounts, []); }

  function renderUserArea() {
    refreshSession();
    const area = $("#user-area");
    const session = getSession();
    if (session) {
      area.innerHTML = `
        <div class="user-pill">
          <span>👤 ${session.username}</span>
          <span class="user-balance">${formatVND(session.balance)}</span>
          <button class="btn-deposit-topbar" id="btn-deposit-topbar" title="Nạp tiền vào ví">💳 Nạp</button>
        </div>
      `;
      $("#btn-deposit-topbar").addEventListener("click", openDepositModal);
    } else {
      area.innerHTML = `<button class="btn-login-trigger" id="btn-open-auth">🔑 Đăng Nhập</button>`;
      $("#btn-open-auth").addEventListener("click", () => openAuthModal("login"));
    }
  }

  renderUserArea();

  // ---- Auth Modal Logic -----------------------
  function openAuthModal(tab) {
    $("#auth-modal").classList.remove("hidden");
    switchAuthTab(tab);
  }
  function closeAuthModal() {
    $("#auth-modal").classList.add("hidden");
    clearAuthErrors();
  }

  function switchAuthTab(tab) {
    $$(".auth-tab").forEach(t => t.classList.toggle("active", t.dataset.auth === tab));
    $$(".auth-form").forEach(f => f.classList.remove("active"));
    $(`#auth-${tab}`).classList.add("active");
    clearAuthErrors();
  }

  function clearAuthErrors() {
    $$("#login-error, #reg-error").forEach(e => { e.classList.add("hidden"); e.textContent = ""; });
  }

  $$(".auth-tab").forEach(t => {
    t.addEventListener("click", () => switchAuthTab(t.dataset.auth));
  });

  $("#btn-close-auth").addEventListener("click", closeAuthModal);
  $("#link-to-register").addEventListener("click", (e) => { e.preventDefault(); switchAuthTab("register"); });
  $("#link-to-login").addEventListener("click", (e) => { e.preventDefault(); switchAuthTab("login"); });

  // Login
  $("#btn-do-login").addEventListener("click", doLogin);
  $("#login-pass").addEventListener("keydown", (e) => { if (e.key === "Enter") doLogin(); });

  function doLogin() {
    const username = $("#login-user").value.trim();
    const password = $("#login-pass").value;
    const errEl = $("#login-error");

    if (!username || !password) {
      errEl.textContent = "❌ Vui lòng nhập tên đăng nhập và mật khẩu!";
      errEl.classList.remove("hidden");
      return;
    }

    const accounts = getAccounts();
    const acc = accounts.find(a =>
      a.username.toLowerCase() === username.toLowerCase() && a.password === password
    );

    if (!acc) {
      errEl.textContent = "❌ Sai tên đăng nhập hoặc mật khẩu!";
      errEl.classList.remove("hidden");
      return;
    }

    if (acc.status === "banned") {
      errEl.textContent = "🚫 Tài khoản đã bị khóa. Liên hệ hỗ trợ.";
      errEl.classList.remove("hidden");
      return;
    }
    if (acc.status === "suspended") {
      errEl.textContent = "⏸️ Tài khoản đang bị tạm khóa.";
      errEl.classList.remove("hidden");
      return;
    }

    setSession(acc);
    closeAuthModal();
    renderUserArea();
    toast(`👋 Chào mừng ${acc.username}!`, true);
    $("#login-user").value = "";
    $("#login-pass").value = "";
  }

  // Register — NEW ACCOUNTS START AT 0 VND
  $("#btn-do-register").addEventListener("click", doRegister);
  $("#reg-pass-confirm").addEventListener("keydown", (e) => { if (e.key === "Enter") doRegister(); });

  function doRegister() {
    const username = $("#reg-user").value.trim();
    const email = $("#reg-email").value.trim();
    const password = $("#reg-pass").value;
    const confirm = $("#reg-pass-confirm").value;
    const errEl = $("#reg-error");

    if (!username) {
      errEl.textContent = "❌ Vui lòng nhập tên đăng nhập!";
      errEl.classList.remove("hidden");
      return;
    }
    if (username.length < 3) {
      errEl.textContent = "❌ Tên đăng nhập tối thiểu 3 ký tự!";
      errEl.classList.remove("hidden");
      return;
    }
    if (!password || password.length < 4) {
      errEl.textContent = "❌ Mật khẩu tối thiểu 4 ký tự!";
      errEl.classList.remove("hidden");
      return;
    }
    if (password !== confirm) {
      errEl.textContent = "❌ Mật khẩu xác nhận không khớp!";
      errEl.classList.remove("hidden");
      return;
    }

    let accounts = getAccounts();
    if (accounts.some(a => a.username.toLowerCase() === username.toLowerCase())) {
      errEl.textContent = "❌ Tên đăng nhập đã được sử dụng!";
      errEl.classList.remove("hidden");
      return;
    }

    const newAcc = {
      id: "acc_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      username: username,
      email: email || "",
      password: password,
      role: "customer",
      balance: 0,       // *** 0 VND — must deposit and admin approves ***
      status: "active",
    };

    accounts.push(newAcc);
    save(KEYS.accounts, accounts);

    setSession(newAcc);
    closeAuthModal();
    renderUserArea();
    toast(`🎉 Chào mừng ${username}! Tài khoản đã tạo. Hãy nạp tiền để bắt đầu mua dịch vụ.`, true);

    $("#reg-user").value = "";
    $("#reg-email").value = "";
    $("#reg-pass").value = "";
    $("#reg-pass-confirm").value = "";
  }

  // ---- Deposit System -------------------------
  function openDepositModal() {
    const session = getSession();
    if (!session) {
      openAuthModal("login");
      toast("🔑 Vui lòng đăng nhập trước!");
      return;
    }
    $("#deposit-modal").classList.remove("hidden");
    $("#deposit-amount").value = "";
    $("#deposit-note").value = "";
    const errEl = $("#deposit-error");
    if (errEl) errEl.classList.add("hidden");
    $("#deposit-amount").focus();
  }

  $("#btn-close-deposit").addEventListener("click", () => {
    $("#deposit-modal").classList.add("hidden");
  });

  // Quick amount buttons
  $$(".deposit-quick").forEach(btn => {
    btn.addEventListener("click", () => {
      $("#deposit-amount").value = btn.dataset.amount;
    });
  });

  // Submit deposit request
  $("#btn-submit-deposit").addEventListener("click", () => {
    const session = getSession();
    if (!session) return;

    const amount = parseInt($("#deposit-amount").value);
    const note = ($("#deposit-note").value || "").trim();
    const errEl = $("#deposit-error");

    if (!amount || amount < 10000) {
      errEl.textContent = "❌ Số tiền nạp tối thiểu là 10.000 ₫!";
      errEl.classList.remove("hidden");
      return;
    }

    let deposits = load(KEYS.deposits, []);
    deposits.push({
      id: "dep_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      userId: session.id,
      username: session.username,
      amount: amount,
      note: note,
      status: "pending",   // pending → approved/rejected by admin
      date: new Date().toISOString(),
    });
    save(KEYS.deposits, deposits);

    $("#deposit-modal").classList.add("hidden");
    toast(`📤 Đã gửi yêu cầu nạp ${formatVND(amount)}. Vui lòng chờ Admin duyệt!`, true);
  });

  // ---- Product Catalog: ONLY admin-posted products ----
  function getStoreCatalog() {
    const prices = load(KEYS.prices, {});
    const inventory = load(KEYS.inventory, {});
    const customProducts = load(KEYS.products, []);

    const items = [];

    // ONLY admin-posted & published products — NO default catalog
    customProducts.forEach(p => {
      if (p.published === false) return;
      items.push({
        id: p.id,
        emoji: p.emoji || "⚡",
        name: p.name,
        category: p.category || "VPS Cloud",
        desc: p.desc || "",
        image: p.image || null,
        price: prices[p.id] || p.sell || p.suggested,
        stock: inventory[p.id] !== undefined ? inventory[p.id] : (p.stock || 0),
      });
    });

    return items;
  }

  // ---- Category Pills -------------------------
  function renderCategoryPills() {
    const container = $("#category-pills");
    const catalog = getStoreCatalog();
    const cats = [...new Set(catalog.map(i => i.category))];

    container.innerHTML = "";
    cats.forEach(cat => {
      const pill = document.createElement("button");
      pill.className = "cat-pill";
      pill.dataset.cat = cat;
      pill.textContent = cat;
      container.appendChild(pill);
    });

    $$(".cat-pill").forEach(p => {
      p.addEventListener("click", () => {
        $$(".cat-pill").forEach(x => x.classList.remove("active"));
        p.classList.add("active");
        renderProducts();
      });
    });
  }

  // ---- Render Products Grid -------------------
  function renderProducts() {
    const grid = $("#store-product-grid");
    const emptyMsg = $("#store-empty");
    const catalog = getStoreCatalog();

    const activeCat = document.querySelector(".cat-pill.active");
    const catFilter = activeCat ? activeCat.dataset.cat : "all";
    const searchTerm = ($("#store-search") ? $("#store-search").value.trim().toLowerCase() : "");

    const filtered = catalog.filter(item => {
      if (catFilter !== "all" && item.category !== catFilter) return false;
      if (searchTerm && !item.name.toLowerCase().includes(searchTerm) && !item.category.toLowerCase().includes(searchTerm) && !(item.desc && item.desc.toLowerCase().includes(searchTerm))) return false;
      return true;
    });

    grid.innerHTML = "";

    if (filtered.length === 0) {
      emptyMsg.classList.remove("hidden");
      emptyMsg.textContent = catalog.length === 0
        ? "🏗️ Cửa hàng đang được cập nhật. Vui lòng quay lại sau!"
        : "Không tìm thấy dịch vụ nào phù hợp.";
      return;
    }
    emptyMsg.classList.add("hidden");

    filtered.forEach(item => {
      const card = document.createElement("div");
      card.className = "store-card";

      const isOutOfStock = item.stock <= 0;
      const imgHtml = item.image
        ? `<img src="${item.image}" class="store-card-img" alt="${item.name}">`
        : `<div class="store-card-img emoji-placeholder">${item.emoji}</div>`;

      card.innerHTML = `
        ${imgHtml}
        <span class="store-card-stock ${isOutOfStock ? "out" : ""}">
          ${isOutOfStock ? "Hết hàng" : `Còn ${item.stock}`}
        </span>
        <div class="store-card-body">
          <div class="store-card-cat">${item.category}</div>
          <div class="store-card-name">${item.name}</div>
          <div class="store-card-desc">${item.desc || ""}</div>
          <div class="store-card-footer">
            <span class="store-card-price">${formatVND(item.price)}</span>
            <button class="store-card-btn" data-id="${item.id}" ${isOutOfStock ? "disabled style='opacity:0.4;cursor:not-allowed'" : ""}>
              ${isOutOfStock ? "Hết hàng" : "🛒 Mua ngay"}
            </button>
          </div>
        </div>
      `;

      card.addEventListener("click", (e) => {
        if (e.target.closest(".store-card-btn")) return;
        openPurchaseModal(item);
      });

      grid.appendChild(card);
    });

    grid.querySelectorAll(".store-card-btn:not([disabled])").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const item = filtered.find(x => x.id === btn.dataset.id);
        if (item) openPurchaseModal(item);
      });
    });
  }

  const searchInput = $("#store-search");
  if (searchInput) {
    searchInput.addEventListener("input", () => renderProducts());
  }

  // ---- Purchase Modal -------------------------
  function openPurchaseModal(item) {
    const modal = $("#purchase-modal");
    const detail = $("#purchase-product-detail");
    const isOut = item.stock <= 0;

    const imgHtml = item.image
      ? `<img src="${item.image}" class="purchase-img" alt="${item.name}">`
      : `<div class="purchase-img emoji-ph">${item.emoji}</div>`;

    detail.innerHTML = `
      <div class="purchase-detail">
        ${imgHtml}
        <div class="purchase-cat">${item.category}</div>
        <div class="purchase-name">${item.name}</div>
        <div class="purchase-desc">${item.desc || "Dịch vụ chất lượng cao từ vpsgiare098.com"}</div>
        <div class="purchase-price-row">
          <span class="purchase-price-label">Đơn giá</span>
          <span class="purchase-price-value">${formatVND(item.price)}</span>
        </div>
        <div class="purchase-qty-row">
          <label>Số lượng:</label>
          <input type="number" id="purchase-qty" value="1" min="1" max="${item.stock}" step="1">
          <span class="purchase-total" id="purchase-total">Tổng: ${formatVND(item.price)}</span>
        </div>
        <div class="purchase-stock-info">${isOut ? "⛔ Hết hàng" : `📦 Còn lại: ${item.stock} slot`}</div>
        <div class="purchase-actions">
          <button class="btn-primary" id="btn-confirm-purchase" ${isOut ? "disabled" : ""}>
            ${isOut ? "Hết hàng" : "✅ Xác Nhận Mua Hàng"}
          </button>
        </div>
      </div>
    `;

    modal.classList.remove("hidden");

    const qtyInput = $("#purchase-qty");
    const totalEl = $("#purchase-total");
    if (qtyInput) {
      qtyInput.addEventListener("input", () => {
        let qty = parseInt(qtyInput.value) || 1;
        qty = Math.max(1, Math.min(qty, item.stock));
        qtyInput.value = qty;
        totalEl.textContent = `Tổng: ${formatVND(item.price * qty)}`;
      });
    }

    const btnConfirm = $("#btn-confirm-purchase");
    if (btnConfirm && !isOut) {
      btnConfirm.addEventListener("click", () => {
        doPurchase(item, parseInt(qtyInput.value) || 1);
      });
    }
  }

  $("#btn-close-purchase").addEventListener("click", () => {
    $("#purchase-modal").classList.add("hidden");
  });

  function doPurchase(item, qty) {
    const session = getSession();
    if (!session) {
      $("#purchase-modal").classList.add("hidden");
      openAuthModal("login");
      toast("🔑 Vui lòng đăng nhập hoặc đăng ký để mua hàng!");
      return;
    }

    // Refresh balance from accounts storage
    refreshSession();
    const freshSession = getSession();
    const totalCost = item.price * qty;

    if (freshSession.balance < totalCost) {
      toast(`❌ Số dư không đủ! Cần ${formatVND(totalCost)} nhưng bạn chỉ có ${formatVND(freshSession.balance)}. Hãy nạp tiền trước!`);
      return;
    }

    // Deduct balance
    let accounts = getAccounts();
    const acc = accounts.find(a => a.id === freshSession.id);
    if (acc) {
      acc.balance -= totalCost;
      save(KEYS.accounts, accounts);
    }

    // Deduct stock
    let inventory = load(KEYS.inventory, {});
    inventory[item.id] = Math.max(0, (inventory[item.id] !== undefined ? inventory[item.id] : item.stock) - qty);
    save(KEYS.inventory, inventory);

    // Record order in purchase history
    let orders = load(KEYS.orders, []);
    orders.push({
      id: "ord_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      userId: freshSession.id,
      username: freshSession.username,
      productId: item.id,
      productName: item.name,
      category: item.category,
      emoji: item.emoji,
      image: item.image || null,
      unitPrice: item.price,
      qty: qty,
      total: totalCost,
      date: new Date().toISOString(),
    });
    save(KEYS.orders, orders);

    renderUserArea();
    renderProducts();

    $("#purchase-modal").classList.add("hidden");
    toast(`✅ Đã mua ${qty}× ${item.name}! Trừ ${formatVND(totalCost)}. Kiểm tra lịch sử mua hàng hoặc liên hệ shop để nhận dịch vụ.`, true);
  }

  // ---- Init -----------------------------------
  renderCategoryPills();
  renderProducts();

})();
