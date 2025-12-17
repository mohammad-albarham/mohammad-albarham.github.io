#!/usr/bin/env python3
"""
Update Sub-pages Script
Updates all project/portfolio detail pages to use consistent design with main page
"""

import os
import re
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
PROJECTS_DIR = BASE_DIR / 'projects'
VOLUNTEERING_DIR = BASE_DIR / 'volunteering'

# New CSS imports to add (relative paths for sub-pages)
NEW_CSS = '''  <!-- Main CSS Files -->
  <link href="../assets/css/style.css" rel="stylesheet">
  <link href="../assets/css/modern-portfolio.css" rel="stylesheet">
  <link href="../assets/css/subpage.css" rel="stylesheet">
  <link href="../assets/css/responsive-images.css" rel="stylesheet">
  <link href="../assets/css/dark-mode.css" rel="stylesheet">'''

# New sidebar HTML
NEW_SIDEBAR = '''  <!-- ======= Header / Sidebar ======= -->
  <header id="header">
    <div class="d-flex flex-column">
      <div class="profile">
        <img src="../assets/img/profile-img.jpg" alt="Mohammad Albarham" class="img-fluid rounded-circle" loading="lazy">
        <h1 class="text-light"><a href="../index.html">MOHAMMAD ALBARHAM</a></h1>
        <div class="social-links mt-3 text-center">
          <a href="https://www.linkedin.com/in/albarham/" class="linkedin" aria-label="LinkedIn" target="_blank" rel="noopener">
            <i class="bx bxl-linkedin"></i>
          </a>
          <a href="https://github.com/mohammad-albarham" class="github" aria-label="GitHub" target="_blank" rel="noopener">
            <i class="bx bxl-github"></i>
          </a>
          <a href="https://scholar.google.com/citations?user=3znRUJoAAAAJ&hl=en" aria-label="Google Scholar" target="_blank" rel="noopener">
            <i class="ai ai-google-scholar-square ai-1x"></i>
          </a>
          <a href="https://huggingface.co/pain" aria-label="Hugging Face" target="_blank" rel="noopener">
            <object data="../assets/img/hf-logo.svg" width="17" height="17" aria-hidden="true"></object>
          </a>
        </div>
      </div>

      <nav id="navbar" class="nav-menu navbar">
        <ul>
          <li><a href="../index.html#hero" class="nav-link"><i class="bx bx-home"></i> <span>Home</span></a></li>
          <li><a href="../index.html#about" class="nav-link"><i class="bx bx-user"></i> <span>About</span></a></li>
          <li><a href="../index.html#resume" class="nav-link"><i class="bx bx-file-blank"></i> <span>Resume</span></a></li>
          <li><a href="../index.html#projects" class="nav-link active"><i class="bx bx-folder"></i> <span>Projects</span></a></li>
          <li><a href="../index.html#publications" class="nav-link"><i class="bx bx-book-content"></i> <span>Publications</span></a></li>
          <li><a href="../index.html#volunteering" class="nav-link"><i class="bx bx-heart"></i> <span>Volunteering</span></a></li>
          <li><a href="../index.html#travel" class="nav-link"><i class="bx bx-globe"></i> <span>Travel</span></a></li>
          <li><a href="../index.html#contact" class="nav-link"><i class="bx bx-envelope"></i> <span>Contact</span></a></li>
        </ul>
      </nav>
    </div>
  </header>
  <!-- End Header -->'''

# Updated footer
NEW_FOOTER = '''  <!-- ======= Footer ======= -->
  <footer id="footer">
    <div class="container">
      <div class="copyright">
        &copy; <span id="footer-year">2024</span> <strong><span>Mohammad Albarham</span></strong>. All Rights Reserved.
      </div>
      <div class="credits">
        Designed with <i class="bi bi-heart-fill" style="color: #e74c3c;"></i>
      </div>
    </div>
  </footer>
  <!-- End Footer -->

  <a href="#" class="back-to-top d-flex align-items-center justify-content-center"><i class="bi bi-arrow-up-short"></i></a>'''

# Updated scripts
NEW_SCRIPTS = '''  <!-- Vendor JS Files -->
  <script src="https://code.jquery.com/jquery-3.7.1.min.js" integrity="sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo=" crossorigin="anonymous" defer></script>
  <script src="../assets/vendor/bootstrap/js/bootstrap.bundle.min.js" defer></script>
  <script src="../assets/vendor/glightbox/js/glightbox.min.js" defer></script>
  <script src="../assets/vendor/swiper/swiper-bundle.min.js" defer></script>

  <!-- Main JS Files -->
  <script src="../assets/js/main.js" defer></script>
  <script src="../assets/js/image-optimizer.js" defer></script>
  <script src="../assets/js/theme.js" type="module"></script>

  <script>
    // Update footer year
    document.addEventListener('DOMContentLoaded', function() {
      const yearEl = document.getElementById('footer-year');
      if (yearEl) yearEl.textContent = new Date().getFullYear();
    });
  </script>'''


def update_html_file(filepath):
    """Update a single HTML file with new design elements"""
    print(f"Processing: {filepath.name}")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Update CSS imports - find and replace the CSS section
    css_pattern = r'<!-- Main CSS Files -->.*?<link href="[^"]*dark-mode\.css"[^>]*>'
    if re.search(css_pattern, content, re.DOTALL):
        content = re.sub(css_pattern, NEW_CSS, content, flags=re.DOTALL)
    else:
        # Try alternative pattern
        css_pattern2 = r'<link href="[^"]*style\.css"[^>]*>.*?<link href="[^"]*dark-mode\.css"[^>]*>'
        if re.search(css_pattern2, content, re.DOTALL):
            content = re.sub(css_pattern2, NEW_CSS, content, flags=re.DOTALL)
    
    # Update header/sidebar - find and replace
    header_pattern = r'<!-- ======= Header ======= -->.*?<!-- End Header -->'
    if re.search(header_pattern, content, re.DOTALL):
        # Remove duplicate End Header comments
        content = re.sub(header_pattern, NEW_SIDEBAR, content, flags=re.DOTALL)
        # Clean up any remaining duplicate End Header comments
        content = re.sub(r'\s*<!-- End Header -->\s*<!-- End Header -->', '', content)
    else:
        # Try with different comment style
        header_pattern2 = r'<header id="header">.*?</header>'
        if re.search(header_pattern2, content, re.DOTALL):
            content = re.sub(header_pattern2, NEW_SIDEBAR, content, flags=re.DOTALL)
    
    # Update footer
    footer_pattern = r'<!-- ======= Footer ======= -->.*?<a href="#" class="back-to-top[^>]*>.*?</a>'
    if re.search(footer_pattern, content, re.DOTALL):
        content = re.sub(footer_pattern, NEW_FOOTER, content, flags=re.DOTALL)
    
    # Update scripts section
    scripts_pattern = r'<!-- Vendor JS Files -->.*?</script>\s*</body>'
    if re.search(scripts_pattern, content, re.DOTALL):
        content = re.sub(scripts_pattern, NEW_SCRIPTS + '\n</body>', content, flags=re.DOTALL)
    
    # Add mobile nav toggle if not present
    if 'mobile-nav-toggle' not in content:
        body_pattern = r'<body>\s*'
        content = re.sub(body_pattern, '<body>\n\n  <!-- Mobile nav toggle button -->\n  <i class="bi bi-list mobile-nav-toggle d-xl-none"></i>\n\n', content)
    
    # Remove duplicate sections
    content = re.sub(r'(<!-- End Header -->)\s*\1', r'\1', content)
    content = re.sub(r'\n{3,}', '\n\n', content)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✓ Updated: {filepath.name}")
        return True
    else:
        print(f"  - No changes needed: {filepath.name}")
        return False


def main():
    print("=" * 60)
    print("UPDATING SUB-PAGES WITH NEW DESIGN")
    print("=" * 60)
    
    updated = 0
    total = 0
    
    # Process all HTML files in projects folder
    if PROJECTS_DIR.exists():
        for html_file in PROJECTS_DIR.glob('*.html'):
            total += 1
            if update_html_file(html_file):
                updated += 1
    
    # Process all HTML files in volunteering folder
    if VOLUNTEERING_DIR.exists():
        for html_file in VOLUNTEERING_DIR.glob('*.html'):
            total += 1
            if update_html_file(html_file):
                updated += 1
    
    print("\n" + "=" * 60)
    print(f"COMPLETE: Updated {updated}/{total} files")
    print("=" * 60)


if __name__ == '__main__':
    main()
