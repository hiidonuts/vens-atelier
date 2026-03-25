import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  try {
    const visitorId =
      req.headers['x-visitor-id'] ||
      req.headers['x-forwarded-for'] ||
      'unknown';

    const isNew = !(await kv.sismember('visitors', visitorId));

    if (isNew) {
      await kv.sadd('visitors', visitorId);
      await kv.incr('count');
    }

    const count = (await kv.get('count')) || 0;

    res.status(200).json({
      count,
      isNewVisitor: isNew
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
}