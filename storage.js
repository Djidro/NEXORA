/* storage.js — validated LocalStorage layer with in-memory fallback */
const Store = (() => {
  const PFX = 'ph_v1_';
  const LISTS = ['tasks', 'notes', 'expenses', 'habits', 'events'];
  const str = (x) => typeof x === 'string';
  const VALID = {
    tasks: (x) => str(x.title),
    notes: (x) => str(x.title) && str(x.body),
    expenses: (x) => Number.isFinite(x.amount) && (x.type === 'income' || x.type === 'expense') && str(x.date),
    habits: (x) => str(x.name) && Array.isArray(x.done),
    events: (x) => str(x.title) && str(x.date) && str(x.time),
  };
  const DEFAULTS = { theme: 'auto', pomo: { work: 25, brk: 5, long: 15 }, log: { d: '', n: 0 } };
  const mem = {};
  let persistent = true;

  function read(k) {
    try { const v = localStorage.getItem(PFX + k); return v ? JSON.parse(v) : null; }
    catch (e) { persistent = false; return mem[k] === undefined ? null : mem[k]; }
  }
  function write(k, v) {
    mem[k] = v;
    try { localStorage.setItem(PFX + k, JSON.stringify(v)); return true; }
    catch (e) { persistent = false; return false; }
  }
  const clampN = (v, lo, hi, d) => { v = Number(v); return Number.isFinite(v) && v >= lo && v <= hi ? Math.round(v) : d; };

  function clean(k, v) {
    if (k === 'settings') {
      v = v && typeof v === 'object' ? v : {};
      const p = v.pomo || {}, l = v.log || {};
      return {
        theme: ['auto', 'light', 'dark'].includes(v.theme) ? v.theme : 'auto',
        pomo: { work: clampN(p.work, 1, 120, 25), brk: clampN(p.brk, 1, 60, 5), long: clampN(p.long, 1, 90, 15) },
        log: { d: str(l.d) ? l.d : '', n: clampN(l.n, 0, 999, 0) },
      };
    }
    if (!Array.isArray(v)) return [];
    return v.filter((x) => x && typeof x === 'object' && str(x.id) && VALID[k](x));
  }

  return {
    LISTS,
    get persistent() { return persistent; },
    load() {
      const s = {};
      LISTS.forEach((k) => (s[k] = clean(k, read(k))));
      s.settings = clean('settings', read('settings'));
      return s;
    },
    save(k, v) { return write(k, v); },
    exportAll(s) {
      const data = {};
      LISTS.concat('settings').forEach((k) => (data[k] = s[k]));
      return { app: 'productivity-hub', version: 1, exported: new Date().toISOString(), data };
    },
    importAll(text) {
      let j;
      try { j = JSON.parse(text); } catch (e) { throw new Error('That is not valid JSON.'); }
      if (!j || j.app !== 'productivity-hub' || !j.data || typeof j.data !== 'object') throw new Error('This file is not a Productivity Hub backup.');
      const out = {}, counts = {};
      LISTS.forEach((k) => { out[k] = clean(k, j.data[k]); counts[k] = out[k].length; });
      out.settings = clean('settings', j.data.settings);
      LISTS.concat('settings').forEach((k) => write(k, out[k]));
      return { state: out, counts };
    },
    clearAll() {
      LISTS.concat('settings').forEach((k) => { delete mem[k]; try { localStorage.removeItem(PFX + k); } catch (e) {} });
    },
  };
})();
if (typeof module !== 'undefined') module.exports = Store;
