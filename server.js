// server.js
// Te.Co Pandawa POS - Node.js Server
// Run: node server.js

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 8080);

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  // index.html adalah aplikasi utama yang memuat sinkronisasi Firebase,
  // laporan native, serta analisa HPP admin terbaru.
  // Gunakan pathname agar query cache-busting seperti ?v=3.3.2
  // tidak dianggap sebagai bagian dari nama file.
  const requestPath = new URL(req.url, 'http://localhost').pathname;
  let filePath = requestPath === '/' ? '/index.html' : requestPath;
  filePath = path.join(__dirname, filePath);

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
    } else {
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Service-Worker-Allowed': '/'
      });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log('☕ Te.Co Pandawa POS Server');
  console.log(`🌐 http://localhost:${PORT}`);
  console.log('Tekan Ctrl+C untuk berhenti');
});
