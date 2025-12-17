# 🚀 Deployment Checklist

Use this checklist before deploying your refactored portfolio to production.

## ✅ Pre-Deployment Testing

### 1. Local Testing
- [ ] Website running locally (`python3 -m http.server 8080`)
- [ ] All sections load correctly (About, Resume, Projects, Publications, Volunteering, Travel, Contact)
- [ ] No console errors in browser DevTools (F12 → Console)
- [ ] All images display properly
- [ ] Dark mode toggle works
- [ ] Mobile menu functions correctly

### 2. Content Validation
- [ ] All JSON files are valid (test at [jsonlint.com](https://jsonlint.com))
  - [ ] `data/bio.json`
  - [ ] `data/education.json`
  - [ ] `data/experience.json`
  - [ ] `data/projects.json`
  - [ ] `data/publications.json`
  - [ ] `data/volunteering.json`
  - [ ] `data/travel.json`
- [ ] All images exist in correct paths
- [ ] All external links work (GitHub, LinkedIn, papers, etc.)
- [ ] Email address is correct in contact form
- [ ] Social media links are current

### 3. Responsive Testing
Test on multiple devices/screen sizes:
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

Or use Chrome DevTools Device Toolbar (Ctrl/Cmd + Shift + M)

### 4. Browser Compatibility
Test in multiple browsers:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### 5. Performance Check
Run Lighthouse audit (Chrome DevTools → Lighthouse):
- [ ] Performance score: **90+**
- [ ] Accessibility score: **90+**
- [ ] Best Practices score: **90+**
- [ ] SEO score: **90+**

**How to run:**
1. Open Chrome DevTools (F12)
2. Click "Lighthouse" tab
3. Select all categories
4. Click "Analyze page load"

### 6. Functionality Testing
- [ ] Timeline animations trigger on scroll
- [ ] Project cards have hover effects
- [ ] Publication filters work
- [ ] Travel map displays correctly with all countries
- [ ] Contact form submits successfully
- [ ] Smooth scroll navigation works
- [ ] Back-to-top button appears and functions

---

## 🎨 Content Review

### Education Section
- [ ] All degrees listed with correct dates
- [ ] University logos display correctly (48x48px)
- [ ] GPA and rankings are accurate
- [ ] "Current" badge shows for ongoing education

### Experience Section
- [ ] All positions listed chronologically (most recent first)
- [ ] Company logos display correctly
- [ ] Job descriptions are clear and concise
- [ ] Technologies/skills are tagged
- [ ] "Current" badge shows for active positions

### Projects Section
- [ ] Featured projects appear first with ⭐ badge
- [ ] Project images are optimized (<100KB each)
- [ ] All links work (GitHub, Demo, Paper, etc.)
- [ ] Technologies are listed correctly
- [ ] Short descriptions are compelling

### Publications Section
- [ ] Publications sorted by year (most recent first)
- [ ] BibTeX copy button works
- [ ] DOI links are correct
- [ ] Author names are accurate with "isMe" flag
- [ ] Filters work (by type, year, keyword)

### Volunteering Section
- [ ] IEEE roles displayed in timeline
- [ ] Dates are accurate
- [ ] Descriptions highlight impact
- [ ] "Active" badge shows for ongoing roles

### Travel Section
- [ ] Map displays correctly
- [ ] All visited countries are colored
- [ ] Flag emojis appear for each country
- [ ] Country count is accurate

---

## ⚡ Performance Optimization (Optional)

### Before Deployment
- [ ] Run `./optimize.sh` script
- [ ] Verify images are compressed
- [ ] Check that CSS/JS are minified (optional)

### Manual Optimization
```bash
# Install tools (if not already installed)
npm install -g clean-css-cli uglify-js

# Minify CSS
cleancss -o assets/css/modern-portfolio.min.css assets/css/modern-portfolio.css

# Minify JS
uglifyjs assets/js/portfolio-renderer.js -o assets/js/portfolio-renderer.min.js -c -m

# Update index.html to use minified versions (optional for production)
```

### Image Optimization
- [ ] All portfolio images < 100KB
- [ ] Profile image optimized
- [ ] Logo images are SVG or optimized PNG
- [ ] Use WebP format where possible

---

## 🔒 Security & SEO

### Meta Tags
- [ ] `<title>` is descriptive and unique
- [ ] `<meta name="description">` is compelling (150-160 chars)
- [ ] `<meta name="keywords">` includes relevant terms
- [ ] Open Graph tags are complete
- [ ] Twitter Card tags are set

### Analytics
- [ ] Google Analytics ID is correct (`G-VJHNQN2HWX`)
- [ ] Analytics tracking is working (test in real-time dashboard)

### Security
- [ ] All external links have `rel="noopener"` (prevents tabnabbing)
- [ ] No sensitive information in JSON files
- [ ] HTTPS enforced (GitHub Pages does this automatically)

### Sitemap
- [ ] `sitemap.xml` exists and is valid
- [ ] All main pages are included
- [ ] Sitemap is referenced in `robots.txt`

---

## 🚀 GitHub Pages Deployment

### 1. Commit Changes
```bash
cd /Users/pain/Desktop/my_website/mohammad-albarham.github.io

# Check what files changed
git status

# Stage all changes
git add .

# Commit with descriptive message
git commit -m "Refactor portfolio with modern design and data-driven architecture"

# Push to GitHub
git push origin main
```

### 2. Enable GitHub Pages
1. Go to repository: https://github.com/mohammad-albarham/mohammad-albarham.github.io
2. Click **Settings** → **Pages**
3. Under "Source", select:
   - **Branch:** `main`
   - **Folder:** `/ (root)`
4. Click **Save**
5. Wait 1-2 minutes for deployment

### 3. Verify Deployment
- [ ] Visit https://mohammad-albarham.github.io/
- [ ] Check that all sections load
- [ ] Test a few links
- [ ] Verify Google Analytics is tracking (check Real-Time view)

### 4. Custom Domain (Optional)
If using a custom domain:
1. Add `CNAME` file with your domain name
2. Configure DNS records:
   ```
   Type: A
   Name: @
   Value: 185.199.108.153
   Value: 185.199.109.153
   Value: 185.199.110.153
   Value: 185.199.111.153
   ```
   Or for subdomain (www):
   ```
   Type: CNAME
   Name: www
   Value: mohammad-albarham.github.io
   ```
3. Enable HTTPS in GitHub Pages settings

---

## 📊 Post-Deployment

### Immediate (Within 1 hour)
- [ ] Test live site on multiple devices
- [ ] Check all links work on live site
- [ ] Verify Google Analytics tracking
- [ ] Test contact form submission
- [ ] Share link with a friend for feedback

### Within 24 hours
- [ ] Submit sitemap to Google Search Console
  1. Go to [Google Search Console](https://search.google.com/search-console)
  2. Add property: https://mohammad-albarham.github.io
  3. Submit sitemap: https://mohammad-albarham.github.io/sitemap.xml
- [ ] Check Lighthouse scores on live site
- [ ] Monitor error logs in browser console

### Within 1 week
- [ ] Monitor Google Analytics for traffic
- [ ] Check search engine indexing (Google: `site:mohammad-albarham.github.io`)
- [ ] Gather feedback from colleagues/peers
- [ ] Make any necessary adjustments

---

## 🐛 Troubleshooting

### Common Issues After Deployment

**Problem:** Content not loading, shows "Loading skeleton"
- **Fix:** Check browser console for errors, verify JSON file paths are correct

**Problem:** Images not displaying
- **Fix:** Ensure image paths are relative (`assets/img/...`) not absolute (`/assets/img/...`)

**Problem:** Dark mode not working
- **Fix:** Check that `theme.js` is loaded, clear browser cache

**Problem:** Animations not smooth
- **Fix:** Check browser hardware acceleration is enabled, test on different device

**Problem:** Contact form not submitting
- **Fix:** Verify Google Form ID is correct in `index.html`

---

## 📝 Ongoing Maintenance

### Monthly
- [ ] Update any new publications in `data/publications.json`
- [ ] Add new projects to `data/projects.json`
- [ ] Update experience/volunteering if roles change
- [ ] Check for broken links
- [ ] Review Google Analytics for insights

### Quarterly
- [ ] Run Lighthouse audit to check performance
- [ ] Update dependencies (Bootstrap, etc.) if needed
- [ ] Refresh screenshots/images if projects evolved
- [ ] Review and update meta descriptions for SEO

### Annually
- [ ] Major content refresh
- [ ] Update profile photo if desired
- [ ] Review entire site for outdated information
- [ ] Consider new features or sections

---

## ✅ Final Check Before Going Live

**I confirm that:**
- [x] All content is accurate and up-to-date
- [x] All JSON files are valid
- [x] Website works on desktop and mobile
- [x] No console errors
- [x] Lighthouse scores are 90+
- [x] All links work
- [x] Contact form submits successfully
- [x] Google Analytics is configured
- [x] Sitemap exists
- [x] Website looks professional and polished

**Ready to deploy!** 🚀

---

## 🎉 Congratulations!

Your modern portfolio is ready to impress recruiters, collaborators, and the academic community!

### Share Your Portfolio:
- LinkedIn profile → Add website link
- Twitter/X bio → Include link
- Email signature → Add website
- Conference presentations → Display QR code
- Research papers → Include in author info

---

**Document Version:** 1.0  
**Last Updated:** December 17, 2025  
**Next Review:** January 2026
