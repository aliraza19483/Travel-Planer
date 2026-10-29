const db = require('../models/db');

exports.getDestinationReviews = (req, res) => {
  const { destinationId } = req.params;
  const reviews = db.reviews.find(r => r.destinationId === destinationId);
  reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const average = reviews.length > 0
    ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
    : 5.0;

  res.json({
    success: true,
    count: reviews.length,
    averageRating: average,
    reviews
  });
};

exports.addReview = (req, res) => {
  const { destinationId } = req.params;
  const { rating, comment } = req.body;

  if (!rating || Number(rating) < 1 || Number(rating) > 5) {
    return res.status(400).json({
      success: false,
      message: 'Rating must be a whole number between 1 and 5.'
    });
  }

  if (!comment || comment.trim().length < 5) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a helpful review comment (at least 5 characters).'
    });
  }

  const dest = db.destinations.findById(destinationId);
  if (!dest) {
    return res.status(404).json({ success: false, message: 'Destination not found.' });
  }

  const review = db.reviews.create({
    destinationId,
    userId: req.user.id,
    userName: req.user.name,
    rating: Number(rating),
    comment: comment.trim()
  });

  // Re-calculate destination average rating
  const allDestReviews = db.reviews.find(r => r.destinationId === destinationId);
  const avg = Number((allDestReviews.reduce((sum, r) => sum + r.rating, 0) / allDestReviews.length).toFixed(1));
  db.destinations.updateById(destinationId, {
    avgRating: avg,
    totalReviews: allDestReviews.length
  });

  res.status(201).json({
    success: true,
    message: 'Thank you! Your travel review has been published.',
    review
  });
};
