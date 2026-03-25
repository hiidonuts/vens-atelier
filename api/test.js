// Test endpoint to verify Vercel deployment
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.json({ 
    message: 'API is working',
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.url
  });
}
