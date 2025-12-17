#!/usr/bin/env python3
"""
Batch update HTML files with modern template headers and footers.
Updates latest-projects-* and portfolio-details-* files for consistency.
"""

import re
from pathlib import Path

# Define the modern head section
MODERN_HEAD = '''<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta content="width=device-width, initial-scale=1.0" name="viewport">

  <title>{title} - Mohammad Al-Barham</title>
  <meta content="{description}" name="description">
  <meta content="{keywords}" name="keywords">

  <!-- Favicons -->
  <link href="assets/img/favicon.png" rel="icon">
  <link href="assets/img/apple-touch-icon.png" rel="apple-touch-icon">

  <!-- Google Fonts -->
  <link href="https://fonts.googleapis.com/css?family=Open+Sans:300,300i,400,400i,600,600i,700,700i|Raleway:300,300i,400,400i,500,500i,600,600i,700,700i|Poppins:300,300i,400,400i,500,500i,600,600i,700,700i" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/jpswalsh/academicons@1/css/academicons.min.css">

  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-VJHNQN2HWX"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){{dataLayer.push(arguments);}}
    gtag('js', new Date());
    gtag('config', 'G-VJHNQN2HWX');
  </script>

  <!-- Vendor CSS Files -->
  <link href="assets/vendor/aos/aos.css" rel="stylesheet">
  <link href="assets/vendor/bootstrap/css/bootstrap.min.css" rel="stylesheet">
  <link href="assets/vendor/bootstrap-icons/bootstrap-icons.css" rel="stylesheet">
  <link href="assets/vendor/boxicons/css/boxicons.min.css" rel="stylesheet">
  <link href="assets/vendor/glightbox/css/glightbox.min.css" rel="stylesheet">
  <link href="assets/vendor/swiper/swiper-bundle.min.css" rel="stylesheet">

  <!-- Code highlighting -->
  <link rel="stylesheet" href="https://cdn.rawgit.com/google/code-prettify/master/loader/prettify.css" />
  <script src="https://cdn.rawgit.com/google/code-prettify/master/loader/run_prettify.js"></script>

  <!-- Main CSS Files -->
  <link href="assets/css/style.css" rel="stylesheet">
  <link href="assets/css/modern-portfolio.css" rel="stylesheet">
  <link href="assets/css/dark-mode.css" rel="stylesheet">
</head>'''

# Define the modern header/nav section
MODERN_HEADER = '''
<body>

  <!-- ======= Mobile nav toggle button ======= -->
  <i class="bi bi-list mobile-nav-toggle d-xl-none"></i>

  <!-- ======= Header ======= -->
  <header id="header">
    <div class="d-flex flex-column">

      <div class="profile">
        <img src="assets/img/profile-img.jpg" alt="Mohammad Al-Barham" class="img-fluid rounded-circle">
        <h1 class="text-light"><a href="index.html">MOHAMMAD AL-BARHAM</a></h1>
        <div class="social-links mt-3 text-center">
          <a href="https://www.linkedin.com/in/muhammad-al-barham/" class="linkedin"><i class="bx bxl-linkedin"></i></a>
          <a href="https://github.com/mohammad-albarham" class="github"><i class="bx bxl-github"></i></a>
          <a href="https://scholar.google.com/citations?user=3znRUJoAAAAJ&hl=en"><i class="ai ai-google-scholar-square ai-1x"></i></a>
          <a href="https://huggingface.co/pain"><object data="assets/img/hf-logo.svg" width="17" height="17"></object></a>
        </div>
      </div>

      <nav id="navbar" class="nav-menu navbar">
        <ul>
          <li><a href="index.html" class="nav-link scrollto"><i class="bx bx-home"></i> <span>Home</span></a></li>
          <li><a href="index.html#about" class="nav-link scrollto"><i class="bx bx-user"></i> <span>About</span></a></li>
          <li><a href="index.html#skills" class="nav-link scrollto"><i class="bx bx-code-alt"></i> <span>Skills</span></a></li>
          <li><a href="index.html#resume" class="nav-link scrollto"><i class="bx bx-file-blank"></i> <span>Resume</span></a></li>
          <li><a href="index.html#certifications" class="nav-link scrollto"><i class="bx bx-award"></i> <span>Certifications</span></a></li>
          <li><a href="index.html#projects" class="nav-link scrollto active"><i class="bx bx-book"></i> <span>Projects</span></a></li>
          <li><a href="index.html#publications" class="nav-link scrollto"><i class="bx bx-book-content"></i> <span>Publications</span></a></li>
          <li><a href="index.html#volunteering" class="nav-link scrollto"><i class="bx bx-server"></i> <span>Volunteering</span></a></li>
          <li><a href="index.html#contact" class="nav-link scrollto"><i class="bx bx-envelope"></i> <span>Contact</span></a></li>
        </ul>
      </nav><!-- .nav-menu -->
    </div>
  </header><!-- End Header -->'''

# Define the modern footer
MODERN_FOOTER = '''  <footer id="footer">
    <div class="container">
      <div class="copyright">
        &copy; 2024 <strong><span>Mohammad Al-Barham</span></strong>
      </div>
      <div class="credits">
        Designed by <a href="https://bootstrapmade.com/">BootstrapMade</a>
      </div>
    </div>
  </footer><!-- End Footer -->

  <a href="#" class="back-to-top d-flex align-items-center justify-content-center"><i class="bi bi-arrow-up-short"></i></a>

  <!-- Vendor JS Files -->
  <script src="assets/vendor/purecounter/purecounter_vanilla.js"></script>
  <script src="assets/vendor/aos/aos.js"></script>
  <script src="assets/vendor/bootstrap/js/bootstrap.bundle.min.js"></script>
  <script src="assets/vendor/glightbox/js/glightbox.min.js"></script>
  <script src="assets/vendor/isotope-layout/isotope.pkgd.min.js"></script>
  <script src="assets/vendor/swiper/swiper-bundle.min.js"></script>
  <script src="assets/vendor/typed.js/typed.umd.js"></script>
  <script src="assets/vendor/waypoints/noframework.waypoints.js"></script>
  <script src="assets/vendor/php-email-form/validate.js"></script>

  <!-- Main JS File -->
  <script src="assets/js/main.js"></script>
  <script type="module" src="assets/js/theme.js"></script>

</body>

</html>'''


def extract_main_content(html):
    """Extract the main content between header and footer."""
    # Find the end of header (after </header>)
    header_end = html.find('</header>')
    if header_end == -1:
        # Try alternative pattern
        header_end = html.find('<main')
        if header_end == -1:
            return None
    
    # Find the start of footer
    footer_start = html.find('<footer')
    if footer_start == -1:
        # Try alternative patterns
        footer_start = html.find('<!-- Vendor JS Files -->')
        if footer_start == -1:
            return None
    
    # Extract main content
    main_content = html[header_end:footer_start].strip()
    
    # Clean up - remove closing header tag if present
    if main_content.startswith('</header>'):
        main_content = main_content[9:].strip()
    
    return main_content


def extract_title_from_breadcrumb(content):
    """Extract page title from breadcrumb or content."""
    # Try to find breadcrumb title
    match = re.search(r'<h2[^>]*>([^<]+)</h2>', content)
    if match:
        return match.group(1)
    return "Project Details"


def update_html_file(file_path):
    """Update a single HTML file with modern template."""
    print(f"Processing: {file_path.name}")
    
    try:
        # Read the file
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Extract main content
        main_content = extract_main_content(content)
        if not main_content:
            print(f"  ⚠️  Could not extract main content from {file_path.name}")
            return False
        
        # Extract title for the page
        title = extract_title_from_breadcrumb(main_content)
        
        # Build the new HTML
        new_html = MODERN_HEAD.format(
            title=title,
            description=f"{title} - Mohammad Al-Barham's Portfolio",
            keywords="portfolio, projects, research, machine learning"
        )
        new_html += MODERN_HEADER
        new_html += '\n\n' + main_content + '\n\n'
        new_html += MODERN_FOOTER
        
        # Write the updated file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_html)
        
        print(f"  ✓ Updated successfully")
        return True
        
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return False


def main():
    """Main function to batch update all HTML files."""
    base_path = Path(__file__).parent
    
    # Files to update
    files_to_update = []
    
    # Add latest-projects files
    for i in range(1, 5):
        files_to_update.append(base_path / f"latest-projects-{i}.html")
    
    # Add portfolio-details files
    portfolio_numbers = [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 19, 20, 21]
    for num in portfolio_numbers:
        files_to_update.append(base_path / f"portfolio-details-{num}.html")
    
    # Update each file
    success_count = 0
    fail_count = 0
    
    print("=" * 60)
    print("Batch Updating HTML Files with Modern Template")
    print("=" * 60)
    print()
    
    for file_path in files_to_update:
        if file_path.exists():
            if update_html_file(file_path):
                success_count += 1
            else:
                fail_count += 1
        else:
            print(f"⚠️  File not found: {file_path.name}")
            fail_count += 1
        print()
    
    print("=" * 60)
    print(f"Update Complete: {success_count} successful, {fail_count} failed")
    print("=" * 60)


if __name__ == "__main__":
    main()
