const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

// CREATE
router.post('/register', authController.register);

// READ
router.post('/login', authController.login);
router.get('/me', requireAuth, authController.getMe);
router.get('/profile', requireAuth, authController.getProfile);
router.get('/users', authController.getAllUsers);

// UPDATE
router.put('/profile', requireAuth, authController.updateProfile);
router.put('/change-password', requireAuth, authController.changePassword);

// DELETE
router.delete('/account', requireAuth, authController.deleteAccount);

module.exports = router;

