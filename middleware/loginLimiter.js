const attempts = new Map();

const loginLimiter = (req, res, next) => {
  const now = Date.now();
  const key = req.ip;
  const entry = attempts.get(key) || { count: 0, resetAt: now + 15 * 60 * 1000 };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + 15 * 60 * 1000;
  }
  entry.count += 1;
  attempts.set(key, entry);
  if (entry.count > 20) {
    return res.status(429).render('error', {
      title: 'Too Many Attempts',
      message: 'Please wait 15 minutes before trying again.'
    });
  }
  next();
};

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of attempts) {
    if (now > entry.resetAt) attempts.delete(key);
  }
}, 15 * 60 * 1000).unref();

module.exports = { loginLimiter };
