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
/* The travel map needs jQuery + jVectorMap + the world map data (~430 KB
   uncompressed). None of it is needed until the travel section is close to
   the viewport, and the country list is already rendered in the HTML, so the
   section is meaningful before — and without — any of this loading. */
(function () {
  'use strict';

  var host = document.getElementById('travel-map');
  if (!host) return;

  var regions = JSON.parse(host.getAttribute('data-regions') || '[]');
  if (!regions.length) return;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('Failed to load ' + src)); };
      document.head.appendChild(s);
    });
  }

  function loadStyle(href) {
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.appendChild(l);
  }

  var started = false;

  async function load() {
    if (started) return;
    started = true;
    window.removeEventListener('scroll', maybeLoad);
    window.removeEventListener('resize', maybeLoad);

    try {
      loadStyle('/assets/css/jquery-jvectormap-1.2.2.css');
      if (!window.jQuery) await loadScript('/assets/js/jquery.js');
      await loadScript('/assets/js/travel-map.js');
      window.jQuery(host).vectorMap({
        map: 'world_mill_en',
        backgroundColor: 'white',
        zoomMax: 6,
        regionStyle: {
          initial: { fill: '#aaa', 'fill-opacity': 0.9, stroke: 'none', 'stroke-width': 0, 'stroke-opacity': 1 },
          hover: { 'fill-opacity': 1.0 }
        },
        series: { regions: regions }
      });
    } catch (error) {
      // Leave the country list standing and say what happened, rather than
      // showing an empty frame.
      host.innerHTML = '<p class="map-fallback">The interactive map could not load. ' +
        'The countries are listed below.</p>';
      console.error(error);
    }
  }

  function maybeLoad() {
    if (host.getBoundingClientRect().top < window.innerHeight + 400) load();
  }

  window.addEventListener('scroll', maybeLoad, { passive: true });
  window.addEventListener('resize', maybeLoad, { passive: true });
  window.addEventListener('hashchange', function () {
    if (location.hash === '#travel') load();
  });
  maybeLoad();
})();
