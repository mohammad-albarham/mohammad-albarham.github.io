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
