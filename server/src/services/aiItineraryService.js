/**
 * Smart AI & Rule-Based Itinerary Generation Service
 * Generates day-by-day curated schedules based on destination, travel style, and budget tier.
 */

const destinationBlueprints = {
  manali: {
    adventure: [
      { title: 'Solang Valley Paragliding & Zorbing', time: '09:00 - 13:00', mode: 'Car', cost: 3200, place: 'Solang Valley', notes: 'Tandem paragliding flight with certified pilot' },
      { title: 'Trek to Jogini Waterfalls', time: '14:30 - 17:30', mode: 'Walking', cost: 300, place: 'Vashisht Village', notes: '3km scenic pine forest hike' },
      { title: 'Old Manali Cafe Hopping & Live Music', time: '19:00 - 21:30', mode: 'Walking', cost: 1200, place: 'Old Manali Street', notes: 'Wood-fired pizza & river acoustic vibes' },
      { title: 'Rohtang Snow Point Excursion', time: '08:00 - 14:00', mode: 'Car', cost: 4500, place: 'Rohtang Pass (3978m)', notes: 'Snow scooter ride and breathtaking mountain vistas' },
      { title: 'River Rafting in Beas River', time: '15:30 - 18:00', mode: 'Bus', cost: 1800, place: 'Pirdi Rafting Center', notes: 'Grade 3 rapids under guide supervision' },
      { title: 'Hadimba Wooden Temple & Cedar Walk', time: '10:00 - 12:30', mode: 'Walking', cost: 100, place: 'Hadimba Devi Temple', notes: 'Ancient deodar cedar grove dating back to 1553' }
    ],
    relaxation: [
      { title: 'Natural Sulphur Hot Springs Dip', time: '09:30 - 11:30', mode: 'Walking', cost: 150, place: 'Vashisht Temple Springs', notes: 'Rejuvenating mineral waters' },
      { title: 'Riverside Picnic at Van Vihar', time: '12:30 - 15:00', mode: 'Walking', cost: 200, place: 'Van Vihar National Park', notes: 'Peaceful stroll by the river' },
      { title: 'Naggar Castle Art Gallery & Cafe', time: '16:00 - 19:00', mode: 'Car', cost: 800, place: 'Naggar Village', notes: 'Himalayan views and Roerich estate art' }
    ]
  },
  goa: {
    adventure: [
      { title: 'Scuba Diving & Jet Ski at Grand Island', time: '08:30 - 13:30', mode: 'Ferry', cost: 3500, place: 'Grand Island', notes: 'Underwater marine life & coral exploration' },
      { title: 'Dudhsagar Waterfalls Jeep Safari', time: '14:30 - 18:30', mode: 'Car', cost: 2200, place: 'Bhagwan Mahavir Sanctuary', notes: 'Off-road jungle trek through streams' },
      { title: 'Sunset Kayaking in Backwaters', time: '17:00 - 19:00', mode: 'Walking', cost: 900, place: 'Chapora River', notes: 'Serene mangrove ecosystem' }
    ],
    relaxation: [
      { title: 'Morning Yoga on Palolem Beach', time: '07:30 - 09:00', mode: 'Walking', cost: 400, place: 'South Goa Sands', notes: 'Soothing waves and guided meditation' },
      { title: 'Fontainhas Latin Quarter Heritage Walk', time: '11:00 - 14:00', mode: 'Walking', cost: 300, place: 'Panaji', notes: 'Vibrant pastel Portuguese colonial villas' },
      { title: 'Sunset Beach Shack Seafood Dinner', time: '18:30 - 21:00', mode: 'Car', cost: 1500, place: 'Anjuna Beach', notes: 'Fresh catch cooked in Goan peri-peri' }
    ]
  },
  jaipur: {
    heritage: [
      { title: 'Sunrise Tour of Amber Fort', time: '08:00 - 12:00', mode: 'Car', cost: 600, place: 'Amer', notes: 'Explore Sheesh Mahal mirror palace' },
      { title: 'City Palace & Jantar Mantar Observatory', time: '13:30 - 16:30', mode: 'Car', cost: 700, place: 'Old City', notes: 'World heritage architectural sundial' },
      { title: 'Photography at Hawa Mahal & Johari Bazaar', time: '17:00 - 19:30', mode: 'Walking', cost: 200, place: 'Palace of Winds', notes: '953 ornate lattice windows' }
    ]
  }
};

function generateSmartItineraryForDays(city, totalDays, travelStyle = 'adventure', budgetMultiplier = 1) {
  const cLower = (city || '').toLowerCase();
  let pool = [];

  // Match curated blueprint if available
  for (const [key, styles] of Object.entries(destinationBlueprints)) {
    if (cLower.includes(key)) {
      pool = styles[travelStyle.toLowerCase()] || Object.values(styles)[0] || [];
      break;
    }
  }

  // Fallback generic heuristic generator if destination isn't pre-mapped
  if (pool.length === 0) {
    pool = [
      { title: `Explore Central Historic District of ${city}`, time: '09:00 - 12:00', mode: 'Walking', cost: 300, place: `${city} City Center`, notes: 'Iconic architecture and landmark photography' },
      { title: `Authentic Local Cuisine Tasting Tour`, time: '12:30 - 14:30', mode: 'Walking', cost: 800, place: `Famous Old Market, ${city}`, notes: 'Sample signature dishes and local street treats' },
      { title: `Scenic Viewpoint & Sunset Overlook`, time: '16:00 - 18:30', mode: 'Car', cost: 600, place: `${city} Panorama Point`, notes: 'Golden hour twilight skyline views' },
      { title: `Cultural Arts Center & Craft Bazaar`, time: '10:00 - 13:00', mode: 'Bus', cost: 400, place: `${city} Artisan Quarter`, notes: 'Shop hand-crafted souvenirs and local textiles' },
      { title: `Riverside / Coastal Nature Promenade`, time: '15:00 - 18:00', mode: 'Walking', cost: 200, place: `${city} Promenade`, notes: 'Relaxing afternoon walk along waterfront' },
      { title: `Traditional Dinner with Folk Music`, time: '19:30 - 22:00', mode: 'Car', cost: 1400, place: `${city} Heritage Dining`, notes: 'Live regional music and traditional feast' }
    ];
  }

  const daysPlan = [];
  let itemIndex = 0;

  for (let d = 1; d <= totalDays; d++) {
    const dayActivities = [];
    const countForDay = 2 + (d % 2); // 2 or 3 activities per day

    for (let k = 0; k < countForDay; k++) {
      const template = pool[itemIndex % pool.length];
      const times = k === 0 
        ? { start: '09:00', end: '12:30' } 
        : k === 1 
          ? { start: '14:00', end: '17:00' } 
          : { start: '18:30', end: '21:00' };

      dayActivities.push({
        title: template.title,
        startTime: times.start,
        endTime: times.end,
        transportMode: template.mode || 'Walking',
        estimatedCost: Math.round((template.cost || 500) * budgetMultiplier),
        placeName: template.place,
        notes: template.notes,
        sortOrder: k + 1
      });

      itemIndex++;
    }

    daysPlan.push({
      dayNumber: d,
      activities: dayActivities
    });
  }

  return daysPlan;
}

// Generate weather-driven packing checklist
function generatePackingChecklist(weather, daysCount = 3) {
  const checklist = {
    essentials: [
      { name: 'Government ID / Passport & Visa', packed: false },
      { name: 'Flight / Train / Hotel Reservation confirmation', packed: false },
      { name: 'Credit / Debit cards & Emergency Cash', packed: false },
      { name: 'Personal medication & first-aid kit', packed: false }
    ],
    clothing: [],
    electronics: [
      { name: 'Smartphone & Charger', packed: false },
      { name: 'High-capacity Power Bank (10,000+ mAh)', packed: false },
      { name: 'Universal travel plug adapter', packed: false },
      { name: 'Headphones / Earbuds', packed: false }
    ],
    destinationSpecific: []
  };

  const temp = weather?.current?.temperature || 22;
  const condition = (weather?.current?.condition || '').toLowerCase();

  // Climate aware clothing
  if (temp <= 14) {
    checklist.clothing.push(
      { name: 'Heavy thermal innerwear (top & bottom)', packed: false },
      { name: 'Windproof winter jacket / fleece pullover', packed: false },
      { name: 'Woolen socks & insulated walking boots', packed: false },
      { name: 'Gloves, woolen beanie & muffler', packed: false }
    );
    checklist.destinationSpecific.push(
      { name: 'Cold cream, lip balm & skin moisturizer', packed: false },
      { name: 'Thermos flask for hot water/tea', packed: false }
    );
  } else if (temp >= 28) {
    checklist.clothing.push(
      { name: 'Breathable linen / lightweight cotton shirts', packed: false },
      { name: 'Comfortable shorts & beachwear / swimwear', packed: false },
      { name: 'Breathable sneakers & flip-flops', packed: false },
      { name: 'Sun hat or baseball cap', packed: false }
    );
    checklist.destinationSpecific.push(
      { name: 'High-SPF Sunscreen (SPF 50+ Broad Spectrum)', packed: false },
      { name: 'Polarized UV400 sunglasses', packed: false },
      { name: 'Electrolyte hydration powders (ORS)', packed: false }
    );
  } else {
    checklist.clothing.push(
      { name: 'Comfortable casual t-shirts and jeans', packed: false },
      { name: 'Light jacket or cardigan for evening breeze', packed: false },
      { name: 'Walking shoes for sightseeing', packed: false }
    );
  }

  if (condition.includes('rain') || condition.includes('drizzle') || condition.includes('cloud')) {
    checklist.destinationSpecific.push(
      { name: 'Compact travel umbrella or raincoat', packed: false },
      { name: 'Waterproof pouch for phone & passport', packed: false }
    );
  }

  return checklist;
}

module.exports = {
  generateSmartItineraryForDays,
  generatePackingChecklist
};
