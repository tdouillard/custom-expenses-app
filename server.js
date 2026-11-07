const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3003;
const PUBLIC = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'state.json');
const SEED_FILE = path.join(DATA_DIR, 'seed.json');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

function readState() {
  const file = fs.existsSync(DATA_FILE) ? DATA_FILE : SEED_FILE;
  return fs.readFileSync(file, 'utf8');
}

function send(res, code, body, type = 'application/json') {
  res.writeHead(code, { 'Content-Type': type });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/state') {
    if (req.method === 'GET') return send(res, 200, readState());
    if (req.method === 'PUT') {
      let body = '';
      req.on('data', (c) => { body += c; if (body.length > 5e6) req.destroy(); });
      req.on('end', () => {
        try {
          const s = JSON.parse(body);
          if (!Array.isArray(s.members) || !Array.isArray(s.expenses)) throw new Error('invalid');
          fs.writeFileSync(DATA_FILE, JSON.stringify(s, null, 2));
          send(res, 200, '{"ok":true}');
        } catch {
          send(res, 400, '{"error":"invalid state"}');
        }
      });
      return;
    }
    return send(res, 405, '{"error":"method not allowed"}');
  }
  const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    return send(res, 404, 'Not found', 'text/plain');
  }
  send(res, 200, fs.readFileSync(file), TYPES[path.extname(file)] || 'application/octet-stream');
});

server.listen(PORT, () => console.log(`Expense split running on http://localhost:${PORT}`));
