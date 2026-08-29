// ============================================================
//  菜单管理页面逻辑（admin.html）
//  可视化增删改分类和菜品、填图片网址或从本机选图
// ============================================================

let working = null;   // 正在编辑的菜单副本
let activeCat = '';   // 菜品区当前选中的分类

function cloneMenu(m) { return JSON.parse(JSON.stringify(m)); }
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

// 下一个可用菜 id
function nextDishId() {
  let max = 0;
  working.dishes.forEach(d => { if (/^\d+$/.test(String(d.id))) max = Math.max(max, Number(d.id)); });
  return max + 1;
}

function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(function () { t.classList.remove('show'); }, 2200);
}

// ---------- 启动 ----------
(async function boot() {
  await Store.init();
  await MenuStore.init();
  const saved = await MenuStore.getMenu();
  if (saved && Array.isArray(saved.categories) && Array.isArray(saved.dishes)) {
    working = cloneMenu(saved);
  } else {
    working = cloneMenu(DEFAULT_MENU);
  }
  if (!working.categories.length) working.categories.push('默认分类');
  activeCat = working.categories[0];
  updateModeBadge();
  renderCats();
  renderTabs();
  renderDishes();
})();

function updateModeBadge() {
  const b = document.getElementById('mode-badge');
  if (b) {
    if (MenuStore.isCloud) { b.textContent = '☁️ 云端'; b.classList.add('cloud'); }
    else { b.textContent = '本机'; b.classList.remove('cloud'); }
  }
  const tip = document.getElementById('admin-tip');
  if (tip) {
    if (MenuStore.isCloud) tip.textContent = '☁️ 云端模式：保存一次，全家人（打开同一链接的人）同步看到新菜单。';
    else tip.textContent = '本机模式：菜单只在这台设备生效。想让全家同步，请先按 README 第 4 步配置云端。';
  }
}

// ---------- 分类区 ----------
function renderCats() {
  const box = document.getElementById('cat-list');
  box.innerHTML = working.categories.map((c, i) =>
    '<div class="admin-row">' +
      '<button class="mini-btn move" data-movecat="' + i + ':-1" title="上移">↑</button>' +
      '<button class="mini-btn move" data-movecat="' + i + ':1" title="下移">↓</button>' +
      '<input class="admin-input cat-name" data-i="' + i + '" value="' + esc(c) + '" placeholder="分类名">' +
      '<button class="mini-btn del" data-delcat="' + i + '" title="删除分类">🗑️</button>' +
    '</div>'
  ).join('');
}

// 分类上移/下移（delta: -1 上移，1 下移）
function moveCat(i, delta) {
  const j = i + delta;
  if (j < 0 || j >= working.categories.length) return;
  const tmp = working.categories[i];
  working.categories[i] = working.categories[j];
  working.categories[j] = tmp;
  renderCats();
  renderTabs();
}

// 分类改名：同步更新该分类下所有菜的 category
function renameCat(i, newName) {
  const old = working.categories[i];
  const name = newName.trim();
  if (!name || name === old) return;
  if (working.categories.some((c, j) => j !== i && c === name)) { alert('已存在同名分类'); return; }
  working.categories[i] = name;
  working.dishes.forEach(d => { if (d.category === old) d.category = name; });
  if (activeCat === old) activeCat = name;
  renderTabs();
  renderDishes();
}

function deleteCat(i) {
  const name = working.categories[i];
  const count = working.dishes.filter(d => d.category === name).length;
  if (count > 0) { alert('「' + name + '」下面还有 ' + count + ' 道菜，请先删除或移走这些菜'); return; }
  if (!confirm('删除分类「' + name + '」？')) return;
  working.categories.splice(i, 1);
  if (activeCat === name) activeCat = working.categories[0];
  renderCats();
  renderTabs();
  renderDishes();
}

function addCategory() {
  const name = prompt('新分类叫什么名字？');
  if (name === null) return;
  const n = name.trim();
  if (!n) { alert('分类名不能为空'); return; }
  if (working.categories.includes(n)) { alert('已存在同名分类'); return; }
  working.categories.push(n);
  activeCat = n;
  renderCats();
  renderTabs();
  renderDishes();
}

// ---------- 菜品区 ----------
function renderTabs() {
  const box = document.getElementById('cat-tabs');
  box.innerHTML = working.categories.map(c =>
    '<button class="tab' + (c === activeCat ? ' active' : '') + '" data-tab="' + esc(c) + '">' + esc(c) + '</button>'
  ).join('');
}

function renderDishes() {
  const box = document.getElementById('dish-list-admin');
  const dishes = working.dishes.filter(d => d.category === activeCat);
  if (!dishes.length) {
    box.innerHTML = '<div class="admin-empty">这个分类还没有菜，点下面「＋ 添加菜品」</div>';
    return;
  }
  box.innerHTML = dishes.map(d => {
    const idx = working.dishes.indexOf(d);
    return (
      '<div class="admin-dish">' +
        '<div class="admin-dish-head">' +
          '<button class="mini-btn move" data-movedish="' + idx + ':-1" title="上移">↑</button>' +
          '<button class="mini-btn move" data-movedish="' + idx + ':1" title="下移">↓</button>' +
          '<input class="admin-input d-name" data-idx="' + idx + '" value="' + esc(d.name) + '" placeholder="菜名">' +
          '<button class="mini-btn del" data-deldish="' + idx + '" title="删除菜品">🗑️</button>' +
        '</div>' +
        '<div class="admin-img-row">' +
          '<input class="admin-input d-img" data-idx="' + idx + '" value="' + esc(d.img || '') + '" placeholder="图片网址 https://… 或从本机选图">' +
          '<button class="mini-btn pick" data-pick="' + idx + '">🖼️ 选图</button>' +
          '<input type="file" accept="image/*" hidden data-file="' + idx + '">' +
        '</div>' +
        (d.img ? '<img class="admin-thumb" src="' + esc(d.img) + '" alt="" onerror="this.style.display=\'none\'">' : '') +
      '</div>'
    );
  }).join('');
}

// 菜品在当前分类内上移/下移
function moveDish(idx, delta) {
  const d = working.dishes[idx];
  if (!d) return;
  const same = working.dishes.filter(x => x.category === d.category);
  const pos = same.indexOf(d);
  const npos = pos + delta;
  if (npos < 0 || npos >= same.length) return;
  const tIdx = working.dishes.indexOf(same[npos]);
  const tmp = working.dishes[idx];
  working.dishes[idx] = working.dishes[tIdx];
  working.dishes[tIdx] = tmp;
  renderDishes();
}

function addDish() {
  if (!activeCat) { alert('请先添加分类'); return; }
  working.dishes.push({ id: nextDishId(), name: '新菜', category: activeCat, img: '' });
  renderDishes();
}

function deleteDish(idx) {
  const d = working.dishes[idx];
  if (!d) return;
  if (!confirm('删除「' + d.name + '」？')) return;
  working.dishes.splice(idx, 1);
  renderDishes();
}

// 从本机选图片 → 压缩成小图后嵌入菜单
function pickImage(idx) {
  const fileInput = document.querySelector('[data-file="' + idx + '"]');
  if (fileInput) fileInput.click();
}

function readFileAsSmallDataURL(file, cb) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = function () {
    const max = 200;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    cb(canvas.toDataURL('image/jpeg', 0.75));
    URL.revokeObjectURL(url);
  };
  img.onerror = function () { URL.revokeObjectURL(url); alert('图片读取失败，请换一张'); };
  img.src = url;
}

// ---------- 保存 / 恢复默认 ----------
function validateMenu() {
  const cats = working.categories.map(c => c.trim()).filter(Boolean);
  const uniq = new Set(cats);
  if (uniq.size !== cats.length) { alert('分类名有重复，请先修改'); return false; }
  if (!cats.length) { alert('至少需要一个分类'); return false; }
  working.categories = cats;
  // 菜：保证 id 合法唯一、分类有效、菜名非空
  working.dishes.forEach(d => {
    d.name = (d.name || '').trim() || '未命名';
    d.desc = d.desc || '';
    d.emoji = d.emoji || '';
    d.img = d.img || '';
    if (!cats.includes(d.category)) d.category = cats[0];
  });
  let maxId = 0;
  working.dishes.forEach(d => {
    if (/^\d+$/.test(String(d.id))) maxId = Math.max(maxId, Number(d.id));
  });
  working.dishes.forEach(d => {
    if (!/^\d+$/.test(String(d.id))) { maxId += 1; d.id = maxId; }
  });
  const seen = {};
  working.dishes.forEach(d => {
    if (seen[d.id]) { maxId += 1; d.id = maxId; }
    seen[d.id] = true;
  });
  return true;
}

async function saveMenu() {
  if (!validateMenu()) return;
  const ok = await MenuStore.saveMenu(cloneMenu(working));
  if (ok) toast('✅ 已保存！' + (MenuStore.isCloud ? '全家人同步生效' : '本机生效'));
  else alert('保存失败：云端模式下请确认已创建 menu 表（见 README），或检查网络');
}

async function resetMenu() {
  if (!confirm('恢复默认菜单？当前保存的菜单会被删除，回到 menu.js 里的出厂菜单。')) return;
  await MenuStore.resetMenu();
  working = cloneMenu(DEFAULT_MENU);
  if (!working.categories.length) working.categories.push('默认分类');
  activeCat = working.categories[0];
  renderCats();
  renderTabs();
  renderDishes();
  toast('已恢复默认菜单，记得点「保存菜单」');
}

// ---------- 事件绑定 ----------
document.addEventListener('click', function (e) {
  const moveCatBtn = e.target.closest('[data-movecat]');
  if (moveCatBtn) {
    const parts = moveCatBtn.dataset.movecat.split(':');
    moveCat(Number(parts[0]), Number(parts[1]));
    return;
  }
  const moveDishBtn = e.target.closest('[data-movedish]');
  if (moveDishBtn) {
    const parts = moveDishBtn.dataset.movedish.split(':');
    moveDish(Number(parts[0]), Number(parts[1]));
    return;
  }
  const delCat = e.target.closest('[data-delcat]');
  if (delCat) { deleteCat(Number(delCat.dataset.delcat)); return; }
  const delDish = e.target.closest('[data-deldish]');
  if (delDish) { deleteDish(Number(delDish.dataset.deldish)); return; }
  const tab = e.target.closest('[data-tab]');
  if (tab) { activeCat = tab.dataset.tab; renderTabs(); renderDishes(); return; }
  const pick = e.target.closest('[data-pick]');
  if (pick) { pickImage(Number(pick.dataset.pick)); return; }
  if (e.target.id === 'btn-add-cat') { addCategory(); return; }
  if (e.target.id === 'btn-add-dish') { addDish(); return; }
  if (e.target.id === 'btn-save') { saveMenu(); return; }
  if (e.target.id === 'btn-reset') { resetMenu(); return; }
});

// 输入框失焦时写入工作副本（用 change 事件避免每敲一个字就重绘丢焦点）
document.addEventListener('change', function (e) {
  const t = e.target;
  if (t.classList && t.classList.contains('cat-name')) {
    renameCat(Number(t.dataset.i), t.value);
    renderCats();
    return;
  }
  if (t.classList && t.classList.contains('d-name')) {
    const d = working.dishes[Number(t.dataset.idx)];
    if (d) d.name = t.value;
    return;
  }
  if (t.classList && t.classList.contains('d-img')) {
    const d = working.dishes[Number(t.dataset.idx)];
    if (d) { d.img = t.value.trim(); renderDishes(); }
    return;
  }
});

// 选图文件
document.addEventListener('change', function (e) {
  const t = e.target;
  if (t.type === 'file' && t.dataset.file !== undefined) {
    const idx = Number(t.dataset.file);
    const file = t.files && t.files[0];
    if (file) {
      readFileAsSmallDataURL(file, function (dataURL) {
        const d = working.dishes[idx];
        if (d) { d.img = dataURL; renderDishes(); toast('🖼️ 图片已嵌入，记得保存'); }
      });
    }
    t.value = '';
  }
});
