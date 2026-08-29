// ============================================================
//  页面逻辑：点餐、下单、历史查询
//  布局：美团式（左分类栏 + 右侧菜品卡片：图/名/描述/数量）
//  下单：不需要填名字，自动以「家人XX」署名
//  历史：订单按日期永久保留，可查、可单条删除、可按天清空
// ============================================================

// 购物车：{ 菜id: { qty: 数量, remark: '备注' } }
function loadCart() {
  try {
    const raw = JSON.parse(localStorage.getItem('family_cart') || '{}');
    const cart = {};
    Object.keys(raw).forEach(k => {
      if (!/^\d+$/.test(k)) return; // 丢弃无效的菜id（防止脏数据）
      const v = raw[k];
      cart[k] = typeof v === 'number'
        ? { qty: v, remark: '' }
        : { qty: (v && v.qty) || 0, remark: (v && v.remark) || '' };
    });
    return cart;
  } catch { return {}; }
}
function saveCart(cart) {
  localStorage.setItem('family_cart', JSON.stringify(cart));
}

const state = {
  cart: loadCart(),   // { 菜id: { qty, remark } }
  activeCat: null,    // 当前选中的分类
  selectedDate: null, // 订单页选中的日期（YYYY-MM-DD）
};

// ---------- 小工具 ----------
function pad2(n) { return n < 10 ? '0' + n : '' + n; }
function fmtDate(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function todayStr() { return fmtDate(new Date()); }
function yesterdayStr() { const d = new Date(); d.setDate(d.getDate() - 1); return fmtDate(d); }

// 转义 HTML，防止备注里的特殊字符破坏页面
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 自动身份：不用填名字，按"当天第几单"编号 → 顾客1、顾客2、顾客3…
async function nextCustomerNumber() {
  const today = todayStr();
  const orders = await Store.getOrders();
  const count = orders.filter(o => (o.date || today) === today).length;
  return count + 1;
}

// 购物车里一共几个菜（份数合计）
function cartTotalCount() {
  return Object.values(state.cart).reduce((a, b) => a + (b.qty || 0), 0);
}

// ---------- 视图切换（#/menu #/cart #/orders） ----------
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById('view-' + name).classList.remove('hidden');
}

function router() {
  const hash = location.hash || '#/menu';
  const name = hash.replace('#/', '');
  if (name === 'cart') renderCart();
  else if (name === 'orders') renderOrders();
  else renderMenu();
  showView(name === 'cart' ? 'cart' : name === 'orders' ? 'orders' : 'menu');
}

// ---------- 菜品卡片通用部分 ----------
// 数量加减按钮
function qtyBtns(id, qty) {
  return (
    '<button class="qty-btn minus" data-act="minus" data-id="' + id + '">−</button>' +
    '<span class="qty-num' + (qty === 0 ? ' zero' : '') + '">' + qty + '</span>' +
    '<button class="qty-btn plus" data-act="plus" data-id="' + id + '">+</button>'
  );
}

// 菜品图片：有 img 就显示图片；没有或加载失败，统一显示"待上传图片"占位
function dishImgHtml(d, cls) {
  const fb = '<span class="' + cls + '-fallback">待上传图片</span>';
  const im = d.img
    ? '<img class="' + cls + '" src="' + escapeHtml(d.img) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
    : '';
  return '<div class="' + cls + '-wrap">' + fb + im + '</div>';
}

// 备注输入框（点餐页用，可编辑）
function remarkRowHtml(dishId, remark) {
  return (
    '<div class="remark-row">' +
      '<input class="remark-input" data-remark="' + dishId + '" placeholder="备注：少辣、不要香菜…" value="' + escapeHtml(remark) + '">' +
    '</div>'
  );
}

// ---------- 点餐页：左侧分类栏 ----------
function renderCatRail() {
  const rail = document.getElementById('cat-rail');
  rail.innerHTML = MENU.categories.map(c =>
    '<button class="cat-item' + (c === state.activeCat ? ' active' : '') + '" data-cat="' + escapeHtml(c) + '">' + escapeHtml(c) + '</button>'
  ).join('');
}

// ---------- 点餐页：右侧菜品列表（当前分类） ----------
function renderDishList() {
  const box = document.getElementById('dish-list');
  const dishes = MENU.dishes.filter(d => d.category === state.activeCat);

  box.innerHTML = dishes.map(d => {
    const item = state.cart[d.id] || { qty: 0, remark: '' };
    const qty = item.qty;
    const remarkRow = qty > 0 ? remarkRowHtml(d.id, item.remark) : '';
    return (
      '<div class="dish">' +
        dishImgHtml(d, 'dish-img') +
        '<div class="dish-main">' +
          '<div class="dish-name">' + escapeHtml(d.name) + '</div>' +
          remarkRow +
        '</div>' +
        '<div class="dish-side">' + qtyBtns(d.id, qty) + '</div>' +
      '</div>'
    );
  }).join('');
}

function renderMenu() {
  if (!state.activeCat || !MENU.categories.includes(state.activeCat)) {
    state.activeCat = MENU.categories[0];
  }
  renderCatRail();
  renderDishList();
  updateCartBar();
}

// ---------- 购物车操作 ----------
// 加/减数量（无效菜id直接忽略）
function changeQty(dishId, delta) {
  if (!/^\d+$/.test(String(dishId))) return;
  const cur = state.cart[dishId] || { qty: 0, remark: '' };
  const next = cur.qty + delta;
  if (next <= 0) delete state.cart[dishId];
  else state.cart[dishId] = { qty: next, remark: cur.remark };
  saveCart(state.cart);
  renderMenu();
}

// 修改某道菜的备注（无效菜id直接忽略）
function setRemark(dishId, text) {
  if (!/^\d+$/.test(String(dishId))) return;
  const cur = state.cart[dishId] || { qty: 0, remark: '' };
  if (text === '' && cur.qty <= 0) delete state.cart[dishId];
  else state.cart[dishId] = { qty: cur.qty, remark: text };
  saveCart(state.cart);
}

function updateCartBar() {
  const bar = document.getElementById('cart-bar');
  const count = cartTotalCount();
  document.getElementById('cart-count').textContent = count > 0 ? '🛒 已选 ' + count + ' 个菜' : '🛒 还没选菜哦';
  bar.classList.toggle('hidden', count === 0);
}

// ---------- 下单页 ----------
function renderCart() {
  const box = document.getElementById('cart-list');
  const ids = Object.keys(state.cart);

  if (!ids.length) {
    box.innerHTML = '<div class="empty"><span class="big">🛒</span>购物车是空的<br>先去「点餐」页选几个菜吧<br><button class="btn btn-gold btn-mid" data-gomenu>去点餐</button></div>';
    return;
  }

  box.innerHTML = ids.map(id => {
    const dish = findDish(id);
    const item = state.cart[id];
    if (!dish) return '';
    // 结算页只读展示：图片 + 菜名 + 备注文字 + 份数（要改请点「返回菜单」）
    const remarkText = item.remark
      ? '<div class="dish-remark-text">备注：' + escapeHtml(item.remark) + '</div>'
      : '';
    return (
      '<div class="dish">' +
        dishImgHtml(dish, 'cart-img') +
        '<div class="dish-main">' +
          '<div class="dish-name">' + escapeHtml(dish.name) + '</div>' +
          remarkText +
        '</div>' +
        '<div class="dish-count">× ' + item.qty + '</div>' +
      '</div>'
    );
  }).join('');
}

// 生成订单里的菜品列表（带备注和图片，跳过无效菜）
function buildOrderItems() {
  const out = [];
  Object.keys(state.cart).forEach(id => {
    const item = state.cart[id];
    if (!item || !item.qty || !/^\d+$/.test(id)) return; // 跳过无效/零数量的菜
    const dish = findDish(id);
    out.push({
      id: Number(id),
      name: dish ? dish.name : '菜' + id,
      qty: item.qty,
      remark: item.remark || '',
      img: dish && dish.img ? dish.img : '',
    });
  });
  return out;
}

// 提交订单（自动按当天下单顺序编号，不需要填名字）
async function submitOrder() {
  if (!Object.keys(state.cart).length) { alert('购物车是空的哦'); return; }
  const remarkEl = document.getElementById('order-remark');
  const customerNo = await nextCustomerNumber();

  const order = {
    oid: 'o' + Date.now() + '-' + Math.floor(Math.random() * 1000000),
    name: '顾客' + customerNo,
    items: buildOrderItems(),
    remark: remarkEl ? remarkEl.value.trim() : '',
    date: todayStr(),
    time: pad2(new Date().getHours()) + ':' + pad2(new Date().getMinutes()),
  };

  await Store.addOrder(order);
  state.cart = {};
  saveCart(state.cart);
  if (remarkEl) remarkEl.value = '';
  updateBadge(); // 更新右上角气泡

  alert('顾客' + customerNo + ' 下单成功！🎉 点「订单」看看大家点了啥');
  location.hash = '#/orders';
}

// ---------- 订单页（按日期查历史） ----------
async function renderOrders() {
  const box = document.getElementById('orders-list');
  const btnClear = document.getElementById('btn-clear');
  box.innerHTML = '<div class="empty">⏳ 正在读取订单…</div>';

  const orders = await Store.getOrders();

  // 按日期归类
  const byDate = {};
  orders.forEach(o => {
    const d = o.date || todayStr();
    (byDate[d] = byDate[d] || []).push(o);
  });
  const dates = Object.keys(byDate).sort().reverse(); // 最近的在前面

  // 默认选中最近有订单的一天
  if (!dates.includes(state.selectedDate)) {
    state.selectedDate = dates[0] || todayStr();
  }

  renderDateNav(dates);
  const dayOrders = byDate[state.selectedDate] || [];

  if (!dayOrders.length) {
    box.innerHTML = '<div class="empty"><span class="big">🍽️</span>这一天还没有人点餐<br><button class="btn btn-gold btn-mid" data-gomenu>去点餐</button></div>';
    btnClear.classList.add('hidden');
    return;
  }
  btnClear.classList.remove('hidden');
  btnClear.textContent = '🗑️ 清空 ' + state.selectedDate + ' 的订单';

  let html = '';

  // 每条订单：菜名（备注）× 份数，一行一条，不汇总、不堆块
  dayOrders.forEach((o, i) => {
    const items = o.items || [];
    let rows = '';
    items.forEach(it => {
      // 数量 <= 0 的"幽灵菜品"、无法识别的脏数据，都不显示
      if (!it || !it.qty || it.qty <= 0) return;
      const dishName = resolveItemName(it);
      if (!dishName) return;
      rows +=
        '<div class="item-row">' +
          '<div class="item-line"><span>' + escapeHtml(dishName) + '</span><span class="item-qty">× ' + it.qty + '</span></div>' +
          (it.remark ? '<div class="item-remark">备注：' + escapeHtml(it.remark) + '</div>' : '') +
        '</div>';
    });

    html +=
      '<div class="person-card">' +
        '<div class="card-head">' +
          '<h3>' + (i + 1) + '. ' + escapeHtml(o.name) + '</h3>' +
          '<div class="card-actions">' +
            '<button class="edit-btn" data-edit="' + escapeHtml(o.oid || '') + '" title="放回购物车修改">✏️</button>' +
            '<button class="del-btn" data-del="' + escapeHtml(o.oid || '') + '" title="删除这条订单">🗑️</button>' +
          '</div>' +
        '</div>' +
        '<div class="person-meta">' + escapeHtml(o.time || '') +
          (o.remark ? ' · 整单备注：' + escapeHtml(o.remark) : '') +
        '</div>' +
        (rows || '<div class="person-meta">（无有效菜品）</div>') +
      '</div>';
  });

  box.innerHTML = html;
}

// 订单里菜名的安全解析：返回真实菜名；无法识别的脏数据返回 null（直接不显示，绝不出"未知菜"）
function resolveItemName(it) {
  const n = it && it.name;
  if (n && !/^菜(undefined|null|NaN)$/.test(n) && n !== 'undefined' && n !== 'null') {
    return n; // 名字正常，直接用
  }
  const d = it && findDish(it.id);
  return d ? d.name : null; // 名字是脏数据但能在菜单里找到 → 用菜单里的菜名；找不到 → 不显示
}

// 日期导航：一个大日期条（醒目的日期 + 日期选择器同一行，日期条紧跟其下），整体吸顶不分开
function renderDateNav(dates) {
  const nav = document.getElementById('date-nav');
  const sel = state.selectedDate;
  const m = Number(sel.slice(5, 7));
  const d = Number(sel.slice(8, 10));
  const heroLabel = sel === todayStr() ? '今天' : sel === yesterdayStr() ? '昨天' : (m + '月' + d + '日');
  let html = '<div class="date-bar">';
  html += '<div class="date-bar-head">' +
    '<span class="date-hero">📅 ' + m + '月' + d + '日 · ' + heroLabel + '</span>' +
    '<input type="date" id="date-input" class="date-input-compact" value="' + sel + '">' +
  '</div>';
  html += '<div class="date-chips">';
  dates.forEach(dt => {
    let label = dt;
    if (dt === todayStr()) label = '今天';
    else if (dt === yesterdayStr()) label = '昨天';
    else label = Number(dt.slice(5, 7)) + '月' + Number(dt.slice(8, 10)) + '日';
    html += '<button class="date-chip' + (dt === sel ? ' active' : '') + '" data-date="' + dt + '">' + label + '</button>';
  });
  html += '</div>';
  html += '</div>';
  nav.innerHTML = html;
}

// 右上角小气泡：显示今天有几单（0 单时隐藏）
async function updateBadge() {
  const badge = document.getElementById('order-badge');
  if (!badge) return;
  const today = todayStr();
  const orders = await Store.getOrders();
  const count = orders.filter(o => (o.date || today) === today).length;
  badge.textContent = count > 99 ? '99+' : String(count);
  badge.hidden = count === 0;
}

// 把一条订单的菜装回购物车（用于"修改"功能，跳过无效菜）
function loadOrderIntoCart(order) {
  state.cart = {};
  (order.items || []).forEach(it => {
    if (!it || !it.qty || !/^\d+$/.test(String(it.id))) return;
    state.cart[it.id] = { qty: it.qty, remark: it.remark || '' };
  });
  saveCart(state.cart);
  const remarkEl = document.getElementById('order-remark');
  if (remarkEl) remarkEl.value = order.remark || '';
}

// 修改订单：放回购物车并删除原订单，改好重新提交
async function editOrder(oid) {
  if (!oid) return;
  if (!confirm('把这条订单放回购物车修改吗？原订单会被删除。')) return;
  const orders = await Store.getOrders();
  const o = orders.find(x => x.oid === oid);
  if (!o) return;
  loadOrderIntoCart(o);
  await Store.deleteOrder(oid);
  updateBadge();
  alert('已把这条订单放回购物车（含备注），修改好后再提交～');
  location.hash = '#/menu';
}

// 删除单条订单
async function deleteOneOrder(oid) {
  if (!oid) return;
  if (!confirm('确定删除这条订单吗？')) return;
  await Store.deleteOrder(oid);
  updateBadge();
  renderOrders();
}

// 清空选中那一天的订单
async function clearDay() {
  if (!state.selectedDate) return;
  if (!confirm('确定清空 ' + state.selectedDate + ' 这一天的所有订单吗？清空后不可恢复！')) return;
  await Store.clearByDate(state.selectedDate);
  updateBadge();
  renderOrders();
}

// ---------- 事件绑定 ----------
document.addEventListener('click', function (e) {
  // 左侧分类
  const catBtn = e.target.closest('[data-cat]');
  if (catBtn) { state.activeCat = catBtn.dataset.cat; renderMenu(); return; }
  // 加减数量
  const qtyBtn = e.target.closest('[data-act]');
  if (qtyBtn) { changeQty(qtyBtn.dataset.id, qtyBtn.dataset.act === 'plus' ? 1 : -1); return; }
  // 日期 chips
  const dateBtn = e.target.closest('[data-date]');
  if (dateBtn) { state.selectedDate = dateBtn.dataset.date; renderOrders(); return; }
  // 删除单条订单
  const delBtn = e.target.closest('[data-del]');
  if (delBtn) { deleteOneOrder(delBtn.dataset.del); return; }
  // 修改订单（放回购物车）
  const editBtn = e.target.closest('[data-edit]');
  if (editBtn) { editOrder(editBtn.dataset.edit); return; }
  // 去点餐（空状态按钮）
  const goMenu = e.target.closest('[data-gomenu]');
  if (goMenu) { location.hash = '#/menu'; return; }
  // 其他按钮
  if (e.target.id === 'btn-go-cart') location.hash = '#/cart';
  if (e.target.id === 'btn-back-menu') location.hash = '#/menu';
  if (e.target.id === 'btn-submit') submitOrder();
  if (e.target.id === 'btn-clear') clearDay();
});

// 备注输入（实时保存）
document.addEventListener('input', function (e) {
  if (e.target.classList && e.target.classList.contains('remark-input')) {
    setRemark(e.target.dataset.remark, e.target.value);
  }
});

// 日期选择器
document.addEventListener('change', function (e) {
  if (e.target.id === 'date-input' && e.target.value) {
    state.selectedDate = e.target.value;
    renderOrders();
  }
});

// 菜单自检：给缺 id / id 无效的菜自动补号，防止以后生成脏订单
function normalizeMenu() {
  let maxId = 0;
  MENU.dishes.forEach(d => {
    if (/^\d+$/.test(String(d.id))) maxId = Math.max(maxId, Number(d.id));
  });
  MENU.dishes.forEach(d => {
    if (!/^\d+$/.test(String(d.id))) {
      maxId += 1;
      d.id = maxId;
      console.warn('已自动给「' + d.name + '」补上 id=' + d.id + '，建议在 menu.js 里检查并固定 id');
    }
  });
}

// ---------- 启动 ----------
(async function boot() {
  await Store.init();
  await MenuStore.init();
  // 如果有「菜单管理」页保存的菜单，用它覆盖默认菜单
  const saved = await MenuStore.getMenu();
  if (saved && Array.isArray(saved.categories) && Array.isArray(saved.dishes)) {
    MENU = saved;
  }
  normalizeMenu(); // 自检菜单（自动给缺 id 的菜补号）
  window.addEventListener('hashchange', router);
  if (!location.hash) location.hash = '#/menu';
  router();
  updateBadge(); // 右上角气泡显示今天有几单
})();
