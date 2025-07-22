#!/usr/bin/env python3
"""
URL Checker Script for Fern Docs Sitemap
Checks all URLs in the sitemap for 404 errors and other issues.
"""

import xml.etree.ElementTree as ET
import requests
import time
import sys
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import argparse

class URLChecker:
    def __init__(self, sitemap_path, max_workers=10, delay=0.1, timeout=30):
        self.sitemap_path = sitemap_path
        self.max_workers = max_workers
        self.delay = delay
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Fern-URL-Checker/1.0'
        })
        
    def parse_sitemap(self):
        """Parse the XML sitemap and extract all URLs."""
        try:
            tree = ET.parse(self.sitemap_path)
            root = tree.getroot()
            
            # Handle namespace
            namespace = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
            urls = []
            
            for url_elem in root.findall('ns:url', namespace):
                loc_elem = url_elem.find('ns:loc', namespace)
                if loc_elem is not None:
                    urls.append(loc_elem.text.strip())
            
            return urls
        except ET.ParseError as e:
            print(f"❌ Error parsing XML sitemap: {e}")
            return []
        except FileNotFoundError:
            print(f"❌ Sitemap file not found: {self.sitemap_path}")
            return []

    def check_url(self, url):
        """Check a single URL and return result."""
        try:
            response = self.session.get(url, timeout=self.timeout, allow_redirects=True)
            return {
                'url': url,
                'status_code': response.status_code,
                'final_url': response.url,
                'redirected': url != response.url,
                'error': None
            }
        except requests.exceptions.RequestException as e:
            return {
                'url': url,
                'status_code': None,
                'final_url': None,
                'redirected': False,
                'error': str(e)
            }

    def check_urls(self, urls):
        """Check all URLs concurrently."""
        results = []
        failed_urls = []
        redirect_urls = []
        
        print(f"🔍 Checking {len(urls)} URLs...")
        print(f"⚙️  Using {self.max_workers} workers with {self.delay}s delay")
        print("=" * 60)
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all URL check tasks
            future_to_url = {executor.submit(self.check_url, url): url for url in urls}
            
            for i, future in enumerate(as_completed(future_to_url), 1):
                result = future.result()
                results.append(result)
                
                # Add delay between requests
                if self.delay > 0:
                    time.sleep(self.delay)
                
                # Print progress
                if i % 50 == 0 or i == len(urls):
                    print(f"Progress: {i}/{len(urls)} URLs checked")
                
                # Categorize results
                if result['error']:
                    failed_urls.append(result)
                    print(f"❌ ERROR: {result['url']} - {result['error']}")
                elif result['status_code'] == 404:
                    failed_urls.append(result)
                    print(f"❌ 404: {result['url']}")
                elif result['status_code'] >= 400:
                    failed_urls.append(result)
                    print(f"⚠️  {result['status_code']}: {result['url']}")
                elif result['redirected']:
                    redirect_urls.append(result)
                    print(f"🔄 REDIRECT: {result['url']} → {result['final_url']}")
                elif result['status_code'] == 200:
                    print(f"✅ OK: {result['url']}")
                else:
                    print(f"ℹ️  {result['status_code']}: {result['url']}")
        
        return results, failed_urls, redirect_urls

    def print_summary(self, results, failed_urls, redirect_urls):
        """Print summary of results."""
        print("\n" + "=" * 60)
        print("📊 SUMMARY")
        print("=" * 60)
        
        total_urls = len(results)
        success_urls = len([r for r in results if r['status_code'] == 200 and not r['error']])
        
        print(f"Total URLs checked: {total_urls}")
        print(f"✅ Successful (200): {success_urls}")
        print(f"🔄 Redirects: {len(redirect_urls)}")
        print(f"❌ Failed/Errors: {len(failed_urls)}")
        
        if failed_urls:
            print(f"\n❌ FAILED URLS ({len(failed_urls)}):")
            print("-" * 40)
            for result in failed_urls:
                if result['error']:
                    print(f"ERROR: {result['url']} - {result['error']}")
                else:
                    print(f"{result['status_code']}: {result['url']}")
        
        if redirect_urls:
            print(f"\n🔄 REDIRECTED URLS ({len(redirect_urls)}):")
            print("-" * 40)
            for result in redirect_urls:
                print(f"{result['url']} → {result['final_url']}")
        
        return len(failed_urls) == 0

def main():
    parser = argparse.ArgumentParser(description='Check URLs in Fern sitemap for 404 errors')
    parser.add_argument('--sitemap', default='fern/docs.xml', help='Path to sitemap XML file')
    parser.add_argument('--workers', type=int, default=10, help='Number of concurrent workers')
    parser.add_argument('--delay', type=float, default=0.1, help='Delay between requests (seconds)')
    parser.add_argument('--timeout', type=int, default=30, help='Request timeout (seconds)')
    parser.add_argument('--max-urls', type=int, help='Limit number of URLs to check (for testing)')
    
    args = parser.parse_args()
    
    checker = URLChecker(args.sitemap, args.workers, args.delay, args.timeout)
    
    print("🚀 Fern Docs URL Checker")
    print("=" * 60)
    
    # Parse sitemap
    urls = checker.parse_sitemap()
    if not urls:
        print("❌ No URLs found in sitemap")
        sys.exit(1)
    
    # Limit URLs if specified (for testing)
    if args.max_urls:
        urls = urls[:args.max_urls]
        print(f"🔬 Testing mode: checking first {len(urls)} URLs")
    
    # Check URLs
    results, failed_urls, redirect_urls = checker.check_urls(urls)
    
    # Print summary and exit
    success = checker.print_summary(results, failed_urls, redirect_urls)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main() 