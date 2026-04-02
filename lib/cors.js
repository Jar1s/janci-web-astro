// CORS configuration utility

const ALLOWED_ORIGINS = [
  'https://www.kontrolavozidiel.sk',
  'https://kontrolavozidiel.sk',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173'
];

export function getCorsHeaders(origin) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400' // 24 hours
  };
}

export function handleCorsPreflight(req, res) {
  const headers = getCorsHeaders(req.headers.origin);
  Object.keys(headers).forEach(key => {
    res.setHeader(key, headers[key]);
  });
  return res.status(200).end();
}

