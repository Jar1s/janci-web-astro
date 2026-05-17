const PARTNER_CATEGORY_LABELS = {
  hero: 'Hero pásik',
  exkluzivny: 'Exkluzívni mediálni',
  medialny: 'Mediálni',
  hlavny: 'Hlavní',
};

const API = {
  auth: '/api/auth',
  notifications: '/api/notifications',
  notification: (id) => `/api/notifications?id=${encodeURIComponent(id)}`,
  statistics: '/api/statistics',
  partners: '/api/partners',
  partner: (id) => `/api/partners?id=${encodeURIComponent(id)}`,
  partnerUpload: '/api/partners/upload',
  reviews: '/api/reviews',
  reviewsImport: '/api/reviews/import',
  analytics: '/api/analytics',
  review: (id) => `/api/reviews?id=${encodeURIComponent(id)}`
};

function byId(id) {
  return document.getElementById(id);
}

function setElementText(id, text) {
  const el = byId(id);
  if (el) el.textContent = text;
}

function showFeedback(message, type = 'success') {
  if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
    window.showToast(message, type);
  }
}

function getToken() {
  return localStorage.getItem('adminToken') || '';
}

function setToken(token) {
  if (token) {
    localStorage.setItem('adminToken', token);
  } else {
    localStorage.removeItem('adminToken');
  }
  setElementText('auth-status', token ? 'Token uložený' : 'Token chýba');
}

async function apiFetch(url, options = {}) {
  const headers = options.headers || {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) {
      setToken('');
      if (typeof window !== 'undefined' && typeof window.showLogin === 'function') {
        window.showLogin(
          'Vaše prihlásenie vypršalo alebo heslo nesedí. Zadajte heslo znova.',
          'Opätovné prihlásenie'
        );
      }
    }
    throw new Error(`Request failed ${res.status}: ${text}`);
  }
  return res.json();
}

function parseAuthErrorBody(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function authMessageFromResponse(status, body) {
  if (body?.message) return body.message;
  if (status === 401) return 'Nesprávne administrátorské heslo. Skúste to znova.';
  if (status === 503) {
    return 'Admin prihlásenie nie je dostupné — na serveri chýba ADMIN_PASSWORD (Vercel env).';
  }
  if (status === 405) return 'API auth endpoint neodpovedá správne (skontrolujte deployment).';
  if (status >= 500) return 'Chyba servera pri overovaní hesla. Skúste to o chvíľu znova.';
  return `Prihlásenie zlyhalo (HTTP ${status}).`;
}

async function verifyAdminToken(token) {
  try {
    const res = await fetch(API.auth, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const text = await res.text().catch(() => '');
    const body = parseAuthErrorBody(text);

    if (res.ok) {
      return { ok: true };
    }

    setToken('');
    return {
      ok: false,
      code: body?.code || `http_${res.status}`,
      message: authMessageFromResponse(res.status, body)
    };
  } catch {
    setToken('');
    return {
      ok: false,
      code: 'network',
      message:
        'Nepodarilo sa spojiť s API (/api/auth). Skontrolujte internet, či beží Vercel deployment, alebo či admin otvárate z rovnakej domény ako web.'
    };
  }
}

// Notifications
async function loadNotifications() {
  const list = byId('notif-list');
  const err = byId('notif-error');
  if (!list) return;
  list.innerHTML = '<p class="list-empty">Načítavam…</p>';
  if (err) err.textContent = '';
  try {
    const data = await apiFetch(API.notifications);
    list.innerHTML = '';
    if (!data.notifications?.length) {
      list.innerHTML = '<p class="list-empty">Žiadne notifikácie</p>';
      return;
    }
    data.notifications.forEach((n) => {
      const div = document.createElement('div');
      div.className = 'list-item';
      div.innerHTML = `
        <div class="list-item-header">
          <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
            <span class="list-item-title">#${n.id}</span>
            <span class="badge ${n.active ? 'badge-active' : 'badge-inactive'}">${n.active ? 'Aktívna' : 'Neaktívna'}</span>
          </div>
          <div class="btn-group">
            <button type="button" class="btn btn-ghost btn-sm" data-edit="${n.id}">Upraviť</button>
            <button type="button" class="btn btn-ghost btn-sm" data-toggle="${n.id}">${n.active ? 'Vypnúť' : 'Zapnúť'}</button>
            <button type="button" class="btn btn-danger btn-sm" data-del="${n.id}">Zmazať</button>
          </div>
        </div>
        <p class="list-item__body">${escapeHtml(n.text || '')}</p>
      `;
      list.appendChild(div);
    });
  } catch (e) {
    if (err) {
      err.textContent = e.message;
    } else {
      list.innerHTML = `<p class="list-empty">${escapeHtml(e.message)}</p>`;
    }
  }
}

function fillNotifForm(n) {
  const idEl = byId('notif-id');
  const textEl = byId('notif-text');
  const bgEl = byId('notif-bg');
  const gradEl = byId('notif-grad');
  const borderEl = byId('notif-border');
  const colorEl = byId('notif-textcolor');
  const activeEl = byId('notif-active');
  if (idEl) idEl.value = n.id || '';
  if (textEl) textEl.value = n.text || '';
  if (bgEl) bgEl.value = n.backgroundColor || 'rgba(200, 30, 30, 0.95)';
  if (gradEl) gradEl.value = n.backgroundGradient || 'rgba(180, 20, 20, 0.95)';
  if (borderEl) borderEl.value = n.borderColor || 'rgba(150, 10, 10, 0.8)';
  if (colorEl) colorEl.value = n.textColor || 'rgba(255, 255, 255, 1)';
  if (activeEl) activeEl.value = n.active ? 'true' : 'false';
}

async function submitNotif(e) {
  e.preventDefault();
  const msg = byId('notif-form-msg');
  if (msg) msg.textContent = '';
  const payload = {
    text: byId('notif-text')?.value,
    backgroundColor: byId('notif-bg')?.value,
    backgroundGradient: byId('notif-grad')?.value,
    borderColor: byId('notif-border')?.value,
    textColor: byId('notif-textcolor')?.value,
    active: byId('notif-active')?.value === 'true'
  };
  const id = byId('notif-id')?.value;
  try {
    if (id) {
      await apiFetch(API.notification(id), {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      if (msg) msg.textContent = 'Notifikácia upravená';
      showFeedback('Notifikácia upravená');
    } else {
      await apiFetch(API.notifications, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (msg) msg.textContent = 'Notifikácia pridaná';
      showFeedback('Notifikácia pridaná');
    }
    fillNotifForm({});
    loadNotifications();
  } catch (err) {
    if (msg) msg.textContent = err.message;
    showFeedback(err.message, 'error');
  }
}

async function handleNotifActions(e) {
  const target = e.target;
  if (target.dataset.edit) {
    const id = target.dataset.edit;
    const data = await apiFetch(API.notifications);
    const n = data.notifications.find((x) => x.id.toString() === id.toString());
    if (n) fillNotifForm(n);
  }
  if (target.dataset.toggle) {
    const id = target.dataset.toggle;
    const data = await apiFetch(API.notifications);
    const n = data.notifications.find((x) => x.id.toString() === id.toString());
    if (n) {
      await apiFetch(API.notification(id), { method: 'PUT', body: JSON.stringify({ active: !n.active }) });
      loadNotifications();
    }
  }
  if (target.dataset.del) {
    const id = target.dataset.del;
    if (confirm(`Zmazať notifikáciu #${id}?`)) {
      await apiFetch(API.notification(id), { method: 'DELETE' });
      loadNotifications();
    }
  }
}

async function loadStats() {
  const msg = byId('stats-msg');
  if (msg) msg.textContent = '';
  try {
    const data = await apiFetch(API.statistics);
    document.getElementById('stats-inspections').value = data.performedInspections ?? 15000;
    document.getElementById('stats-years-start').value = data.yearsExperienceStart ?? 2014;
    document.getElementById('stats-satisfaction').value = data.satisfactionPercentage ?? 98;
    document.getElementById('stats-place').value = data.googlePlaceId ?? '';
  } catch (err) {
    if (msg) msg.textContent = err.message;
    showFeedback(err.message, 'error');
  }
}

async function submitStats(e) {
  e.preventDefault();
  const msg = byId('stats-msg');
  if (msg) msg.textContent = '';
  const payload = {
    performedInspections: Number(document.getElementById('stats-inspections').value || 0),
    yearsExperienceStart: Number(document.getElementById('stats-years-start').value || 2014),
    satisfactionPercentage: Number(document.getElementById('stats-satisfaction').value || 98),
    googlePlaceId: document.getElementById('stats-place').value || null
  };
  try {
    await apiFetch(API.statistics, { method: 'PUT', body: JSON.stringify(payload) });
    if (msg) msg.textContent = 'Štatistiky uložené';
    showFeedback('Štatistiky uložené');
  } catch (err) {
    if (msg) msg.textContent = err.message;
    showFeedback(err.message, 'error');
  }
}

// Init
const saveTokenBtn = byId('save-token');
if (saveTokenBtn) {
  saveTokenBtn.addEventListener('click', () => {
    const pwInput = byId('admin-password');
    const val = pwInput ? pwInput.value.trim() : '';
    setToken(val);
  });
}

const notifForm = byId('notif-form');
if (notifForm) notifForm.addEventListener('submit', submitNotif);

const notifReset = byId('notif-reset');
if (notifReset) notifReset.addEventListener('click', () => fillNotifForm({}));

const notifList = byId('notif-list');
if (notifList) notifList.addEventListener('click', (e) => handleNotifActions(e));

const statsForm = byId('stats-form');
if (statsForm) statsForm.addEventListener('submit', submitStats);

setToken(getToken());
if (getToken()) {
  loadNotifications();
  loadStats();
}

// ---- Partners ----
function partnerStatus(text) {
  const el = byId('partner-msg');
  if (el) {
    el.textContent = text || '';
    return;
  }
  if (text) showFeedback(text, text.toLowerCase().includes('chyb') ? 'error' : 'success');
}

async function loadPartners() {
  const list = byId('partners-list');
  const err = byId('partners-error');
  if (!list) return;
  list.innerHTML = '<div class="muted">Načítavam...</div>';
  if (err) err.textContent = '';
  try {
    const data = await apiFetch(`${API.partners}?includeInactive=true`);
    list.innerHTML = '';
    if (!data.partners?.length) {
      list.innerHTML = '<p class="list-empty">Žiadni partneri</p>';
      return;
    }
    data.partners.forEach((p) => {
      const div = document.createElement('div');
      div.className = 'list-item';
      const safeName = escapeHtml(p.name || '');
      div.innerHTML = `
        <div class="list-item-header">
          <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
            <span class="list-item-title">${safeName}</span>
            <span class="badge ${p.active ? 'badge-active' : 'badge-inactive'}">${p.active ? 'Aktívny' : 'Neaktívny'}</span>
            <span class="badge badge-blue">${escapeHtml(PARTNER_CATEGORY_LABELS[p.category] || p.category || '—')}</span>
            <span class="badge badge-blue">Poradie: ${p.sortOrder ?? 0}</span>
          </div>
          <div class="btn-group">
            <button type="button" class="btn btn-ghost btn-sm" data-partner-edit="${p.id}">Upraviť</button>
            <button type="button" class="btn btn-ghost btn-sm" data-partner-toggle="${p.id}">${p.active ? 'Vypnúť' : 'Zapnúť'}</button>
            <button type="button" class="btn btn-danger btn-sm" data-partner-del="${p.id}">Zmazať</button>
          </div>
        </div>
        ${p.logoUrl ? `<div class="partner-list__logo"><img src="${escapeHtml(p.logoUrl)}" alt="${safeName}"></div>` : ''}
        ${p.link ? `<p class="partner-list__link">${escapeHtml(p.link)}</p>` : ''}
      `;
      list.appendChild(div);
    });
  } catch (e) {
    if (err) {
      err.textContent = e.message;
    } else {
      list.innerHTML = `<p class="list-empty">${escapeHtml(e.message)}</p>`;
    }
  }
}

function fillPartnerForm(p) {
  document.getElementById('partner-id').value = p?.id || '';
  document.getElementById('partner-name').value = p?.name || '';
  document.getElementById('partner-link').value = p?.link || '';
  document.getElementById('partner-order').value = p?.sortOrder ?? 0;
  document.getElementById('partner-category').value = p?.category || 'hlavny';
  document.getElementById('partner-active').value = p?.active ? 'true' : 'false';
  document.getElementById('partner-logo').value = '';
  partnerStatus('');
}

async function uploadLogoIfNeeded(fileInput) {
  const file = fileInput.files[0];
  if (!file) return null;
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const payload = {
    fileName: file.name,
    fileType: file.type,
    dataBase64: base64
  };
  const res = await apiFetch(API.partnerUpload, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return res.url;
}

async function submitPartner(e) {
  e.preventDefault();
  partnerStatus('');
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn?.textContent || 'Uložiť partnera';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Ukladám...';
  }
  
  try {
    const id = document.getElementById('partner-id').value;
    const name = document.getElementById('partner-name').value.trim();
    if (!name) {
      partnerStatus('Názov partnera je povinný');
      return;
    }
    const linkValue = document.getElementById('partner-link').value.trim();
    let currentPartner = null;
    if (id) {
      // Get current partner data to preserve logoUrl if no new file is uploaded
      const data = await apiFetch(API.partners);
      currentPartner = data.partners.find((x) => x.id.toString() === id.toString());
    }
    
    const payload = {
      id: id || undefined,
      name,
      link: linkValue || null,
      sortOrder: Number(document.getElementById('partner-order').value || 0),
      category: document.getElementById('partner-category').value || 'hlavny',
      active: document.getElementById('partner-active').value === 'true'
    };
    
    const logoUrl = await uploadLogoIfNeeded(document.getElementById('partner-logo'));
    if (logoUrl) {
      payload.logoUrl = logoUrl;
    } else if (id && currentPartner && currentPartner.logoUrl) {
      // Preserve existing logoUrl if editing and no new file uploaded
      payload.logoUrl = currentPartner.logoUrl;
    } else if (!id) {
      // For new partners, logoUrl is optional
      payload.logoUrl = null;
    }

    const method = id ? 'PUT' : 'POST';
    const url = id ? API.partner(id) : API.partners;
    await apiFetch(url, { method, body: JSON.stringify(payload) });
    partnerStatus('Partner uložený');
    fillPartnerForm({});
    await loadPartners();
  } catch (err) {
    const errorMsg = err.message || 'Chyba pri ukladaní';
    if (err.message && err.message.includes('Validation failed')) {
      try {
        const errorData = JSON.parse(err.message.split(':')[1] || '{}');
        if (errorData.errors && Array.isArray(errorData.errors)) {
          partnerStatus('Chyby validácie: ' + errorData.errors.join(', '));
        } else {
          partnerStatus(errorMsg);
        }
      } catch {
        partnerStatus(errorMsg);
      }
    } else {
      partnerStatus(errorMsg);
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }
}

async function handlePartnerActions(e) {
  const t = e.target;
  if (t.dataset.partnerEdit) {
    const id = t.dataset.partnerEdit;
    const data = await apiFetch(`${API.partners}?includeInactive=true`);
    const p = data.partners.find((x) => x.id.toString() === id.toString());
    if (p) fillPartnerForm(p);
  }
  if (t.dataset.partnerToggle) {
    const id = t.dataset.partnerToggle;
    const data = await apiFetch(`${API.partners}?includeInactive=true`);
    const p = data.partners.find((x) => x.id.toString() === id.toString());
    if (p) {
      const payload = {
        id: p.id,
        name: (p.name || '').trim(),
        link: p.link || null,
        logoUrl: p.logoUrl || null,
        sortOrder: p.sortOrder ?? 0,
        category: p.category || 'hlavny',
        active: !p.active
      };
      await apiFetch(API.partner(id), { method: 'PUT', body: JSON.stringify(payload) });
      loadPartners();
    }
  }
  if (t.dataset.partnerDel) {
    const id = t.dataset.partnerDel;
    if (confirm(`Zmazať partnera #${id}?`)) {
      await apiFetch(API.partner(id), { method: 'DELETE' });
      loadPartners();
    }
  }
}

const partnerForm = byId('partner-form');
if (partnerForm) partnerForm.addEventListener('submit', submitPartner);

const partnerReset = byId('partner-reset');
if (partnerReset) partnerReset.addEventListener('click', () => fillPartnerForm({}));

const partnersList = byId('partners-list');
if (partnersList) partnersList.addEventListener('click', handlePartnerActions);

// ---- Analytics / traffic ----
const DEVICE_LABELS = {
  desktop: 'Počítač',
  mobile: 'Mobil',
  tablet: 'Tablet',
  unknown: 'Neznáme'
};

function formatNumber(n) {
  return Number(n || 0).toLocaleString('sk-SK');
}

function formatShortDate(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.`;
}

function renderAnalyticsTable(rows, columns) {
  if (!rows?.length) {
    return '<p class="list-empty">Zatiaľ žiadne dáta</p>';
  }
  const head = columns.map((c) => `<th>${c.label}</th>`).join('');
  const body = rows
    .map((row) => {
      const cells = columns
        .map((c) => `<td>${escapeHtml(String(c.value(row)))}</td>`)
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');
  return `<table class="analytics-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function buildDailySeries(daily, days = 14) {
  const map = new Map((daily || []).map((d) => [d.date, d.views]));
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, views: map.get(key) || 0 });
  }
  return out;
}

const DEVICE_COLORS = {
  desktop: '#3b82f6',
  mobile: '#22c55e',
  tablet: '#a855f7',
  unknown: '#94a3b8'
};

function shouldShowChartLabel(index, total, labelStep) {
  if (labelStep <= 1) return true;
  return index % labelStep === 0 || index === total - 1;
}

function renderBarChart(series, labelFn, options = {}) {
  if (!series?.length) return '<p class="list-empty">Zatiaľ žiadne dáta</p>';

  const {
    labelStep = 1,
    dense = false,
    barWidth = dense ? 32 : null,
    hideZeroValues = dense,
    titleFn = labelFn
  } = options;

  const maxViews = Math.max(1, ...series.map((d) => d.views));
  const chartClass = dense ? 'analytics-chart analytics-chart--dense' : 'analytics-chart';
  const minWidth = barWidth ? series.length * barWidth : null;

  const bars = series
    .map((d, i) => {
      const height = Math.round((d.views / maxViews) * 100);
      const label = labelFn(d);
      const showLabel = shouldShowChartLabel(i, series.length, labelStep);
      const valueClass = hideZeroValues && !d.views ? 'analytics-chart__value is-zero' : 'analytics-chart__value';
      const labelClass = showLabel ? 'analytics-chart__label' : 'analytics-chart__label is-empty';
      const title = escapeHtml(String(titleFn(d)));
      const value = d.views ? String(d.views) : '0';

      return `<div class="analytics-chart__bar" title="${title}: ${value}">
            <span class="${valueClass}">${value}</span>
            <span class="analytics-chart__fill" style="height:${Math.max(4, height)}%"></span>
            <span class="${labelClass}">${showLabel ? escapeHtml(label) : '·'}</span>
          </div>`;
    })
    .join('');

  const chart = `<motion class="${chartClass}"${minWidth ? ` style="min-width:${minWidth}px"` : ''} role="img">${bars}</div>`;
  const chartFixed = chart.replace('motion', 'div');

  if (!dense) return chartFixed;

  return `<div class="analytics-chart-scroll">${chartFixed}</div>`;
}

function renderSvgLineChart(series) {
  if (!series?.length) return '<p class="list-empty">Zatiaľ žiadne dáta</p>';
  const w = 640;
  const h = 200;
  const pad = { t: 16, r: 12, b: 40, l: 40 };
  const max = Math.max(1, ...series.map((d) => d.views));
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const points = series.map((d, i) => {
    const x = pad.l + (series.length <= 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
    const y = pad.t + innerH - (d.views / max) * innerH;
    return { x, y, ...d };
  });
  const linePts = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPts = `${pad.l},${pad.t + innerH} ${linePts} ${points[points.length - 1].x.toFixed(1)},${pad.t + innerH}`;
  const gridLines = [0, 0.25, 0.5, 0.75, 1]
    .map((t) => {
      const y = pad.t + innerH * (1 - t);
      const val = Math.round(max * t);
      return `<line class="analytics-line-chart__grid" x1="${pad.l}" y1="${y}" x2="${w - pad.r}" y2="${y}" />
        <text class="analytics-line-chart__axis" x="${pad.l - 6}" y="${y + 3}" text-anchor="end">${val}</text>`;
    })
    .join('');
  const labelEvery = Math.max(1, Math.ceil(series.length / 7));
  const xLabels = points
    .filter((_, i) => i % labelEvery === 0 || i === series.length - 1)
    .map(
      (p) =>
        `<text class="analytics-line-chart__axis" x="${p.x}" y="${h - 10}" text-anchor="middle">${formatShortDate(p.date)}</text>`
    )
    .join('');
  return `<svg class="analytics-line-chart" viewBox="0 0 ${w} ${h}" role="img" aria-hidden="true">
    ${gridLines}
    <polygon points="${areaPts}" fill="rgba(59,130,246,0.15)" />
    <polyline points="${linePts}" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
    ${points.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="3" fill="#3b82f6" />`).join('')}
    ${xLabels}
  </svg>`;
}

function renderHorizontalBars(items, labelKey, valueKey = 'views') {
  if (!items?.length) return '<p class="list-empty">Zatiaľ žiadne dáta</p>';
  const max = Math.max(1, ...items.map((i) => i[valueKey] || 0));
  return `<div class="analytics-hbars">${items
    .map((item) => {
      const val = item[valueKey] || 0;
      const pct = Math.round((val / max) * 100);
      return `<div class="analytics-hbar">
        <span class="analytics-hbar__label" title="${escapeHtml(String(item[labelKey]))}">${escapeHtml(String(item[labelKey]))}</span>
        <span class="analytics-hbar__track"><span class="analytics-hbar__fill" style="width:${pct}%"></span></span>
        <span class="analytics-hbar__value">${formatNumber(val)}</span>
      </div>`;
    })
    .join('')}</div>`;
}

function renderDonutChart(items, labelFn) {
  if (!items?.length) return '<p class="list-empty">Zatiaľ žiadne dáta</p>';
  const total = items.reduce((s, i) => s + (i.views || 0), 0);
  if (total === 0) return '<p class="list-empty">Zatiaľ žiadne dáta</p>';

  let g = 'conic-gradient(';
  let pos = 0;
  const parts = items.map((item) => {
    const pct = (item.views / total) * 100;
    const color = DEVICE_COLORS[item.device] || '#94a3b8';
    const start = pos;
    pos += pct;
    return `${color} ${start}% ${pos}%`;
  });
  g += parts.join(', ') + ')';

  const legend = items
    .map((item) => {
      const color = DEVICE_COLORS[item.device] || '#94a3b8';
      const pct = Math.round((item.views / total) * 100);
      return `<div class="analytics-legend__item">
        <span class="analytics-legend__swatch" style="background:${color}"></span>
        <span class="analytics-legend__label">${escapeHtml(labelFn(item))}</span>
        <span class="analytics-legend__value">${formatNumber(item.views)} (${pct}%)</span>
      </div>`;
    })
    .join('');

  return `<div class="analytics-donut-wrap">
    <div class="analytics-donut" style="background:${g}">
      <div class="analytics-donut__center"><strong>${formatNumber(total)}</strong><br>zobrazení</div>
    </div>
    <div class="analytics-legend">${legend}</div>
  </div>`;
}

function renderSummaryCards(summary) {
  const s = summary || {};
  const peak =
    s.peakDate && s.peakViews
      ? `${formatShortDate(s.peakDate)} (${formatNumber(s.peakViews)})`
      : '–';
  return `
    <div class="analytics-mini-stat"><strong>${formatNumber(s.avgDaily7d)}</strong><span>Priemer / deň (7 dní)</span></div>
    <div class="analytics-mini-stat"><strong>${formatNumber(s.avgDaily30d)}</strong><span>Priemer / deň (30 dní)</span></div>
    <div class="analytics-mini-stat"><strong>${peak}</strong><span>Najsilnejší deň</span></div>
    <div class="analytics-mini-stat"><strong>${formatNumber(s.uniquePages)}</strong><span>Unikátne stránky</span></div>
  `;
}

async function loadTraffic() {
  const err = byId('traffic-error');
  const hint = byId('traffic-hint');
  if (err) {
    err.textContent = '';
    err.hidden = true;
  }

  const set = (id, val) => {
    const el = byId(id);
    if (el) el.textContent = val;
  };

  try {
    const data = await apiFetch(API.analytics);

    if (!data.configured) {
      if (hint) {
        hint.textContent =
          'Analytika nie je dostupná — v Supabase spustite aktualizovaný supabase/schema.sql (tabuľka page_views).';
      }
      return;
    }

    if (hint) {
      hint.textContent =
        data.viewsTotal === 0
          ? 'Zatiaľ žiadne zaznamenané návštevy. Po nasadení sa začnú počítať automaticky pri prehliadaní webu.'
          : 'Počítajú sa zobrazenia stránok (bez adminu a API). Osobné údaje sa neukladajú.';
    }

    set('tr-views-today', formatNumber(data.viewsToday));
    set('tr-views-7d', formatNumber(data.views7d));
    set('tr-views-30d', formatNumber(data.views30d));
    set('tr-views-total', formatNumber(data.viewsTotal));

    const content = data.content || {};
    set('tr-reviews-approved', formatNumber(content.reviewsApproved));
    set('tr-reviews-pending', formatNumber(content.reviewsPending));
    set('tr-partners', formatNumber(content.partnersActive));
    set('tr-notifications', formatNumber(content.notificationsActive));

    const summaryEl = byId('traffic-summary');
    if (summaryEl) summaryEl.innerHTML = renderSummaryCards(data.summary);

    const series30 = data.daily30?.length ? data.daily30 : buildDailySeries(data.daily, 30);
    const lineChart = byId('traffic-line-chart');
    if (lineChart) lineChart.innerHTML = renderSvgLineChart(series30);

    const series14 = data.daily?.length ? data.daily : buildDailySeries(data.daily, 14);
    const chart = byId('traffic-chart');
    if (chart) {
      chart.innerHTML = renderBarChart(series14, (d) => formatShortDate(d.date), {
        dense: true,
        labelStep: 2,
        barWidth: 36,
        titleFn: (d) => formatShortDate(d.date)
      });
    }

    const hourlyChart = byId('traffic-hourly-chart');
    if (hourlyChart) {
      hourlyChart.innerHTML = renderBarChart(data.hourly || [], (d) => `${String(d.hour).padStart(2, '0')}`, {
        dense: true,
        labelStep: 4,
        barWidth: 32,
        titleFn: (d) => `${String(d.hour).padStart(2, '0')}:00 UTC`
      });
    }

    const weekdayChart = byId('traffic-weekday-chart');
    if (weekdayChart) {
      weekdayChart.innerHTML = renderBarChart(data.weekday || [], (d) => d.label || '', {
        labelStep: 1,
        hideZeroValues: false
      });
    }

    const topPages = byId('traffic-top-pages');
    if (topPages) {
      topPages.innerHTML = renderHorizontalBars(data.topPages, 'path');
    }

    const referrers = byId('traffic-referrers');
    if (referrers) {
      referrers.innerHTML = renderHorizontalBars(data.referrers, 'host');
    }

    const devices = byId('traffic-devices');
    if (devices) {
      devices.innerHTML = renderDonutChart(data.devices, (r) => DEVICE_LABELS[r.device] || r.device);
    }
  } catch (e) {
    if (err) {
      err.textContent = e.message;
      err.hidden = false;
    }
    if (hint) hint.textContent = '';
  }
}

// ---- Reviews ----
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function reviewSourceLabel(source) {
  if (source === 'website') return 'Z webu';
  if (source === 'import') return 'Import';
  if (source === 'google') return 'Google';
  return 'Manuálne';
}

function renderStars(rating) {
  const n = Math.max(1, Math.min(5, Number(rating) || 5));
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

function appendReviewSection(list, title, items, pendingMode) {
  const section = document.createElement('section');
  section.className = 'reviews-section';
  const heading = document.createElement('h4');
  heading.className = 'reviews-section__title';
  heading.textContent = title;
  section.appendChild(heading);
  items.forEach((r) => section.appendChild(renderReviewItem(r, pendingMode)));
  list.appendChild(section);
}

async function loadReviews() {
  const list = byId('reviews-list');
  const err = byId('reviews-error');
  if (!list) return;
  list.innerHTML = '<p class="reviews-empty">Načítavam…</p>';
  if (err) {
    err.textContent = '';
    err.hidden = true;
  }
  try {
    const data = await apiFetch(`${API.reviews}?limit=200`);
    list.innerHTML = '';
    const items = data.reviews || [];
    if (!items.length) {
      list.innerHTML =
        '<p class="reviews-empty">Žiadne recenzie v databáze. Spustite import alebo počkajte na odoslanie z webu.</p>';
      return;
    }
    const pending = items.filter((r) => !r.approved);
    const approved = items.filter((r) => r.approved);
    if (pending.length) {
      appendReviewSection(list, `Čakajú na schválenie (${pending.length})`, pending, true);
    }
    if (approved.length) {
      appendReviewSection(list, `Schválené (${approved.length})`, approved.slice(0, 50), false);
      if (approved.length > 50) {
        const more = document.createElement('p');
        more.className = 'reviews-more';
        more.textContent = `… a ďalších ${approved.length - 50} schválených recenzií`;
        list.appendChild(more);
      }
    }
  } catch (e) {
    if (err) {
      err.textContent = e.message;
      err.hidden = false;
    } else {
      list.innerHTML = `<p class="reviews-empty">${escapeHtml(e.message)}</p>`;
    }
  }
}

function renderReviewItem(r, pendingMode) {
  const div = document.createElement('article');
  div.className = pendingMode ? 'review-card review-card--pending' : 'review-card review-card--approved';
  const text = (r.text || '').trim();
  const preview = text.length > 220 ? `${text.slice(0, 217)}…` : text;
  const time =
    r.relative_time_description &&
    !/^čaká na schválenie$/i.test(String(r.relative_time_description).trim())
      ? `<span class="review-card__source"> · ${escapeHtml(r.relative_time_description)}</span>`
      : '';

  div.innerHTML = `
    <header class="review-card__header">
      <div class="review-card__meta">
        <span class="review-card__author">${escapeHtml(r.author_name || '—')}</span>
        ${
          pendingMode
            ? '<span class="badge badge-pending">Čaká na schválenie</span>'
            : '<span class="badge badge-approved">Schválená</span>'
        }
      </div>
      <span class="review-card__stars" aria-label="${Number(r.rating) || 5} z 5">${renderStars(r.rating)}</span>
    </header>
    <p class="review-card__text">${escapeHtml(preview)}</p>
    <footer class="review-card__footer">
      <div class="review-card__meta">
        <span class="review-card__source">${escapeHtml(reviewSourceLabel(r.source))}${time}</span>
      </div>
      <div class="review-card__actions">
        ${
          pendingMode
            ? `<button type="button" class="btn-review btn-review--approve" data-review-approve="${escapeHtml(r.id)}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
                Schváliť
              </button>`
            : ''
        }
        <button type="button" class="btn-review btn-review--delete" data-review-del="${escapeHtml(r.id)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2m-1 0v14H9V6"/></svg>
          Zmazať
        </button>
      </div>
    </footer>
  `;
  return div;
}

async function handleReviewActions(e) {
  const t = e.target;
  if (t.dataset.reviewApprove) {
    const id = t.dataset.reviewApprove;
    await apiFetch(API.review(id), {
      method: 'PUT',
      body: JSON.stringify({ approved: true, relative_time_description: 'nedávno' })
    });
    showFeedback('Recenzia schválená');
    loadReviews();
  }
  if (t.dataset.reviewDel) {
    const id = t.dataset.reviewDel;
    if (!confirm(`Zmazať recenziu #${id}?`)) return;
    await apiFetch(API.review(id), { method: 'DELETE' });
    showFeedback('Recenzia zmazaná');
    loadReviews();
  }
}

async function importReviewsArchive() {
  const btn = byId('reviews-import-btn');
  if (!btn || btn.disabled) return;
  if (
    !confirm(
      'Importovať 177 recenzií zo starého webu kontrolavozidiel.sk? Existujúce duplicity sa preskočia.'
    )
  ) {
    return;
  }
  btn.disabled = true;
  const prev = btn.textContent;
  btn.textContent = 'Importujem…';
  try {
    const data = await apiFetch(API.reviewsImport, {
      method: 'POST',
      body: JSON.stringify({ skipExisting: true })
    });
    showFeedback(
      `Import: ${data.imported} nových, ${data.skipped} preskočených, ${data.failed} chýb (celkom ${data.total})`
    );
    await loadReviews();
  } catch (e) {
    showFeedback(e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = prev;
  }
}

const reviewsList = byId('reviews-list');
if (reviewsList) reviewsList.addEventListener('click', handleReviewActions);

const reviewsImportBtn = byId('reviews-import-btn');
if (reviewsImportBtn) reviewsImportBtn.addEventListener('click', importReviewsArchive);

if (getToken()) {
  loadPartners();
  loadReviews();
}

window.loadReviews = loadReviews;
