// i18n Language Switcher for JP Control website
import { sk, en } from './i18n/index.js';

(() => {
  const translations = { sk, en };

  function applyText(el, value) {
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      if (el.type === 'submit' || el.type === 'button') {
        el.value = value;
      } else {
        el.placeholder = value;
      }
      return;
    }
    if (el.tagName === 'OPTION') {
      el.textContent = value;
      return;
    }
    el.textContent = value;
  }

  function updateLanguage(lang) {
    document.documentElement.lang = lang;
    localStorage.setItem('language', lang);

    document.querySelectorAll('.lang-btn').forEach((btn) => {
      const btnLang = btn.getAttribute('data-lang') || btn.textContent.trim().toLowerCase();
      const isActive = btnLang === lang;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-current', isActive ? 'true' : 'false');
    });

    document.querySelectorAll('[data-translate]').forEach((el) => {
      const key = el.getAttribute('data-translate');
      const value = translations[lang]?.[key];
      if (value === undefined) return;
      if (el.hasAttribute('data-translate-html')) {
        el.innerHTML = value;
      } else {
        applyText(el, value);
      }
    });

    document.querySelectorAll('[data-translate-aria]').forEach((el) => {
      const key = el.getAttribute('data-translate-aria');
      const value = translations[lang]?.[key];
      if (value !== undefined) el.setAttribute('aria-label', value);
    });

    document.querySelectorAll('[data-translate-title]').forEach((el) => {
      const key = el.getAttribute('data-translate-title');
      const value = translations[lang]?.[key];
      if (value !== undefined) el.setAttribute('title', value);
    });
  }

  function initLanguage() {
    const currentLang = localStorage.getItem('language') || 'sk';
    updateLanguage(currentLang);

    document.querySelectorAll('.lang-btn').forEach((btn) => {
      if (btn.dataset.i18nBound === '1') return;
      btn.dataset.i18nBound = '1';
      btn.addEventListener('click', () => {
        const lang = btn.getAttribute('data-lang') || btn.textContent.trim().toLowerCase();
        updateLanguage(lang);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', initLanguage);
  document.addEventListener('astro:after-swap', initLanguage);

  window.updateLanguage = updateLanguage;
})();
