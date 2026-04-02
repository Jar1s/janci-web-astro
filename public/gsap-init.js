// GSAP ScrollTrigger animations
(function() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  function initAnimations() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Kill old triggers
    ScrollTrigger.getAll().forEach(function(t) { t.kill(); });

    // Service cards
    gsap.utils.toArray('.service-card').forEach(function(card, i) {
      gsap.fromTo(card,
        { opacity: 0, y: 30 },
        {
          scrollTrigger: { trigger: card, start: 'top 90%', once: true },
          opacity: 1, y: 0, duration: 0.6, delay: i * 0.15, ease: 'power2.out',
          clearProps: 'all'
        }
      );
    });

    // Review cards
    gsap.utils.toArray('.review-card').forEach(function(card, i) {
      gsap.fromTo(card,
        { opacity: 0, y: 25 },
        {
          scrollTrigger: { trigger: card, start: 'top 90%', once: true },
          opacity: 1, y: 0, duration: 0.6, delay: i * 0.15, ease: 'power2.out',
          clearProps: 'all'
        }
      );
    });

    // Process timeline
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
        onUpdate: function(self) {
          var progress = self.progress;
          if (isMobile) {
            lineFill.style.height = (progress * 100) + '%';
          } else {
            lineFill.style.width = (progress * 100) + '%';
          }
          steps.forEach(function(step, i) {
            var threshold = i / (steps.length - 1);
            if (progress >= threshold * 0.9) {
              step.classList.add('visible', 'active');
            }
          });
        }
      });
    }
  }

  // Run on DOM ready
  document.addEventListener('DOMContentLoaded', initAnimations);

  // Re-run after View Transitions page swap
  document.addEventListener('astro:after-swap', function() {
    ScrollTrigger.refresh();
    initAnimations();
  });
})();
