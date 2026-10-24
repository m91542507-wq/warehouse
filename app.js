'use strict';
/* ===== Хранилище (localStorage). Все данные живут в браузере. ===== */
const KEY = 'wms_db', SES = 'wms_session';
const $ = s => document.querySelector(s);
const today = () => new Date().toISOString().slice(0, 10);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Number(n).toLocaleString('ru-RU', { maximumFractionDigits: 2 });

let db = JSON.parse(localStorage.getItem(KEY) || 'null');
let me = JSON.parse(sessionStorage.getItem(SES) || 'null');
let tab = 'stock';
let lastReport = { title: '', rows: [] };

const save = () => localStorage.setItem(KEY, JSON.stringify(db));

async function hash(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}

const ROLES = { admin: 'Админ', keeper: 'Кладовщик', manager: 'Менеджер' };
const can = {
  edit: () => ['admin', 'keeper'].includes(me.role),   // товары, приход, расход
  users: () => me.role === 'admin'
};

/* ===== Бизнес-логика ===== */
function stock(pid, date) {
  return db.moves
    .filter(m => m.productId === pid && (!date || m.date <= date))
    .reduce((s, m) => s + (m.type === 'in' ? m.qty : -m.qty), 0);
}
const lowItems = () => db.products.filter(p => stock(p.id) <= p.min);
const prod = id => db.products.find(p => p.id === id);

/* Локальный «API»: те же функции можно позже заменить на fetch() к настоящему серверу */
window.api = {
  products: () => db.products.map(p => ({ ...p, stock: stock(p.id) })),
  movements: pid => db.moves.filter(m => !pid || m.productId === pid),
  stockOn: date => db.products.map(p => ({ id: p.id, name: p.name, qty: stock(p.id, date) }))
};

async function init() {
  if (!db) {
    db = { users: [{ id: uid(), login: 'admin', name: 'Администратор', role: 'admin', pass: await hash('admin123') }], products: [], moves: [] };
    save();
  }
  me ? showApp() : showAuth();
}

/* ===== Авторизация ===== */
let mode = 'login';
function authMode(m) {
  mode = m;
  $('#tabLogin').classList.toggle('active', m === 'login');
  $('#tabReg').classList.toggle('active', m === 'reg');
  $('#aNameWrap').classList.toggle('hidden', m === 'login');
  $('#authForm button.primary').textContent = m === 'login' ? 'Войти' : 'Зарегистрироваться';
  $('#aErr').textContent = '';
}
function showAuth() { $('#auth').classList.remove('hidden'); $('#app').classList.add('hidden'); }
function logout() { sessionStorage.removeItem(SES); me = null; showAuth(); }

$('#authForm').addEventListener('submit', async e => {
  e.preventDefault();
  const login = $('#aLogin').value.trim().toLowerCase(), pass = await hash($('#aPass').value);
  const err = $('#aErr');
  if (mode === 'login') {
    const u = db.users.find(u => u.login === login && u.pass === pass);
    if (!u) return err.textContent = 'Неверный логин или пароль';
    me = u;
  } else {
    if (db.users.some(u => u.login === login)) return err.textContent = 'Такой логин уже есть';
    me = { id: uid(), login, name: $('#aName').value.trim() || login, role: 'manager', pass };
    db.users.push(me); save();
  }
  sessionStorage.setItem(SES, JSON.stringify(me));
  $('#authForm').reset();
  showApp();
});

/* ===== Каркас приложения ===== */
function showApp() {
  $('#auth').classList.add('hidden'); $('#app').classList.remove('hidden');
  $('#whoami').textContent = `${me.name} (${ROLES[me.role]})`;
  const tabs = [['stock', 'Товары и остатки']];
  if (can.edit()) tabs.push(['in', 'Приход'], ['out', 'Расход']);
  tabs.push(['history', 'История'], ['reports', 'Отчёты']);
  if (can.users()) tabs.push(['users', 'Пользователи']);
  if (!tabs.some(t => t[0] === tab)) tab = 'stock';
  $('#nav').innerHTML = tabs.map(([k, n]) => `<button class="${k === tab ? 'active' : ''}" onclick="go('${k}')">${n}</button>`).join('');
  renderAlerts();
  ({ stock: viewStock, in: viewIn, out: viewOut, history: viewHistory, reports: viewReports, users: viewUsers })[tab]();
}
function go(t) { tab = t; showApp(); }
function renderAlerts() {
  const low = lowItems();
  $('#alerts').innerHTML = low.length
    ? `<div class="alert">⚠️ Товар заканчивается: ${low.map(p => `<b>${esc(p.name)}</b> (${fmt(stock(p.id))} ${esc(p.unit)})`).join(', ')}</div>` : '';
}
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2500); }

function dialog(html, onSubmit) {
  const f = $('#dlgForm');
  f.innerHTML = html + `<div class="dlgbtns"><button type="button" class="sec" onclick="$('#dlg').close()">Отмена</button><button class="primary" value="ok">Сохранить</button></div>`;
  f.onsubmit = e => { e.preventDefault(); onSubmit(new FormData(f)); };
  $('#dlg').showModal();
}

/* ===== Товары и остатки ===== */
function viewStock() {
  const q = (window._q || '').toLowerCase();
  const list = db.products.filter(p => !q || [p.name, p.category, p.barcode].join(' ').toLowerCase().includes(q));
  $('#view').innerHTML = `
  <div class="panel">
    <h2>Товары и остатки</h2>
    <div class="tools">
      <input placeholder="Поиск: название, категория, штрихкод" value="${esc(window._q || '')}" oninput="window._q=this.value;viewStock()" id="q">
      ${can.edit() ? '<button class="primary" onclick="editProduct()">+ Добавить товар</button>' : ''}
    </div>
    <div class="tablewrap"><table>
      <tr><th>Название</th><th>Категория</th><th>Цена</th><th>Ед.</th><th>Штрихкод</th><th>Остаток</th><th>Мин.</th><th></th></tr>
      ${list.map(p => { const s = stock(p.id), low = s <= p.min; return `<tr>
        <td>${esc(p.name)}</td><td>${esc(p.category)}</td><td>${fmt(p.price)}</td><td>${esc(p.unit)}</td><td>${esc(p.barcode)}</td>
        <td><b>${fmt(s)}</b> <span class="badge ${low ? 'b-low' : 'b-ok'}">${low ? 'мало' : 'ок'}</span></td><td>${fmt(p.min)}</td>
        <td>${can.edit() ? `<button class="sec" onclick="editProduct('${p.id}')">✎</button> <button class="sec danger" onclick="delProduct('${p.id}')">🗑</button>` : ''}</td></tr>`; }).join('') || '<tr><td colspan="8" class="muted">Товаров пока нет</td></tr>'}
    </table></div>
  </div>`;
  const qi = $('#q'); if (window._q) { qi.focus(); qi.setSelectionRange(qi.value.length, qi.value.length); }
}
function editProduct(id) {
  const p = id ? prod(id) : { name: '', category: '', price: 0, unit: 'шт', barcode: '', min: 0 };
  dialog(`<h3>${id ? 'Редактирование' : 'Новый товар'}</h3>
    <label>Название <input name="name" required value="${esc(p.name)}"></label>
    <label>Категория <input name="category" value="${esc(p.category)}"></label>
    <label>Цена <input name="price" type="number" step="0.01" min="0" value="${p.price}"></label>
    <label>Ед. измерения <input name="unit" value="${esc(p.unit)}"></label>
    <label>Штрихкод <input name="barcode" value="${esc(p.barcode)}"></label>
    <label>Минимальный остаток <input name="min" type="number" min="0" step="any" value="${p.min}"></label>`,
    fd => {
      const d = { name: fd.get('name').trim(), category: fd.get('category').trim(), price: +fd.get('price'), unit: fd.get('unit').trim() || 'шт', barcode: fd.get('barcode').trim(), min: +fd.get('min') };
      if (d.barcode && db.products.some(x => x.barcode === d.barcode && x.id !== id)) return alert('Такой штрихкод уже есть');
      if (id) Object.assign(prod(id), d); else db.products.push({ id: uid(), ...d });
      save(); $('#dlg').close(); showApp(); toast('Сохранено');
    });
}
function delProduct(id) {
  if (db.moves.some(m => m.productId === id)) return alert('У товара есть история движения — удалить нельзя.');
  if (!confirm('Удалить товар?')) return;
  db.products = db.products.filter(p => p.id !== id); save(); showApp();
}

/* ===== Приход / Расход ===== */
const prodOptions = () => db.products.map(p => `<option value="${p.id}">${esc(p.name)} (остаток: ${fmt(stock(p.id))} ${esc(p.unit)})</option>`).join('');

function moveForm(type) {
  const isIn = type === 'in';
  const todayMoves = db.moves.filter(m => m.type === type).slice(-10).reverse();
  $('#view').innerHTML = `
  <div class="panel">
    <h2>${isIn ? 'Приход товара' : 'Расход товара'}</h2>
    ${db.products.length ? `<form id="mf">
      <div class="row">
        <label>Товар <select name="pid" required>${prodOptions()}</select></label>
        <label>Количество <input name="qty" type="number" min="0.01" step="any" required></label>
        <label>Дата <input name="date" type="date" value="${today()}" required></label>
      </div>
      <div class="row">
        ${isIn ? '<label>Поставщик <input name="supplier" required></label>'
               : '<label>Причина <select name="reason"><option value="sale">Продажа</option><option value="spoilage">Порча</option></select></label>'}
        <label>Комментарий <input name="note"></label>
        <button class="primary">${isIn ? 'Принять' : 'Списать'}</button>
      </div></form>` : '<p class="muted">Сначала добавьте товары.</p>'}
  </div>
  <div class="panel"><h3>Последние операции</h3>${movesTable(todayMoves)}</div>`;
  const f = $('#mf'); if (!f) return;
  f.onsubmit = e => {
    e.preventDefault();
    const fd = new FormData(f), pid = fd.get('pid'), qty = +fd.get('qty'), p = prod(pid);
    if (!isIn && qty > stock(pid)) return alert(`Недостаточно товара. В наличии: ${fmt(stock(pid))} ${p.unit}`);
    db.moves.push({ id: uid(), productId: pid, type, qty, date: fd.get('date'), supplier: fd.get('supplier') || '', reason: isIn ? 'supply' : fd.get('reason'), note: fd.get('note'), user: me.name, ts: Date.now() });
    save(); showApp();
    toast(isIn ? 'Приход зафиксирован' : 'Расход списан');
    if (!isIn && stock(pid) <= p.min) setTimeout(() => toast(`⚠️ «${p.name}» заканчивается!`), 2700);
  };
}
const viewIn = () => moveForm('in');
const viewOut = () => moveForm('out');

const REASONS = { supply: 'Поставка', sale: 'Продажа', spoilage: 'Порча' };
function movesTable(list) {
  return `<div class="tablewrap"><table><tr><th>Дата</th><th>Товар</th><th>Тип</th><th>Кол-во</th><th>Поставщик / причина</th><th>Комментарий</th><th>Кто</th></tr>
  ${list.map(m => { const p = prod(m.productId); return `<tr><td>${m.date}</td><td>${esc(p?.name)}</td>
    <td><span class="badge ${m.type === 'in' ? 'b-in' : 'b-out'}">${m.type === 'in' ? 'Приход' : 'Расход'}</span></td>
    <td>${fmt(m.qty)} ${esc(p?.unit)}</td><td>${m.type === 'in' ? esc(m.supplier) : REASONS[m.reason]}</td><td>${esc(m.note)}</td><td>${esc(m.user)}</td></tr>`; }).join('') || '<tr><td colspan="7" class="muted">Операций нет</td></tr>'}
  </table></div>`;
}

/* ===== История движения по позиции ===== */
function viewHistory() {
  const pid = window._hp || '';
  const list = db.moves.filter(m => !pid || m.productId === pid).slice().sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts);
  $('#view').innerHTML = `<div class="panel"><h2>История движения</h2>
    <div class="tools"><select id="hp" onchange="window._hp=this.value;viewHistory()" style="max-width:320px">
      <option value="">Все товары</option>${db.products.map(p => `<option value="${p.id}" ${p.id === pid ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
    ${pid ? `<p>Текущий остаток: <b>${fmt(stock(pid))} ${esc(prod(pid).unit)}</b></p>` : ''}
    ${movesTable(list)}</div>`;
}

/* ===== Отчёты ===== */
function viewReports() {
  const r = window._r || (window._r = { kind: 'stock', date: today(), from: today().slice(0, 8) + '01', to: today() });
  $('#view').innerHTML = `<div class="panel"><h2>Отчёты</h2>
    <div class="row noprint">
      <label>Отчёт <select id="rk" onchange="window._r.kind=this.value;viewReports()">
        <option value="stock" ${r.kind === 'stock' ? 'selected' : ''}>Остатки на дату</option>
        <option value="turn" ${r.kind === 'turn' ? 'selected' : ''}>Оборачиваемость</option>
        <option value="top" ${r.kind === 'top' ? 'selected' : ''}>Самые продаваемые</option></select></label>
      ${r.kind === 'stock' ? `<label>На дату <input type="date" value="${r.date}" onchange="window._r.date=this.value;viewReports()"></label>`
        : `<label>С <input type="date" value="${r.from}" onchange="window._r.from=this.value;viewReports()"></label>
           <label>По <input type="date" value="${r.to}" onchange="window._r.to=this.value;viewReports()"></label>`}
      <button class="sec" onclick="exportXLSX()">⬇ Excel</button>
      <button class="sec" onclick="window.print()">⬇ PDF</button>
    </div><div id="rep"></div></div>`;
  let title, head, rows;
  if (r.kind === 'stock') {
    title = `Остатки на ${r.date}`; head = ['Товар', 'Категория', 'Остаток', 'Ед.', 'Сумма'];
    rows = db.products.map(p => { const s = stock(p.id, r.date); return [p.name, p.category, s, p.unit, +(s * p.price).toFixed(2)]; });
  } else {
    const inP = db.moves.filter(m => m.date >= r.from && m.date <= r.to);
    const calc = p => {
      const mv = inP.filter(m => m.productId === p.id);
      const inn = mv.filter(m => m.type === 'in').reduce((s, m) => s + m.qty, 0);
      const out = mv.filter(m => m.type === 'out').reduce((s, m) => s + m.qty, 0);
      const sold = mv.filter(m => m.type === 'out' && m.reason === 'sale').reduce((s, m) => s + m.qty, 0);
      const start = stock(p.id, new Date(new Date(r.from) - 864e5).toISOString().slice(0, 10)), end = stock(p.id, r.to);
      const avg = (start + end) / 2;
      return { p, inn, out, sold, start, end, turn: avg > 0 ? +(out / avg).toFixed(2) : 0 };
    };
    if (r.kind === 'turn') {
      title = `Оборачиваемость ${r.from} — ${r.to}`; head = ['Товар', 'Начало', 'Приход', 'Расход', 'Конец', 'Оборачиваемость'];
      rows = db.products.map(calc).map(x => [x.p.name, x.start, x.inn, x.out, x.end, x.turn]);
    } else {
      title = `Самые продаваемые ${r.from} — ${r.to}`; head = ['Место', 'Товар', 'Продано', 'Выручка'];
      rows = db.products.map(calc).filter(x => x.sold > 0).sort((a, b) => b.sold - a.sold).map((x, i) => [i + 1, x.p.name, x.sold, +(x.sold * x.p.price).toFixed(2)]);
    }
  }
  lastReport = { title, head, rows };
  $('#rep').innerHTML = `<h3>${esc(title)}</h3><div class="tablewrap"><table><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>
    ${rows.map(row => `<tr>${row.map(c => `<td>${typeof c === 'number' ? fmt(c) : esc(c)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${head.length}" class="muted">Нет данных</td></tr>`}</table></div>`;
}
function exportXLSX() {
  const { title, head, rows } = lastReport;
  if (!rows.length) return alert('Нет данных для экспорта');
  if (typeof XLSX === 'undefined') return alert('Библиотека Excel не загрузилась (нужен интернет).');
  const ws = XLSX.utils.aoa_to_sheet([head, ...rows]);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Отчёт');
  XLSX.writeFile(wb, title.replace(/[^\wа-яё-]+/gi, '_') + '.xlsx');
}

/* ===== Пользователи (только админ) ===== */
function viewUsers() {
  $('#view').innerHTML = `<div class="panel"><h2>Пользователи</h2>
    <div class="tablewrap"><table><tr><th>Логин</th><th>Имя</th><th>Роль</th><th></th></tr>
    ${db.users.map(u => `<tr><td>${esc(u.login)}</td><td>${esc(u.name)}</td>
      <td><select onchange="setRole('${u.id}',this.value)" ${u.id === me.id ? 'disabled' : ''}>${Object.entries(ROLES).map(([k, n]) => `<option value="${k}" ${u.role === k ? 'selected' : ''}>${n}</option>`).join('')}</select></td>
      <td>${u.id === me.id ? '' : `<button class="sec danger" onclick="delUser('${u.id}')">🗑</button>`}</td></tr>`).join('')}
    </table></div>
    <p class="muted">Новые пользователи регистрируются сами с ролью «Менеджер» — здесь вы меняете им роль.</p></div>`;
}
function setRole(id, role) { db.users.find(u => u.id === id).role = role; save(); toast('Роль изменена'); }
function delUser(id) { if (confirm('Удалить пользователя?')) { db.users = db.users.filter(u => u.id !== id); save(); viewUsers(); } }

init();
