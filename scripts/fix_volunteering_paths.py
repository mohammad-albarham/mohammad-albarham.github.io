#!/usr/bin/env python3
"""
Fix Volunteering Pages Paths
Updates volunteering pages to use correct relative paths (../assets/ instead of assets/)
"""

import re
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
VOLUNTEERING_DIR = BASE_DIR / 'volunteering'

def fix_paths(filepath):
    """Fix asset paths in volunteering HTML files"""
    print(f"Processing: {filepath.name}")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Fix asset paths (not already prefixed with ../)
    # Be careful not to double-fix already correct paths
    content = re.sub(r'href="assets/', 'href="../assets/', content)
    content = re.sub(r'src="assets/', 'src="../assets/', content)
    content = re.sub(r'data="assets/', 'data="../assets/', content)
    content = re.sub(r'href="index\.html', 'href="../index.html', content)
    
    # Fix any double prefixes that might have been created
    content = re.sub(r'\.\./\.\./', '../', content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✓ Fixed paths in: {filepath.name}")
        return True
    else:
        print(f"  - No changes needed: {filepath.name}")
        return False


def main():
    print("=" * 60)
    print("FIXING VOLUNTEERING PAGE PATHS")
    print("=" * 60)
    
    updated = 0
    total = 0
    
    if VOLUNTEERING_DIR.exists():
        for html_file in VOLUNTEERING_DIR.glob('*.html'):
            total += 1
            if fix_paths(html_file):
                updated += 1
    
    print("\n" + "=" * 60)
    print(f"COMPLETE: Fixed {updated}/{total} files")
    print("=" * 60)


if __name__ == '__main__':
    main()
