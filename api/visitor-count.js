import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Visitor-ID');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const visitorId =
      req.headers['x-visitor-id'] ||
      req.headers['x-forwarded-for'] ||
      'unknown-' + Math.random().toString(36).substr(2, 9);

    const isNew = !(await kv.sismember('visitors', visitorId));

    if (isNew) {
      await kv.sadd('visitors', visitorId);
      await kv.incr('count');
    }

    const count = parseInt(await kv.get('count') || '0');

    res.status(200).json({
      count,
      isNewVisitor: isNew,
      visitorId: visitorId
    });
  } catch (error) {
    console.error('Visitor count error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}