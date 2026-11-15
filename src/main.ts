import './styles.css';
import { NIGHTS, SETS, STAGES, hm, setById, type NightId, type Set as FestSet } from './data';
import { getLang, setLang, t, type Key } from './i18n';
import { clashes, decodePlan, encodePlan, route } from './plan';
import { mountScrollbar } from './scrollbar';
import PHOTOS from './photos.json';

const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector(sel) as T;
const $$ = <T extends Element = HTMLElement>(sel: string) => [...document.querySelectorAll(sel)] as T[];
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const stageName = (id: string) => STAGES.find(s => s.id === id)!.name;
const range = (s: FestSet) => `${hm(s.start)}–${hm(s.end)}`;

// ---------- plan state: the link wins over what this browser remembers ----------

const STORE = 'nebbia-plan';
let plan: string[] = (() => {
  const m = location.hash.match(/^#piano=(.*)$/);
  if (m) return decodePlan(decodeURIComponent(m[1]));
  try { return decodePlan(localStorage.getItem(STORE) ?? ''); } catch { return []; }
})();
let night: NightId = (setById(plan[0] ?? '')?.night) ?? 'ven';
let opened: string | null = null;

function save() {
  try { localStorage.setItem(STORE, encodePlan(plan)); } catch { /* private mode: the plan lives until reload */ }
  if (location.hash.startsWith('#piano=')) history.replaceState(null, '', location.pathname + location.search);
}
function toggle(id: string) {
  plan = plan.includes(id) ? plan.filter(x => x !== id) : [...plan, id];
  save();
  renderLineup();
  renderPlan();
}

// ---------- static text and photos ----------

function applyText() {
  document.documentElement.lang = getLang();
  document.title = t('meta.title');
  $('meta[name="description"]').setAttribute('content', t('meta.desc'));
  for (const el of $$('[data-i18n]')) el.textContent = t(el.dataset.i18n as Key);
  for (const el of $$<HTMLImageElement>('[data-i18n-alt]')) el.alt = t(el.dataset.i18nAlt as Key);
  $('[data-lineup-sub]').textContent = t('lineup.sub', { n: SETS.length });
  $('[data-credits]').innerHTML = `${esc(t('foot.photos'))}: ` + PHOTOS.map(p =>
    `<a href="${esc(p.page)}" rel="noopener" target="_blank">${esc(p.creator)}</a> (${esc(p.license)})`).join(', ');
}

const SIZES: Record<string, string> = {
  fog: '100vw',
  gasometro: '(max-width: 900px) 100vw, 45vw',
  yard: '100vw',
  board: '(max-width: 900px) 100vw, 40vw',
  platform: '(max-width: 900px) 100vw, 40vw',
  park: '(max-width: 900px) 100vw, 40vw',
};
function placePhotos() {
  const base = import.meta.env.BASE_URL;
  for (const img of $$<HTMLImageElement>('img[data-photo]')) {
    const p = PHOTOS.find(x => x.name === img.dataset.photo)!;
    // the largest file of a narrower original is only as wide as the original
    const files = [960, 1600, 2560].map(w => [w, Math.min(w, p.w)]).filter(([, a], i, all) => i === 0 || a > all[i - 1][1]);
    img.srcset = files.map(([w, a]) => `${base}photos/${p.name}-${w}.webp ${a}w`).join(', ');
    img.sizes = SIZES[p.name];
    img.src = `${base}photos/${p.name}-1600.webp`;
    img.width = p.w;
    img.height = p.h;
  }
}

// ---------- line-up ----------

function renderLineup() {
  $('[data-lineup]').innerHTML = NIGHTS.map(n => {
    const sets = SETS.filter(s => s.night === n.id).sort((a, b) => Number(!!b.top) - Number(!!a.top) || a.start - b.start);
    const open = sets.find(s => s.id === opened);
    return `<div class="night">
      <h3 class="night-h">${esc(t(`night.${n.id}` as Key))} <span class="time">${hm(n.open)}—${hm(n.close)}</span></h3>
      <ul class="names">${sets.map(s => `<li><button type="button" class="name${s.top ? ' top' : ''}${plan.includes(s.id) ? ' in' : ''}" aria-expanded="${s.id === opened}" data-open="${s.id}">${esc(s.name)}</button></li>`).join(' ')}</ul>
      ${open ? `<div class="detail" role="region" aria-label="${esc(open.name)}">
        <p><strong>${esc(open.name)}</strong> <span class="time">${esc(open.genre)}</span></p>
        <p>${esc(t('lineup.where', { night: t(`night.${n.id}` as Key), stage: stageName(open.stage), time: range(open) }))}</p>
        <div class="row"><button type="button" class="btn" data-toggle="${open.id}">${esc(t(plan.includes(open.id) ? 'lineup.remove' : 'lineup.add'))}</button>
        <button type="button" class="btn ghost" data-open="">${esc(t('lineup.close'))}</button></div>
      </div>` : ''}
    </div>`;
  }).join('');
}

// ---------- the plan: grid on wide screens, list on phones ----------

const SLOT = 30;
function renderPlan() {
  const n = NIGHTS.find(x => x.id === night)!;
  const sets = SETS.filter(s => s.night === night);
  const clash = clashes(plan);
  const cls = (s: FestSet) => `set${plan.includes(s.id) ? ' on' : ''}${clash.has(s.id) ? ' clash' : ''}${s.top ? ' top' : ''}`;
  const label = (s: FestSet) => `${s.name}, ${stageName(s.stage)}, ${range(s)}`;

  $('[data-nights]').innerHTML = NIGHTS.map(x => {
    const k = plan.filter(id => setById(id)!.night === x.id).length;
    return `<button type="button" role="tab" aria-selected="${x.id === night}" data-night="${x.id}">${esc(t(`night.${x.id}` as Key))}${k ? ` <span class="k">${k}</span>` : ''}</button>`;
  }).join('');

  const cols = (n.close - n.open) / SLOT;
  let g = `<div class="g" style="--cols:${cols}"><div class="g-corner"></div>`;
  for (let m = n.open; m < n.close; m += 60) g += `<div class="g-hour mono" style="grid-column:${2 + (m - n.open) / SLOT} / span 2">${hm(m)}</div>`;
  STAGES.forEach((st, r) => {
    g += `<div class="g-stage" style="grid-row:${r + 2}">${st.name}</div>`;
    for (let c = 0; c < cols; c++) g += `<div class="g-cell" style="grid-row:${r + 2};grid-column:${c + 2}"></div>`;
    for (const s of sets.filter(x => x.stage === st.id))
      g += `<button type="button" class="${cls(s)}" style="grid-row:${r + 2};grid-column:${2 + (s.start - n.open) / SLOT} / span ${(s.end - s.start) / SLOT}" aria-pressed="${plan.includes(s.id)}" aria-label="${esc(label(s))}" data-toggle="${s.id}"><b>${esc(s.name)}</b><small class="time">${range(s)}</small></button>`;
  });
  $('[data-grid]').innerHTML = g + '</div>';

  $('[data-list]').innerHTML = [...sets].sort((a, b) => a.start - b.start || STAGES.findIndex(x => x.id === a.stage) - STAGES.findIndex(x => x.id === b.stage))
    .map(s => `<li><button type="button" class="${cls(s)}" aria-pressed="${plan.includes(s.id)}" data-toggle="${s.id}">
      <span class="time">${range(s)}</span><b>${esc(s.name)}</b><span class="st">${stageName(s.stage)}</span></button></li>`).join('');

  renderSummary(clash);
}

function renderSummary(clash: globalThis.Set<string>) {
  const el = $('[data-summary]');
  $('[data-share]').toggleAttribute('disabled', !plan.length);
  $('[data-clear]').toggleAttribute('disabled', !plan.length);
  if (!plan.length) { el.innerHTML = `<p class="muted">${esc(t('plan.empty'))}</p>`; return; }
  const steps = route(plan);
  let html = `<p class="count">${esc(plan.length === 1 ? t('plan.one') : t('plan.count', { n: plan.length }))}</p>`;
  if (clash.size) html += `<p class="warn">${esc(t('plan.clash', { n: clash.size }))}</p>`;
  for (const n of NIGHTS) {
    const mine = plan.map(id => setById(id)!).filter(s => s.night === n.id).sort((a, b) => a.start - b.start);
    if (!mine.length) continue;
    html += `<div class="route"><h4>${esc(t(`night.${n.id}` as Key))}</h4><ol>`;
    mine.forEach((s, i) => {
      const step = i ? steps.find(x => x.to === s.id) : undefined;
      if (step) {
        const bits = [step.walk ? t('plan.walk', { min: step.walk }) : t('plan.same')];
        if (step.walk || step.missFrom) bits.push(t('plan.leave', { time: hm(step.leave) }));
        if (step.missFrom) bits.push(t('plan.missFrom', { min: step.missFrom }));
        if (step.missTo) bits.push(t('plan.missTo', { min: step.missTo }));
        html += `<li class="walk${step.missFrom || step.missTo ? ' cost' : ''}">→ ${esc(bits.join(' · '))}</li>`;
      }
      html += `<li class="stop"><span class="time">${range(s)}</span> <b>${esc(s.name)}</b> <span class="st">${stageName(s.stage)}</span></li>`;
    });
    html += '</ol></div>';
  }
  el.innerHTML = html;
}

// ---------- the site map ----------

function renderMap() {
  const svg = $('[data-map]');
  svg.setAttribute('aria-label', `${t('place.title')}: ${t('map.note')}`);
  const pos = { gasometro: [230, 175], forno: [372, 128], binario: [418, 282] } as const;
  const path = (a: keyof typeof pos, b: keyof typeof pos, min: number) => {
    const [x1, y1] = pos[a], [x2, y2] = pos[b];
    return `<line class="m-path" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><text class="m-min" x="${(x1 + x2) / 2 + 8}" y="${(y1 + y2) / 2 - 6}">${min}′</text>`;
  };
  const trees = Array.from({ length: 34 }, (_, i) => { const a = i * 2.39996, r = 18 + (i % 7) * 9; return `<circle class="m-tree" cx="${205 + Math.cos(a) * r * 1.2}" cy="${282 + Math.sin(a) * r * .55}" r="3"/>`; }).join('');
  svg.innerHTML = `
    <path class="m-track" d="M40 10 C 120 120, 250 300, 304 418"/><path class="m-track" d="M600 10 C 520 120, 390 300, 336 418"/>
    <path class="m-drop" d="M320 392 C 250 330 112 262 112 168 C 112 78 210 26 320 26 C 430 26 528 78 528 168 C 528 262 390 330 320 392 Z"/>
    ${trees}
    <text class="m-label" x="160" y="330">${esc(t('map.woods'))}</text>
    ${path('gasometro', 'forno', 4)}${path('forno', 'binario', 6)}${path('gasometro', 'binario', 9)}
    <circle class="m-stage ring" cx="230" cy="175" r="44"/><circle class="m-stage" cx="230" cy="175" r="30"/>
    <rect class="m-stage" x="330" y="104" width="84" height="48"/>
    <rect class="m-stage" x="380" y="262" width="76" height="40"/>
    <text class="m-name" x="230" y="118" text-anchor="middle">Gasometro</text>
    <text class="m-name" x="372" y="94" text-anchor="middle">Forno</text>
    <text class="m-name" x="418" y="322" text-anchor="middle">Binario</text>
    <path class="m-entry" d="M320 392 L320 356"/><circle class="m-dot" cx="320" cy="352" r="6"/>
    <text class="m-label" x="300" y="364" text-anchor="end">${esc(t('map.entry'))}</text>
    <text class="m-label" x="290" y="412" text-anchor="end">${esc(t('map.station'))}</text>
    <text class="m-label" x="560" y="60" text-anchor="end">${esc(t('map.tracks'))}</text>
    <text class="m-note" x="628" y="412" text-anchor="end">${esc(t('map.note'))}</text>`;
}

// ---------- the giant word fits the margins exactly ----------

function fitWords() {
  for (const el of $$('.word, .foot-word')) {
    el.style.fontSize = '100px';
    const cs = getComputedStyle(el.parentElement!);
    const box = el.parentElement!.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - (el.classList.contains('word') ? 2 * el.offsetLeft : 0);
    el.style.fontSize = `${Math.floor((100 * box) / el.scrollWidth * 10) / 10}px`;
  }
}

// ---------- motion: the parts of each section rise into place once ----------

function reveal() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(list => {
    for (const e of list) if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px' });
  for (const el of $$('main section > *, .foot > *')) { el.classList.add('rise'); io.observe(el); }
}

// ---------- wiring ----------

function renderAll() {
  applyText();
  renderLineup();
  renderPlan();
  renderMap();
}

document.addEventListener('click', e => {
  const el = (e.target as Element).closest<HTMLElement>('[data-toggle],[data-open],[data-night],[data-lang],[data-share],[data-clear],[data-buy]');
  if (!el) return;
  if (el.dataset.toggle) toggle(el.dataset.toggle);
  else if (el.dataset.open !== undefined) {
    const was = opened;
    opened = el.dataset.open && el.dataset.open !== opened ? el.dataset.open : null;
    renderLineup();
    $(`[data-open="${opened ?? was}"]`)?.focus();
  } else if (el.dataset.night) { night = el.dataset.night as NightId; renderPlan(); $(`[data-night="${night}"]`).focus(); }
  else if (el.hasAttribute('data-lang')) { setLang(getLang() === 'it' ? 'en' : 'it'); renderAll(); }
  else if (el.hasAttribute('data-share')) share(el);
  else if (el.hasAttribute('data-clear')) { plan = []; save(); renderLineup(); renderPlan(); }
  else if (el.hasAttribute('data-buy')) $('[data-buy-note]').textContent = t('tix.demo');
});

// arrow keys move between the night tabs
$('[data-nights]').addEventListener('keydown', e => {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const i = NIGHTS.findIndex(n => n.id === night) + (e.key === 'ArrowRight' ? 1 : -1);
  night = NIGHTS[(i + NIGHTS.length) % NIGHTS.length].id;
  renderPlan();
  $(`[data-night="${night}"]`).focus();
});

async function share(btn: HTMLElement) {
  const url = `${location.origin}${location.pathname}#piano=${encodeURIComponent(encodePlan(plan))}`;
  try { await navigator.clipboard.writeText(url); } catch { prompt(t('plan.share'), url); return; }
  btn.textContent = t('plan.copied');
  setTimeout(() => { btn.textContent = t('plan.share'); }, 1800);
}

placePhotos();
renderAll();
mountScrollbar();
reveal();
document.fonts.ready.then(fitWords);
addEventListener('resize', fitWords);
