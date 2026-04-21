// GSAP len pre časovú os procesu — NIE pre .service-card / .review-card (tie rieši animations.js,
// inak neskorý gsap.fromTo({ opacity: 0 }) prepíše už zobrazený obsah → biele „dierky“).
(function () {
  function initAnimations() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    ScrollTrigger.getAll().forEach(function (t) {
      t.kill();
    });

    var timeline = document.getElementById('process-timeline');
    var lineFill = document.getElementById('process-line-fill');
    var steps = timeline ? timeline.querySelectorAll('.process-step') : [];

    if (timeline && lineFill && steps.length) {
      var isMobile = window.innerWidth <= 768;
      ScrollTrigger.create({
        trigger: timeline,
        start: 'top 80%',
        end: 'bottom 60%',
        scrub: 0.5,
        onUpdate: function (self) {
          var progress = self.progress;
          if (isMobile) {
            lineFill.style.height = progress * 100 + '%';
          } else {
            lineFill.style.width = progress * 100 + '%';
          }
          steps.forEach(function (step, i) {
            var threshold = i / (steps.length - 1);
            if (progress >= threshold * 0.9) {
              step.classList.add('visible', 'active');
            }
          });
        },
      });
    }
  }

  function boot() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);
    initAnimations();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('astro:after-swap', function () {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    ScrollTrigger.refresh();
    initAnimations();
  });
})();
