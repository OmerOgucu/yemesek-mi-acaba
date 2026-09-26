export function nginxParts(env) {
  const apiPort = digits(env.API_BIND_PORT, '3001');
  const webPort = digits(env.WEB_BIND_PORT, '3000');
  const apiHost = safeHost(env.API_HOST, 'api.internal');
  const webHost = safeHost(env.WEB_HOST, 'web.internal');
  const http = `# Yemesek upstreams. 80/443 dinlemez. http bağlamına eklenir.
upstream yemesek_api_local { server 127.0.0.1:${apiPort}; }
upstream yemesek_web_local { server 127.0.0.1:${webPort}; }
`;
  const locations = `# Yemesek locations. server bağlamına eklenir. listen yoktur.
location /yemesek-api/ {
  proxy_pass http://yemesek_api_local/;
  proxy_set_header Host ${apiHost};
  proxy_set_header X-Forwarded-For $remote_addr;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_read_timeout 30s;
}
location / {
  proxy_pass http://yemesek_web_local;
  proxy_set_header Host ${webHost};
  proxy_set_header X-Forwarded-For $remote_addr;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_read_timeout 30s;
}
`;
  return { http, locations };
}

export function nginxTestConfig(parts) {
  return `events {}
http {
  ${parts.http}
  server {
    listen 127.0.0.1:18080;
    server_name yemesek.test;
    ${parts.locations.replace(/\n/g, '\n    ')}
  }
}
`;
}

function digits(value, fallback) {
  const text = String(value || fallback);
  if (!/^\d{2,5}$/.test(text)) return fallback;
  return text;
}

function safeHost(value, fallback) {
  const text = String(value || fallback);
  if (!/^[A-Za-z0-9.-]+$/.test(text)) return fallback;
  return text;
}
