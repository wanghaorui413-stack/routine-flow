import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = join(import.meta.dirname, 'dist');
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const file = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (!['index.html', 'styles.css', 'app.js'].includes(file)) {
    response.writeHead(404).end('Not found');
    return;
  }
  try {
    const body = await readFile(join(root, file));
    response.writeHead(200, { 'Content-Type': mime[file.slice(file.lastIndexOf('.'))] });
    response.end(body);
  } catch (_) {
    response.writeHead(500).end('Preview error');
  }
}).listen(4173, '127.0.0.1', () => console.log('Local: http://127.0.0.1:4173'));

