import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Visitor-ID');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const visitorId = req.headers['x-visitor-id'] || req.ip;
    const isNew = !(await kv.sismember('visitors', visitorId));

    if (isNew) {
      await kv.sadd('visitors', visitorId);
      const currentCount = parseInt(await kv.get('count') || '0');
      await kv.set('count', (currentCount + 1).toString());
    }

    const count = parseInt(await kv.get('count') || '0');

    res.json({ count, isNewVisitor: isNew });
  } catch (error) {
    console.error('Visitor count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
