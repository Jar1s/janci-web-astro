(() => {
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const state = {
    mobileNavMenu: null,
    isMenuOpen: false,
    heroStatsAnimated: false,
    statsAnimated: false,
    defaultPartnerNodes: null,
    partnersData: []
  };

  const dom = {
    navbar: $('.navbar'),
    heroSection: $('.hero') || $('.about-hero'),
    announcementsWrapper: $('#hero-announcements-wrapper'),
    heroPartners: $('.hero-partners-scroll'),
    partnersTrack: $('#partners-scroll')
  };

  const rafThrottle = (fn) => {
    let ticking = false;
    return (...args) => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        fn(...args);
      });
    };
  };

  const debounce = (fn, delay = 180) => {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  };

  function computeHeaderHeights() {
    const navbar = dom.navbar || $('.navbar');
    const announcements = dom.announcementsWrapper || $('#hero-announcements-wrapper');
    const navHeight = navbar ? Math.max(48, Math.ceil(navbar.offsetHeight || 0)) : 0;
    const announcementVisible = announcements && announcements.style.display !== 'none';
    const announcementHeight = announcementVisible ? Math.max(36, Math.ceil(announcements.offsetHeight || 0)) : 0;
    const total = navHeight + announcementHeight;
    document.documentElement.style.setProperty('--navbar-height', `${navHeight}px`);
    document.documentElement.style.setProperty('--announcement-height', `${announcementHeight}px`);
    document.documentElement.style.setProperty('--header-total-height', `${total}px`);
    return { navHeight, announcementHeight, total };
  }

  function initNavigation() {
    const navMenuLeft = $('.nav-menu-left');
    const navMenuRight = $('.nav-menu-right');
    const mobileMenuToggle = $('.mobile-menu-toggle');
    const mobileMenuOverlay = $('.mobile-menu-overlay');
    const navWrapper = $('.nav-wrapper');
    const navbar = dom.navbar;
    const heroSection = dom.heroSection;
    const navbarLeftExtras = $('.navbar-left-extras');
    const navbarRightExtras = $('.navbar-right-extras');
    const logoEl = navWrapper?.querySelector('.logo');
    const desktopMenus = [navMenuLeft, navMenuRight].filter(Boolean);
    const isMobileViewport = () => window.innerWidth <= 1200 || window.innerHeight <= 600;
    let lockedScrollY = 0;

    const ensureInBody = (el) => {
      if (!el) return;
      if (el.parentElement !== document.body) {
        document.body.appendChild(el);
      }
    };

    const buildMobileMenu = () => {
      const existingMobile = $('.nav-menu.mobile-only', navWrapper) || $('.nav-menu.mobile-only');
      if (existingMobile) {
        if (!existingMobile.id) existingMobile.id = 'mobile-menu';
        state.mobileNavMenu = existingMobile;
        ensureInBody(state.mobileNavMenu);
        return;
      }

      if (navMenuLeft && navMenuRight) {
        const mobileNavMenu = document.createElement('ul');
        mobileNavMenu.className = 'nav-menu mobile-only';
        mobileNavMenu.id = 'mobile-menu';
        mobileNavMenu.setAttribute('role', 'menu');
        mobileNavMenu.setAttribute('aria-label', 'Main navigation');
        navMenuLeft.querySelectorAll('li').forEach((li) => {
          const clonedLi = li.cloneNode(true);
          const link = clonedLi.querySelector('a');
          if (link) link.setAttribute('role', 'menuitem');
          mobileNavMenu.appendChild(clonedLi);
        });
        navMenuRight.querySelectorAll('li').forEach((li) => {
          const clonedLi = li.cloneNode(true);
          const link = clonedLi.querySelector('a');
          if (link) link.setAttribute('role', 'menuitem');
          mobileNavMenu.appendChild(clonedLi);
        });
        document.body.appendChild(mobileNavMenu);
        state.mobileNavMenu = mobileNavMenu;
        return;
      }

      const singleMenu = $('.nav-menu', navWrapper) || $('.nav-menu');
      if (singleMenu) {
        const mobileNavMenu = document.createElement('ul');
        mobileNavMenu.className = 'nav-menu mobile-only';
        mobileNavMenu.id = 'mobile-menu';
        mobileNavMenu.setAttribute('role', 'menu');
        mobileNavMenu.setAttribute('aria-label', 'Main navigation');
        singleMenu.querySelectorAll('li').forEach((li) => {
          mobileNavMenu.appendChild(li.cloneNode(true));
        });
        document.body.appendChild(mobileNavMenu);
        state.mobileNavMenu = mobileNavMenu;
        return;
      }

      state.mobileNavMenu = null;
    };

    const ensureMobileHeader = () => {
      if (!state.mobileNavMenu) return;
      if (state.mobileNavMenu.querySelector('.mobile-menu-header')) return;
      const headerItem = document.createElement('li');
      headerItem.className = 'mobile-menu-header';
      const backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.className = 'mobile-menu-back';
      backBtn.innerHTML = '<span class="mobile-back-icon" aria-hidden="true">←</span><span>Späť</span>';
      const title = document.createElement('span');
      title.className = 'mobile-menu-title';
      title.textContent = 'Menu';
      headerItem.appendChild(backBtn);
      headerItem.appendChild(title);
      state.mobileNavMenu.insertBefore(headerItem, state.mobileNavMenu.firstChild);
      backBtn.addEventListener('click', () => closeMobileMenu());
    };

    const ensureMobileSocials = () => {
      if (!state.mobileNavMenu) return;
      if (state.mobileNavMenu.querySelector('.mobile-menu-socials')) return;
      const socialsSource = $('.social-icons', navbarRightExtras) || $('.social-icons', navWrapper) || $('.social-icons');
      if (!socialsSource) return;
      const cloned = socialsSource.cloneNode(true);
      const socialItem = document.createElement('li');
      socialItem.className = 'mobile-menu-socials';
      socialItem.appendChild(cloned);
      state.mobileNavMenu.appendChild(socialItem);
    };

    const setDesktopVisibility = (mobile) => {
      desktopMenus.forEach((menu) => { if (menu) menu.style.display = mobile ? 'none' : ''; });
      if (navbarLeftExtras) navbarLeftExtras.style.display = mobile ? 'none' : '';
      if (navbarRightExtras) navbarRightExtras.style.display = mobile ? 'none' : '';
      if (logoEl) logoEl.style.display = '';
      if (mobileMenuToggle) mobileMenuToggle.style.display = mobile ? 'flex' : '';
    };

    const closeMobileMenu = (skipScrollRestore = false) => {
      if (!state.mobileNavMenu) return;
      state.isMenuOpen = false;
      state.mobileNavMenu.classList.remove('active');
      state.mobileNavMenu.style.display = 'none';
      state.mobileNavMenu.style.transform = 'translateX(100%)';
      mobileMenuToggle?.classList.remove('active');
      mobileMenuToggle?.setAttribute('aria-expanded', 'false');
      mobileMenuOverlay?.classList.remove('active');
      if (mobileMenuOverlay) mobileMenuOverlay.style.display = 'none';
      document.body.classList.remove('menu-open');
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (!skipScrollRestore) {
        window.scrollTo(0, lockedScrollY || 0);
      }
    };

    const openMobileMenu = () => {
      if (!state.mobileNavMenu || !isMobileViewport()) return;
      state.isMenuOpen = true;
      state.mobileNavMenu.style.display = 'flex';
      state.mobileNavMenu.classList.add('active');
      state.mobileNavMenu.style.transform = 'translateX(0)';
      mobileMenuToggle?.classList.add('active');
      mobileMenuToggle?.setAttribute('aria-expanded', 'true');
      mobileMenuOverlay?.classList.add('active');
      if (mobileMenuOverlay) mobileMenuOverlay.style.display = 'block';
      lockedScrollY = window.scrollY;
      document.body.classList.add('menu-open');
      document.body.style.position = 'fixed';
      document.body.style.top = `-${lockedScrollY}px`;
      document.body.style.width = '100%';
    };

    const toggleMobileMenu = (e) => {
      if (e) e.preventDefault();
      if (!isMobileViewport()) return;
      if (state.isMenuOpen) closeMobileMenu();
      else openMobileMenu();
    };

    const applyNavVisibility = () => {
      const mobile = isMobileViewport();
      setDesktopVisibility(mobile);
      if (!mobile) {
        closeMobileMenu(true);
      } else if (state.mobileNavMenu && !state.isMenuOpen) {
        state.mobileNavMenu.style.display = 'none';
        state.mobileNavMenu.classList.remove('active');
        state.mobileNavMenu.style.transform = 'translateX(100%)';
      }
    };

    buildMobileMenu();
    ensureMobileHeader();
    ensureMobileSocials();
    ensureInBody(mobileMenuOverlay);
    applyNavVisibility();

    mobileMenuToggle?.setAttribute('aria-label', 'Toggle navigation menu');
    mobileMenuToggle?.setAttribute('aria-expanded', 'false');
    mobileMenuToggle?.addEventListener('click', toggleMobileMenu);

    mobileMenuOverlay?.addEventListener('click', () => closeMobileMenu());

    state.mobileNavMenu?.addEventListener('click', (e) => {
      if (e.target.closest('.nav-link')) closeMobileMenu();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.isMenuOpen) closeMobileMenu();
    });

    const updateNavbarState = () => {
      if (!navbar) return;
      const currentScroll = window.pageYOffset;
      const shouldDarken = heroSection ? currentScroll > 60 : true;
      navbar.classList.toggle('scrolled', shouldDarken);
      const announcements = dom.announcementsWrapper || $('#hero-announcements-wrapper');
      if (announcements) {
        const header = computeHeaderHeights();
        const heroHeight = heroSection ? heroSection.offsetHeight || 0 : 0;
        const hideThreshold = Math.max(0, heroHeight - header.total);
        announcements.classList.toggle('is-hidden', currentScroll > hideThreshold);
      }
    };

    if (navbar) {
      navbar.style.position = 'fixed';
      navbar.style.top = '0';
      navbar.style.left = '0';
      navbar.style.right = '0';
      navbar.style.zIndex = '1000';
      updateNavbarState();
      const onScroll = rafThrottle(updateNavbarState);
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('load', updateNavbarState);
    }

    const onResize = rafThrottle(() => {
      if (!isMobileViewport() && state.isMenuOpen) {
        closeMobileMenu();
      }
      applyNavVisibility();
      computeHeaderHeights();
    });
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
  }

  function initSmoothScroll() {
    $$('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        const target = $(anchor.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        const navbar = dom.navbar;
        const navbarHeight = navbar ? navbar.offsetHeight : 80;
        const offsetTop = target.offsetTop - navbarHeight - 20;
        window.scrollTo({ top: Math.max(0, offsetTop), behavior: 'smooth' });
      });
    });
  }

  function initForms() {
    const bookingForm = $('.booking-form') || $('#bookingForm');
    if (bookingForm) {
      const submitButton = bookingForm.querySelector('button[type="submit"]');
      bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(bookingForm);
        const data = Object.fromEntries(formData);
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.dataset.originalText = submitButton.dataset.originalText || submitButton.textContent || '';
          submitButton.textContent = 'Odosielam...';
        }
        console.log('Booking data:', data);
        alert('Ďakujeme za vašu rezerváciu! Čoskoro vás budeme kontaktovať.');
        bookingForm.reset();
        setTimeout(() => {
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = submitButton.dataset.originalText || 'Rezervovať termín';
          }
        }, 1500);
      });
    }

    const dateInput = $('#date');
    if (dateInput) {
      const today = new Date().toISOString().split('T')[0];
      dateInput.setAttribute('min', today);
    }

    $$('input, select').forEach((input) => {
      input.addEventListener('blur', () => {
        if (input.checkValidity()) {
          input.classList.add('valid');
          input.classList.remove('invalid');
        } else {
          input.classList.add('invalid');
          input.classList.remove('valid');
        }
      });
    });
  }

  function initCookieConsent() {
    const cookieConsent = $('#cookie-consent');
    const acceptCookies = $('#accept-cookies');
    const rejectCookies = $('#reject-cookies');
    const cookieChoice = localStorage.getItem('cookieConsent');
    if (!cookieChoice && cookieConsent) {
      setTimeout(() => cookieConsent.classList.add('show'), 1000);
    }
    acceptCookies?.addEventListener('click', () => {
      localStorage.setItem('cookieConsent', 'accepted');
      cookieConsent?.classList.remove('show');
    });
    rejectCookies?.addEventListener('click', () => {
      localStorage.setItem('cookieConsent', 'rejected');
      cookieConsent?.classList.remove('show');
    });
  }

  function initAnimations() {
    const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -100px 0px' };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animated');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const staggerObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('animated'), index * 100);
          staggerObserver.unobserve(entry.target);
        }
      });
    }, observerOptions);

    $$('.section-header').forEach((header) => observer.observe(header));

    const cardGroups = [
      { selector: '.advantage-card', stagger: true },
      { selector: '.service-card', stagger: true },
      { selector: '.review-card', stagger: true },
      { selector: '.main-service-card', stagger: true },
      { selector: '.info-card', stagger: true },
      { selector: '.partner-card', stagger: true },
      { selector: '.service-link-card', stagger: true }
    ];

    cardGroups.forEach((group) => {
      $$(group.selector).forEach((el) => {
        el.classList.add('animate-on-scroll', 'animate-fade-up');
        if (group.stagger) {
          staggerObserver.observe(el);
        } else {
          observer.observe(el);
        }
      });
    });

    $$('section:not(.hero):not(.statistics-section)').forEach((section) => {
      section.classList.add('animate-on-scroll', 'animate-fade-up');
      observer.observe(section);
    });

    $$('.contact-item').forEach((item, index) => {
      item.classList.add('animate-on-scroll', 'animate-fade-left');
      setTimeout(() => staggerObserver.observe(item), index * 50);
    });

    const mapContainer = $('.map-container');
    if (mapContainer) {
      mapContainer.classList.add('animate-on-scroll', 'animate-fade-scale');
      observer.observe(mapContainer);
    }

    const chargingCard = $('.charging-card');
    if (chargingCard) {
      chargingCard.classList.add('animate-on-scroll', 'animate-fade-up');
      observer.observe(chargingCard);
    }

    $$('.pricing-tab').forEach((tab, index) => {
      tab.classList.add('animate-on-scroll', 'animate-fade-up');
      setTimeout(() => staggerObserver.observe(tab), index * 50);
    });

    $$('.announcement-card').forEach((card) => {
      card.classList.remove('animate-on-scroll', 'animate-fade-right', 'animate-fade-up', 'animate-fade-left', 'animate-fade-scale');
      card.style.opacity = '1';
      card.style.transform = 'none';
    });
  }

  function initHeroVideo() {
    const heroVideo = $('.hero-video');
    if (!heroVideo) return;

    heroVideo.muted = true;
    heroVideo.loop = true;
    heroVideo.playsInline = true;

    const playVideo = async () => {
      try {
        await heroVideo.play();
      } catch (err) {
        console.log('Video autoplay failed, will retry:', err);
        const retryPlay = () => heroVideo.play().catch((e) => console.log('Retry play failed:', e));
        document.addEventListener('click', retryPlay, { once: true });
        document.addEventListener('touchstart', retryPlay, { once: true });
      }
    };

    if (heroVideo.readyState >= 3) {
      playVideo();
    }

    heroVideo.addEventListener('canplay', playVideo, { once: true });
    heroVideo.addEventListener('loadeddata', playVideo, { once: true });
    heroVideo.addEventListener('loadedmetadata', () => {
      if (heroVideo.readyState >= 2) playVideo();
    }, { once: true });

    heroVideo.addEventListener('error', (e) => {
      console.error('Video loading error:', e, heroVideo.error);
      const hero = $('.hero');
      if (hero) {
        hero.style.backgroundImage = "url('200358324_2030190010482436_7737746352101166953_n.jpg')";
        hero.style.backgroundSize = 'cover';
        hero.style.backgroundPosition = 'center';
        hero.style.backgroundRepeat = 'no-repeat';
      }
    });

    const visibilityObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && heroVideo.paused) playVideo();
      });
    }, { threshold: 0.1 });
    visibilityObserver.observe(heroVideo);

    setTimeout(() => {
      if (heroVideo.paused) playVideo();
    }, 500);
  }

  function initAboutHeroSlider() {
    const slider = $('.about-hero');
    const slides = slider ? $$('.about-hero-slide', slider) : [];
    const prevBtn = slider ? slider.querySelector('.about-hero-prev') : null;
    const nextBtn = slider ? slider.querySelector('.about-hero-next') : null;
    if (!slider || slides.length === 0) return;

    let activeIndex = slides.findIndex((slide) => slide.classList.contains('is-active'));
    if (activeIndex < 0) {
      activeIndex = 0;
      slides[0].classList.add('is-active');
    }

    const setActive = (nextIndex) => {
      if (nextIndex === activeIndex || !slides[nextIndex]) return;
      slides[activeIndex]?.classList.remove('is-active');
      activeIndex = nextIndex;
      slides[activeIndex]?.classList.add('is-active');
    };

    const next = () => setActive((activeIndex + 1) % slides.length);
    const prev = () => setActive((activeIndex - 1 + slides.length) % slides.length);

    let timer = null;
    const start = () => {
      if (slides.length <= 1) return;
      clearInterval(timer);
      timer = setInterval(next, 6500);
    };
    const stop = () => {
      clearInterval(timer);
      timer = null;
    };

    const handleNav = (dir) => {
      if (dir === 'next') next();
      if (dir === 'prev') prev();
      if (slides.length > 1) start();
    };

    if (nextBtn) nextBtn.addEventListener('click', () => handleNav('next'));
    if (prevBtn) prevBtn.addEventListener('click', () => handleNav('prev'));

    slider.addEventListener('mouseenter', stop);
    slider.addEventListener('mouseleave', start);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    });

    const controls = [prevBtn, nextBtn].filter(Boolean);
    if (controls.length) {
      controls.forEach((btn) => {
        btn.style.display = slides.length > 1 ? 'inline-flex' : 'none';
      });
    }

    start();
  }

  function initHeroScrollButton() {
    const heroScroll = $('.hero-scroll');
    if (!heroScroll) return;
    heroScroll.addEventListener('click', () => {
      window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
    });
  }

  function animateCounter(element, target, suffix = '', duration = 2000) {
    const startTime = performance.now();
    const updateCounter = () => {
      const now = performance.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = Math.floor(target * easeOutQuart);
      const formattedValue = current.toLocaleString('sk-SK').replace(/,/g, ' ');
      element.textContent = formattedValue + suffix;
      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        element.textContent = target.toLocaleString('sk-SK').replace(/,/g, ' ') + suffix;
      }
    };
    updateCounter();
  }

  function animateStatistics(container, itemSelector, numberSelector, flagKey) {
    if (!container || state[flagKey]) return;
    state[flagKey] = true;
    const statistics = $$(itemSelector, container);
    statistics.forEach((stat, index) => {
      const numberElement = $(numberSelector, stat);
      if (!numberElement) return;
      const originalText = numberElement.textContent.trim();
      const match = originalText.match(/([\d\s,]+)([+%]?)/);
      if (!match) return;
      const numberStr = match[1].replace(/[\s,]/g, '');
      const suffix = match[2] || '';
      const targetNumber = parseInt(numberStr, 10);
      if (Number.isNaN(targetNumber) || numberElement.hasAttribute('data-animated')) return;
      numberElement.setAttribute('data-animated', 'true');
      numberElement.textContent = `0${suffix}`;
      setTimeout(() => animateCounter(numberElement, targetNumber, suffix, 2000), index * 200);
      stat.classList.add('animated');
    });
  }

  function resetStatisticsAnimation(container, itemSelector, numberSelector, flagKey) {
    state[flagKey] = false;
    $$(itemSelector, container).forEach((stat) => {
      const numberElement = $(numberSelector, stat);
      numberElement?.removeAttribute('data-animated');
    });
  }

  function initStatisticsObservers() {
    const heroStatistics = $('.hero-statistics');
    const statisticsSection = $('.statistics-section');

    if (heroStatistics) {
      const heroStatisticsObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !state.heroStatsAnimated) {
            animateStatistics(entry.target, '.hero-statistic-item', '.hero-statistic-number', 'heroStatsAnimated');
            heroStatisticsObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px 0px 0px' });
      heroStatisticsObserver.observe(heroStatistics);
    }

    if (statisticsSection) {
      const statisticsObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !state.statsAnimated) {
            animateStatistics(entry.target, '.statistic-item', '.statistic-number', 'statsAnimated');
            statisticsObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.2, rootMargin: '0px 0px -50px 0px' });
      statisticsObserver.observe(statisticsSection);
    }
  }

  function initPricingTabs() {
    const pricingTabs = $$('.pricing-tab');
    const pricingContents = $$('.pricing-content');
    if (pricingTabs.length === 0) return;
    pricingTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const targetTab = tab.getAttribute('data-tab');
        pricingTabs.forEach((t) => t.classList.remove('active'));
        pricingContents.forEach((c) => c.classList.remove('active'));
        tab.classList.add('active');
        const targetContent = document.getElementById(targetTab);
        targetContent?.classList.add('active');
      });
    });
  }

  const translations = {
    sk: {
      'status-closed': 'ZATVORENÉ',
      nonstop: 'NONSTOP',
      'nav-home': 'Úvod',
      'nav-inspections': 'Kontroly',
      'nav-services': 'Služby',
      'nav-pricing': 'Cenník',
      'nav-reviews': 'Recenzie',
      'nav-contact': 'Kontakt',
      'nav-about': 'O nás',
      'nav-booking': 'Rezervovať',
      'hero-title': 'JP Control s.r.o.',
      'hero-subtitle': 'Vaša spoľahlivá stanica technickej kontroly v Bratislavskom kraji',
      'hero-cta': 'Rezervovať termín online',
      'section-advantages': 'Výhody u nás',
      'section-advantages-sub': 'Prečo si vybrať práve nás',
      'advantage-1-title': 'Odvoz/dovoz zadarmo',
      'advantage-1-text': 'Ak sa potrebujete počas kontroly nečakane dostaviť na neplánované stretnutie, vieme Vám zabezpečiť odvoz aj dovoz k nám. (do 10 km)',
      'advantage-1-cta': 'STK bez stresu',
      'advantage-2-title': 'Prídeme si pre Vaše vozidlo',
      'advantage-2-text': 'Nemôžete sa k nám osobne dostaviť na kontrolu? Prídeme si po Vaše vozidlo a po kontrole Vám ho privezieme späť. (do 10 km)',
      'advantage-2-cta': 'Bezstarostná preprava',
      'advantage-3-title': 'NONSTOP pre nákladné vozidlá',
      'advantage-3-text': 'Po telefonickej objednávke aj mimo otváracích hodín. BEZ PRÍPLATKU',
      'advantage-3-cta': 'Servis aj po 22:00',
      'advantage-4-title': 'Zapožičanie prevozných ŠPZ',
      'advantage-4-text': 'Pre potreby KO a STK v rámci SR',
      'advantage-4-cta': 'Dokončené rýchlejšie',
      'advantage-5-title': 'Nabíjacia stanica',
      'advantage-5-text': 'U nás si počas čakania dobijete svoje elektroauto pohodlne v areáli stanice.',
      'advantage-5-cta': 'Komfort pri čakaní',
      'tech-control-title': 'TECHNICKÁ KONTROLA',
      'tech-control-desc': 'Technická kontrola vozidla (STK) je povinná kontrola, ktorá sa vykonáva v pravidelných intervaloch podľa veku a typu vozidla. Naša STK zabezpečuje komplexnú kontrolu všetkých kritických súčastí vozidla.',
      'tech-control-what': 'Čo kontrolujeme:',
      'emission-control-title': 'EMISNÁ KONTROLA',
      'emission-control-desc': 'Emisná kontrola (EK) je povinná kontrola emisií škodlivých látok vo výfukových plynoch vozidla. Kontrola sa vykonáva súčasne s technickou kontrolou alebo samostatne.',
      'emission-control-what': 'Čo kontrolujeme:',
      'originality-control-title': 'KONTROLA ORIGINALITY',
      'originality-control-desc': 'Kontrola originality (KO) je kontrola, ktorá sa vykonáva pri dovoze vozidla zo zahraničia, vývoze, zmenách vlastníctva alebo pri zmenách na vozidle (napr. zmena farby).',
      'originality-control-when': 'Kedy je potrebná:',
      'originality-control-what': 'Čo kontrolujeme:',
      'section-services': 'Doplnkové služby a poradenstvo',
      'section-services-sub': 'Kompletná ponuka služieb pre vaše vozidlo',
      'section-pricing': 'Cenník služieb',
      'section-pricing-sub': 'Transparentné ceny pre všetky naše služby',
      'section-reviews': 'Napísali o nás',
      'section-reviews-sub': 'Recenzie našich zákazníkov',
      'section-charging': 'Dobíjanie elektromobilov',
      'section-charging-sub': 'Rýchle a pohodlné dobíjanie vášho elektromobilu',
      'charging-title': 'Dobíjacia stanica',
      'charging-desc': 'Naša STK je vybavená modernou dobíjacou stanicou pre elektromobily. Počas čakania na kontrolu môžete pohodlne dobiť svoje vozidlo.',
      'charging-feature-1': 'Rýchle dobíjanie',
      'charging-feature-2': 'Dostupné počas otváracích hodín',
      'charging-feature-3': 'Kontaktujte nás pre ceny',
      'charging-btn': 'Kontaktovať',
      'section-additional': 'Ďalšie služby',
      'section-additional-sub': 'Pozrite si naše ďalšie služby a partnerov',
      'service-boutique-title': 'Botique',
      'service-boutique-desc': 'Oblečenie a módne doplnky',
      'service-container-title': 'Kontajnerová služba',
      'service-container-desc': 'Prenájom kontajnerov',
      'service-vinomat-title': 'Vinomat',
      'service-vinomat-desc': 'Predaj vína a alkoholických nápojov',
      'section-partners': 'Naši partneri',
      'section-partners-sub': 'Spolupracujeme s overenými partnermi',
      'section-contact': 'Kontakt',
      'section-contact-sub': 'Kontaktujte nás ešte dnes',
      'contact-phone': 'Telefón',
      'contact-email': 'Email',
      'contact-address': 'Adresa',
      'opening-hours': 'Otváracie hodiny',
      'show-map': 'Zobraziť na mape',
      'map-title': 'Kde nás nájdete',
      'about-title': 'O nás',
      'footer-links': 'Rýchle odkazy',
      'footer-contact': 'Kontakt'
    },
    en: {
      'status-closed': 'CLOSED',
      nonstop: 'NONSTOP',
      'nav-home': 'Home',
      'nav-inspections': 'Inspections',
      'nav-services': 'Services',
      'nav-pricing': 'Pricing',
      'nav-reviews': 'Reviews',
      'nav-contact': 'Contact',
      'nav-about': 'About Us',
      'nav-booking': 'Book',
      'hero-title': 'JP Control s.r.o.',
      'hero-subtitle': 'Your reliable vehicle inspection station in Bratislava region',
      'hero-cta': 'Book appointment online',
      'section-advantages': 'Our Advantages',
      'section-advantages-sub': 'Why choose us',
      'advantage-1-title': 'Free pickup/delivery',
      'advantage-1-text': 'If you need to attend an unexpected meeting during the inspection, we can arrange pickup and delivery to us. (up to 10 km)',
      'advantage-1-cta': 'Stress-free check',
      'advantage-2-title': 'We come to pick up your vehicle',
      'advantage-2-text': "Can't come to us in person for inspection? We'll come pick up your vehicle and bring it back after inspection. (up to 10 km)",
      'advantage-2-cta': 'Worry-free transport',
      'advantage-3-title': 'NONSTOP for trucks',
      'advantage-3-text': 'By phone appointment even outside opening hours. NO SURCHARGE',
      'advantage-3-cta': 'Service after hours',
      'advantage-4-title': 'Loan of transport license plates',
      'advantage-4-text': 'For KO and STK needs within Slovakia',
      'advantage-4-cta': 'Finished faster',
      'advantage-5-title': 'Charging station',
      'advantage-5-text': 'Charge your EV while you wait, directly at our station.',
      'advantage-5-cta': 'Comfort while waiting',
      'tech-control-title': 'TECHNICAL INSPECTION',
      'tech-control-desc': 'Vehicle technical inspection (STK) is a mandatory inspection performed at regular intervals according to the age and type of vehicle. Our STK ensures comprehensive inspection of all critical vehicle components.',
      'tech-control-what': 'What we check:',
      'emission-control-title': 'EMISSION CONTROL',
      'emission-control-desc': 'Emission control (EK) is a mandatory inspection of harmful substance emissions in vehicle exhaust gases. The inspection is performed simultaneously with technical inspection or separately.',
      'emission-control-what': 'What we check:',
      'originality-control-title': 'ORIGINALITY CONTROL',
      'originality-control-desc': 'Originality control (KO) is an inspection performed when importing a vehicle from abroad, exporting, changing ownership, or changes to the vehicle (e.g., color change).',
      'originality-control-when': 'When is it needed:',
      'originality-control-what': 'What we check:',
      'section-services': 'Additional Services and Consulting',
      'section-services-sub': 'Complete range of services for your vehicle',
      'section-pricing': 'Service Pricing',
      'section-pricing-sub': 'Transparent prices for all our services',
      'section-reviews': 'What They Say About Us',
      'section-reviews-sub': 'Customer reviews',
      'section-charging': 'Electric Vehicle Charging',
      'section-charging-sub': 'Fast and convenient charging for your electric vehicle',
      'charging-title': 'Charging Station',
      'charging-desc': 'Our STK is equipped with a modern charging station for electric vehicles. While waiting for inspection, you can conveniently charge your vehicle.',
      'charging-feature-1': 'Fast charging',
      'charging-feature-2': 'Available during opening hours',
      'charging-feature-3': 'Contact us for prices',
      'charging-btn': 'Contact',
      'section-additional': 'Additional Services',
      'section-additional-sub': 'Check out our other services and partners',
      'service-boutique-title': 'Boutique',
      'service-boutique-desc': 'Clothing and fashion accessories',
      'service-container-title': 'Container Service',
      'service-container-desc': 'Container rental and removal',
      'service-vinomat-title': 'Wine Shop',
      'service-vinomat-desc': 'Wine and alcoholic beverages',
      'section-partners': 'Our Partners',
      'section-partners-sub': 'We work with verified partners',
      'section-contact': 'Contact',
      'section-contact-sub': 'Contact us today',
      'contact-phone': 'Phone',
      'contact-email': 'Email',
      'contact-address': 'Address',
      'opening-hours': 'Opening Hours',
      'show-map': 'Show on map',
      'map-title': 'Find us',
      'about-title': 'About Us',
      'footer-links': 'Quick Links',
      'footer-contact': 'Contact'
    }
  };

  function updateLanguage(lang) {
    document.documentElement.lang = lang;
    localStorage.setItem('language', lang);
    $$('.lang-btn').forEach((btn) => {
      const isActive = btn.getAttribute('data-lang') === lang;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive.toString());
    });
    $$('[data-translate]').forEach((element) => {
      if (element.querySelector('.nav-plates-container')) return;
      const key = element.getAttribute('data-translate');
      if (translations[lang]?.[key]) {
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
          if (element.type === 'submit' || element.type === 'button') {
            element.value = translations[lang][key];
          } else {
            element.placeholder = translations[lang][key];
          }
        } else {
          element.textContent = translations[lang][key];
        }
      }
    });
  }

  function initLanguageSwitcher() {
    const langButtons = $$('.lang-btn');
    const currentLang = localStorage.getItem('language') || 'sk';
    updateLanguage(currentLang);
    langButtons.forEach((btn) => {
      btn.addEventListener('click', () => updateLanguage(btn.getAttribute('data-lang')));
    });
  }

  function initAdvantagesCarousel() {
    const carouselWrapper = $('.advantages-carousel-wrapper');
    const carousel = $('.advantages-carousel');
    const prevBtn = $('.carousel-btn-prev');
    const nextBtn = $('.carousel-btn-next');
    if (!carouselWrapper || !carousel || !prevBtn || !nextBtn) return;

    // Static grid layout — hide carousel controls and auto-scroll
    carousel.style.transform = 'none';
    carousel.classList.remove('auto-scroll');
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
  }

  function formatStat(value) {
    const num = Number(value);
    if (Number.isNaN(num)) return null;
    return num.toLocaleString('sk-SK').replace(/,/g, ' ');
  }

  async function loadDynamicStatistics() {
    const container = $('.hero-statistics');
    if (container) container.classList.add('loading');
    try {
      const res = await fetch('/api/statistics');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const { performedInspections, yearsExperience, satisfactionPercentage } = data;
      const heroNumbers = $$('.hero-statistic-number');
      if (heroNumbers.length >= 3) {
        const v1 = formatStat(performedInspections);
        const v2 = formatStat(yearsExperience);
        const v3 = formatStat(satisfactionPercentage);
        if (v1 !== null) heroNumbers[0].textContent = `${v1}+`;
        if (v2 !== null) heroNumbers[1].textContent = `${v2}+`;
        if (v3 !== null) heroNumbers[2].textContent = `${v3}%`;
        resetStatisticsAnimation(container, '.hero-statistic-item', '.hero-statistic-number', 'heroStatsAnimated');
        animateStatistics(container, '.hero-statistic-item', '.hero-statistic-number', 'heroStatsAnimated');
      }

      const sectionNumbers = $$('.statistic-number');
      if (sectionNumbers.length >= 3) {
        const v1 = formatStat(performedInspections);
        const v2 = formatStat(yearsExperience);
        const v3 = formatStat(satisfactionPercentage);
        if (v1 !== null) sectionNumbers[0].textContent = `${v1}+`;
        if (v2 !== null) sectionNumbers[1].textContent = `${v2}+`;
        if (v3 !== null) sectionNumbers[2].textContent = `${v3}%`;
        const section = $('.statistics-section');
        resetStatisticsAnimation(section, '.statistic-item', '.statistic-number', 'statsAnimated');
      }
    } catch (err) {
      console.warn('Failed to load statistics', err);
    } finally {
      container?.classList.remove('loading');
    }
  }

  const buildLoopingTrack = (container, nodes, options = {}) => {
    const {
      minWidthFactor = 1.25,
      runningClass = null,
      durationVar = null,
      shiftVar = null,
      speed = 120,
      safetyCap = 8
    } = options;

    if (!container) return;

    container.innerHTML = '';
    if (!nodes || nodes.length === 0) {
      if (runningClass) container.classList.remove(runningClass);
      return;
    }

    const wrapperWidth = container.parentElement?.offsetWidth || window.innerWidth;
    const fragment = document.createDocumentFragment();
    nodes.forEach((node) => fragment.appendChild(node.cloneNode(true)));
    container.appendChild(fragment);

    const baseNodes = Array.from(container.children);
    let repeats = 1;
    while (container.scrollWidth < wrapperWidth * minWidthFactor && repeats < safetyCap) {
      baseNodes.forEach((node) => container.appendChild(node.cloneNode(true)));
      repeats += 1;
    }

    const currentNodes = Array.from(container.children);
    currentNodes.forEach((node) => container.appendChild(node.cloneNode(true)));

    const halfWidth = container.scrollWidth / 2;
    if (shiftVar) container.style.setProperty(shiftVar, `${halfWidth}px`);
    if (durationVar) {
      const duration = Math.max(18, Math.min(45, halfWidth / speed));
      container.style.setProperty(durationVar, `${duration}s`);
    }

    if (runningClass) {
      container.classList.remove(runningClass);
      // eslint-disable-next-line no-unused-expressions
      container.offsetHeight;
      container.classList.add(runningClass);
    }
  };

  const renderHeroPartners = (partners) => {
    const heroContainer = dom.heroPartners || $('.hero-partners-scroll');
    if (!heroContainer) {
      console.warn('Hero partners container not found');
      return;
    }

    const activePartners = (partners || []).filter((p) => p.active !== false);
    if (activePartners.length === 0) {
      heroContainer.innerHTML = '';
      heroContainer.classList.remove('running');
      return;
    }

    const heroItems = activePartners.map((p) => {
      const div = document.createElement('div');
      div.className = 'hero-partner-item';
      if (p.logoUrl) {
        const img = document.createElement('img');
        img.src = p.logoUrl;
        img.alt = p.name || 'Partner';
        img.loading = 'lazy';
        img.onerror = () => {
          console.warn('Failed to load partner image:', p.logoUrl);
          img.remove();
          const span = document.createElement('span');
          span.textContent = p.name || 'Partner';
          div.appendChild(span);
        };
        img.onload = () => {
          console.log('Partner image loaded:', p.name, p.logoUrl);
        };
        div.appendChild(img);
      } else {
        const span = document.createElement('span');
        span.textContent = p.name || 'Partner';
        div.appendChild(span);
      }
      return div;
    });

    buildLoopingTrack(heroContainer, heroItems, {
      minWidthFactor: 1.2,
      runningClass: 'running',
      durationVar: '--hero-partners-duration',
      shiftVar: '--hero-partners-shift',
      speed: 120
    });
  };

  const renderPartnersSection = (partners) => {
    const partnersContainer = dom.partnersTrack || $('#partners-scroll');
    if (!partnersContainer) return;

    const partnerCards = (partners || []).map((p) => {
      const card = document.createElement('div');
      card.className = 'partner-card';
      if (p.link) {
        card.dataset.link = p.link;
      }
      if (p.logoUrl) {
        const img = document.createElement('img');
        img.src = p.logoUrl;
        img.alt = p.name || 'Partner';
        img.onerror = () => {
          const placeholder = document.createElement('div');
          placeholder.className = 'partner-placeholder';
          const span = document.createElement('span');
          span.textContent = p.name || 'Partner';
          placeholder.appendChild(span);
          card.innerHTML = '';
          card.appendChild(placeholder);
        };
        card.appendChild(img);
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'partner-placeholder';
        const span = document.createElement('span');
        span.textContent = p.name || 'Partner';
        placeholder.appendChild(span);
        card.appendChild(placeholder);
      }
      return card;
    });

    buildLoopingTrack(partnersContainer, partnerCards, {
      minWidthFactor: 1.2,
      runningClass: 'running',
      durationVar: '--partners-duration',
      shiftVar: '--partners-shift',
      speed: 115
    });

    partnersContainer.querySelectorAll('.partner-card[data-link]').forEach((card) => {
      const link = card.dataset.link;
      if (!link) return;
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => {
        window.open(link, '_blank', 'noopener,noreferrer');
      });
    });
  };

  const rebuildPartnersTracks = debounce(() => {
    if (!state.partnersData || state.partnersData.length === 0) return;
    renderHeroPartners(state.partnersData);
    renderPartnersSection(state.partnersData);
  }, 250);

  async function loadPartners() {
    try {
      const res = await fetch('/api/partners');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      state.partnersData = data.partners || [];
      console.log('Loaded partners:', state.partnersData.length, state.partnersData);
      renderHeroPartners(state.partnersData);
      renderPartnersSection(state.partnersData);
    } catch (err) {
      console.error('Failed to load partners', err);
    }
  }

  async function loadHeroNotifications() {
    const wrapper = dom.announcementsWrapper || $('#hero-announcements-wrapper');
    const carousel = $('#hero-announcements-carousel');
    if (!wrapper || !carousel) return;
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const notifications = (data.notifications || []).filter((n) => n.active);
      if (notifications.length === 0) {
        carousel.innerHTML = '';
        wrapper.style.display = 'none';
        computeHeaderHeights();
        return;
      }

      const baseNodes = notifications.map((n) => {
        const span = document.createElement('span');
        span.className = 'hero-announcement-text';
        span.innerHTML = n.text;
        return span;
      });

      carousel.innerHTML = '';
      const appendBase = () => baseNodes.forEach((node) => carousel.appendChild(node.cloneNode(true)));
      appendBase();
      const viewportWidth = wrapper ? wrapper.offsetWidth : window.innerWidth;
      let repeats = 1;
      const maxRepeats = 8;
      while (carousel.scrollWidth < viewportWidth * 2.2 && repeats < maxRepeats) {
        appendBase();
        repeats += 1;
      }

      const currentNodes = Array.from(carousel.children);
      currentNodes.forEach((node) => carousel.appendChild(node.cloneNode(true)));

      wrapper.style.display = 'block';
      computeHeaderHeights();
      carousel.classList.remove('running');
      // eslint-disable-next-line no-unused-expressions
      carousel.offsetHeight;
      carousel.classList.add('running');
    } catch (err) {
      console.warn('Failed to load hero notifications', err);
    }
  }

  function initCookieAwareFeatures() {
    initCookieConsent();
    loadHeroNotifications();
  }

  function init() {
    computeHeaderHeights();
    initNavigation();
    initSmoothScroll();
    initAnimations();
    initHeroVideo();
    initAboutHeroSlider();
    initHeroScrollButton();
    initForms();
    initPricingTabs();
    initLanguageSwitcher();
    initAdvantagesCarousel();
    initStatisticsObservers();
    loadDynamicStatistics();
    window.addEventListener('resize', rebuildPartnersTracks);
    window.addEventListener('orientationchange', rebuildPartnersTracks);
    loadPartners();
    initCookieAwareFeatures();
  }

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('load', computeHeaderHeights);
})(); 
