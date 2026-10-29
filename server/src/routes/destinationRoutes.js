const express = require('express');
const router = express.Router();
const destController = require('../controllers/destinationController');
const reviewController = require('../controllers/reviewController');
const { requireAuth } = require('../middleware/auth');

router.get('/', destController.getAllDestinations);
router.get('/:id', destController.getDestinationById);
router.get('/:id/weather', destController.getDestinationWeather);

// Nested reviews for destination
router.get('/:destinationId/reviews', reviewController.getDestinationReviews);
router.post('/:destinationId/reviews', requireAuth, reviewController.addReview);

module.exports = router;
