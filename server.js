// Tiny zero-dependency Node server for the journal.
// Run:  node server.js   (then open http://localhost:3000)

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'entries.json');
const HTML_FILE = path.join(ROOT, 'index.html');

function readEntries() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function writeEntries(entries) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(entries, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function send(res, status, body, type) {
  res.writeHead(status, {
    'Content-Type': type || 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 1e6) { req.destroy(); reject(new Error('payload too large')); }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function isValidEntry(e) {
  return e
    && typeof e.id === 'string'
    && typeof e.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.date)
    && typeof e.time === 'string' && /^\d{2}:\d{2}$/.test(e.time)
    && typeof e.text === 'string' && e.text.length > 0 && e.text.length <= 5000
    && typeof e.ts === 'number';
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const pathname = url.pathname;

  if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
    fs.readFile(HTML_FILE, (err, html) => {
      if (err) return send(res, 500, 'Could not read index.html', 'text/plain');
      send(res, 200, html, 'text/html; charset=utf-8');
    });
    return;
  }

  if (req.method === 'GET' && pathname === '/entries') {
    return send(res, 200, JSON.stringify(readEntries()));
  }

  if (req.method === 'POST' && pathname === '/entries') {
    try {
      const body = await readBody(req);
      const entry = JSON.parse(body);
      if (!isValidEntry(entry)) return send(res, 400, JSON.stringify({ error: 'invalid entry' }));
      const entries = readEntries();
      if (entries.some(e => e.id === entry.id)) return send(res, 409, JSON.stringify({ error: 'duplicate id' }));
      entries.push(entry);
      writeEntries(entries);
      return send(res, 201, JSON.stringify(entry));
    } catch (e) {
      return send(res, 400, JSON.stringify({ error: 'bad request' }));
    }
  }

  send(res, 404, JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, () => {
  console.log('Journal running at http://localhost:' + PORT);
  console.log('Entries file: ' + DATA_FILE);
});
