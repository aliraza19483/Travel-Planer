const db = require('../models/db');
const weatherService = require('../services/weatherService');

exports.toggleShareTrip = (req, res) => {
  const { id } = req.params;
  const trip = db.trips.findById(id);

  if (!trip || trip.userId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  const { isPublic } = req.body;
  const updatedIsPublic = isPublic !== undefined ? Boolean(isPublic) : !trip.isPublic;

  let shareToken = trip.shareToken;
  if (!shareToken) {
    shareToken = 'tr-' + Math.random().toString(36).substring(2, 10);
  }

  const updated = db.trips.updateById(id, {
    isPublic: updatedIsPublic,
    shareToken
  });

  res.json({
    success: true,
    message: updatedIsPublic ? 'Trip is now public and shareable.' : 'Trip sharing set to private.',
    isPublic: updatedIsPublic,
    shareToken: updated.shareToken,
    shareUrl: `/shared/trip/${updated.shareToken}`
  });
};

exports.getPublicSharedTrip = async (req, res, next) => {
  try {
    const { shareToken } = req.params;
    const trip = db.trips.findOne(t => t.shareToken === shareToken);

    if (!trip || !trip.isPublic) {
      return res.status(404).json({
        success: false,
        message: 'This shared itinerary does not exist or has been made private by the creator.'
      });
    }

    const owner = db.users.findById(trip.userId);
    const days = db.itineraryDays.find(d => d.tripId === trip.id);
    days.sort((a, b) => a.dayNumber - b.dayNumber);

    const daysWithItems = days.map(day => {
      const items = db.itineraryItems.find(i => i.dayId === day.id);
      items.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      return { ...day, items };
    });

    // Weather forecast
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
    } catch (_) {}

    res.json({
      success: true,
      trip: {
        id: trip.id,
        title: trip.title,
        destinationCity: trip.destinationCity,
        startDate: trip.startDate,
        endDate: trip.endDate,
        totalBudget: trip.totalBudget,
        createdBy: owner ? owner.name : 'Adventurous Traveler',
        days: daysWithItems,
        weather
      }
    });
  } catch (err) {
    next(err);
  }
};
