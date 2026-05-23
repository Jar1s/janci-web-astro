(function () {
  'use strict';

  var consent = null;
  try {
    consent = localStorage.getItem('cookie-consent');
  } catch (_) {
    consent = null;
  }
  if (consent !== 'accepted') {
    return;
  }

  var path = window.location.pathname || '/';
  if (!path.startsWith('/') || path.indexOf('/admin') === 0 || path.indexOf('/api') === 0) {
    return;
  }

  var payload = JSON.stringify({
    path: path,
    referrer: document.referrer || ''
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics', new Blob([payload], { type: 'application/json' }));
    return;
  }

  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
    credentials: 'same-origin'
  }).catch(function () {});
})();
