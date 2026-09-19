/* Copy a BibTeX entry. The entry itself is always on the page inside a
   <details>, so this only saves a selection — it is never the only way in. */
(function () {
  'use strict';

  document.querySelectorAll('.copy-bibtex').forEach(function (button) {
    var target = document.getElementById(button.getAttribute('data-bibtex-for'));
    if (!target) return;

    var idle = button.textContent;
    button.addEventListener('click', function () {
      var text = target.textContent;

      var done = function (message) {
        button.textContent = message;
        window.setTimeout(function () { button.textContent = idle; }, 2000);
      };

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(
          function () { done('Copied'); },
          function () { done('Press Ctrl+C'); }
        );
        return;
      }

      // http:// and older browsers: select the text so the keyboard copy works.
      var range = document.createRange();
      range.selectNodeContents(target);
      var selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      done('Press Ctrl+C');
    });
  });
})();
