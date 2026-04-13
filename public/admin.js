const API = {
  notifications: '/api/notifications',
  notification: (id) => `/api/notifications?id=${encodeURIComponent(id)}`,
  statistics: '/api/statistics',
  partners: '/api/partners',
  partner: (id) => `/api/partners?id=${encodeURIComponent(id)}`,
  partnerUpload: '/api/partners/upload'
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
  localStorage.setItem('adminToken', token);
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
    throw new Error(`Request failed ${res.status}: ${text}`);
  }
  return res.json();
}

// Notifications
async function loadNotifications() {
  const list = byId('notif-list');
  const err = byId('notif-error');
  if (!list) return;
  list.innerHTML = '<div class="muted">Načítavam...</div>';
  if (err) err.textContent = '';
  try {
    const data = await apiFetch(API.notifications);
    list.innerHTML = '';
    data.notifications.forEach((n) => {
      const div = document.createElement('div');
      div.className = 'item';
      div.innerHTML = `
        <div class="inline">
          <strong>#${n.id}</strong>
          <span class="badge">${n.active ? 'Aktívna' : 'Neaktívna'}</span>
        </div>
        <div class="muted" style="margin:6px 0;">${n.text}</div>
        <div class="inline">
          <button type="button" class="btn-secondary" data-edit="${n.id}">Upraviť</button>
          <button type="button" class="btn-secondary" data-toggle="${n.id}">${n.active ? 'Deaktivovať' : 'Aktivovať'}</button>
          <button type="button" class="btn-danger" data-del="${n.id}">Zmazať</button>
        </div>
      `;
      list.appendChild(div);
    });
  } catch (e) {
    if (err) {
      err.textContent = e.message;
    } else {
      list.innerHTML = `<div class="muted">${e.message}</div>`;
    }
  }
}

function fillNotifForm(n) {
  document.getElementById('notif-id').value = n.id || '';
  document.getElementById('notif-text').value = n.text || '';
  document.getElementById('notif-bg').value = n.backgroundColor || 'rgba(200, 30, 30, 0.95)';
  document.getElementById('notif-grad').value = n.backgroundGradient || 'rgba(180, 20, 20, 0.95)';
  document.getElementById('notif-border').value = n.borderColor || 'rgba(150, 10, 10, 0.8)';
  document.getElementById('notif-textcolor').value = n.textColor || 'rgba(255, 255, 255, 1)';
  document.getElementById('notif-active').value = n.active ? 'true' : 'false';
}

async function submitNotif(e) {
  e.preventDefault();
  const msg = byId('notif-form-msg');
  if (msg) msg.textContent = '';
  const payload = {
    text: document.getElementById('notif-text').value,
    backgroundColor: document.getElementById('notif-bg').value,
    backgroundGradient: document.getElementById('notif-grad').value,
    borderColor: document.getElementById('notif-border').value,
    textColor: document.getElementById('notif-textcolor').value,
    active: document.getElementById('notif-active').value === 'true'
  };
  const id = document.getElementById('notif-id').value;
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

// Statistics
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
    data.partners.forEach((p) => {
      const div = document.createElement('div');
      div.className = 'item';
      div.innerHTML = `
        <div class="inline">
          <strong>#${p.id}</strong>
          <span class="badge">${p.active ? 'Aktívny' : 'Neaktívny'}</span>
          <span class="badge">Poradie: ${p.sortOrder ?? 0}</span>
        </div>
        <div style="margin:6px 0;">
          <div><strong>${p.name}</strong></div>
          ${p.logoUrl ? `<div class="muted">Logo: ${p.logoUrl}</div>` : ''}
          ${p.link ? `<div class="muted">Link: ${p.link}</div>` : ''}
        </div>
        <div class="inline">
          <button type="button" class="btn-secondary" data-partner-edit="${p.id}">Upraviť</button>
          <button type="button" class="btn-secondary" data-partner-toggle="${p.id}">${p.active ? 'Deaktivovať' : 'Aktivovať'}</button>
          <button type="button" class="btn-danger" data-partner-del="${p.id}">Zmazať</button>
        </div>
      `;
      list.appendChild(div);
    });
  } catch (e) {
    if (err) {
      err.textContent = e.message;
    } else {
      list.innerHTML = `<div class="muted">${e.message}</div>`;
    }
  }
}

function fillPartnerForm(p) {
  document.getElementById('partner-id').value = p?.id || '';
  document.getElementById('partner-name').value = p?.name || '';
  document.getElementById('partner-link').value = p?.link || '';
  document.getElementById('partner-order').value = p?.sortOrder ?? 0;
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

if (getToken()) {
  loadPartners();
}
