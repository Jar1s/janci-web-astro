/* Načíta GSAP + ScrollTrigger + gsap-init až po idle alebo prvom scrolli/touchi (rýchlejší prvý paint). */
(function () {
  var started = false;
  var urls = ['/gsap.min.js', '/ScrollTrigger.min.js', '/gsap-init.js'];

  function inject(i) {
    if (i >= urls.length) return;
    var s = document.createElement('script');
    s.src = urls[i];
    s.onload = function () {
      inject(i + 1);
    };
    s.onerror = function () {
      inject(i + 1);
    };
    document.body.appendChild(s);
  }

  function kick() {
    if (started) return;
    started = true;
    inject(0);
  }

  if ('requestIdleCallback' in window) {
    requestIdleCallback(
      function () {
        kick();
      },
      { timeout: 2800 }
    );
  } else {
    setTimeout(kick, 1800);
  }

  window.addEventListener('scroll', kick, { once: true, passive: true });
  window.addEventListener('touchstart', kick, { once: true, passive: true });
})();
