/* app.js — Productivity Hub (vanilla JS, no backend). */
'use strict';
(function () {
  /* ---------- Telegram ---------- */
  const tg = (window.Telegram && window.Telegram.WebApp) || null;
  const tgOk = !!(tg && tg.initData);
  const T = (f) => { try { return f(); } catch (e) { return undefined; } };
  const hap = (t) => T(() => (t === 'error' || t === 'success') ? tg.HapticFeedback.notificationOccurred(t) : tg.HapticFeedback.impactOccurred('light'));

  /* ---------- helpers ---------- */
  const $ = (s, e = document) => e.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const pad = (n) => String(n).padStart(2, '0');
  const ds = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const today = () => ds(new Date());
  const addDays = (s, n) => { const d = new Date(s + 'T00:00'); d.setDate(d.getDate() + n); return ds(d); };
  const fdate = (s, o) => new Date(s + 'T00:00').toLocaleDateString(undefined, o || { weekday: 'short', day: 'numeric', month: 'short' });
  const RD = /^\d{4}-\d{2}-\d{2}$/, RT = /^\d{2}:\d{2}$/;
  const sum = (a) => a.reduce((s, x) => s + Math.round(x.amount * 1000), 0) / 1000;
  const omr = (n) => (n < 0 ? '−' : '') + Math.abs(n).toFixed(3) + ' OMR';
  const fmtN = (n) => String(parseFloat(Number(n).toPrecision(12)));
  const by = (k, id) => S[k].find((x) => x.id === id);

  const P = {
    home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    tasks: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    wallet: '<path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2z"/><circle cx="16.5" cy="14.5" r="1"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    note: '<path d="M5 3h9l5 5v13H5z"/><path d="M14 3v5h5M8 13h8M8 17h6"/>',
    flame: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
    calc: '<rect x="4" y="2" width="16" height="20" rx="3"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 18h.01M12 18h.01M16 18h.01"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h3M20 17v4"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    pin: '<path d="M12 17v5M8 3h8l-1 7 3 4H6l3-4z"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
  };
  const I = (n) => '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + P[n] + '</svg>';
  const empty = (ic, t, m) => '<div class="empty">' + I(ic) + '<b>' + t + '</b>' + m + '</div>';

  /* ---------- state ---------- */
  let S = Store.load();
  let route = 'home', filter = 'all', plDate = today(), nq = '', ctab = 'std', qrs = null;
  const SUB = ['notes', 'habits', 'focus', 'calc', 'qr', 'settings'];
  const TITLES = { home: 'Productivity Hub', tasks: 'Tasks', planner: 'Planner', money: 'Money', more: 'More', notes: 'Notes', habits: 'Habits', focus: 'Focus timer', calc: 'Calculator', qr: 'QR generator', settings: 'Settings' };
  const commit = (k) => { if (!Store.save(k, S[k]) && !commit.warned) { commit.warned = true; toast('Storage is blocked here. Changes will be lost when you close the app.'); } render(); };

  let tt;
  function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2600); }
  function ask(msg, cb) {
    if (tgOk && tg.isVersionAtLeast && tg.isVersionAtLeast('6.2')) tg.showConfirm(msg, (ok) => ok && cb());
    else if (window.confirm(msg)) cb();
  }

  /* ---------- theme ---------- */
  function applyTheme() {
    const th = S.settings.theme, r = document.documentElement;
    const mode = th !== 'auto' ? th : (tgOk && tg.colorScheme) || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
    r.dataset.theme = mode;
    const map = { '--bg': 'secondary_bg_color', '--surface': 'bg_color', '--ink': 'text_color', '--hint': 'hint_color', '--accent': 'button_color', '--on-accent': 'button_text_color' };
    const p = (tgOk && tg.themeParams) || {};
    Object.keys(map).forEach((v) => (th === 'auto' && p[map[v]]) ? r.style.setProperty(v, p[map[v]]) : r.style.removeProperty(v));
    const bg = getComputedStyle(r).getPropertyValue('--bg').trim();
    if (tgOk && /^#[0-9a-f]{6}$/i.test(bg)) { T(() => tg.setHeaderColor(bg)); T(() => tg.setBackgroundColor(bg)); T(() => tg.setBottomBarColor(getComputedStyle(r).getPropertyValue('--surface').trim())); }
  }

  /* ---------- sheet (modal form) ---------- */
  let SH = null;
  function closeSheet(now) { if (!SH) return; const o = SH; SH = null; o.classList.remove('show'); if (now) o.remove(); else setTimeout(() => o.remove(), 220); }
  function sheet(title, fields, save, del) {
    closeSheet(true);
    const inp = (f) => f.t === 'select'
      ? '<select name="' + f.k + '">' + f.o.map((x) => '<option' + (x === f.v ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '</select>'
      : f.t === 'textarea'
        ? '<textarea name="' + f.k + '" maxlength="5000" placeholder="' + esc(f.p || '') + '">' + esc(f.v || '') + '</textarea>'
        : '<input name="' + f.k + '" type="' + (f.t || 'text') + '" value="' + esc(f.v) + '" ' + (f.x || '') + ' autocomplete="off">';
    const o = document.createElement('div');
    o.className = 'ov';
    o.innerHTML = '<form class="sheet" novalidate><div class="grab"></div><h3>' + title + '</h3>' +
      fields.map((f) => '<label><span>' + f.l + '</span>' + inp(f) + '</label>').join('') +
      '<p class="err" hidden></p><div class="row">' + (del ? '<button type="button" class="btn danger" data-d>Delete</button>' : '') +
      '<button type="button" class="btn ghost" data-c>Cancel</button><button class="btn">Save</button></div></form>';
    document.body.appendChild(o); SH = o;
    const form = $('form', o), err = $('.err', o);
    o.addEventListener('pointerdown', (e) => { if (e.target === o) closeSheet(); });
    $('[data-c]', o).onclick = () => closeSheet();
    if (del) $('[data-d]', o).onclick = () => ask('Delete this item? This cannot be undone.', () => { closeSheet(); del(); });
    form.onsubmit = (e) => {
      e.preventDefault();
      const v = {}; fields.forEach((f) => (v[f.k] = form.elements[f.k].value.trim()));
      const m = save(v);
      if (m) { err.textContent = m; err.hidden = false; hap('error'); } else { closeSheet(); hap('success'); }
    };
    requestAnimationFrame(() => o.classList.add('show'));
    if (!matchMedia('(pointer:coarse)').matches) T(() => form.elements[fields[0].k].focus());
  }

  /* ---------- views ---------- */
  const VIEWS = {}, POST = {}, A = {};

  VIEWS.home = () => {
    const t = today();
    const tk = S.tasks.filter((x) => !x.done || x.doneOn === t), td = tk.filter((x) => x.done).length;
    const hd = S.habits.filter((h) => h.done.includes(t)).length, tot = tk.length + S.habits.length;
    const pct = tot ? Math.round(((td + hd) / tot) * 100) : 0, C = 2 * Math.PI * 52;
    const mo = S.expenses.filter((x) => x.date.startsWith(t.slice(0, 7)));
    const bal = sum(S.expenses.filter((x) => x.type === 'income')) - sum(S.expenses.filter((x) => x.type === 'expense'));
    const ev = S.events.filter((e) => e.date === t).sort((a, b) => a.time.localeCompare(b.time));
    const hr = new Date().getHours(), g = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
    const nm = tgOk && tg.initDataUnsafe && tg.initDataUnsafe.user ? ', ' + esc(tg.initDataUnsafe.user.first_name) : '';
    return '<div class="card hero"><div class="ring"><svg viewBox="0 0 120 120"><circle class="tr" cx="60" cy="60" r="52"/><circle class="pr" cx="60" cy="60" r="52" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - pct / 100)).toFixed(1) + '"/></svg><b>' + pct + '%</b></div>' +
      '<div><h3>' + g + nm + '</h3><div class="muted">' + (tot ? (td + hd) + ' of ' + tot + ' tasks and habits done today' : 'Add a task or habit to start tracking your day.') + '</div></div></div>' +
      '<div class="grid2">' +
      '<button class="stat" data-a="go" data-r="tasks">' + I('tasks') + '<b>' + S.tasks.filter((x) => !x.done).length + '</b><span class="muted">Open tasks</span></button>' +
      '<button class="stat" data-a="go" data-r="money">' + I('wallet') + '<b class="' + (bal < 0 ? 'neg' : '') + '">' + omr(bal) + '</b><span class="muted">Balance</span></button>' +
      '<button class="stat" data-a="go" data-r="habits">' + I('flame') + '<b>' + hd + '/' + S.habits.length + '</b><span class="muted">Habits today</span></button>' +
      '<button class="stat" data-a="go" data-r="money">' + I('wallet') + '<b>' + omr(sum(mo.filter((x) => x.type === 'expense'))) + '</b><span class="muted">Spent this month</span></button></div>' +
      '<h2>Today’s schedule</h2>' + (ev.length ? ev.map((e) => '<button class="li" style="width:100%" data-a="go" data-r="planner"><b>' + e.time + '</b><span class="grow t">' + esc(e.title) + '</span></button>').join('') : empty('cal', 'Nothing scheduled', 'Plan your day in the Planner tab.'));
  };

  const PR = { High: 3, Medium: 2, Low: 1 };
  VIEWS.tasks = () => {
    const F = { all: () => true, active: (x) => !x.done, done: (x) => x.done };
    const L = S.tasks.filter(F[filter]).sort((a, b) => (a.done - b.done) || ((a.due || '9999') < (b.due || '9999') ? -1 : (a.due || '9999') > (b.due || '9999') ? 1 : PR[b.pri] - PR[a.pri]));
    const t = today();
    const chip = (k, l, n) => '<button class="chip' + (filter === k ? ' on' : '') + '" data-a="tf" data-f="' + k + '">' + l + ' ' + n + '</button>';
    return '<div class="chips">' + chip('all', 'All', S.tasks.length) + chip('active', 'Active', S.tasks.filter((x) => !x.done).length) + chip('done', 'Done', S.tasks.filter((x) => x.done).length) + '</div>' +
      (L.length ? L.map((x) => '<div class="li' + (x.done ? ' done' : '') + '"><button class="chk" data-a="ttog" data-id="' + x.id + '" aria-label="Toggle done">' + I('check') + '</button>' +
        '<button class="grow" data-a="tedit" data-id="' + x.id + '"><div class="t">' + esc(x.title) + '</div><div><span class="tag ' + x.pri + '">' + x.pri + '</span>' +
        (x.due ? '<span class="muted' + (!x.done && x.due < t ? ' late' : '') + '">' + (x.due < t && !x.done ? 'Overdue · ' : '') + fdate(x.due) + '</span>' : '') + '</div></button></div>').join('')
        : empty('tasks', filter === 'all' ? 'No tasks yet' : 'No ' + filter + ' tasks', 'Tap + to add a task.')) +
      '<button class="fab" data-a="tadd" aria-label="Add task">' + I('plus') + '</button>';
  };
  function taskSheet(t) {
    sheet(t ? 'Edit task' : 'New task', [
      { k: 'title', l: 'Title', v: t && t.title, x: 'maxlength="120" placeholder="What needs doing?"' },
      { k: 'due', l: 'Due date (optional)', t: 'date', v: t && t.due },
      { k: 'pri', l: 'Priority', t: 'select', o: ['Low', 'Medium', 'High'], v: t ? t.pri : 'Medium' }],
    (v) => {
      if (!v.title) return 'Enter a task title.';
      if (v.due && !RD.test(v.due)) return 'Pick a valid due date.';
      if (t) Object.assign(t, { title: v.title, due: v.due, pri: v.pri });
      else S.tasks.unshift({ id: uid(), title: v.title, due: v.due, pri: v.pri, done: false, doneOn: '' });
      commit('tasks');
    }, t && (() => { S.tasks = S.tasks.filter((x) => x !== t); commit('tasks'); }));
  }
  A.tf = (d) => { filter = d.f; render(); };
  A.tadd = () => taskSheet();
  A.tedit = (d) => { const t = by('tasks', d.id); t && taskSheet(t); };
  A.ttog = (d) => { const t = by('tasks', d.id); if (!t) return; t.done = !t.done; t.doneOn = t.done ? today() : ''; hap(); commit('tasks'); };

  const noteTitle = (n) => n.title || (n.body.split('\n')[0] || 'Untitled').slice(0, 60);
  const noteList = () => {
    const q = nq.toLowerCase();
    const L = S.notes.filter((n) => !q || (n.title + ' ' + n.body).toLowerCase().includes(q)).sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || b.upd - a.upd);
    return L.length ? L.map((n) => '<div class="li"><button class="grow" data-a="nedit" data-id="' + n.id + '"><div class="t">' + esc(noteTitle(n)) + '</div><div class="muted">' + esc(n.body.slice(0, 90)) + '</div><div class="muted">' + new Date(n.upd).toLocaleDateString() + '</div></button>' +
      '<button data-a="npin" data-id="' + n.id + '" aria-label="Pin" style="color:' + (n.pin ? 'var(--gold)' : 'var(--hint)') + '">' + I('pin').replace('<svg class="ic"', '<svg class="ic" style="fill:' + (n.pin ? 'currentColor' : 'none') + '"') + '</button></div>').join('')
      : empty('note', q ? 'No matching notes' : 'No notes yet', q ? 'Try a different search.' : 'Tap + to write your first note.');
  };
  VIEWS.notes = () => '<input id="nq" type="search" placeholder="Search notes" value="' + esc(nq) + '" style="margin-bottom:12px"><div id="nl">' + noteList() + '</div><button class="fab" data-a="nadd" aria-label="Add note">' + I('plus') + '</button>';
  POST.notes = () => { $('#nq').oninput = (e) => { nq = e.target.value.trim(); $('#nl').innerHTML = noteList(); }; };
  function noteSheet(n) {
    sheet(n ? 'Edit note' : 'New note', [{ k: 'title', l: 'Title', v: n && n.title, x: 'maxlength="100"' }, { k: 'body', l: 'Note', t: 'textarea', v: n && n.body, p: 'Write something…' }],
      (v) => {
        if (!v.title && !v.body) return 'Add a title or some text.';
        if (n) Object.assign(n, { title: v.title, body: v.body, upd: Date.now() });
        else S.notes.unshift({ id: uid(), title: v.title, body: v.body, pin: false, upd: Date.now() });
        commit('notes');
      }, n && (() => { S.notes = S.notes.filter((x) => x !== n); commit('notes'); }));
  }
  A.nadd = () => noteSheet();
  A.nedit = (d) => { const n = by('notes', d.id); n && noteSheet(n); };
  A.npin = (d) => { const n = by('notes', d.id); if (n) { n.pin = !n.pin; hap(); commit('notes'); } };

  const CATS = ['Food', 'Transport', 'Bills', 'Shopping', 'Health', 'Entertainment', 'Salary', 'Business', 'Gift', 'Other'];
  VIEWS.money = () => {
    const inc = sum(S.expenses.filter((x) => x.type === 'income')), exp = sum(S.expenses.filter((x) => x.type === 'expense')), bal = Math.round((inc - exp) * 1000) / 1000;
    const m = today().slice(0, 7), me = S.expenses.filter((x) => x.type === 'expense' && x.date.startsWith(m)), mt = sum(me);
    const cats = {}; me.forEach((x) => (cats[x.category] = (cats[x.category] || 0) + x.amount));
    const L = S.expenses.slice().sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    return '<div class="card"><div class="muted">Balance</div><div class="bal ' + (bal < 0 ? 'neg' : '') + '">' + omr(bal) + '</div><div class="grid2"><div><div class="muted">Income</div><b class="pos amt">' + omr(inc) + '</b></div><div><div class="muted">Expenses</div><b class="neg amt">' + omr(exp) + '</b></div></div></div>' +
      (mt ? '<div class="card"><b>Spending this month</b>' + Object.keys(cats).sort((a, b) => cats[b] - cats[a]).map((c) => '<div style="margin-top:10px"><div style="display:flex;justify-content:space-between"><span>' + esc(c) + '</span><span class="amt">' + omr(cats[c]) + '</span></div><div class="bar"><i style="width:' + Math.round(cats[c] / mt * 100) + '%"></i></div></div>').join('') + '</div>' : '') +
      '<h2>Transactions</h2>' + (L.length ? L.map((x) => '<button class="li" style="width:100%" data-a="medit" data-id="' + x.id + '"><span class="grow"><div class="t">' + esc(x.note || x.category) + '</div><div class="muted">' + esc(x.category) + ' · ' + fdate(x.date) + '</div></span><span class="amt ' + (x.type === 'income' ? 'pos' : 'neg') + '">' + (x.type === 'income' ? '+' : '−') + x.amount.toFixed(3) + '</span></button>').join('') : empty('wallet', 'No transactions yet', 'Tap + to record income or an expense.')) +
      '<button class="fab" data-a="madd" aria-label="Add transaction">' + I('plus') + '</button>';
  };
  function moneySheet(x) {
    sheet(x ? 'Edit transaction' : 'New transaction', [
      { k: 'type', l: 'Type', t: 'select', o: ['Expense', 'Income'], v: x ? (x.type === 'income' ? 'Income' : 'Expense') : 'Expense' },
      { k: 'amount', l: 'Amount (OMR)', v: x && x.amount.toFixed(3), x: 'inputmode="decimal" placeholder="0.000"' },
      { k: 'category', l: 'Category', t: 'select', o: CATS, v: x ? x.category : 'Food' },
      { k: 'date', l: 'Date', t: 'date', v: x ? x.date : today() },
      { k: 'note', l: 'Note (optional)', v: x && x.note, x: 'maxlength="80"' }],
    (v) => {
      const a = Number(v.amount.replace(',', '.'));
      if (!v.amount || !Number.isFinite(a) || a <= 0) return 'Enter an amount greater than 0.';
      if (a > 1e9) return 'That amount is too large.';
      if (!RD.test(v.date)) return 'Pick a valid date.';
      const rec = { type: v.type.toLowerCase(), amount: Math.round(a * 1000) / 1000, category: v.category, date: v.date, note: v.note };
      if (x) Object.assign(x, rec); else S.expenses.push(Object.assign({ id: uid() }, rec));
      commit('expenses');
    }, x && (() => { S.expenses = S.expenses.filter((e) => e !== x); commit('expenses'); }));
  }
  A.madd = () => moneySheet();
  A.medit = (d) => { const x = by('expenses', d.id); x && moneySheet(x); };

  const streak = (h) => { const s = new Set(h.done), d = new Date(); let n = 0; if (!s.has(ds(d))) d.setDate(d.getDate() - 1); while (s.has(ds(d))) { n++; d.setDate(d.getDate() - 1); } return n; };
  VIEWS.habits = () => {
    const t = today();
    return (S.habits.length ? S.habits.map((h) => {
      const days = []; for (let i = 13; i >= 0; i--) days.push(addDays(t, -i));
      const rate = Math.round(Array.from({ length: 30 }, (_, i) => addDays(t, -i)).filter((d) => h.done.includes(d)).length / 30 * 100), on = h.done.includes(t);
      return '<div class="card"><div style="display:flex;align-items:center;gap:12px"><button class="grow t" style="flex:1;text-align:left;font-weight:650" data-a="hedit" data-id="' + h.id + '">' + esc(h.name) + '<div class="muted" style="font-weight:400">' + rate + '% in the last 30 days</div></button>' +
        '<span class="streak">' + I('flame') + streak(h) + '</span><button class="btn' + (on ? '' : ' ghost') + '" data-a="htog" data-id="' + h.id + '">' + (on ? 'Done' : 'Mark done') + '</button></div>' +
        '<div class="dots">' + days.map((d) => '<button class="dot' + (h.done.includes(d) ? ' on' : '') + '" data-a="hday" data-id="' + h.id + '" data-d="' + d + '" aria-label="' + fdate(d) + '">' + Number(d.slice(8)) + '</button>').join('') + '</div></div>';
    }).join('') : empty('flame', 'No habits yet', 'Tap + to create a daily habit.')) + '<button class="fab" data-a="hadd" aria-label="Add habit">' + I('plus') + '</button>';
  };
  function habitSheet(h) {
    sheet(h ? 'Edit habit' : 'New habit', [{ k: 'name', l: 'Habit name', v: h && h.name, x: 'maxlength="50" placeholder="e.g. Read 10 pages"' }],
      (v) => { if (!v.name) return 'Enter a habit name.'; if (h) h.name = v.name; else S.habits.push({ id: uid(), name: v.name, done: [] }); commit('habits'); },
      h && (() => { S.habits = S.habits.filter((x) => x !== h); commit('habits'); }));
  }
  const hToggle = (h, d) => { const i = h.done.indexOf(d); if (i < 0) h.done.push(d); else h.done.splice(i, 1); hap(); commit('habits'); };
  A.hadd = () => habitSheet();
  A.hedit = (d) => { const h = by('habits', d.id); h && habitSheet(h); };
  A.htog = (d) => { const h = by('habits', d.id); h && hToggle(h, today()); };
  A.hday = (d) => { const h = by('habits', d.id); h && RD.test(d.d) && d.d <= today() && hToggle(h, d.d); };

  VIEWS.planner = () => {
    const L = S.events.filter((e) => e.date === plDate).sort((a, b) => a.time.localeCompare(b.time));
    const strip = []; for (let i = -3; i <= 3; i++) strip.push(addDays(plDate, i));
    return '<div class="pnav"><button class="btn ghost" data-a="pshift" data-n="-1" aria-label="Previous day">‹</button><b>' + fdate(plDate, { weekday: 'long', day: 'numeric', month: 'long' }) + '</b><button class="btn ghost" data-a="pshift" data-n="1" aria-label="Next day">›</button></div>' +
      '<div class="strip">' + strip.map((d) => '<button class="sd' + (d === plDate ? ' on' : '') + '" data-a="pday" data-d="' + d + '"><span>' + fdate(d, { weekday: 'narrow' }) + '</span><b>' + Number(d.slice(8)) + '</b><i class="' + (S.events.some((e) => e.date === d) ? 'y' : '') + '"></i></button>').join('') + '</div>' +
      (plDate !== today() ? '<div style="text-align:center;margin-bottom:12px"><button class="chip" data-a="pday" data-d="' + today() + '">Back to today</button></div>' : '') +
      (L.length ? L.map((e) => '<div class="ev"><time>' + e.time + '</time><button class="li" data-a="pedit" data-id="' + e.id + '"><span class="grow"><div class="t">' + esc(e.title) + '</div><div class="muted">' + (e.end ? 'Until ' + e.end : '') + (e.end && e.note ? ' · ' : '') + esc(e.note || '') + '</div></span></button></div>').join('') : empty('cal', 'Nothing planned', 'Tap + to add an activity for this day.')) +
      '<button class="fab" data-a="padd" aria-label="Add activity">' + I('plus') + '</button>';
  };
  function eventSheet(e) {
    sheet(e ? 'Edit activity' : 'New activity', [
      { k: 'title', l: 'Activity', v: e && e.title, x: 'maxlength="100"' }, { k: 'date', l: 'Date', t: 'date', v: e ? e.date : plDate },
      { k: 'time', l: 'Starts', t: 'time', v: e && e.time }, { k: 'end', l: 'Ends (optional)', t: 'time', v: e && e.end },
      { k: 'note', l: 'Note (optional)', v: e && e.note, x: 'maxlength="120"' }],
    (v) => {
      if (!v.title) return 'Enter an activity name.';
      if (!RD.test(v.date)) return 'Pick a valid date.';
      if (!RT.test(v.time)) return 'Pick a start time.';
      if (v.end && (!RT.test(v.end) || v.end <= v.time)) return 'End time must be after the start time.';
      const rec = { title: v.title, date: v.date, time: v.time, end: v.end, note: v.note };
      if (e) Object.assign(e, rec); else S.events.push(Object.assign({ id: uid() }, rec));
      plDate = v.date; commit('events');
    }, e && (() => { S.events = S.events.filter((x) => x !== e); commit('events'); }));
  }
  A.padd = () => eventSheet();
  A.pedit = (d) => { const e = by('events', d.id); e && eventSheet(e); };
  A.pshift = (d) => { plDate = addDays(plDate, Number(d.n)); render(); };
  A.pday = (d) => { if (RD.test(d.d)) { plDate = d.d; render(); } };

  /* ----- focus timer ----- */
  const F = { mode: 'work', run: false, end: 0, left: 0, total: 0, iv: null };
  const mins = (m) => S.settings.pomo[m === 'work' ? 'work' : m === 'short' ? 'brk' : 'long'];
  const fSet = (m) => { clearInterval(F.iv); F.run = false; F.mode = m; F.total = F.left = mins(m) * 60; };
  const logToday = () => (S.settings.log.d === today() ? S.settings.log.n : 0);
  const mmss = (s) => pad(Math.floor(s / 60)) + ':' + pad(s % 60);
  function fPaint() {
    const tm = $('#tm'); if (!tm) return;
    tm.textContent = mmss(F.left);
    $('#fp').setAttribute('stroke-dashoffset', (2 * Math.PI * 110 * (1 - (F.total ? F.left / F.total : 0))).toFixed(1));
    $('#fgo').textContent = F.run ? 'Pause' : F.left < F.total ? 'Resume' : 'Start';
    document.title = F.run ? mmss(F.left) + ' · Focus' : 'Productivity Hub';
  }
  function fTick() {
    if (!F.run) return;
    F.left = Math.max(0, Math.round((F.end - Date.now()) / 1000));
    if (F.left <= 0) {
      const wasWork = F.mode === 'work';
      if (wasWork) { S.settings.log = { d: today(), n: logToday() + 1 }; Store.save('settings', S.settings); }
      hap('success'); toast(wasWork ? 'Focus session complete. Time for a break.' : 'Break over. Ready to focus?');
      fSet(wasWork ? (logToday() % 4 === 0 ? 'long' : 'short') : 'work');
      if (route === 'focus') render(); return;
    }
    fPaint();
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) fTick(); });
  fSet('work');
  VIEWS.focus = () => {
    const tab = (m, l) => '<button class="' + (F.mode === m ? 'on' : '') + '" data-a="fmode" data-m="' + m + '">' + l + '</button>';
    const C = 2 * Math.PI * 110, p = S.settings.pomo;
    return '<div class="seg">' + tab('work', 'Focus') + tab('short', 'Short break') + tab('long', 'Long break') + '</div>' +
      '<div class="timer"><div class="ring"><svg viewBox="0 0 240 240"><circle class="tr" cx="120" cy="120" r="110" style="stroke:var(--soft);opacity:1"/><circle id="fp" class="pr" cx="120" cy="120" r="110" style="stroke:var(--accent)" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="0"/></svg><b id="tm">' + mmss(F.left) + '</b></div></div>' +
      '<div class="ctrl"><button class="btn" id="fgo" data-a="fgo">Start</button><button class="btn ghost" data-a="freset">Reset</button></div>' +
      '<p class="muted" style="text-align:center;margin:14px 0">Focus sessions completed today: <b>' + logToday() + '</b></p>' +
      '<div class="card"><b>Durations (minutes)</b><div class="grid2" style="margin-top:10px;grid-template-columns:repeat(3,1fr)"><label><span>Focus</span><input type="number" min="1" max="120" data-pm="work" value="' + p.work + '"></label><label><span>Short</span><input type="number" min="1" max="60" data-pm="brk" value="' + p.brk + '"></label><label><span>Long</span><input type="number" min="1" max="90" data-pm="long" value="' + p.long + '"></label></div></div>';
  };
  POST.focus = () => {
    fPaint();
    document.querySelectorAll('[data-pm]').forEach((i) => (i.onchange = () => {
      const lim = { work: 120, brk: 60, long: 90 }[i.dataset.pm], v = Math.round(Number(i.value));
      if (!Number.isFinite(v) || v < 1 || v > lim) { toast('Enter a number from 1 to ' + lim + '.'); i.value = S.settings.pomo[i.dataset.pm]; return; }
      S.settings.pomo[i.dataset.pm] = v; Store.save('settings', S.settings);
      if (!F.run) { fSet(F.mode); render(); }
    }));
  };
  A.fmode = (d) => { fSet(d.m); render(); };
  A.fgo = () => {
    if (F.run) { fTick(); F.run = false; clearInterval(F.iv); } else { F.run = true; F.end = Date.now() + F.left * 1000; F.iv = setInterval(fTick, 250); }
    hap(); fPaint();
  };
  A.freset = () => { fSet(F.mode); hap(); render(); };

  /* ----- calculator ----- */
  const K = { cur: '0', prev: null, op: null, fresh: true };
  const KEYS = ['C', '±', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '0', '.', '⌫', '='];
  function kEval() {
    const a = K.prev, b = parseFloat(K.cur); let r;
    if (K.op === '+') r = a + b; else if (K.op === '−') r = a - b; else if (K.op === '×') r = a * b; else r = b === 0 ? NaN : a / b;
    if (!Number.isFinite(r)) { K.cur = 'Error'; K.prev = null; K.op = null; K.fresh = true; return; }
    K.cur = fmtN(r); K.prev = r;
  }
  function kPress(k) {
    if (K.cur === 'Error') { K.cur = '0'; K.prev = null; K.op = null; K.fresh = true; if (k === 'C') return; }
    if (/^\d$/.test(k)) { if (K.fresh || K.cur === '0') K.cur = k; else if (K.cur.replace(/[-.]/g, '').length < 14) K.cur += k; K.fresh = false; }
    else if (k === '.') { if (K.fresh) { K.cur = '0.'; K.fresh = false; } else if (!K.cur.includes('.')) K.cur += '.'; }
    else if (k === 'C') { K.cur = '0'; K.prev = null; K.op = null; K.fresh = true; }
    else if (k === '⌫') { if (!K.fresh) K.cur = K.cur.length > 1 && !(K.cur.length === 2 && K.cur[0] === '-') ? K.cur.slice(0, -1) : '0'; }
    else if (k === '±') { if (K.cur !== '0') K.cur = K.cur[0] === '-' ? K.cur.slice(1) : '-' + K.cur; }
    else if (k === '%') { K.cur = fmtN(parseFloat(K.cur) / 100); K.fresh = true; }
    else if (k === '=') { if (K.op) { kEval(); K.op = null; } K.fresh = true; }
    else { if (K.op && !K.fresh) kEval(); if (K.cur !== 'Error') { K.prev = parseFloat(K.cur); K.op = k; K.fresh = true; } }
    kPaint();
  }
  function kPaint() { const d = $('#cd'); if (!d) return; d.textContent = K.cur; d.style.fontSize = K.cur.length > 12 ? '1.6rem' : K.cur.length > 9 ? '2rem' : ''; $('#cx').innerHTML = K.op ? fmtN(K.prev) + ' ' + K.op : '&nbsp;'; }
  VIEWS.calc = () => {
    const pc = (n, t, a, b) => '<div class="card"><b>' + t + '</b><div class="grid2" style="margin:10px 0"><label style="margin:0"><span>' + a + '</span><input data-p="' + n + 'x" inputmode="decimal"></label><label style="margin:0"><span>' + b + '</span><input data-p="' + n + 'y" inputmode="decimal"></label></div><div class="res" id="r' + n + '">—</div></div>';
    return '<div class="seg"><button class="' + (ctab === 'std' ? 'on' : '') + '" data-a="ctab" data-t="std">Standard</button><button class="' + (ctab === 'pct' ? 'on' : '') + '" data-a="ctab" data-t="pct">Percentage</button></div>' +
      (ctab === 'std' ? '<div class="disp"><small id="cx">&nbsp;</small><b id="cd">0</b></div><div class="keys">' + KEYS.map((k) => '<button class="' + (k === '=' ? 'eq' : '÷×−+C±%'.includes(k) ? 'op' : '') + '" data-a="ck" data-k="' + k + '">' + k + '</button>').join('') + '</div>'
        : pc(1, 'What is X% of Y?', 'Percent (X)', 'Number (Y)') + pc(2, 'X is what % of Y?', 'Part (X)', 'Total (Y)') + pc(3, 'Increase or decrease Y by X%', 'Percent (X)', 'Number (Y)'));
  };
  POST.calc = () => {
    if (ctab === 'std') return kPaint();
    const num = (id) => { const v = ($('[data-p="' + id + '"]').value || '').trim().replace(',', '.'); return v === '' ? NaN : Number(v); };
    const upd = () => {
      const f = (n) => fmtN(parseFloat(n.toFixed(6)));
      const r = (n, h) => { $('#r' + n).textContent = h; };
      const x1 = num('1x'), y1 = num('1y'), x2 = num('2x'), y2 = num('2y'), x3 = num('3x'), y3 = num('3y');
      r(1, Number.isFinite(x1) && Number.isFinite(y1) ? f(x1 / 100 * y1) : '—');
      r(2, Number.isFinite(x2) && Number.isFinite(y2) ? (y2 === 0 ? 'Total cannot be 0' : f(x2 / y2 * 100) + '%') : '—');
      r(3, Number.isFinite(x3) && Number.isFinite(y3) ? '+ ' + f(y3 * (1 + x3 / 100)) + '  ·  − ' + f(y3 * (1 - x3 / 100)) : '—');
    };
    document.querySelectorAll('[data-p]').forEach((i) => (i.oninput = upd));
  };
  A.ctab = (d) => { ctab = d.t; render(); };
  A.ck = (d) => kPress(d.k);

  /* ----- QR ----- */
  VIEWS.qr = () => '<div class="card qr"><label style="text-align:left"><span>Text or URL</span><textarea id="qt" maxlength="1000" placeholder="https://example.com">' + esc(qrs ? qrs.text : '') + '</textarea></label><button class="btn block" data-a="qgen">Generate QR code</button>' +
    '<p class="err" id="qe" hidden></p>' + (qrs ? '<div id="qo"><img alt="QR code" src="' + qrs.url + '"><button class="btn ghost block" data-a="qdl">Download PNG</button><p class="muted">If the download does not start in Telegram, press and hold the image to save it.</p></div>' : '') + '</div>';
  A.qgen = () => {
    const text = $('#qt').value.trim(), e = $('#qe'); e.hidden = true;
    const fail = (m) => { e.textContent = m; e.hidden = false; hap('error'); };
    if (!text) return fail('Enter some text or a URL first.');
    if (typeof qrcode !== 'function') return fail('The QR library could not load. Check your connection and reopen the app.');
    try {
      if (qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
      const q = qrcode(0, 'M'); q.addData(text); q.make();
      const n = q.getModuleCount(), sc = 8, m = 4, c = document.createElement('canvas'); c.width = c.height = (n + m * 2) * sc;
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#000';
      for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) g.fillRect((k + m) * sc, (r + m) * sc, sc, sc);
      qrs = { text, url: c.toDataURL('image/png') }; hap('success'); render();
    } catch (x) { fail('That text is too long to fit in a QR code. Shorten it and try again.'); }
  };
  A.qdl = () => { if (qrs) save('qr-code.png', qrs.url); };
  function save(name, href) { const a = document.createElement('a'); a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }

  /* ----- more + settings ----- */
  VIEWS.more = () => '<div class="tiles">' + [['notes', 'note', 'Notes', 'Write, pin and search'], ['habits', 'flame', 'Habits', 'Streaks and history'], ['focus', 'timer', 'Focus timer', 'Pomodoro sessions'], ['calc', 'calc', 'Calculator', 'Standard and percent'], ['qr', 'qr', 'QR generator', 'Text and links'], ['settings', 'gear', 'Settings', 'Theme and backups']]
    .map((x) => '<button class="tile" data-a="go" data-r="' + x[0] + '">' + I(x[1]) + '<b>' + x[2] + '</b><span class="muted">' + x[3] + '</span></button>').join('') + '</div>';
  VIEWS.settings = () => {
    const th = S.settings.theme, b = (k, l) => '<button class="' + (th === k ? 'on' : '') + '" data-a="theme" data-t="' + k + '">' + l + '</button>';
    return '<div class="card"><b>Theme</b><div class="seg" style="margin:10px 0 0">' + b('auto', 'Auto') + b('light', 'Light') + b('dark', 'Dark') + '</div></div>' +
      '<div class="card"><b>Your data</b><p class="muted">' + S.tasks.length + ' tasks · ' + S.notes.length + ' notes · ' + S.expenses.length + ' transactions · ' + S.habits.length + ' habits · ' + S.events.length + ' activities</p>' +
      (Store.persistent ? '' : '<p class="err">Storage is unavailable in this browser. Data will not survive closing the app.</p>') +
      '<div class="grid2"><button class="btn" data-a="exp">Export backup</button><button class="btn ghost" data-a="expc">Copy JSON</button></div>' +
      '<label class="btn ghost block" style="display:block;text-align:center;margin-top:10px">Import from file<input id="imf" type="file" accept="application/json,.json" class="hid"></label>' +
      '<button class="btn ghost block" style="margin-top:10px" data-a="impp">Import by pasting JSON</button></div>' +
      '<div class="card"><b>Danger zone</b><p class="muted">Deletes everything stored by this app on this device.</p><button class="btn danger block" data-a="clr">Clear all data</button></div>' +
      '<p class="muted" style="text-align:center">Productivity Hub 1.0 · data stays on your device</p>';
  };
  POST.settings = () => { $('#imf').onchange = (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => doImport(String(r.result)); r.onerror = () => toast('Could not read that file.'); r.readAsText(f); }; };
  function doImport(text) {
    let res; try { JSON.parse(text); } catch (e) { return toast('That is not valid JSON.'); }
    ask('Importing replaces all current data. Continue?', () => {
      try { res = Store.importAll(text); } catch (e) { return toast(e.message); }
      S = res.state; applyTheme(); fSet('work'); render(); toast('Backup restored.');
    });
  }
  A.theme = (d) => { S.settings.theme = d.t; Store.save('settings', S.settings); applyTheme(); render(); };
  const json = () => JSON.stringify(Store.exportAll(S), null, 2);
  A.exp = () => { const u = URL.createObjectURL(new Blob([json()], { type: 'application/json' })); save('productivity-hub-backup-' + today() + '.json', u); setTimeout(() => URL.revokeObjectURL(u), 4000); toast('Backup created. If nothing downloaded, use Copy JSON.'); };
  A.expc = () => {
    const t = json(), fb = () => { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); const ok = T(() => document.execCommand('copy')); a.remove(); toast(ok ? 'Backup copied.' : 'Copy failed. Use Export backup instead.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(() => toast('Backup copied.'), fb); else fb();
  };
  A.impp = () => sheet('Import backup', [{ k: 'json', l: 'Paste backup JSON', t: 'textarea', p: '{ "app": "productivity-hub", … }' }], (v) => { if (!v.json) return 'Paste your backup JSON first.'; setTimeout(() => doImport(v.json), 250); });
  A.clr = () => ask('Delete all tasks, notes, transactions, habits, activities and settings?', () => { Store.clearAll(); S = Store.load(); applyTheme(); fSet('work'); qrs = null; K.cur = '0'; K.prev = K.op = null; render(); toast('All data cleared.'); });

  /* ---------- router ---------- */
  A.go = (d) => go(d.r);
  A.back = () => { if (SH) closeSheet(); else go('more'); };
  const NAV = [['home', 'home', 'Home'], ['tasks', 'tasks', 'Tasks'], ['planner', 'cal', 'Planner'], ['money', 'wallet', 'Money'], ['more', 'grid', 'More']];
  function go(r) { if (!VIEWS[r]) r = 'home'; closeSheet(true); route = r; render(true); hap(); }
  function render(anim) {
    const v = $('#view');
    v.innerHTML = '<div class="page' + (anim ? ' in' : '') + '">' + VIEWS[route]() + '</div>';
    if (anim) v.scrollTop = 0;
    const act = SUB.includes(route) ? 'more' : route;
    $('#nav').innerHTML = NAV.map((n) => '<button class="' + (n[0] === act ? 'on' : '') + '" data-a="go" data-r="' + n[0] + '" ' + (n[0] === act ? 'aria-current="page"' : '') + '>' + I(n[1]) + '<span>' + n[2] + '</span></button>').join('');
    $('#ttl').textContent = TITLES[route];
    const sub = SUB.includes(route), bk = $('#back'); bk.hidden = !sub; bk.innerHTML = I('back');
    if (tg && tg.BackButton) T(() => (sub ? tg.BackButton.show() : tg.BackButton.hide()));
    POST[route] && POST[route]();
  }

  document.addEventListener('click', (e) => { const t = e.target.closest('[data-a]'); if (!t) return; const f = A[t.dataset.a]; if (f) { try { f(t.dataset, t); } catch (x) { console.error(x); toast('Something went wrong. Please try again.'); } } });

  /* ---------- boot ---------- */
  if (tg) {
    T(() => { tg.ready(); tg.expand(); if (tg.disableVerticalSwipes) tg.disableVerticalSwipes(); });
    T(() => tg.onEvent('themeChanged', applyTheme));
    T(() => tg.BackButton.onClick(() => A.back()));
  }
  applyTheme();
  render(true);
})();
