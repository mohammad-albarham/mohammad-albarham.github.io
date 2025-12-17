#!/usr/bin/env python3
"""
Script to update project page paths after reorganization.
Updates all asset paths and links to use ../ prefix since files moved to /projects/
"""

import os
import re
import glob

PROJECTS_DIR = "/Users/pain/Desktop/my_website/mohammad-albarham.github.io/projects"

# Patterns to update (old -> new)
REPLACEMENTS = [
    # Asset paths
    (r'href="assets/', 'href="../assets/'),
    (r'src="assets/', 'src="../assets/'),
    (r'data="assets/', 'data="../assets/'),
    # Index links
    (r'href="index\.html', 'href="../index.html'),
    # Navigation back to main sections
    (r'href="index\.html#', 'href="../index.html#'),
    # Portfolio details links within project folder
    (r'href="portfolio-details-', 'href="portfolio-details-'),  # Keep same level
    (r'href="latest-projects-', 'href="latest-projects-'),  # Keep same level
]

def update_file(filepath):
    """Update a single HTML file with correct paths."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Apply replacements
    for old, new in REPLACEMENTS:
        content = re.sub(old, new, content)
    
    # Only write if changes were made
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {os.path.basename(filepath)}")
        return True
    else:
        print(f"No changes: {os.path.basename(filepath)}")
        return False

def main():
    """Update all HTML files in the projects directory."""
    html_files = glob.glob(os.path.join(PROJECTS_DIR, "*.html"))
    
    updated = 0
    for filepath in html_files:
        if update_file(filepath):
            updated += 1
    
    print(f"\nTotal files updated: {updated}/{len(html_files)}")

if __name__ == "__main__":
    main()
