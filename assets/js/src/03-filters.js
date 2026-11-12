/* Chip filters for the project grid and the publication list. Progressive
   enhancement: with no JavaScript every card is already in the HTML and
   visible. A group may name the noun it counts and, when its cards sit inside
   headed sections, the selector for those sections so an emptied one hides
   with its heading. */
(function () {
  'use strict';

  document.querySelectorAll('[data-filter-group]').forEach(function (group) {
    var chips = group.querySelectorAll('.filter-chip');
    var grid = document.getElementById(group.getAttribute('data-filter-group'));
    var status = document.getElementById(group.getAttribute('data-filter-status'));
    if (!grid) return;

    var noun = group.getAttribute('data-filter-noun') || 'projects';
    var sectionSelector = group.getAttribute('data-filter-section');
    var cards = Array.prototype.slice.call(grid.querySelectorAll('[data-tech]'));
    var sections = sectionSelector
      ? Array.prototype.slice.call(grid.querySelectorAll(sectionSelector))
      : [];

    function announce(shown, label) {
      if (!status) return;
      status.textContent = label === 'all'
        ? 'Showing all ' + cards.length + ' ' + noun
        : 'Showing ' + shown + ' of ' + cards.length + ' ' + noun + ' tagged ' + label;
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

      sections.forEach(function (section) {
        section.classList.toggle(
          'is-hidden', !section.querySelector('[data-tech]:not(.is-hidden)'));
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
