/* Light/dark toggle. The initial theme is applied by an inline snippet in
   <head> so the page never flashes the wrong colours; this only wires the
   button and keeps the choice. */
(function () {
  'use strict';

  var KEY = 'ma-theme';
  var button = document.querySelector('.theme-toggle');
  if (!button) return;

  function current() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function apply(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    button.setAttribute('aria-pressed', String(theme === 'dark'));
    button.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  }

  function withTransitionSuppression(fn) {
    var style = document.createElement('style');
    style.appendChild(document.createTextNode('*,*::before,*::after{transition:none !important}'));
    document.head.appendChild(style);
    fn();
    var _flush = document.body ? document.body.offsetHeight : 0;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        style.remove();
      });
    });
  }

  apply(current());

  button.addEventListener('click', function () {
    var next = current() === 'dark' ? 'light' : 'dark';
    withTransitionSuppression(function () {
      apply(next);
    });
    try {
      localStorage.setItem(KEY, next);
    } catch (error) {
      /* Private mode or blocked storage: the choice just won't outlive the page. */
    }
  });

  try {
    var mql = window.matchMedia('(prefers-color-scheme: dark)');
    mql.addEventListener('change', function (e) {
      try {
        if (localStorage.getItem(KEY)) return;
      } catch (err) {}
      withTransitionSuppression(function () {
        apply(e.matches ? 'dark' : 'light');
      });
    });
  } catch (e) {}
})();
