const notFound = (req, res) => res.status(404).render('error', {
  title: 'Page Not Found',
  message: 'The page you are looking for does not exist.'
});

const errorHandler = (error, req, res, next) => {
  console.error(error.stack || error);
  if (res.headersSent) return next(error);
  if (req.path.startsWith('/api/')) return res.status(500).json({ error: 'Internal server error.' });
  res.status(500).render('error', {
    title: 'Something Went Wrong',
    message: 'Please try again in a moment.'
  });
};

module.exports = { notFound, errorHandler };
