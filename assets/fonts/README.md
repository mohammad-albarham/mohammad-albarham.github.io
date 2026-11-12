# Self-hosted webfonts

All three families are licensed under the SIL Open Font License 1.1, which permits
self-hosting and redistribution as part of a website. The full licence text for each
family is included next to the font files.

| Family | Role | Files | Licence |
|---|---|---|---|
| Nunito | Headings (weights 700–800) | `nunito-latin.woff2`, `nunito-latin-ext.woff2` | `OFL-Nunito.txt` |
| Nunito Sans | Body copy (weights 300–600) | `nunito-sans-latin.woff2`, `nunito-sans-latin-ext.woff2` | `OFL-NunitoSans.txt` |
| JetBrains Mono | Data labels, code, metadata (400–500) | `jetbrains-mono-latin.woff2`, `jetbrains-mono-latin-ext.woff2` | `OFL-JetBrainsMono.txt` |

Each `.woff2` is a **variable** font covering the weight range used by the site, so one
file per subset serves every weight. Only the `latin` and `latin-ext` subsets are shipped
(~176 KB total); Cyrillic, Greek and Vietnamese subsets were dropped because the site has
no content in those scripts.

## Provenance

Downloaded from the Google Fonts CSS2 API on 2026-09-07:

```
https://fonts.googleapis.com/css2?family=Nunito:wght@700;800&family=Nunito+Sans:wght@300;400;600&family=JetBrains+Mono:wght@400;500&display=swap
```

`fonts.css` is that response with the non-latin `@font-face` blocks removed and the
`src: url(...)` values rewritten to the local files. Licence texts come from
`https://github.com/google/fonts/tree/main/ofl/<family>/OFL.txt`.

## Why self-hosted

The old site loaded Open Sans + Raleway (and, on detail pages, Poppins) from
`fonts.googleapis.com`. Self-hosting removes two render-blocking third-party
connections and the privacy exposure that comes with them, and it keeps the site
working with no external dependency at runtime.

## Refreshing

Re-run the download by hand and re-check the licence files; there is no automated
step, because fonts should not silently change under the site.
