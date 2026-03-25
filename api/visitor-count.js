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
      'unknown-' + Date.now();

    console.log('Processing visitor:', visitorId);

    const isNew = !(await kv.sismember('visitors', visitorId));
    console.log('Is new visitor:', isNew);

    if (isNew) {
      await kv.sadd('visitors', visitorId);
      await kv.incr('count');
      console.log('Added new visitor and incremented count');
    }

    const count = parseInt(await kv.get('count') || '0');
    console.log('Current count:', count);

    res.status(200).json({
      count,
      isNewVisitor: isNew
    });
  } catch (error) {
    console.error('Visitor count error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
}