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

  apply(current());

  button.addEventListener('click', function () {
    var next = current() === 'dark' ? 'light' : 'dark';
    apply(next);
    try {
      localStorage.setItem(KEY, next);
    } catch (error) {
      /* Private mode or blocked storage: the choice just won't outlive the page. */
    }
  });
})();
