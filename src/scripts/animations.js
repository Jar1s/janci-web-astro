/**
 * Scroll Animations – IntersectionObserver-based
 * Re-initializes on View Transitions (astro:after-swap)
 */
(function () {
  'use strict';

  function initScrollAnimations() {
    var prefersReducedMotion =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var elements = document.querySelectorAll('.animate-on-scroll');
    if (!elements.length) return;

    if (prefersReducedMotion) {
      elements.forEach(function (el) {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      return;
    }

    elements.forEach(function (el) {
      el.style.opacity = '0';
      el.style.willChange = 'opacity, transform';
      el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';

      if (el.classList.contains('animate-fade-up')) {
        el.style.transform = 'translateY(40px)';
      } else if (el.classList.contains('animate-fade-left')) {
        el.style.transform = 'translateX(-40px)';
      } else if (el.classList.contains('animate-fade-right')) {
        el.style.transform = 'translateX(40px)';
      } else if (el.classList.contains('animate-fade-scale')) {
        el.style.transform = 'scale(0.95)';
      }
    });

    // Stagger cards
    var cardSets = new Map();
    elements.forEach(function (el) {
      var cards = el.querySelectorAll(
        '.advantage-card, .review-card, .service-link-card, .service-card'
      );
      cards.forEach(function (card, index) {
        card.style.opacity = '0';
        card.style.willChange = 'opacity, transform';
        card.style.transition =
          'opacity 0.5s ease ' + index * 100 + 'ms, transform 0.5s ease ' + index * 100 + 'ms';
        card.style.transform = 'translateY(40px)';
      });
      if (cards.length > 0) cardSets.set(el, cards);
    });

    function reveal(el) {
      el.style.opacity = '1';
      el.style.transform = 'none';
      var cards = cardSets.get(el);
      if (cards) {
        cards.forEach(function (card) {
          card.style.opacity = '1';
          card.style.transform = 'none';
        });
      }
    }

    // threshold 0.1 spôsoboval neviditeľné sekcie: vysoký blok mal v okne <10 % výšky → callback nikdy
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          reveal(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0, rootMargin: '80px 0px 120px 0px' }
    );

    elements.forEach(function (el) {
      observer.observe(el);
    });

    // Dvojité rAF: po prvom paint má správnu výšku layoutu
    function revealIfInView() {
      elements.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var vh = window.innerHeight || document.documentElement.clientHeight;
        if (r.bottom > 0 && r.top < vh) {
          reveal(el);
          try {
            observer.unobserve(el);
          } catch (_) {}
        }
      });
    }
    requestAnimationFrame(function () {
      requestAnimationFrame(revealIfInView);
    });

    // Po úplnom načítaní (fonty/obrázky) ešte raz — predchádza „zaseknutému“ opacity 0
    window.addEventListener(
      'load',
      function () {
        requestAnimationFrame(revealIfInView);
      },
      { once: true }
    );
  }

  // Init on first load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollAnimations);
  } else {
    initScrollAnimations();
  }

  // Re-init after View Transitions
  document.addEventListener('astro:after-swap', initScrollAnimations);
})();
