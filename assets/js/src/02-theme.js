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

  /* A theme flip changes colour, background, border and shadow on nearly every
     element at once. Left alone, every transition on those properties fires
     together and the switch smears instead of snapping. Kill transitions for
     the swap, force the new colours to commit while the override still applies,
     then drop it on the next frame. The toggle's own icon is exempted so it
     still cross-fades — that one is the state change, not the smear. */
  function withoutTransitions(change) {
    var style = document.createElement('style');
    style.appendChild(document.createTextNode(
      '*,*::before,*::after{transition:none !important}' +
      '.theme-toggle .bi{transition:opacity var(--dur-icon) var(--ease-out),' +
      'scale var(--dur-icon) var(--ease-out),' +
      'filter var(--dur-icon) var(--ease-out) !important}'
    ));
    document.head.appendChild(style);

    change();

    // Read for the side effect: a synchronous style flush, so the new theme
    // resolves while the override is still in the document.
    void document.body.offsetHeight;

    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () { style.remove(); });
    });
  }

  apply(current());

  button.addEventListener('click', function () {
    var next = current() === 'dark' ? 'light' : 'dark';
    withoutTransitions(function () { apply(next); });
    try {
      localStorage.setItem(KEY, next);
    } catch (error) {
      /* Private mode or blocked storage: the choice just won't outlive the page. */
    }
  });
})();
