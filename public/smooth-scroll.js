// Lightweight smooth scroll with lerp interpolation
(function() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.documentElement.style.scrollBehavior = 'smooth';

  var current = window.pageYOffset;
  var target = current;
  var ease = 0.08;
  var rafId = null;
  var isScrolling = false;

  function lerp(a, b, t) { return a + (b - a) * t; }

  function update() {
    current = lerp(current, target, ease);
    if (Math.abs(current - target) < 0.5) {
      current = target;
      isScrolling = false;
      window.scrollTo(0, current);
      rafId = null;
      return;
    }
    window.scrollTo(0, current);
    rafId = requestAnimationFrame(update);
  }

  window.addEventListener('wheel', function(e) {
    e.preventDefault();
    target = Math.max(0, Math.min(
      target + e.deltaY,
      document.documentElement.scrollHeight - window.innerHeight
    ));
    current = window.pageYOffset;
    if (!isScrolling) {
      isScrolling = true;
      rafId = requestAnimationFrame(update);
    }
  }, { passive: false });
})();
