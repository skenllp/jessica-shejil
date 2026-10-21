#!/usr/bin/env python3
"""Set the bride-side site address in index.html (canonical, og:url, og:image, twitter:image).

Usage:  python3 set-site-url.py https://your-bride-site.example
Run it once before deploying. It refuses the groom-side domain and can be re-run with a new address.
"""
import re, sys, pathlib
GROOM = 'shejil-jessica.vercel.app'
PLACEHOLDER = 'https://YOUR-BRIDE-SITE-DOMAIN'
if len(sys.argv) != 2 or not re.fullmatch(r'https://[A-Za-z0-9.-]+(:\d+)?', sys.argv[1].rstrip('/')):
    sys.exit('Usage: python3 set-site-url.py https://your-bride-site.example   (https, no path)')
url = sys.argv[1].rstrip('/')
if GROOM in url:
    sys.exit('That is the groom-side address. Use a separate domain for the bride-side invitation.')
p = pathlib.Path(__file__).with_name('index.html'); s = p.read_text(encoding='utf-8')
cur = re.search(r'<link rel="canonical" href="(https://[^/"]+)/">', s)
old = cur.group(1) if cur else PLACEHOLDER
n = s.count(old)
if not n: sys.exit('Could not find the current site address in index.html')
p.write_text(s.replace(old, url), encoding='utf-8')
print(f'Replaced {n} occurrences of {old} with {url}')
