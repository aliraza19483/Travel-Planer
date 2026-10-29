const db = require('../models/db');
const weatherService = require('../services/weatherService');

exports.getAllDestinations = (req, res) => {
  const { search, category } = req.query;
  let results = db.destinations.getAll();

  if (category && category !== 'All') {
    results = results.filter(d => d.category?.toLowerCase() === category.toLowerCase());
  }

  if (search) {
    const q = search.toLowerCase();
    results = results.filter(d =>
      d.name.toLowerCase().includes(q) ||
      (d.state && d.state.toLowerCase().includes(q)) ||
      d.country.toLowerCase().includes(q)
    );
  }

  // Calculate live review count and average rating
  const enriched = results.map(dest => {
    const reviews = db.reviews.find(r => r.destinationId === dest.id);
    const avg = reviews.length > 0
      ? Number((reviews.reduce((acc, cur) => acc + cur.rating, 0) / reviews.length).toFixed(1))
      : dest.avgRating || 5.0;
    return {
      ...dest,
      totalReviews: reviews.length || dest.totalReviews || 0,
      avgRating: avg
    };
  });

  res.json({
    success: true,
    count: enriched.length,
    destinations: enriched
  });
};

exports.getDestinationById = (req, res) => {
  const { id } = req.params;
  const dest = db.destinations.findById(id);

  if (!dest) {
    return res.status(404).json({
      success: false,
      message: 'Destination not found.'
    });
  }

  const reviews = db.reviews.find(r => r.destinationId === dest.id);
  const avg = reviews.length > 0
    ? Number((reviews.reduce((acc, cur) => acc + cur.rating, 0) / reviews.length).toFixed(1))
    : dest.avgRating || 5.0;

  res.json({
    success: true,
    destination: {
      ...dest,
      avgRating: avg,
      totalReviews: reviews.length,
      reviews
    }
  });
};

exports.getDestinationWeather = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dest = db.destinations.findById(id);

    const city = dest ? dest.name : id;
    const lat = dest ? dest.lat : 0;
    const lon = dest ? dest.lon : 0;

    const weather = await weatherService.getDestinationWeather(city, lat, lon);

    res.json({
      success: true,
      destinationName: city,
      weather
    });
  } catch (err) {
    next(err);
  }
};
