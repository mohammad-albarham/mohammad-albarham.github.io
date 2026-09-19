/* Technology filter for the project grids. Progressive enhancement: with no
   JavaScript every project is already in the HTML and visible. */
(function () {
  'use strict';

  document.querySelectorAll('[data-filter-group]').forEach(function (group) {
    var chips = group.querySelectorAll('.filter-chip');
    var grid = document.getElementById(group.getAttribute('data-filter-group'));
    var status = document.getElementById(group.getAttribute('data-filter-status'));
    if (!grid) return;

    var cards = Array.prototype.slice.call(grid.querySelectorAll('[data-tech]'));

    function announce(shown, label) {
      if (!status) return;
      status.textContent = label === 'all'
        ? 'Showing all ' + cards.length + ' projects'
        : 'Showing ' + shown + ' of ' + cards.length + ' projects tagged ' + label;
    }

    function select(chip) {
      var value = chip.getAttribute('data-tech-value');
      var shown = 0;

      cards.forEach(function (card) {
        var techs = (card.getAttribute('data-tech') || '').split('|');
        var match = value === 'all' || techs.indexOf(value) !== -1;
        card.classList.toggle('is-hidden', !match);
        if (match) shown++;
      });

      chips.forEach(function (other) {
        other.setAttribute('aria-pressed', String(other === chip));
      });
      announce(shown, value);
    }

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () { select(chip); });
    });

    announce(cards.length, 'all');
  });
})();
