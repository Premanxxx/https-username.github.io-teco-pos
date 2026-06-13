#!/usr/bin/env python3
"""
Te.Co Pandawa POS - Local Server
Jalankan ini di komputer/HP untuk serve aplikasi PWA
"""
import http.server
import socketserver
import os
import webbrowser
from pathlib import Path

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS and PWA headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Service-Worker-Allowed', '/')
        super().end_headers()

    def log_message(self, format, *args):
        print(f"[SERVER] {self.address_string()} - {format % args}")

os.chdir(DIRECTORY)

print("=" * 50)
print("☕ Te.Co Pandawa POS - Local Server")
print("=" * 50)
print(f"📁 Directory: {DIRECTORY}")
print(f"🌐 URL: http://localhost:{PORT}")
print(f"📱 Untuk HP lain: http://<IP-komputer>:{PORT}")
print("=" * 50)
print("Tekan Ctrl+C untuk berhenti\n")

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    # Auto open browser
    try:
        webbrowser.open(f'http://localhost:{PORT}')
    except:
        pass

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Server dihentikan")
        httpd.shutdown()
