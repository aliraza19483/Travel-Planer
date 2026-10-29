const db = require('../models/db');
const weatherService = require('../services/weatherService');

// Helper to compute number of days between two dates (inclusive)
function calculateDays(startDateStr, endDateStr) {
  try {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 && diffDays <= 30 ? diffDays : 1;
  } catch (_) {
    return 1;
  }
}

exports.getMyTrips = (req, res) => {
  const userTrips = db.trips.find(t => t.userId === req.user.id);
  
  // Enrich with item count and expense summary
  const enriched = userTrips.map(trip => {
    const days = db.itineraryDays.find(d => d.tripId === trip.id);
    const dayIds = days.map(d => d.id);
    const items = db.itineraryItems.find(i => dayIds.includes(i.dayId));
    const expenses = db.expenses.find(e => e.tripId === trip.id);
    const totalSpent = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    return {
      ...trip,
      totalDays: days.length,
      totalActivities: items.length,
      totalSpent: totalSpent,
      budgetRemaining: Math.max(0, (trip.totalBudget || 0) - totalSpent),
      budgetUtilizationPercent: trip.totalBudget > 0 ? Math.round((totalSpent / trip.totalBudget) * 100) : 0
    };
  });

  res.json({
    success: true,
    count: enriched.length,
    trips: enriched
  });
};

exports.createTrip = (req, res) => {
  const { title, destinationCity, destinationId, startDate, endDate, totalBudget } = req.body;

  if (!title || !destinationCity || !startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: 'Title, destination city, start date, and end date are required.'
    });
  }

  const shareToken = 'tr-' + Math.random().toString(36).substring(2, 10);

  const newTrip = db.trips.create({
    userId: req.user.id,
    title: title.trim(),
    destinationCity: destinationCity.trim(),
    destinationId: destinationId || null,
    startDate,
    endDate,
    totalBudget: Number(totalBudget) || 0,
    status: 'planned',
    isPublic: false,
    shareToken
  });

  // Automatically generate day slots based on dates
  const dayCount = calculateDays(startDate, endDate);
  const startObj = new Date(startDate);

  for (let i = 0; i < dayCount; i++) {
    const dayDate = new Date(startObj.getTime() + i * 24 * 60 * 60 * 1000);
    db.itineraryDays.create({
      tripId: newTrip.id,
      dayNumber: i + 1,
      date: dayDate.toISOString().split('T')[0],
      notes: `Day ${i + 1} itinerary for ${destinationCity}`
    });
  }

  res.status(201).json({
    success: true,
    message: `Trip created successfully with ${dayCount} itinerary days.`,
    trip: newTrip
  });
};

exports.getTripDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const trip = db.trips.findById(id);

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found.' });
    }

    // Auth check: only owner or public access
    if (trip.userId !== req.user.id && !trip.isPublic) {
      return res.status(403).json({ success: false, message: 'Access denied: You do not own this trip.' });
    }

    const days = db.itineraryDays.find(d => d.tripId === trip.id);
    days.sort((a, b) => a.dayNumber - b.dayNumber);

    // Attach items to each day
    const daysWithItems = days.map(day => {
      const items = db.itineraryItems.find(i => i.dayId === day.id);
      items.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      return {
        ...day,
        items
      };
    });

    const expenses = db.expenses.find(e => e.tripId === trip.id);
    const totalSpent = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // Weather forecast for trip's destination
    let weather = null;
    try {
      let dest = trip.destinationId ? db.destinations.findById(trip.destinationId) : null;
      if (!dest) {
        dest = db.destinations.findOne(d => d.name.toLowerCase() === trip.destinationCity.toLowerCase());
      }
      weather = await weatherService.getDestinationWeather(
        trip.destinationCity,
        dest ? dest.lat : 0,
        dest ? dest.lon : 0
      );
    } catch (_) {
      // Optional weather failure should not break trip retrieval
    }

    res.json({
      success: true,
      trip: {
        ...trip,
        totalSpent,
        budgetRemaining: Math.max(0, (trip.totalBudget || 0) - totalSpent),
        days: daysWithItems,
        expenses,
        weather
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.updateTrip = (req, res) => {
  const { id } = req.params;
  const trip = db.trips.findById(id);

  if (!trip) {
    return res.status(404).json({ success: false, message: 'Trip not found.' });
  }

  if (trip.userId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  const { title, destinationCity, startDate, endDate, totalBudget, status, isPublic } = req.body;

  const updated = db.trips.updateById(id, {
    ...(title && { title: title.trim() }),
    ...(destinationCity && { destinationCity: destinationCity.trim() }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    ...(totalBudget !== undefined && { totalBudget: Number(totalBudget) }),
    ...(status && { status }),
    ...(isPublic !== undefined && { isPublic: Boolean(isPublic) })
  });

  res.json({
    success: true,
    message: 'Trip updated successfully.',
    trip: updated
  });
};

exports.deleteTrip = (req, res) => {
  const { id } = req.params;
  const trip = db.trips.findById(id);

  if (!trip) {
    return res.status(404).json({ success: false, message: 'Trip not found.' });
  }

  if (trip.userId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  // Cascading deletes
  const days = db.itineraryDays.find(d => d.tripId === trip.id);
  const dayIds = days.map(d => d.id);

  db.itineraryItems.deleteMany(item => dayIds.includes(item.dayId));
  db.itineraryDays.deleteMany(d => d.tripId === trip.id);
  db.expenses.deleteMany(e => e.tripId === trip.id);
  db.trips.deleteById(trip.id);

  res.json({
    success: true,
    message: 'Trip and associated itinerary records deleted successfully.'
  });
};

// --- Itinerary Items (Activities & Custom Routes) ---

exports.addItineraryItem = (req, res) => {
  const { id, dayId } = req.params;
  const trip = db.trips.findById(id);

  if (!trip || trip.userId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Unauthorized or trip not found.' });
  }

  const day = db.itineraryDays.findById(dayId);
  if (!day || day.tripId !== trip.id) {
    return res.status(404).json({ success: false, message: 'Itinerary day not found in this trip.' });
  }

  const { title, startTime, endTime, transportMode, estimatedCost, placeName, notes } = req.body;

  if (!title) {
    return res.status(400).json({ success: false, message: 'Activity title is required.' });
  }

  const existingItems = db.itineraryItems.find(i => i.dayId === day.id);
  const nextSortOrder = existingItems.length + 1;

  const newItem = db.itineraryItems.create({
    dayId: day.id,
    title: title.trim(),
    startTime: startTime || '09:00',
    endTime: endTime || '11:00',
    transportMode: transportMode || 'Walking', // Walking, Bus, Train, Flight, Car, Ferry
    estimatedCost: Number(estimatedCost) || 0,
    placeName: placeName ? placeName.trim() : '',
    notes: notes ? notes.trim() : '',
    sortOrder: nextSortOrder
  });

  res.status(201).json({
    success: true,
    message: 'Itinerary activity added.',
    item: newItem
  });
};

exports.updateItineraryItem = (req, res) => {
  const { id, itemId } = req.params;
  const trip = db.trips.findById(id);

  if (!trip || trip.userId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  const item = db.itineraryItems.findById(itemId);
  if (!item) {
    return res.status(404).json({ success: false, message: 'Itinerary item not found.' });
  }

  const { title, startTime, endTime, transportMode, estimatedCost, placeName, notes, sortOrder } = req.body;

  const updated = db.itineraryItems.updateById(itemId, {
    ...(title && { title: title.trim() }),
    ...(startTime && { startTime }),
    ...(endTime && { endTime }),
    ...(transportMode && { transportMode }),
    ...(estimatedCost !== undefined && { estimatedCost: Number(estimatedCost) }),
    ...(placeName !== undefined && { placeName: placeName.trim() }),
    ...(notes !== undefined && { notes: notes.trim() }),
    ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) })
  });

  res.json({
    success: true,
    message: 'Itinerary item updated.',
    item: updated
  });
};

exports.deleteItineraryItem = (req, res) => {
  const { id, itemId } = req.params;
  const trip = db.trips.findById(id);

  if (!trip || trip.userId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  const deleted = db.itineraryItems.deleteById(itemId);
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Item not found.' });
  }

  res.json({
    success: true,
    message: 'Itinerary item deleted.'
  });
};

exports.reorderItineraryItems = (req, res) => {
  const { id, dayId } = req.params;
  const { itemIds } = req.body; // Array of item IDs in desired order

  const trip = db.trips.findById(id);
  if (!trip || trip.userId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  if (!Array.isArray(itemIds)) {
    return res.status(400).json({ success: false, message: 'itemIds array required.' });
  }

  itemIds.forEach((itemId, index) => {
    db.itineraryItems.updateById(itemId, { sortOrder: index + 1 });
  });

  const updatedItems = db.itineraryItems.find(i => i.dayId === dayId);
  updatedItems.sort((a, b) => a.sortOrder - b.sortOrder);

  res.json({
    success: true,
    message: 'Route order updated successfully.',
    items: updatedItems
  });
};

const aiService = require('../services/aiItineraryService');

// AI / Smart Itinerary Auto-Generator
exports.autoGenerateItinerary = (req, res) => {
  const { id } = req.params;
  const { travelStyle = 'Adventure', budgetTier = 'moderate' } = req.body;

  const trip = db.trips.findById(id);
  if (!trip || trip.userId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  const days = db.itineraryDays.find(d => d.tripId === trip.id);
  days.sort((a, b) => a.dayNumber - b.dayNumber);

  if (days.length === 0) {
    return res.status(400).json({ success: false, message: 'Trip has no itinerary days to generate for.' });
  }

  const multiplier = budgetTier === 'budget' ? 0.7 : budgetTier === 'luxury' ? 1.8 : 1.0;
  const plan = aiService.generateSmartItineraryForDays(trip.destinationCity, days.length, travelStyle, multiplier);

  // Clear existing items for clean regeneration
  const dayIds = days.map(d => d.id);
  db.itineraryItems.deleteMany(item => dayIds.includes(item.dayId));

  // Populate new items
  plan.forEach(dayPlan => {
    const matchedDay = days.find(d => d.dayNumber === dayPlan.dayNumber);
    if (matchedDay) {
      dayPlan.activities.forEach(act => {
        db.itineraryItems.create({
          dayId: matchedDay.id,
          title: act.title,
          startTime: act.startTime,
          endTime: act.endTime,
          transportMode: act.transportMode,
          estimatedCost: act.estimatedCost,
          placeName: act.placeName,
          notes: act.notes,
          sortOrder: act.sortOrder
        });
      });
    }
  });

  res.json({
    success: true,
    message: `AI generated ${travelStyle} itinerary for ${days.length} days in ${trip.destinationCity}!`,
    daysGenerated: days.length
  });
};

// Weather-driven Packing Checklist
exports.getPackingChecklist = async (req, res, next) => {
  try {
    const { id } = req.params;
    const trip = db.trips.findById(id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found.' });

    let dest = trip.destinationId ? db.destinations.findById(trip.destinationId) : null;
    if (!dest) {
      dest = db.destinations.findOne(d => d.name.toLowerCase() === trip.destinationCity.toLowerCase());
    }

    const weather = await weatherService.getDestinationWeather(
      trip.destinationCity,
      dest ? dest.lat : 0,
      dest ? dest.lon : 0
    );

    const checklist = aiService.generatePackingChecklist(weather);

    res.json({
      success: true,
      city: trip.destinationCity,
      weather: weather.current,
      checklist
    });
  } catch (err) {
    next(err);
  }
};

