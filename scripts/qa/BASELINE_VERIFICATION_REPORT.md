# Baseline QA Verification Report

- **Target Tested**: `/Users/pain/orca/workspaces/mohammad-albarham.github.io/website-foundation`
- **Result**: **PASS** (100% checks passed, 0 regressions against baseline)
- **Suite**: `/tmp/portfolio-qa/validate.py`

---

## Executive Summary

1. **Route Coverage**: 34/34 original public HTML routes confirmed present.
2. **Anchor Coverage**: All 10 legacy section IDs (`hero`, `about`, `programming-languages`, `resume`, `projects`, `competitions`, `publications`, `volunteering`, `travel`, `contact`) and `#main` anchor targets confirmed intact.
3. **Data Retention**: 100% of data records across all 9 categories (Bio, 5 Competitions, 2 Education records, 8 Experience records, 25 Projects, 8 Publications, 7 Volunteering positions, Travel stats, Programming languages) confirmed present. Generic navigation text was excluded from content matching.
4. **Project Detail Integrity**: All 24 project detail pages verified; zero gallery image loss and zero description content loss detected.

---

## Pre-Existing Baseline Defects (Separated Diagnostic)

The following 3 defects pre-exist in `website-foundation` and must not be counted as rebuild regressions:

1. `projects/latest-projects-1.html`: `<img src="../assets/img/portfolio/" alt="">` points to directory.
2. `projects/latest-projects-2.html`: `<img src="../assets/img/portfolio/" alt="">` points to directory.
3. `projects/latest-projects-3.html`: `<img src="../assets/img/portfolio/" alt="">` points to directory.

Additionally:
- `competitions/competition-details-[1..5].html`, `projects/araclip.html`, and `experience/phi-pair.html` use `/#section` links which depend on root web-server rewriting rather than clean relative `../index.html#section` links.
- `projects/portfolio-details-1.html` contains commented-out slides for missing files `portfolio-details-2.jpg` and `portfolio-details-3.jpg`.
- `volunteering/visited_countries.html` contains a commented-out script tag referencing `/js/jquery.js`.

---

## Verification Command

```bash
python3 /tmp/portfolio-qa/validate.py --site /Users/pain/orca/workspaces/mohammad-albarham.github.io/website-foundation
```
