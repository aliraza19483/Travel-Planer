const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const budgetController = require('../controllers/budgetController');
const shareController = require('../controllers/shareController');
const { requireAuth } = require('../middleware/auth');

// All trip routes require authentication
router.use(requireAuth);

// Trips core CRUD
router.get('/', tripController.getMyTrips);
router.post('/', tripController.createTrip);
router.get('/:id', tripController.getTripDetails);
router.put('/:id', tripController.updateTrip);
router.delete('/:id', tripController.deleteTrip);

// Dynamic Itinerary Items (Activities & Custom Routes)
router.post('/:id/days/:dayId/items', tripController.addItineraryItem);
router.put('/:id/items/:itemId', tripController.updateItineraryItem);
router.delete('/:id/items/:itemId', tripController.deleteItineraryItem);
router.put('/:id/days/:dayId/reorder', tripController.reorderItineraryItems);

// Budget & Expenses
router.get('/:id/expenses', budgetController.getTripBudgetSummary);
router.post('/:id/expenses', budgetController.addExpense);
router.delete('/:id/expenses/:expId', budgetController.deleteExpense);

// Sharing toggle
router.post('/:id/share', shareController.toggleShareTrip);

// AI Itinerary Auto-Generator & Packing Checklist
router.post('/:id/auto-generate', tripController.autoGenerateItinerary);
router.get('/:id/packing-checklist', tripController.getPackingChecklist);

module.exports = router;

