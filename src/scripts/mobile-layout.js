/**
 * Mobile header stack: measures .site-top (navbar + announcement) and
 * syncs --site-top-height / --header-total-height for #main padding.
 */
(function initMobileLayout() {
  var siteTop = document.getElementById('site-top');
  if (!siteTop) return;

  var mq = window.matchMedia('(max-width: 768px)');

  function measure() {
    if (!mq.matches) {
      document.documentElement.style.removeProperty('--site-top-height');
      document.body.classList.remove('mobile-layout-ready');
      return;
    }

    var h = Math.ceil(siteTop.getBoundingClientRect().height);
    if (h > 0) {
      document.documentElement.style.setProperty('--site-top-height', h + 'px');
      document.documentElement.style.setProperty('--header-total-height', h + 'px');
      document.body.classList.add('mobile-layout-ready');
    }
  }

  function scheduleMeasure() {
    requestAnimationFrame(function () {
      measure();
    });
  }

  measure();
  window.addEventListener('resize', scheduleMeasure, { passive: true });
  window.addEventListener('janci:layout-sync', scheduleMeasure);
  mq.addEventListener('change', scheduleMeasure);
  document.addEventListener('DOMContentLoaded', scheduleMeasure);
  window.addEventListener('load', scheduleMeasure);

  if (typeof ResizeObserver !== 'undefined') {
    var ro = new ResizeObserver(scheduleMeasure);
    ro.observe(siteTop);
  }

  var annBar = document.getElementById('announcement-bar');
  if (annBar && typeof MutationObserver !== 'undefined') {
    var mo = new MutationObserver(scheduleMeasure);
    mo.observe(annBar, { attributes: true, attributeFilter: ['style', 'class'] });
  }
})();
