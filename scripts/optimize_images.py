#!/usr/bin/env python3
"""
Image Optimization Script for Portfolio Website
Compresses, resizes, and converts images to WebP format

Usage:
    python optimize_images.py [--dry-run] [--quality 85] [--max-width 1920]

Requirements:
    pip install Pillow

Features:
    - Compresses JPG/JPEG images
    - Compresses PNG images (converts to palette mode when possible)
    - Creates WebP versions of all images
    - Resizes oversized images while maintaining aspect ratio
    - Creates responsive image variants (optional)
    - Preserves original files in a backup folder
"""

import os
import sys
import shutil
import argparse
from pathlib import Path
from datetime import datetime

try:
    from PIL import Image, ImageOps
    HAS_PIL = True
except ImportError:
    HAS_PIL = False
    print("WARNING: Pillow not installed. Install with: pip install Pillow")

# Configuration
DEFAULT_CONFIG = {
    'quality': 85,           # JPEG quality (1-100)
    'webp_quality': 80,      # WebP quality (1-100)
    'max_width': 1920,       # Maximum width for large images
    'max_height': 1080,      # Maximum height for large images
    'thumbnail_sizes': [400, 800],  # Responsive variant widths
    'min_savings': 0.10,     # Minimum 10% savings to replace
    'skip_small': 10240,     # Skip files smaller than 10KB
    'formats': ['.jpg', '.jpeg', '.png', '.gif'],
}

# Directories
BASE_DIR = Path(__file__).parent.parent
IMG_DIR = BASE_DIR / 'assets' / 'img'
BACKUP_DIR = BASE_DIR / 'assets' / 'img_backup'
WEBP_DIR = BASE_DIR / 'assets' / 'img_webp'

# Stats tracking
stats = {
    'processed': 0,
    'skipped': 0,
    'errors': 0,
    'original_size': 0,
    'new_size': 0,
    'webp_created': 0,
}


def format_size(size_bytes):
    """Format file size in human-readable format"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"


def get_image_info(path):
    """Get image dimensions and format"""
    try:
        with Image.open(path) as img:
            return {
                'width': img.width,
                'height': img.height,
                'format': img.format,
                'mode': img.mode,
                'size': os.path.getsize(path)
            }
    except Exception as e:
        return None


def optimize_jpeg(img_path, output_path, quality, max_width, max_height):
    """Optimize a JPEG image"""
    try:
        with Image.open(img_path) as img:
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            
            # Resize if too large
            if img.width > max_width or img.height > max_height:
                img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
            
            # Auto-orient based on EXIF
            img = ImageOps.exif_transpose(img)
            
            # Save optimized
            img.save(output_path, 'JPEG', quality=quality, optimize=True, progressive=True)
            return True
    except Exception as e:
        print(f"  Error optimizing {img_path}: {e}")
        return False


def optimize_png(img_path, output_path, max_width, max_height):
    """Optimize a PNG image"""
    try:
        with Image.open(img_path) as img:
            # Resize if too large
            if img.width > max_width or img.height > max_height:
                img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
            
            # Check if we can convert to palette mode (256 colors)
            if img.mode == 'RGBA':
                # Keep RGBA for images with transparency
                img.save(output_path, 'PNG', optimize=True)
            elif img.mode == 'RGB':
                # Try to convert to palette for smaller size
                try:
                    img_p = img.convert('P', palette=Image.Palette.ADAPTIVE, colors=256)
                    img_p.save(output_path, 'PNG', optimize=True)
                except:
                    img.save(output_path, 'PNG', optimize=True)
            else:
                img.save(output_path, 'PNG', optimize=True)
            return True
    except Exception as e:
        print(f"  Error optimizing {img_path}: {e}")
        return False


def create_webp(img_path, output_path, quality):
    """Create a WebP version of an image"""
    try:
        with Image.open(img_path) as img:
            # Handle transparency
            if img.mode in ('RGBA', 'LA', 'P'):
                if img.mode == 'P':
                    img = img.convert('RGBA')
            else:
                img = img.convert('RGB')
            
            img.save(output_path, 'WEBP', quality=quality, method=6)
            return True
    except Exception as e:
        print(f"  Error creating WebP for {img_path}: {e}")
        return False


def create_responsive_variant(img_path, output_dir, width):
    """Create a responsive image variant at specified width"""
    try:
        with Image.open(img_path) as img:
            if img.width <= width:
                return None  # Image already smaller
            
            ratio = width / img.width
            new_height = int(img.height * ratio)
            
            resized = img.resize((width, new_height), Image.Resampling.LANCZOS)
            
            # Generate output filename
            stem = img_path.stem
            suffix = img_path.suffix
            output_name = f"{stem}-{width}w{suffix}"
            output_path = output_dir / output_name
            
            if img.mode in ('RGBA', 'P'):
                resized.save(output_path, 'PNG', optimize=True)
            else:
                resized.save(output_path, 'JPEG', quality=85, optimize=True)
            
            return output_path
    except Exception as e:
        print(f"  Error creating variant for {img_path}: {e}")
        return None


def process_image(img_path, config, dry_run=False):
    """Process a single image file"""
    global stats
    
    path = Path(img_path)
    original_size = os.path.getsize(path)
    stats['original_size'] += original_size
    
    # Skip small files
    if original_size < config['skip_small']:
        print(f"  Skipping {path.name} (too small: {format_size(original_size)})")
        stats['skipped'] += 1
        return
    
    suffix = path.suffix.lower()
    
    # Get image info
    info = get_image_info(path)
    if not info:
        print(f"  Error reading {path.name}")
        stats['errors'] += 1
        return
    
    print(f"\n  Processing: {path.name}")
    print(f"    Original: {info['width']}x{info['height']}, {format_size(original_size)}")
    
    if dry_run:
        stats['processed'] += 1
        stats['new_size'] += original_size
        return
    
    # Create temp file for optimization
    temp_path = path.with_suffix(f'.opt{suffix}')
    
    try:
        # Optimize based on format
        if suffix in ['.jpg', '.jpeg']:
            success = optimize_jpeg(
                path, temp_path,
                config['quality'],
                config['max_width'],
                config['max_height']
            )
        elif suffix == '.png':
            success = optimize_png(
                path, temp_path,
                config['max_width'],
                config['max_height']
            )
        else:
            print(f"    Skipping optimization for {suffix}")
            success = False
        
        if success and temp_path.exists():
            new_size = os.path.getsize(temp_path)
            savings = (original_size - new_size) / original_size
            
            print(f"    Optimized: {format_size(new_size)} ({savings*100:.1f}% savings)")
            
            # Only replace if savings are significant
            if savings >= config['min_savings']:
                # Backup original
                backup_path = BACKUP_DIR / path.relative_to(IMG_DIR)
                backup_path.parent.mkdir(parents=True, exist_ok=True)
                if not backup_path.exists():
                    shutil.copy2(path, backup_path)
                
                # Replace with optimized
                shutil.move(temp_path, path)
                stats['new_size'] += new_size
                stats['processed'] += 1
            else:
                print(f"    Savings too small, keeping original")
                temp_path.unlink()
                stats['new_size'] += original_size
                stats['skipped'] += 1
        else:
            stats['new_size'] += original_size
            if temp_path.exists():
                temp_path.unlink()
        
        # Create WebP version
        webp_path = WEBP_DIR / path.relative_to(IMG_DIR).with_suffix('.webp')
        webp_path.parent.mkdir(parents=True, exist_ok=True)
        
        if create_webp(path, webp_path, config['webp_quality']):
            webp_size = os.path.getsize(webp_path)
            print(f"    WebP: {format_size(webp_size)}")
            stats['webp_created'] += 1
            
    except Exception as e:
        print(f"    Error: {e}")
        stats['errors'] += 1
        if temp_path.exists():
            temp_path.unlink()


def find_large_images(min_size_kb=100):
    """Find images larger than specified size"""
    large_images = []
    
    for img_file in IMG_DIR.rglob('*'):
        if img_file.suffix.lower() in DEFAULT_CONFIG['formats']:
            size = os.path.getsize(img_file)
            if size > min_size_kb * 1024:
                large_images.append((img_file, size))
    
    # Sort by size descending
    large_images.sort(key=lambda x: x[1], reverse=True)
    return large_images


def generate_report():
    """Generate optimization report"""
    print("\n" + "="*60)
    print("OPTIMIZATION REPORT")
    print("="*60)
    
    print(f"\nImages processed: {stats['processed']}")
    print(f"Images skipped:   {stats['skipped']}")
    print(f"Errors:           {stats['errors']}")
    print(f"WebP created:     {stats['webp_created']}")
    
    if stats['original_size'] > 0:
        total_savings = stats['original_size'] - stats['new_size']
        savings_pct = (total_savings / stats['original_size']) * 100
        
        print(f"\nOriginal size:  {format_size(stats['original_size'])}")
        print(f"New size:       {format_size(stats['new_size'])}")
        print(f"Total savings:  {format_size(total_savings)} ({savings_pct:.1f}%)")
    
    print("\n" + "="*60)


def main():
    parser = argparse.ArgumentParser(description='Optimize portfolio images')
    parser.add_argument('--dry-run', action='store_true', 
                       help='Show what would be done without making changes')
    parser.add_argument('--quality', type=int, default=85,
                       help='JPEG quality (1-100, default: 85)')
    parser.add_argument('--max-width', type=int, default=1920,
                       help='Maximum image width (default: 1920)')
    parser.add_argument('--list-large', type=int, metavar='KB',
                       help='List images larger than specified KB')
    
    args = parser.parse_args()
    
    if not HAS_PIL:
        print("\nERROR: Pillow is required. Install with:")
        print("  pip install Pillow")
        sys.exit(1)
    
    # List large images mode
    if args.list_large:
        print(f"\nImages larger than {args.list_large}KB:")
        print("-" * 60)
        
        large = find_large_images(args.list_large)
        for img, size in large[:50]:  # Show top 50
            rel_path = img.relative_to(IMG_DIR)
            print(f"  {format_size(size):>10}  {rel_path}")
        
        print(f"\nTotal: {len(large)} images")
        sys.exit(0)
    
    # Create directories
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    WEBP_DIR.mkdir(parents=True, exist_ok=True)
    
    # Configuration
    config = DEFAULT_CONFIG.copy()
    config['quality'] = args.quality
    config['max_width'] = args.max_width
    
    print(f"\n{'='*60}")
    print("IMAGE OPTIMIZATION")
    print(f"{'='*60}")
    print(f"\nSource:     {IMG_DIR}")
    print(f"Backup:     {BACKUP_DIR}")
    print(f"WebP:       {WEBP_DIR}")
    print(f"Quality:    {config['quality']}")
    print(f"Max width:  {config['max_width']}px")
    print(f"Dry run:    {args.dry_run}")
    
    # Find all images
    images = []
    for img_file in IMG_DIR.rglob('*'):
        if img_file.suffix.lower() in config['formats']:
            images.append(img_file)
    
    print(f"\nFound {len(images)} images to process...")
    
    if args.dry_run:
        print("\n*** DRY RUN - No changes will be made ***")
    
    # Process images
    for i, img_path in enumerate(images, 1):
        print(f"\n[{i}/{len(images)}]", end='')
        process_image(img_path, config, dry_run=args.dry_run)
    
    # Generate report
    generate_report()
    
    if not args.dry_run:
        print(f"\nBackup saved to: {BACKUP_DIR}")
        print(f"WebP images saved to: {WEBP_DIR}")


if __name__ == '__main__':
    main()
