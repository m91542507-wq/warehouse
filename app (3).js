'use strict';
/* =====================================================================
   Склад эсеби / Учёт склада
   Эки режим: локалдык (localStorage) жана жалпы база (Supabase).
   Supabase config.js ичинде толтурулса автоматтык түрдө иштейт.
   ===================================================================== */
const CFG = window.WMS_CONFIG || {};
const REMOTE = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase);
const KEY = 'wms_db', SES = 'wms_session', LANG = 'wms_lang';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const ymd = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const today = () => ymd(new Date());
const daysAgo = n => ymd(new Date(Date.now() - n * 864e5));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Number(n || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 });

/* ===================== Тил (RU / KY) ===================== */
const I18N = {
  ru: {
    app_title: 'Учёт склада', login_tab: 'Вход', reg_tab: 'Регистрация', login: 'Логин', email: 'Email', password: 'Пароль', name: 'Имя',
    do_login: 'Войти', do_reg: 'Зарегистрироваться', logout: 'Выйти',
    hint_local: 'Первый вход: admin / admin123', hint_remote: 'Первый зарегистрированный пользователь становится админом.',
    mode_local: '💾 Локально', mode_remote: '☁️ Общая база', info_local: 'Данные хранятся в этом браузере', info_remote: 'Общая база данных для всех пользователей',
    err_bad: 'Неверный логин или пароль', err_exists: 'Такой логин уже есть', confirm_email: 'Подтвердите email по ссылке из письма и войдите.',
    n_dash: 'Обзор', n_stock: 'Товары', n_in: 'Приход', n_out: 'Расход', n_history: 'История', n_reports: 'Отчёты', n_users: 'Пользователи',
    admin: 'Админ', keeper: 'Кладовщик', manager: 'Менеджер',
    stock_title: 'Товары и остатки', f_name: 'Название', f_category: 'Категория', f_price: 'Цена', f_unit: 'Ед. измерения', f_barcode: 'Штрихкод', f_min: 'Мин. остаток', f_photo: 'Фото', f_stock: 'Остаток',
    pcs: 'шт', add_product: '+ Добавить товар', search: 'Поиск: название, категория, штрихкод', no_products: 'Товаров пока нет',
    low: 'мало', ok: 'норма', save: 'Сохранить', cancel: 'Отмена', new_product: 'Новый товар', edit_product: 'Редактирование', saved: 'Сохранено',
    dup_barcode: 'Такой штрихкод уже есть', has_history: 'У товара есть история движения — удалить нельзя.', confirm_del: 'Удалить?',
    scan: 'Сканер', scan_title: 'Сканирование штрихкода', scan_hint: 'Наведите камеру на штрихкод', scan_err: 'Камера недоступна', not_found: 'Товар не найден',
    in_title: 'Приход товара', out_title: 'Расход товара', product: 'Товар', qty: 'Количество', date: 'Дата', supplier: 'Поставщик', reason: 'Причина',
    sale: 'Продажа', spoilage: 'Порча', supply: 'Поставка', note: 'Комментарий', accept: 'Принять', writeoff: 'Списать', recent: 'Последние операции',
    t_in: 'Приход', t_out: 'Расход', who: 'Кто', sup_reason: 'Поставщик / причина', no_ops: 'Операций нет', add_first: 'Сначала добавьте товары.',
    in_stock: 'остаток', not_enough: 'Недостаточно товара. В наличии:', in_done: 'Приход зафиксирован', out_done: 'Расход списан', low_warn: 'заканчивается!', alert_low: 'Товар заканчивается:',
    history_title: 'История движения', all_products: 'Все товары', cur_stock: 'Текущий остаток:',
    reports_title: 'Отчёты', report: 'Отчёт', rep_stock: 'Остатки на дату', rep_turn: 'Оборачиваемость', rep_top: 'Самые продаваемые',
    on_date: 'На дату', from: 'С', to: 'По', no_data: 'Нет данных', unit_short: 'Ед.', sum: 'Сумма', start: 'Начало', end: 'Конец', turn: 'Оборачиваемость', place: 'Место', sold: 'Продано', revenue: 'Выручка',
    xls_none: 'Нет данных для экспорта', xls_lib: 'Библиотека Excel не загрузилась (нужен интернет).',
    r_stock_t: 'Остатки на', r_turn_t: 'Оборачиваемость', r_top_t: 'Самые продаваемые',
    users_title: 'Пользователи', col_login: 'Логин', col_role: 'Роль', role_changed: 'Роль изменена',
    users_hint: 'Новые пользователи регистрируются сами с ролью «Менеджер» — здесь вы меняете им роль.',
    d_products: 'Товаров', d_value: 'Стоимость склада', d_low: 'Заканчиваются', d_moves: 'Операций за 30 дней',
    d_flow: 'Приход и расход за 14 дней', d_top: 'Топ продаж за 30 дней', d_lowlist: 'Нужно заказать', d_none: 'Пока нет данных', d_all_ok: 'Всё в норме 👍',
    demo_load: 'Демо-данные', demo_confirm: 'Добавить ~45 демо-товаров и историю за 30 дней?', demo_done: 'Демо-данные добавлены',
    demo_clear: 'Очистить всё', demo_clear_confirm: 'Удалить ВСЕ товары и операции? Это нельзя отменить.'
  },
  ky: {
    app_title: 'Склад эсеби', login_tab: 'Кирүү', reg_tab: 'Катталуу', login: 'Логин', email: 'Email', password: 'Сырсөз', name: 'Аты',
    do_login: 'Кирүү', do_reg: 'Катталуу', logout: 'Чыгуу',
    hint_local: 'Биринчи кирүү: admin / admin123', hint_remote: 'Биринчи катталган колдонуучу админ болот.',
    mode_local: '💾 Локалдык', mode_remote: '☁️ Жалпы база', info_local: 'Маалымат ушул браузерде сакталат', info_remote: 'Бардык колдонуучулар үчүн жалпы база',
    err_bad: 'Логин же сырсөз туура эмес', err_exists: 'Мындай логин бар', confirm_email: 'Каттан келген шилтеме менен email\'ди ырастап, кайра кириңиз.',
    n_dash: 'Сереп', n_stock: 'Товарлар', n_in: 'Киреше', n_out: 'Чыгаша', n_history: 'Тарых', n_reports: 'Отчёттор', n_users: 'Колдонуучулар',
    admin: 'Админ', keeper: 'Кампачы', manager: 'Менеджер',
    stock_title: 'Товарлар жана калдык', f_name: 'Аты', f_category: 'Категориясы', f_price: 'Баасы', f_unit: 'Өлчөм бирдиги', f_barcode: 'Штрихкод', f_min: 'Мин. калдык', f_photo: 'Сүрөт', f_stock: 'Калдык',
    pcs: 'дана', add_product: '+ Товар кошуу', search: 'Издөө: аты, категориясы, штрихкод', no_products: 'Азырынча товар жок',
    low: 'аз', ok: 'жетиштүү', save: 'Сактоо', cancel: 'Жокко чыгаруу', new_product: 'Жаңы товар', edit_product: 'Оңдоо', saved: 'Сакталды',
    dup_barcode: 'Мындай штрихкод бар', has_history: 'Товардын кыймыл тарыхы бар — өчүрүүгө болбойт.', confirm_del: 'Өчүрөсүзбү?',
    scan: 'Сканер', scan_title: 'Штрихкодду сканерлөө', scan_hint: 'Камераны штрихкодго багыттаңыз', scan_err: 'Камера жеткиликсиз', not_found: 'Товар табылган жок',
    in_title: 'Товардын киреши', out_title: 'Товардын чыгашасы', product: 'Товар', qty: 'Саны', date: 'Датасы', supplier: 'Жеткирүүчү', reason: 'Себеби',
    sale: 'Сатуу', spoilage: 'Бузулуу', supply: 'Жеткирүү', note: 'Комментарий', accept: 'Кабыл алуу', writeoff: 'Эсептен чыгаруу', recent: 'Акыркы операциялар',
    t_in: 'Киреше', t_out: 'Чыгаша', who: 'Ким', sup_reason: 'Жеткирүүчү / себеп', no_ops: 'Операция жок', add_first: 'Алгач товар кошуңуз.',
    in_stock: 'калдык', not_enough: 'Товар жетишсиз. Бар:', in_done: 'Киреше катталды', out_done: 'Чыгаша эсептен чыгарылды', low_warn: 'аз калды!', alert_low: 'Товар түгөнүп баратат:',
    history_title: 'Кыймыл тарыхы', all_products: 'Бардык товарлар', cur_stock: 'Азыркы калдык:',
    reports_title: 'Отчёттор', report: 'Отчёт', rep_stock: 'Датага калдык', rep_turn: 'Айлануу (оборот)', rep_top: 'Эң көп сатылгандар',
    on_date: 'Датага', from: 'Башы', to: 'Аягы', no_data: 'Маалымат жок', unit_short: 'Бирд.', sum: 'Суммасы', start: 'Башында', end: 'Аягында', turn: 'Айлануу', place: 'Орду', sold: 'Сатылды', revenue: 'Түшүм',
    xls_none: 'Экспорттоого маалымат жок', xls_lib: 'Excel китепканасы жүктөлгөн жок (интернет керек).',
    r_stock_t: 'Калдык', r_turn_t: 'Айлануу', r_top_t: 'Эң көп сатылгандар',
    users_title: 'Колдонуучулар', col_login: 'Логин', col_role: 'Ролу', role_changed: 'Ролу өзгөрдү',
    users_hint: 'Жаңы колдонуучулар өздөрү «Менеджер» ролу менен катталат — бул жерден ролун өзгөртөсүз.',
    d_products: 'Товарлар', d_value: 'Складдын наркы', d_low: 'Түгөнүп баратат', d_moves: '30 күндөгү операция',
    d_flow: '14 күндөгү киреше жана чыгаша', d_top: '30 күндөгү эң көп сатылгандар', d_lowlist: 'Заказ кылуу керек', d_none: 'Азырынча маалымат жок', d_all_ok: 'Баары жайында 👍',
    demo_load: 'Демо-маалымат', demo_confirm: '~45 демо-товар жана 30 күндүк тарых кошулсунбу?', demo_done: 'Демо-маалымат кошулду',
    demo_clear: 'Баарын тазалоо', demo_clear_confirm: 'БАРДЫК товар жана операцияларды өчүрөсүзбү? Кайтарууга болбойт.'
  }
};
let lang = localStorage.getItem(LANG) || 'ru';
if (!I18N[lang]) lang = 'ru';
const t = k => I18N[lang][k] ?? I18N.ru[k] ?? k;
const ROLE_KEYS = ['admin', 'keeper', 'manager'];

/* ===================== Дайындар катмары ===================== */
let db = { users: [], products: [], moves: [] };
let me = null;

async function hash(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
const pub = u => ({ id: u.id, login: u.login, name: u.name, role: u.role });

/* --- Локалдык режим --- */
const Local = {
  d: null,
  async init() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { }
    if (!d) d = { users: [{ id: uid(), login: 'admin', name: 'Администратор', role: 'admin', pass: await hash('admin123') }], products: [], moves: [] };
    d.products.forEach(p => { if (p.min_stock === undefined) p.min_stock = p.min || 0; delete p.min; if (p.photo === undefined) p.photo = ''; });
    this.d = d; this.save();
  },
  save() { localStorage.setItem(KEY, JSON.stringify(this.d)); },
  async session() {
    let s = null; try { s = JSON.parse(sessionStorage.getItem(SES) || 'null'); } catch { }
    const u = s && this.d.users.find(u => u.id === s.id);
    return u ? pub(u) : null;
  },
  async login(l, p) {
    const h = await hash(p), u = this.d.users.find(u => u.login === l.toLowerCase() && u.pass === h);
    if (!u) throw new Error(t('err_bad'));
    sessionStorage.setItem(SES, JSON.stringify({ id: u.id })); return pub(u);
  },
  async register(l, p, name) {
    l = l.toLowerCase();
    if (this.d.users.some(u => u.login === l)) throw new Error(t('err_exists'));
    const u = { id: uid(), login: l, name: name || l, role: 'manager', pass: await hash(p) };
    this.d.users.push(u); this.save();
    sessionStorage.setItem(SES, JSON.stringify({ id: u.id })); return pub(u);
  },
  async logout() { sessionStorage.removeItem(SES); },
  async load() { const d = this.d; return { users: d.users.map(pub), products: d.products.map(p => ({ ...p })), moves: d.moves.map(m => ({ ...m })) }; },
  async saveProduct(p, isNew) {
    if (isNew) this.d.products.push({ ...p, id: uid() }); else Object.assign(this.d.products.find(x => x.id === p.id), p);
    this.save();
  },
  async deleteProduct(id) { this.d.products = this.d.products.filter(p => p.id !== id); this.save(); },
  async addMove(m) { this.d.moves.push({ ...m, id: uid(), ts: Date.now() }); this.save(); },
  async setRole(id, role) { this.d.users.find(u => u.id === id).role = role; this.save(); },
  async deleteUser(id) { this.d.users = this.d.users.filter(u => u.id !== id); this.save(); },
  async addBulk(prods, mk) {
    prods.forEach(p => { p.id = uid(); });
    this.d.products.push(...prods.map(({ _per, _i, ...r }) => r));
    mk(prods).forEach(m => this.d.moves.push({ ...m, id: uid(), ts: Date.now() }));
    this.save();
  },
  async clearAll() { this.d.products = []; this.d.moves = []; this.save(); },
  canDeleteUsers: true
};

/* --- Supabase режими --- */
const Remote = {
  sb: null,
  async init() { this.sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY); },
  chk(r) { if (r.error) throw new Error(r.error.message); return r.data; },
  async profile(id) {
    const d = this.chk(await this.sb.from('profiles').select('*').eq('id', id).single());
    return { id: d.id, login: d.email, name: d.name, role: d.role };
  },
  async session() {
    const { data } = await this.sb.auth.getSession();
    return data.session ? this.profile(data.session.user.id) : null;
  },
  async login(email, password) {
    const d = this.chk(await this.sb.auth.signInWithPassword({ email, password }));
    return this.profile(d.user.id);
  },
  async register(email, password, name) {
    const d = this.chk(await this.sb.auth.signUp({ email, password, options: { data: { name } } }));
    if (!d.session) throw new Error(t('confirm_email'));
    return this.profile(d.user.id);
  },
  async logout() { await this.sb.auth.signOut(); },
  async load() {
    const [u, p, m] = await Promise.all([
      this.sb.from('profiles').select('*').order('email'),
      this.sb.from('products').select('*').order('name'),
      this.sb.from('moves').select('*').order('created_at')
    ]);
    return {
      users: this.chk(u).map(x => ({ id: x.id, login: x.email, name: x.name, role: x.role })),
      products: this.chk(p).map(x => ({ id: x.id, name: x.name, category: x.category || '', price: +x.price, unit: x.unit, barcode: x.barcode || '', min_stock: +x.min_stock, photo: x.photo || '' })),
      moves: this.chk(m).map(x => ({ id: x.id, productId: x.product_id, type: x.type, qty: +x.qty, date: x.date, supplier: x.supplier || '', reason: x.reason || '', note: x.note || '', user: x.user_name || '', ts: Date.parse(x.created_at) }))
    };
  },
  async saveProduct(p, isNew) {
    const row = { name: p.name, category: p.category, price: p.price, unit: p.unit, barcode: p.barcode, min_stock: p.min_stock, photo: p.photo };
    this.chk(isNew ? await this.sb.from('products').insert(row) : await this.sb.from('products').update(row).eq('id', p.id));
  },
  async deleteProduct(id) { this.chk(await this.sb.from('products').delete().eq('id', id)); },
  async addMove(m) {
    this.chk(await this.sb.from('moves').insert({ product_id: m.productId, type: m.type, qty: m.qty, date: m.date, supplier: m.supplier, reason: m.reason, note: m.note, user_name: m.user }));
  },
  async setRole(id, role) { this.chk(await this.sb.from('profiles').update({ role }).eq('id', id)); },
  async deleteUser() { },
  async addBulk(prods, mk) {
    const rows = prods.map(p => ({ name: p.name, category: p.category, price: p.price, unit: p.unit, barcode: p.barcode, min_stock: p.min_stock, photo: '' }));
    const ins = this.chk(await this.sb.from('products').insert(rows).select());
    prods.forEach(p => { p.id = ins.find(x => x.barcode === p.barcode).id; });
    const mv = mk(prods).map(m => ({ product_id: m.productId, type: m.type, qty: m.qty, date: m.date, supplier: m.supplier, reason: m.reason, note: m.note, user_name: m.user }));
    for (let i = 0; i < mv.length; i += 400) this.chk(await this.sb.from('moves').insert(mv.slice(i, i + 400)));
  },
  async clearAll() { },
  canDeleteUsers: false
};
const store = REMOTE ? Remote : Local;

/* ===================== Бизнес-логика ===================== */
const stock = (pid, date) => db.moves.filter(m => m.productId === pid && (!date || m.date <= date)).reduce((s, m) => s + (m.type === 'in' ? m.qty : -m.qty), 0);
const prod = id => db.products.find(p => p.id === id);
const lowItems = () => db.products.filter(p => stock(p.id) <= p.min_stock);
const can = { edit: () => ['admin', 'keeper'].includes(me.role), users: () => me.role === 'admin' };
const roleName = r => t(r);

window.api = { // кийин чыныгы REST API менен алмаштырууга болот
  products: () => db.products.map(p => ({ ...p, stock: stock(p.id) })),
  movements: pid => db.moves.filter(m => !pid || m.productId === pid),
  stockOn: date => db.products.map(p => ({ id: p.id, name: p.name, qty: stock(p.id, date) }))
};

async function act(fn) { try { await fn(); } catch (e) { console.error(e); alert((e && e.message) || String(e)); } }
async function refresh() { db = await store.load(); showApp(); }

/* ===================== Статикалык тексттер ===================== */
let tab = 'dash', mode = 'login';
function applyStatic() {
  document.documentElement.lang = lang === 'ky' ? 'ky' : 'ru';
  document.title = t('app_title');
  $$('[data-i18n]').forEach(el => el.textContent = t(el.dataset.i18n));
  $('#lblLogin').textContent = REMOTE ? t('email') : t('login');
  $('#aLogin').type = REMOTE ? 'email' : 'text';
  $('#authBtn').textContent = mode === 'login' ? t('do_login') : t('do_reg');
  $('#authHint').textContent = REMOTE ? t('hint_remote') : t('hint_local');
  $('#modeInfo').textContent = REMOTE ? t('info_remote') : t('info_local');
  $('#modeBadge').textContent = REMOTE ? t('mode_remote') : t('mode_local');
  $('#scanTitle').textContent = t('scan_title'); $('#scanCancel').textContent = t('cancel');
  $$('.langSel').forEach(s => { s.innerHTML = '<option value="ru">Русский</option><option value="ky">Кыргызча</option>'; s.value = lang; });
}
$$('.langSel').forEach(s => s.addEventListener('change', e => {
  lang = e.target.value; localStorage.setItem(LANG, lang); applyStatic(); me ? showApp() : null;
}));

/* ===================== Авторизация ===================== */
function authMode(m) {
  mode = m;
  $('#tabLogin').classList.toggle('active', m === 'login'); $('#tabReg').classList.toggle('active', m === 'reg');
  $('#aNameWrap').classList.toggle('hidden', m === 'login');
  $('#authBtn').textContent = m === 'login' ? t('do_login') : t('do_reg'); $('#aErr').textContent = '';
}
$('#tabLogin').onclick = () => authMode('login');
$('#tabReg').onclick = () => authMode('reg');
function showAuth() { $('#auth').classList.remove('hidden'); $('#app').classList.add('hidden'); }
$('#logoutBtn').onclick = () => act(async () => { await store.logout(); me = null; showAuth(); });

$('#authForm').addEventListener('submit', async e => {
  e.preventDefault();
  const err = $('#aErr'); err.textContent = '';
  try {
    const l = $('#aLogin').value.trim(), p = $('#aPass').value;
    me = mode === 'login' ? await store.login(l, p) : await store.register(l, p, $('#aName').value.trim());
    $('#authForm').reset(); await refresh();
  } catch (ex) { err.textContent = ex.message; }
});

/* ===================== Каркас ===================== */
function showApp() {
  $('#auth').classList.add('hidden'); $('#app').classList.remove('hidden');
  $('#whoami').textContent = `${me.name} (${roleName(me.role)})`;
  const tabs = [['dash', '📊'], ['stock', '📦']];
  if (can.edit()) tabs.push(['in', '⬇️'], ['out', '⬆️']);
  tabs.push(['history', '🕘'], ['reports', '📑']);
  if (can.users()) tabs.push(['users', '👥']);
  if (!tabs.some(x => x[0] === tab)) tab = 'dash';
  $('#nav').innerHTML = tabs.map(([k, i]) => `<button class="${k === tab ? 'active' : ''}" onclick="go('${k}')">${i} ${t('n_' + k)}</button>`).join('');
  renderAlerts();
  ({ dash: viewDash, stock: viewStock, in: viewIn, out: viewOut, history: viewHistory, reports: viewReports, users: viewUsers })[tab]();
}
window.go = k => { tab = k; showApp(); };
function renderAlerts() {
  const low = lowItems();
  $('#alerts').innerHTML = low.length ? `<div class="alert">⚠️ ${t('alert_low')} ${low.map(p => `<b>${esc(p.name)}</b> (${fmt(stock(p.id))} ${esc(p.unit)})`).join(', ')}</div>` : '';
}
function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2600); }

function dialog(html, onSubmit) {
  const f = $('#dlgForm');
  f.innerHTML = html + `<div class="dlgbtns"><button type="button" class="sec" id="dlgCancel">${t('cancel')}</button><button class="primary">${t('save')}</button></div>`;
  $('#dlgCancel').onclick = () => $('#dlg').close();
  f.onsubmit = e => { e.preventDefault(); act(() => onSubmit(new FormData(f))); };
  $('#dlg').showModal();
}
const thumb = (p, big) => p.photo ? `<img class="thumb ${big ? 'big' : ''}" src="${esc(p.photo)}" alt="">` : `<span class="thumb ${big ? 'big' : ''}">📦</span>`;

/* ===================== Штрихкод сканери ===================== */
let zx = null;
function scanBarcode(cb) {
  if (!window.ZXing || !navigator.mediaDevices) return alert(t('scan_err'));
  const d = $('#scanDlg'); $('#scanHint').textContent = t('scan_hint'); d.showModal();
  zx = new ZXing.BrowserMultiFormatReader();
  $('#scanCancel').onclick = () => d.close();
  zx.decodeFromVideoDevice(null, 'scanVideo', res => { if (res) { d.close(); cb(res.getText()); } })
    .catch(() => { d.close(); alert(t('scan_err')); });
}
$('#scanDlg').addEventListener('close', () => { try { zx && zx.reset(); } catch { } zx = null; });

function resizeImage(file, max = 200) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', .72));
    };
    img.onerror = rej; img.src = url;
  });
}

/* ===================== Обзор (dashboard) ===================== */
function viewDash() {
  const low = lowItems(), value = db.products.reduce((s, p) => s + stock(p.id) * p.price, 0);
  const since = daysAgo(30), m30 = db.moves.filter(m => m.date >= since);
  const days = [...Array(14)].map((_, i) => daysAgo(13 - i));
  const flow = days.map(d => ({ d, i: db.moves.filter(m => m.date === d && m.type === 'in').reduce((s, m) => s + m.qty, 0), o: db.moves.filter(m => m.date === d && m.type === 'out').reduce((s, m) => s + m.qty, 0) }));
  const mx = Math.max(1, ...flow.flatMap(x => [x.i, x.o]));
  const top = db.products.map(p => ({ p, q: m30.filter(m => m.productId === p.id && m.type === 'out' && m.reason === 'sale').reduce((s, m) => s + m.qty, 0) })).filter(x => x.q > 0).sort((a, b) => b.q - a.q).slice(0, 5);
  const tmx = top.length ? top[0].q : 1;
  $('#view').innerHTML = `
  <div class="cards">
    <div class="stat"><div class="k">${t('d_products')}</div><div class="v">${db.products.length}</div></div>
    <div class="stat"><div class="k">${t('d_value')}</div><div class="v">${fmt(value)}</div></div>
    <div class="stat ${low.length ? 'warn' : ''}"><div class="k">${t('d_low')}</div><div class="v">${low.length}</div></div>
    <div class="stat"><div class="k">${t('d_moves')}</div><div class="v">${m30.length}</div></div>
  </div>
  <div class="grid2">
    <div class="panel"><h3>${t('d_flow')}</h3>
      <div class="flow">${flow.map(x => `<div class="d" title="${x.d}: +${fmt(x.i)} / −${fmt(x.o)}"><div class="bars"><div class="bar bi" style="height:${x.i / mx * 100}%"></div><div class="bar bo" style="height:${x.o / mx * 100}%"></div></div><small>${x.d.slice(8)}</small></div>`).join('')}</div>
      <div class="legend"><span><i style="background:var(--green)"></i>${t('t_in')}</span><span><i style="background:var(--orange)"></i>${t('t_out')}</span></div>
    </div>
    <div class="panel"><h3>${t('d_lowlist')}</h3>
      ${low.length ? `<ul class="low">${low.map(p => `<li><b>${esc(p.name)}</b> — ${fmt(stock(p.id))} / ${fmt(p.min_stock)} ${esc(p.unit)}</li>`).join('')}</ul>` : `<p class="muted">${t('d_all_ok')}</p>`}
    </div>
  </div>
  <div class="panel"><h3>${t('d_top')}</h3>
    ${top.length ? top.map(x => `<div class="hbar"><div class="t"><span>${esc(x.p.name)}</span><b>${fmt(x.q)} ${esc(x.p.unit)}</b></div><div class="tr"><span style="width:${x.q / tmx * 100}%"></span></div></div>`).join('') : `<p class="muted">${t('d_none')}</p>`}
  </div>`;
}

/* ===================== Товарлар ===================== */
let q = '';
function viewStock() {
  $('#view').innerHTML = `<div class="panel"><h2>${t('stock_title')}</h2>
    <div class="tools"><input id="q" placeholder="${t('search')}" value="${esc(q)}">
      ${can.edit() ? `<button class="primary" id="addP">${t('add_product')}</button><button class="sec" id="demoB">🧪 ${t('demo_load')}</button>` : ''}
      ${!REMOTE && me.role === 'admin' ? `<button class="sec danger" id="clrB">${t('demo_clear')}</button>` : ''}</div>
    <div class="tablewrap"><table><thead><tr><th>${t('f_name')}</th><th>${t('f_category')}</th><th class="num">${t('f_price')}</th><th>${t('f_barcode')}</th><th class="num">${t('f_stock')}</th><th class="num">${t('f_min')}</th><th></th></tr></thead><tbody id="rows"></tbody></table></div></div>`;
  $('#q').oninput = e => { q = e.target.value; rows(); };
  if (can.edit()) {
    $('#addP').onclick = () => editProduct();
    $('#demoB').onclick = () => act(async () => { if (!confirm(t('demo_confirm'))) return; await loadDemo(); await refresh(); toast(t('demo_done')); });
  }
  if ($('#clrB')) $('#clrB').onclick = () => act(async () => { if (!confirm(t('demo_clear_confirm'))) return; await store.clearAll(); await refresh(); });
  rows();
}

/* ===== Демо-маалымат: чыныгы дүкөнгө окшош товарлар жана 30 күндүк тарых ===== */
// [аты, категория, баа (сом), бирдик, мин. калдык, күнүнө орточо сатуу]
const DEMO = [
  ['Молоко 3.2% 1 л', 'Молочные', 95, 'шт', 20, 14], ['Кефир 1 л', 'Молочные', 85, 'шт', 15, 8], ['Сметана 400 г', 'Молочные', 120, 'шт', 10, 5],
  ['Масло сливочное 180 г', 'Молочные', 210, 'шт', 10, 4], ['Йогурт клубничный', 'Молочные', 60, 'шт', 20, 9], ['Сыр твёрдый', 'Молочные', 780, 'кг', 3, 1.2], ['Творог 5% 200 г', 'Молочные', 110, 'шт', 10, 4],
  ['Хлеб белый', 'Хлеб и выпечка', 28, 'шт', 30, 40], ['Лепёшка (нан)', 'Хлеб и выпечка', 25, 'шт', 30, 35], ['Батон нарезной', 'Хлеб и выпечка', 45, 'шт', 20, 18], ['Булочка с маком', 'Хлеб и выпечка', 35, 'шт', 15, 12],
  ['Вода негазированная 1.5 л', 'Напитки', 55, 'шт', 30, 25], ['Кола 1 л', 'Напитки', 95, 'шт', 20, 14], ['Сок яблочный 1 л', 'Напитки', 130, 'шт', 12, 7], ['Чай чёрный 100 пак.', 'Напитки', 210, 'шт', 8, 3], ['Кофе растворимый 95 г', 'Напитки', 420, 'шт', 6, 2],
  ['Рис 1 кг', 'Бакалея', 110, 'кг', 25, 9], ['Гречка 1 кг', 'Бакалея', 120, 'кг', 25, 8], ['Сахар 1 кг', 'Бакалея', 95, 'кг', 30, 12], ['Мука 2 кг', 'Бакалея', 140, 'шт', 15, 6],
  ['Макароны 400 г', 'Бакалея', 55, 'шт', 25, 14], ['Масло подсолнечное 1 л', 'Бакалея', 190, 'шт', 15, 7], ['Соль 1 кг', 'Бакалея', 25, 'шт', 15, 4], ['Яйца 10 шт', 'Бакалея', 130, 'уп.', 20, 16],
  ['Курица охлаждённая', 'Мясо', 340, 'кг', 10, 6], ['Говядина', 'Мясо', 620, 'кг', 8, 4], ['Колбаса варёная', 'Мясо', 480, 'кг', 5, 2.5], ['Сосиски 400 г', 'Мясо', 240, 'шт', 10, 6],
  ['Шоколад молочный 90 г', 'Сладости', 120, 'шт', 15, 8], ['Печенье овсяное 300 г', 'Сладости', 95, 'шт', 15, 7], ['Конфеты ассорти', 'Сладости', 520, 'кг', 4, 1.5], ['Халва 350 г', 'Сладости', 150, 'шт', 8, 3],
  ['Картофель', 'Овощи и фрукты', 40, 'кг', 40, 22], ['Лук репчатый', 'Овощи и фрукты', 30, 'кг', 25, 10], ['Морковь', 'Овощи и фрукты', 35, 'кг', 20, 8], ['Помидоры', 'Овощи и фрукты', 120, 'кг', 15, 9],
  ['Яблоки', 'Овощи и фрукты', 90, 'кг', 20, 10], ['Бананы', 'Овощи и фрукты', 140, 'кг', 15, 8],
  ['Мыло хозяйственное', 'Бытовая химия', 70, 'шт', 10, 3], ['Порошок стиральный 3 кг', 'Бытовая химия', 520, 'шт', 5, 1.5], ['Шампунь 400 мл', 'Бытовая химия', 310, 'шт', 6, 2],
  ['Зубная паста 100 мл', 'Бытовая химия', 150, 'шт', 8, 3], ['Туалетная бумага 4 рул.', 'Бытовая химия', 120, 'шт', 15, 6], ['Салфетки 100 шт', 'Бытовая химия', 45, 'шт', 15, 5]
];
const DEMO_SUPPLIER = { 'Молочные': 'Бишкек-Сүт', 'Хлеб и выпечка': 'Нан-Сервис', 'Напитки': 'Азия-Трейд', 'Бакалея': 'ИП Асанов', 'Мясо': 'Ала-Тоо Эт', 'Сладости': 'Азия-Трейд', 'Овощи и фрукты': 'Ош Базар Опт', 'Бытовая химия': 'ИП Асанов' };

async function loadDemo() {
  let seed = 7; // бирдей натыйжа үчүн туруктуу кокус сан
  const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let x = Math.imul(seed ^ seed >>> 15, 1 | seed); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; };
  const have = new Set(db.products.map(p => p.barcode));
  const prods = DEMO.map((d, i) => ({ name: d[0], category: d[1], price: d[2], unit: d[3], min_stock: d[4], barcode: '4780001' + String(100001 + i), photo: '', _per: d[5], _i: i }))
    .filter(p => !have.has(p.barcode));
  const mk = list => {
    const out = [];
    list.forEach(p => {
      const per = p._per, sup = DEMO_SUPPLIER[p.category], low = p._i % 9 === 4;
      const dec = n => (per < 3 ? Math.round(n * 2) / 2 : Math.round(n));
      let st = Math.max(dec(per * 18), p.min_stock * 2);
      const add = (d, type, qty, extra) => out.push({ productId: p.id, type, qty, date: daysAgo(d), supplier: '', reason: '', note: '', user: me.name, ...extra });
      add(30, 'in', st, { supplier: sup, reason: 'supply' });
      for (let d = 29; d >= 0; d--) {
        if (d % 7 === 3 && !(low && d < 12)) { const q = Math.max(dec(per * 7), 1); add(d, 'in', q, { supplier: sup, reason: 'supply' }); st += q; }
        let q = dec(per * (0.6 + rnd() * 0.8)); if (q > st) q = st;
        if (q > 0) { add(d, 'out', q, { reason: 'sale' }); st -= q; }
        if (rnd() < 0.03 && st >= 2) { add(d, 'out', 1, { reason: 'spoilage', note: 'срок годности' }); st -= 1; }
      }
      if (low) { const q = st - Math.floor(p.min_stock / 2); if (q > 0) add(0, 'out', q, { reason: 'sale' }); }
    });
    return out;
  };
  const clean = prods.map(({ _per, _i, ...r }) => ({ ...r, _per, _i }));
  await store.addBulk(clean, mk);
}
function rows() {
  const s = q.toLowerCase();
  const list = db.products.filter(p => !s || [p.name, p.category, p.barcode].join(' ').toLowerCase().includes(s));
  $('#rows').innerHTML = list.map(p => {
    const st = stock(p.id), low = st <= p.min_stock;
    return `<tr><td><div class="pname">${thumb(p)}<span>${esc(p.name)}</span></div></td><td>${esc(p.category)}</td><td class="num">${fmt(p.price)}</td><td>${esc(p.barcode)}</td>
      <td class="num"><b>${fmt(st)}</b> ${esc(p.unit)} <span class="badge ${low ? 'b-low' : 'b-ok'}">${low ? t('low') : t('ok')}</span></td><td class="num">${fmt(p.min_stock)}</td>
      <td class="num">${can.edit() ? `<button class="sec" onclick="editProduct('${p.id}')">✎</button> <button class="sec danger" onclick="delProduct('${p.id}')">🗑</button>` : ''}</td></tr>`;
  }).join('') || `<tr><td colspan="7" class="muted">${t('no_products')}</td></tr>`;
}
window.editProduct = id => {
  const p = id ? prod(id) : { name: '', category: '', price: 0, unit: t('pcs'), barcode: '', min_stock: 0, photo: '' };
  let photo = p.photo || '';
  dialog(`<h3>${id ? t('edit_product') : t('new_product')}</h3>
    <div class="photoRow"><span id="phPrev">${thumb({ photo }, true)}</span>
      <label class="filebtn" style="margin:0">📷 ${t('f_photo')}<input type="file" accept="image/*" id="phIn" hidden></label>
      <button type="button" class="sec" id="phDel">✕</button></div>
    <label>${t('f_name')} <input name="name" required value="${esc(p.name)}"></label>
    <label>${t('f_category')} <input name="category" value="${esc(p.category)}"></label>
    <div class="row"><label>${t('f_price')} <input name="price" type="number" step="0.01" min="0" value="${p.price}"></label>
    <label>${t('f_unit')} <input name="unit" value="${esc(p.unit)}"></label></div>
    <label>${t('f_barcode')} <div class="inl"><input name="barcode" id="bcIn" value="${esc(p.barcode)}"><button type="button" class="sec" id="bcScan">📷 ${t('scan')}</button></div></label>
    <label>${t('f_min')} <input name="min" type="number" min="0" step="any" value="${p.min_stock}"></label>`,
    async fd => {
      const d = { name: fd.get('name').trim(), category: fd.get('category').trim(), price: +fd.get('price'), unit: fd.get('unit').trim() || t('pcs'), barcode: fd.get('barcode').trim(), min_stock: +fd.get('min'), photo };
      if (d.barcode && db.products.some(x => x.barcode === d.barcode && x.id !== id)) return alert(t('dup_barcode'));
      await store.saveProduct(id ? { ...d, id } : d, !id);
      $('#dlg').close(); await refresh(); toast(t('saved'));
    });
  $('#phIn').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try { photo = await resizeImage(f); $('#phPrev').innerHTML = thumb({ photo }, true); } catch { }
  };
  $('#phDel').onclick = () => { photo = ''; $('#phPrev').innerHTML = thumb({ photo }, true); };
  $('#bcScan').onclick = () => scanBarcode(code => { $('#bcIn').value = code; });
};
window.delProduct = id => act(async () => {
  if (db.moves.some(m => m.productId === id)) return alert(t('has_history'));
  if (!confirm(t('confirm_del'))) return;
  await store.deleteProduct(id); await refresh();
});

/* ===================== Киреше / Чыгаша ===================== */
const prodOptions = () => db.products.map(p => `<option value="${p.id}">${esc(p.name)} (${t('in_stock')}: ${fmt(stock(p.id))} ${esc(p.unit)})</option>`).join('');
function moveForm(type) {
  const isIn = type === 'in';
  const last = db.moves.filter(m => m.type === type).slice(-10).reverse();
  $('#view').innerHTML = `<div class="panel"><h2>${isIn ? t('in_title') : t('out_title')}</h2>
    ${db.products.length ? `<form id="mf">
      <label>${t('f_barcode')} <div class="inl"><input id="bc" placeholder="${t('f_barcode')}" autocomplete="off"><button type="button" class="sec" id="bcScan">📷 ${t('scan')}</button></div></label>
      <div class="row"><label>${t('product')} <select name="pid" required>${prodOptions()}</select></label>
        <label>${t('qty')} <input name="qty" type="number" min="0.01" step="any" required></label>
        <label>${t('date')} <input name="date" type="date" value="${today()}" required></label></div>
      <div class="row">${isIn ? `<label>${t('supplier')} <input name="supplier" required></label>`
        : `<label>${t('reason')} <select name="reason"><option value="sale">${t('sale')}</option><option value="spoilage">${t('spoilage')}</option></select></label>`}
        <label>${t('note')} <input name="note"></label>
        <button class="primary">${isIn ? t('accept') : t('writeoff')}</button></div></form>` : `<p class="muted">${t('add_first')}</p>`}
  </div><div class="panel"><h3>${t('recent')}</h3>${movesTable(last)}</div>`;
  const f = $('#mf'); if (!f) return;
  const pick = code => {
    const p = db.products.find(x => x.barcode && x.barcode === code.trim());
    if (!p) return toast(t('not_found'));
    f.pid.value = p.id; f.qty.focus(); $('#bc').value = '';
  };
  $('#bc').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); pick(e.target.value); } };
  $('#bcScan').onclick = () => scanBarcode(pick);
  f.onsubmit = e => {
    e.preventDefault();
    act(async () => {
      const fd = new FormData(f), pid = fd.get('pid'), qty = +fd.get('qty'), p = prod(pid);
      if (!isIn && qty > stock(pid)) return alert(`${t('not_enough')} ${fmt(stock(pid))} ${p.unit}`);
      await store.addMove({ productId: pid, type, qty, date: fd.get('date'), supplier: fd.get('supplier') || '', reason: isIn ? 'supply' : fd.get('reason'), note: fd.get('note') || '', user: me.name });
      await refresh();
      toast(isIn ? t('in_done') : t('out_done'));
      if (!isIn && stock(pid) <= p.min_stock) setTimeout(() => toast(`⚠️ «${p.name}» ${t('low_warn')}`), 2800);
    });
  };
}
const viewIn = () => moveForm('in'), viewOut = () => moveForm('out');

const reasonName = r => ({ supply: t('supply'), sale: t('sale'), spoilage: t('spoilage') }[r] || r);
function movesTable(list) {
  return `<div class="tablewrap"><table><thead><tr><th>${t('date')}</th><th>${t('product')}</th><th></th><th class="num">${t('qty')}</th><th>${t('sup_reason')}</th><th>${t('note')}</th><th>${t('who')}</th></tr></thead><tbody>
  ${list.map(m => { const p = prod(m.productId) || {}; return `<tr><td>${m.date}</td><td>${esc(p.name)}</td>
    <td><span class="badge ${m.type === 'in' ? 'b-in' : 'b-out'}">${m.type === 'in' ? t('t_in') : t('t_out')}</span></td>
    <td class="num">${fmt(m.qty)} ${esc(p.unit)}</td><td>${m.type === 'in' ? esc(m.supplier) : reasonName(m.reason)}</td><td>${esc(m.note)}</td><td>${esc(m.user)}</td></tr>`; }).join('') || `<tr><td colspan="7" class="muted">${t('no_ops')}</td></tr>`}
  </tbody></table></div>`;
}

/* ===================== Тарых ===================== */
let hp = '';
function viewHistory() {
  const list = db.moves.filter(m => !hp || m.productId === hp).slice().sort((a, b) => b.date.localeCompare(a.date) || (b.ts || 0) - (a.ts || 0));
  $('#view').innerHTML = `<div class="panel"><h2>${t('history_title')}</h2>
    <div class="tools"><select id="hp" style="max-width:340px"><option value="">${t('all_products')}</option>
      ${db.products.map(p => `<option value="${p.id}" ${p.id === hp ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
    ${hp && prod(hp) ? `<p>${t('cur_stock')} <b>${fmt(stock(hp))} ${esc(prod(hp).unit)}</b></p>` : ''}${movesTable(list)}</div>`;
  $('#hp').onchange = e => { hp = e.target.value; viewHistory(); };
}

/* ===================== Отчёттор ===================== */
let lastReport = { title: '', head: [], rows: [] };
const R = { kind: 'stock', date: today(), from: today().slice(0, 8) + '01', to: today() };
function viewReports() {
  $('#view').innerHTML = `<div class="panel"><h2>${t('reports_title')}</h2>
    <div class="row noprint">
      <label>${t('report')} <select id="rk">${[['stock', 'rep_stock'], ['turn', 'rep_turn'], ['top', 'rep_top']].map(([k, n]) => `<option value="${k}" ${R.kind === k ? 'selected' : ''}>${t(n)}</option>`).join('')}</select></label>
      ${R.kind === 'stock' ? `<label>${t('on_date')} <input type="date" id="rd" value="${R.date}"></label>`
        : `<label>${t('from')} <input type="date" id="rf" value="${R.from}"></label><label>${t('to')} <input type="date" id="rt" value="${R.to}"></label>`}
      <button class="sec" id="xl">⬇ Excel</button><button class="sec" id="pdf">⬇ PDF</button>
    </div><div id="rep"></div></div>`;
  $('#rk').onchange = e => { R.kind = e.target.value; viewReports(); };
  if ($('#rd')) $('#rd').onchange = e => { R.date = e.target.value; viewReports(); };
  if ($('#rf')) { $('#rf').onchange = e => { R.from = e.target.value; viewReports(); }; $('#rt').onchange = e => { R.to = e.target.value; viewReports(); }; }
  $('#xl').onclick = exportXLSX; $('#pdf').onclick = () => window.print();

  let title, head, out;
  if (R.kind === 'stock') {
    title = `${t('r_stock_t')} ${R.date}`; head = [t('f_name'), t('f_category'), t('f_stock'), t('unit_short'), t('sum')];
    out = db.products.map(p => { const s = stock(p.id, R.date); return [p.name, p.category, s, p.unit, +(s * p.price).toFixed(2)]; });
  } else {
    const inP = db.moves.filter(m => m.date >= R.from && m.date <= R.to);
    const dayBefore = ymd(new Date(new Date(R.from).getTime() - 864e5));
    const calc = p => {
      const mv = inP.filter(m => m.productId === p.id), sum = f => mv.filter(f).reduce((s, m) => s + m.qty, 0);
      const inn = sum(m => m.type === 'in'), outq = sum(m => m.type === 'out'), sold = sum(m => m.type === 'out' && m.reason === 'sale');
      const start = stock(p.id, dayBefore), end = stock(p.id, R.to), avg = (start + end) / 2;
      return { p, inn, out: outq, sold, start, end, turn: avg > 0 ? +(outq / avg).toFixed(2) : 0 };
    };
    if (R.kind === 'turn') {
      title = `${t('r_turn_t')} ${R.from} — ${R.to}`; head = [t('f_name'), t('start'), t('t_in'), t('t_out'), t('end'), t('turn')];
      out = db.products.map(calc).map(x => [x.p.name, x.start, x.inn, x.out, x.end, x.turn]);
    } else {
      title = `${t('r_top_t')} ${R.from} — ${R.to}`; head = [t('place'), t('f_name'), t('sold'), t('revenue')];
      out = db.products.map(calc).filter(x => x.sold > 0).sort((a, b) => b.sold - a.sold).map((x, i) => [i + 1, x.p.name, x.sold, +(x.sold * x.p.price).toFixed(2)]);
    }
  }
  lastReport = { title, head, rows: out };
  $('#rep').innerHTML = `<h3>${esc(title)}</h3><div class="tablewrap"><table><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>
    ${out.map(r => `<tr>${r.map(c => `<td class="${typeof c === 'number' ? 'num' : ''}">${typeof c === 'number' ? fmt(c) : esc(c)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${head.length}" class="muted">${t('no_data')}</td></tr>`}</tbody></table></div>`;
}
function exportXLSX() {
  const { title, head, rows } = lastReport;
  if (!rows.length) return alert(t('xls_none'));
  if (typeof XLSX === 'undefined') return alert(t('xls_lib'));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([head, ...rows]), 'Report');
  XLSX.writeFile(wb, title.replace(/[^\wа-яёәңөү-]+/gi, '_') + '.xlsx');
}

/* ===================== Колдонуучулар (админ) ===================== */
function viewUsers() {
  $('#view').innerHTML = `<div class="panel"><h2>${t('users_title')}</h2>
    <div class="tablewrap"><table><thead><tr><th>${t('col_login')}</th><th>${t('name')}</th><th>${t('col_role')}</th><th></th></tr></thead><tbody>
    ${db.users.map(u => `<tr><td>${esc(u.login)}</td><td>${esc(u.name)}</td>
      <td><select data-uid="${u.id}" class="roleSel" ${u.id === me.id ? 'disabled' : ''}>${ROLE_KEYS.map(k => `<option value="${k}" ${u.role === k ? 'selected' : ''}>${roleName(k)}</option>`).join('')}</select></td>
      <td class="num">${u.id === me.id || !store.canDeleteUsers ? '' : `<button class="sec danger" data-del="${u.id}">🗑</button>`}</td></tr>`).join('')}
    </tbody></table></div><p class="muted">${t('users_hint')}</p></div>`;
  $$('.roleSel').forEach(s => s.onchange = e => act(async () => { await store.setRole(e.target.dataset.uid, e.target.value); await refresh(); toast(t('role_changed')); }));
  $$('[data-del]').forEach(b => b.onclick = () => act(async () => { if (confirm(t('confirm_del'))) { await store.deleteUser(b.dataset.del); await refresh(); } }));
}

/* ===================== Баштоо ===================== */
(async function init() {
  applyStatic();
  try {
    await store.init();
    me = await store.session();
    me ? await refresh() : showAuth();
  } catch (e) { console.error(e); showAuth(); $('#aErr').textContent = e.message || String(e); }
})();
