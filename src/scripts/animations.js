/**
 * Scroll sekcie — bez skrývania opacity (spoľahlivosť > animácia).
 * Pridá .animated pre prípadné štýly; žiadne opacity:0 → žiadne „zmiznuté“ sekcie.
 */
(function () {
  'use strict';

  function initScrollAnimations() {
    document.querySelectorAll('.animate-on-scroll').forEach(function (el) {
      el.classList.add('animated');
      el.style.opacity = '';
      el.style.transform = '';
      el.style.willChange = '';
      el.style.transition = '';
      el.querySelectorAll(
        '.advantage-card, .review-card, .service-link-card, .service-card'
      ).forEach(function (card) {
        card.style.opacity = '';
        card.style.transform = '';
        card.style.willChange = '';
        card.style.transition = '';
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollAnimations);
  } else {
    initScrollAnimations();
  }

  document.addEventListener('astro:after-swap', initScrollAnimations);
})();
