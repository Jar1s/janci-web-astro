/**
 * Micro-interactions — JP Control Astro
 *
 * Provides: Tilt cards, Magnetic buttons, Parallax elements,
 *           Smooth reveal, Counter bounce.
 *
 * All effects respect prefers-reduced-motion and are disabled
 * on touch devices where appropriate.
 */
(function () {
  'use strict';

  /* ========================================================================
     UTILITIES
     ======================================================================== */
  var prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var isTouchDevice =
    'ontouchstart' in window || navigator.maxTouchPoints > 0;

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /* ========================================================================
     1. TILT EFFECT — .tilt-card
     Subtle 3D tilt following mouse position (max 5deg).
     Disabled on mobile / touch / reduced-motion.
     ======================================================================== */
  function initTiltCards() {
    if (prefersReducedMotion || isTouchDevice) return;

    var cards = document.querySelectorAll('.tilt-card');
    cards.forEach(function (card) {
      var ticking = false;
      var currentX = 0;
      var currentY = 0;
      var targetX = 0;
      var targetY = 0;

      function updateTilt() {
        currentX = lerp(currentX, targetX, 0.12);
        currentY = lerp(currentY, targetY, 0.12);

        card.style.transform =
          'perspective(800px) rotateY(' + currentX + 'deg) rotateX(' + currentY + 'deg)';

        if (
          Math.abs(currentX - targetX) > 0.01 ||
          Math.abs(currentY - targetY) > 0.01
        ) {
          requestAnimationFrame(updateTilt);
        } else {
          ticking = false;
        }
      }

      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;

        var halfW = rect.width / 2;
        var halfH = rect.height / 2;

        targetX = ((x - halfW) / halfW) * 5;  // max 5deg
        targetY = -((y - halfH) / halfH) * 5; // max 5deg, inverted

        if (!ticking) {
          ticking = true;
          requestAnimationFrame(updateTilt);
        }
      });

      card.addEventListener('mouseleave', function () {
        targetX = 0;
        targetY = 0;
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(updateTilt);
        }
      });
    });
  }

  /* ========================================================================
     2. MAGNETIC BUTTONS — .magnetic-btn
     CTA buttons slightly follow the cursor when near (max 10px).
     Disabled on touch / reduced-motion.
     ======================================================================== */
  function initMagneticButtons() {
    if (prefersReducedMotion || isTouchDevice) return;

    var buttons = document.querySelectorAll('.magnetic-btn');
    buttons.forEach(function (btn) {
      var currentX = 0;
      var currentY = 0;
      var targetX = 0;
      var targetY = 0;
      var ticking = false;

      function updateMagnetic() {
        currentX = lerp(currentX, targetX, 0.15);
        currentY = lerp(currentY, targetY, 0.15);

        btn.style.transform = 'translate(' + currentX + 'px, ' + currentY + 'px)';

        if (
          Math.abs(currentX - targetX) > 0.05 ||
          Math.abs(currentY - targetY) > 0.05
        ) {
          requestAnimationFrame(updateMagnetic);
        } else {
          ticking = false;
        }
      }

      btn.addEventListener('mousemove', function (e) {
        var rect = btn.getBoundingClientRect();
        var centerX = rect.left + rect.width / 2;
        var centerY = rect.top + rect.height / 2;

        var dx = e.clientX - centerX;
        var dy = e.clientY - centerY;

        // Max displacement: 10px
        var maxDist = 10;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var cappedDist = Math.min(dist, rect.width / 2);
        var ratio = cappedDist / (rect.width / 2);

        targetX = (dx / dist) * maxDist * ratio || 0;
        targetY = (dy / dist) * maxDist * ratio || 0;

        if (!ticking) {
          ticking = true;
          requestAnimationFrame(updateMagnetic);
        }
      });

      btn.addEventListener('mouseleave', function () {
        targetX = 0;
        targetY = 0;
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(updateMagnetic);
        }
      });
    });
  }

  /* ========================================================================
     3. PARALLAX ELEMENTS — data-parallax-speed
     Elements move at different scroll speeds.
     Disabled if prefers-reduced-motion.
     ======================================================================== */
  function initParallax() {
    if (prefersReducedMotion) return;

    var parallaxEls = document.querySelectorAll('[data-parallax-speed]');
    if (parallaxEls.length === 0) return;

    var ticking = false;

    function updateParallax() {
      var scrollY = window.pageYOffset || document.documentElement.scrollTop;

      parallaxEls.forEach(function (el) {
        var speed = parseFloat(el.getAttribute('data-parallax-speed')) || 0;
        var rect = el.getBoundingClientRect();
        var elCenter = rect.top + rect.height / 2 + scrollY;
        var viewCenter = scrollY + window.innerHeight / 2;
        var offset = (viewCenter - elCenter) * speed * 0.1;

        el.style.transform = 'translateY(' + offset + 'px)';
      });

      ticking = false;
    }

    window.addEventListener(
      'scroll',
      function () {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(updateParallax);
        }
      },
      { passive: true }
    );

    // Initial call
    updateParallax();
  }

  /* ========================================================================
     4. SMOOTH REVEAL — enhanced scroll animations with spring-like easing
     Works with existing .animate-on-scroll elements, adding spring easing.
     ======================================================================== */
  function initSmoothReveal() {
    if (prefersReducedMotion) return;

    var revealEls = document.querySelectorAll('.smooth-reveal');
    if (revealEls.length === 0) return;

    revealEls.forEach(function (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      el.style.transition =
        'opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1), ' +
        'transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)';
    });

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;

          var el = entry.target;

          // Stagger children with .smooth-reveal-child
          var children = el.querySelectorAll('.smooth-reveal-child');
          if (children.length > 0) {
            children.forEach(function (child, i) {
              child.style.opacity = '0';
              child.style.transform = 'translateY(20px)';
              child.style.transition =
                'opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1) ' +
                (i * 80) + 'ms, ' +
                'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1) ' +
                (i * 80) + 'ms';

              // Trigger in next frame
              requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                  child.style.opacity = '1';
                  child.style.transform = 'none';
                });
              });
            });
          }

          el.style.opacity = '1';
          el.style.transform = 'none';
          observer.unobserve(el);
        });
      },
      { threshold: 0.08 }
    );

    revealEls.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ========================================================================
     5. COUNTER BOUNCE — bounce/overshoot when stat counters finish
     Watches for the counter to reach its target, then adds bounce class.
     ======================================================================== */
  function initCounterBounce() {
    if (prefersReducedMotion) return;

    var statsSection = document.getElementById('hero-stats');
    if (!statsSection) return;

    var statValues = statsSection.querySelectorAll('.hero-stat-value');
    if (statValues.length === 0) return;

    // Poll each stat value to detect when counting finishes
    statValues.forEach(function (el) {
      var target = el.getAttribute('data-target');
      if (!target) return;

      var checkInterval = setInterval(function () {
        var current = el.textContent || '';
        // Strip whitespace and compare
        var currentClean = current.replace(/\s/g, '');
        var targetClean = target.replace(/\s/g, '');

        if (currentClean === targetClean) {
          clearInterval(checkInterval);
          // Small delay, then add bounce
          setTimeout(function () {
            el.classList.add('counter-bounce');
            // Remove the class after animation so it doesn't interfere
            el.addEventListener('animationend', function () {
              el.classList.remove('counter-bounce');
            }, { once: true });
          }, 50);
        }
      }, 100);

      // Safety: stop checking after 5s
      setTimeout(function () {
        clearInterval(checkInterval);
      }, 5000);
    });
  }

  /* ========================================================================
     INIT — run when DOM is ready
     ======================================================================== */
  function init() {
    initTiltCards();
    initMagneticButtons();
    initParallax();
    initSmoothReveal();
    initCounterBounce();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-init after View Transitions
  document.addEventListener('astro:after-swap', init);
})();
