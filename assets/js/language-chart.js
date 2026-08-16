/**
 * Language Chart
 *
 * Draws data/programming-languages.json as a labelled pie, in the style of the figure at
 * julian.ac/about: every slice carries its own name and percentage on a leader
 * line rather than a separate legend.
 *
 * Slice colours come from CSS custom properties (--lang-1 .. --lang-13), so the
 * dark theme recolours the chart through the cascade and this module never
 * re-renders on a theme change. It does re-render on resize, because below
 * ~640px there is no room for leader lines and the labels move to a grid under
 * the pie.
 *
 * Usage:
 *   new LanguageChart('programming-languages-container').init();
 */

class LanguageChart {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.data = null;
    this.resizeTimer = null;
  }

  async init() {
    if (!this.container) return;

    try {
      const loader = window.dataLoader || new DataLoader();
      this.data = await loader.load('programming-languages');
    } catch (error) {
      console.error('LanguageChart: could not load programming-languages.json', error);
      this.container.innerHTML =
        '<p class="lang-chart-error">Language breakdown is unavailable right now.</p>';
      return;
    }

    this.render();

    window.addEventListener('resize', () => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => this.render(), 200);
    });
  }

  render() {
    const compact = this.container.clientWidth < 640;
    this.container.innerHTML = `
      <figure class="lang-chart-figure${compact ? ' is-compact' : ''}">
        ${this.buildSvg(compact)}
        ${compact ? this.buildLegend() : ''}
        <figcaption class="lang-chart-caption">
          Share of hand-written code across ${this.data.repositories} public
          repositories on <a href="${this.sourceUrl()}" target="_blank"
          rel="noopener">GitHub</a>, ${this.formatSize(this.data.totalBytes)} in total.
          Notebook code cells count as their kernel language; notebook outputs,
          vendored libraries, datasets and media are excluded.
          <button type="button" class="lang-chart-table-toggle"
                  aria-expanded="false" aria-controls="lang-chart-table">
            Show as table
          </button>
        </figcaption>
        ${this.buildTable()}
      </figure>
    `;

    this.bindTooltip();
    this.bindTableToggle();
  }

  /* ---------- geometry ---------- */

  /** Point on the pie's circumference, angle in degrees clockwise from 12. */
  static pointAt(cx, cy, radius, angle) {
    const radians = (angle * Math.PI) / 180;
    return [cx + radius * Math.sin(radians), cy - radius * Math.cos(radians)];
  }

  /**
   * Slices, each with the angles it spans and the mid-angle its label points at.
   * Percentages already sum to 100, so the angles close the circle exactly.
   */
  slices() {
    let angle = 0;
    return this.data.languages.map((entry, index) => {
      const sweep = (entry.pct / 100) * 360;
      const slice = {
        ...entry,
        index,
        start: angle,
        end: angle + sweep,
        mid: angle + sweep / 2,
        color: `var(--lang-${index + 1})`,
      };
      angle += sweep;
      return slice;
    });
  }

  /* ---------- rendering ---------- */

  buildSvg(compact) {
    const width = compact ? 340 : 860;
    const height = compact ? 340 : 470;
    const cx = compact ? 170 : 430;
    const cy = compact ? 170 : 235;
    const radius = compact ? 140 : 150;

    const paths = this.slices()
      .map((slice) => {
        const [x1, y1] = LanguageChart.pointAt(cx, cy, radius, slice.start);
        const [x2, y2] = LanguageChart.pointAt(cx, cy, radius, slice.end);
        const largeArc = slice.end - slice.start > 180 ? 1 : 0;
        const d = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} ` +
          `A ${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
        return `<path class="lang-slice" d="${d}" fill="${slice.color}"
                 data-name="${this.escape(slice.name)}" data-pct="${slice.pct}"
                 data-bytes="${slice.bytes}"></path>`;
      })
      .join('\n        ');

    const labels = compact ? '' : this.buildLeaderLabels(cx, cy, radius, width, height);

    return `
      <svg class="lang-chart-svg" viewBox="0 0 ${width} ${height}"
           role="img" aria-label="${this.escape(this.ariaSummary())}">
        <g class="lang-slices">
        ${paths}
        </g>
        ${labels}
      </svg>
      <div class="lang-chart-tooltip" role="status" aria-live="polite" hidden></div>
    `;
  }

  /**
   * Name-and-percentage labels outside the pie, joined to their slice by a
   * leader line. Labels are placed at their slice's mid-angle, then pushed
   * apart vertically so the thin slices at the tail stay readable.
   */
  buildLeaderLabels(cx, cy, radius, width, height) {
    const columnGap = 78;
    const minSpacing = 22;

    const placed = this.slices().map((slice) => {
      const [anchorX, anchorY] = LanguageChart.pointAt(cx, cy, radius, slice.mid);
      const right = slice.mid <= 180;
      return {
        ...slice,
        anchorX,
        anchorY,
        right,
        idealY: anchorY,
        y: anchorY,
        labelX: right ? cx + radius + columnGap : cx - radius - columnGap,
      };
    });

    // De-collide each column independently: settle downward from the top, then
    // relieve any overflow past the bottom by settling back upward.
    ['right', 'left'].forEach((side) => {
      const column = placed
        .filter((label) => (side === 'right' ? label.right : !label.right))
        .sort((a, b) => a.idealY - b.idealY);

      let cursor = 16;
      column.forEach((label) => {
        label.y = Math.max(label.idealY, cursor);
        cursor = label.y + minSpacing;
      });

      let floor = height - 16;
      for (let i = column.length - 1; i >= 0; i -= 1) {
        column[i].y = Math.min(column[i].y, floor);
        floor = column[i].y - minSpacing;
      }
    });

    return `<g class="lang-labels">${placed
      .map((label) => {
        const elbowX = label.right
          ? label.labelX - 14
          : label.labelX + 14;
        const [outerX, outerY] = LanguageChart.pointAt(
          cx, cy, radius + 10, label.mid
        );
        const points = [
          `${label.anchorX.toFixed(1)},${label.anchorY.toFixed(1)}`,
          `${outerX.toFixed(1)},${outerY.toFixed(1)}`,
          `${elbowX},${label.y.toFixed(1)}`,
          `${label.labelX},${label.y.toFixed(1)}`,
        ].join(' ');

        return `
        <polyline class="lang-leader" points="${points}"></polyline>
        <text class="lang-label" x="${label.labelX}" y="${label.y.toFixed(1)}"
              text-anchor="${label.right ? 'start' : 'end'}"
              dominant-baseline="middle"
              dx="${label.right ? 6 : -6}">
          <tspan class="lang-label-name">${this.escape(label.name)}</tspan><tspan
                class="lang-label-pct"> : ${label.pct} %</tspan>
        </text>`;
      })
      .join('')}</g>`;
  }

  /** Compact mode replaces the leader lines with a swatch grid under the pie. */
  buildLegend() {
    return `
      <ul class="lang-chart-legend">
        ${this.slices()
          .map(
            (slice) => `
          <li>
            <span class="lang-chart-swatch" style="background:${slice.color}"></span>
            <span class="lang-chart-legend-name">${this.escape(slice.name)}</span>
            <span class="lang-chart-legend-pct">${slice.pct}%</span>
          </li>`
          )
          .join('')}
      </ul>
    `;
  }

  buildTable() {
    return `
      <div class="lang-chart-table-wrap" id="lang-chart-table" hidden>
        <table class="lang-chart-table">
          <caption class="visually-hidden">
            Share of hand-written code by language
          </caption>
          <thead>
            <tr><th scope="col">Language</th><th scope="col">Share</th><th scope="col">Code</th></tr>
          </thead>
          <tbody>
            ${this.data.languages
              .map(
                (entry) => `
            <tr>
              <th scope="row">${this.escape(entry.name)}</th>
              <td>${entry.pct}%</td>
              <td>${this.formatSize(entry.bytes)}</td>
            </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /* ---------- behaviour ---------- */

  bindTooltip() {
    const tooltip = this.container.querySelector('.lang-chart-tooltip');
    const figure = this.container.querySelector('.lang-chart-figure');
    if (!tooltip || !figure) return;

    this.container.querySelectorAll('.lang-slice').forEach((slice) => {
      slice.addEventListener('mouseenter', () => {
        const name = slice.dataset.name;
        const bytes = this.formatSize(Number(slice.dataset.bytes));
        tooltip.innerHTML =
          `<strong>${name}</strong> ${slice.dataset.pct}% · ${bytes}`;
        tooltip.hidden = false;
        figure.classList.add('has-hover');
        slice.classList.add('is-hovered');
      });

      slice.addEventListener('mousemove', (event) => {
        const bounds = figure.getBoundingClientRect();
        tooltip.style.left = `${event.clientX - bounds.left}px`;
        tooltip.style.top = `${event.clientY - bounds.top}px`;
      });

      slice.addEventListener('mouseleave', () => {
        tooltip.hidden = true;
        figure.classList.remove('has-hover');
        slice.classList.remove('is-hovered');
      });
    });
  }

  bindTableToggle() {
    const button = this.container.querySelector('.lang-chart-table-toggle');
    const table = this.container.querySelector('#lang-chart-table');
    if (!button || !table) return;

    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!open));
      button.textContent = open ? 'Show as table' : 'Hide table';
      table.hidden = open;
    });
  }

  /* ---------- helpers ---------- */

  sourceUrl() {
    return `https://${this.data.source}`;
  }

  ariaSummary() {
    const parts = this.data.languages.map((e) => `${e.name} ${e.pct}%`);
    return `Share of hand-written code by language: ${parts.join(', ')}.`;
  }

  formatSize(bytes) {
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(2)} MB`;
    if (bytes >= 1e3) return `${Math.round(bytes / 1e3)} kB`;
    return `${bytes} B`;
  }

  escape(value) {
    return String(value).replace(/[&<>"]/g, (character) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[character]
    ));
  }
}

window.LanguageChart = LanguageChart;

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('programming-languages-container')) {
    window.languageChart = new LanguageChart('programming-languages-container');
    window.languageChart.init();
  }
});
