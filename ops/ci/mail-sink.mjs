import { createServer } from 'http';

const messages = [];

const server = createServer((request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1');
  if (request.method === 'GET' && url.pathname === '/messages') {
    const to = url.searchParams.get('to') || '';
    const rows = messages.filter((item) => item.to === to).map((item) => ({ subject: item.subject, text: item.text }));
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(rows));
    return;
  }
  if (request.method === 'POST') {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        const to = body.to?.[0]?.email || '';
        messages.push({ to, subject: String(body.subject || ''), text: String(body.textContent || '') });
        if (messages.length > 100) messages.shift();
      } catch {
        response.writeHead(400);
        response.end();
        return;
      }
      response.writeHead(201, { 'content-type': 'application/json' });
      response.end('{}');
    });
    return;
  }
  response.writeHead(404);
  response.end();
});

server.listen(8025, '0.0.0.0');
