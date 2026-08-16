from http.server import BaseHTTPRequestHandler
import json
import sys
import os
import urllib.parse

# Include python crawler directory
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend', 'python'))
try:
    from website_knowledge_crawler import crawl_url
except ImportError:
    crawl_url = None

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed_path.query)
        target_url = params.get('url', [''])[0]

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

        if target_url and crawl_url:
            crawled_data = crawl_url(target_url)
            self.wfile.write(json.dumps({"success": True, "data": crawled_data}).encode('utf-8'))
        else:
            status_resp = {
                "success": True,
                "status": "online",
                "service": "DPGNotes Unified Vercel Python Service",
                "runtime": "Vercel Python 3.9+"
            }
            self.wfile.write(json.dumps(status_resp).encode('utf-8'))

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

        try:
            payload = json.loads(post_data.decode('utf-8'))
            urls = payload.get('urls', [])
            target_url = payload.get('url', '')
            results = []

            if target_url and crawl_url:
                results.append(crawl_url(target_url))
            elif urls and crawl_url:
                for u in urls[:15]:
                    res = crawl_url(u)
                    if res:
                        results.append(res)

            self.wfile.write(json.dumps({"success": True, "websites": results}).encode('utf-8'))
        except Exception as e:
            self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
