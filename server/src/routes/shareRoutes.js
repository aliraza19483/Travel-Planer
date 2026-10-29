const express = require('express');
const router = express.Router();
const shareController = require('../controllers/shareController');

// Public shared trip route (no auth required)
router.get('/trip/:shareToken', shareController.getPublicSharedTrip);

module.exports = router;
