/* Site chrome: mobile nav disclosure + a hairline under the bar once it sticks. */
(function () {
  'use strict';

  var toggle = document.querySelector('.nav-toggle');
  var pills = document.getElementById('nav-pills');
  var bar = document.querySelector('.topbar');

  function isCompact() {
    return window.matchMedia('(max-width: 60rem)').matches;
  }

  function setOpen(open) {
    if (!pills || !toggle) return;
    pills.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  }

  function syncToViewport() {
    if (!pills) return;
    // On wide screens the list is always visible and the button is hidden,
    // so `hidden` must be cleared or the nav disappears on resize.
    if (isCompact()) {
      setOpen(false);
    } else {
      pills.hidden = false;
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    }
  }

  if (toggle && pills) {
    toggle.addEventListener('click', function () {
      setOpen(pills.hidden);
    });
    pills.addEventListener('click', function (event) {
      if (event.target.closest('a') && isCompact()) setOpen(false);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && isCompact() && !pills.hidden) {
        setOpen(false);
        toggle.focus();
      }
    });
    window.addEventListener('resize', syncToViewport);
    syncToViewport();
  }

  if (bar) {
    var onScroll = function () {
      bar.classList.toggle('is-stuck', window.scrollY > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
})();
