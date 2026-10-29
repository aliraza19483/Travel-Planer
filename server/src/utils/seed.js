const bcrypt = require('bcryptjs');
const db = require('../models/db');

function seedDatabase() {
  const currentDb = db.raw.readDb();
  
  // Only seed if empty or explicitly called
  console.log('--- Initializing / Seeding Database ---');

  // 1. Seed Demo User
  let demoUser = db.users.findOne(u => u.email === 'alex@traveler.com');
  if (!demoUser) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('Password123', salt);
    demoUser = db.users.create({
      name: 'Alex Rivera',
      email: 'alex@traveler.com',
      passwordHash: passwordHash,
      role: 'traveler'
    });
    console.log('✓ Created demo user: alex@traveler.com / Password123');
  }

  // 2. Seed Destinations
  const destinationsData = [
    {
      id: 'dest-manali',
      name: 'Manali',
      state: 'Himachal Pradesh',
      country: 'India',
      category: 'Mountains',
      lat: 32.2432,
      lon: 77.1892,
      imageUrl: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80',
      description: 'Nestled in the Beas River valley, Manali is a premier Himalayan hill station famous for snow peaks, adventure sports, Solang Valley, and Rohtang Pass.',
      bestSeason: 'October to June',
      avgRating: 4.8,
      totalReviews: 24
    },
    {
      id: 'dest-goa',
      name: 'Goa',
      state: 'Goa',
      country: 'India',
      category: 'Beaches',
      lat: 15.2993,
      lon: 74.1240,
      imageUrl: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
      description: 'Golden sandy beaches, Portuguese colonial heritage, vibrant flea markets, water sports, and tranquil coastal cafes.',
      bestSeason: 'November to February',
      avgRating: 4.7,
      totalReviews: 38
    },
    {
      id: 'dest-jaipur',
      name: 'Jaipur',
      state: 'Rajasthan',
      country: 'India',
      category: 'Heritage',
      lat: 26.9124,
      lon: 75.7873,
      imageUrl: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=800&q=80',
      description: 'The historic Pink City, home to majestic Amber Fort, Hawa Mahal, City Palace, vibrant handicraft bazaars, and royal culinary delights.',
      bestSeason: 'October to March',
      avgRating: 4.9,
      totalReviews: 45
    },
    {
      id: 'dest-tokyo',
      name: 'Tokyo',
      state: 'Kanto',
      country: 'Japan',
      category: 'Urban',
      lat: 35.6762,
      lon: 139.6503,
      imageUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80',
      description: 'A futuristic metropolis combining neon skyscrapers, ancient Shinto shrines, unmatched gastronomy, bullet trains, and anime culture.',
      bestSeason: 'March to May & September to November',
      avgRating: 4.9,
      totalReviews: 62
    },
    {
      id: 'dest-paris',
      name: 'Paris',
      state: 'Île-de-France',
      country: 'France',
      category: 'Heritage',
      lat: 48.8566,
      lon: 2.3522,
      imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80',
      description: 'The City of Light, renowned for the Eiffel Tower, world-class art museums like the Louvre, boutique fashion, and Seine river cruises.',
      bestSeason: 'April to October',
      avgRating: 4.6,
      totalReviews: 50
    },
    {
      id: 'dest-bali',
      name: 'Bali',
      state: 'Bali',
      country: 'Indonesia',
      category: 'Tropical',
      lat: -8.4095,
      lon: 115.1889,
      imageUrl: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80',
      description: 'The Island of the Gods featuring lush terraced rice fields in Ubud, serene Hindu water temples, volcanic peaks, and pristine surf breaks.',
      bestSeason: 'April to October',
      avgRating: 4.8,
      totalReviews: 41
    }
  ];

  destinationsData.forEach(dest => {
    if (!db.destinations.findById(dest.id)) {
      db.destinations.create(dest);
    }
  });
  console.log(`✓ Ensured ${destinationsData.length} popular destinations`);

  // 3. Seed Sample Trip for Demo User
  let sampleTrip = db.trips.findOne(t => t.userId === demoUser.id && t.title.includes('Manali'));
  if (!sampleTrip) {
    sampleTrip = db.trips.create({
      userId: demoUser.id,
      title: 'Himalayan Escape: Manali Adventure',
      destinationCity: 'Manali',
      destinationId: 'dest-manali',
      startDate: '2026-11-10',
      endDate: '2026-11-13',
      totalBudget: 25000,
      status: 'planned',
      isPublic: true,
      shareToken: 'share-manali-2026'
    });

    // Create 3 Days
    const day1 = db.itineraryDays.create({
      tripId: sampleTrip.id,
      dayNumber: 1,
      date: '2026-11-10',
      notes: 'Arrival & acclimatization in Old Manali'
    });

    const day2 = db.itineraryDays.create({
      tripId: sampleTrip.id,
      dayNumber: 2,
      date: '2026-11-11',
      notes: 'Adventure day at Solang Valley'
    });

    const day3 = db.itineraryDays.create({
      tripId: sampleTrip.id,
      dayNumber: 3,
      date: '2026-11-12',
      notes: 'Heritage & Cafe hopping'
    });

    // Activities Day 1
    db.itineraryItems.create({
      dayId: day1.id,
      title: 'Volvo Bus Arrival at Mall Road',
      startTime: '08:30',
      endTime: '09:30',
      transportMode: 'Bus',
      estimatedCost: 1500,
      placeName: 'Private Bus Stand, Mall Road',
      notes: 'Check-in to resort, freshen up and breakfast',
      sortOrder: 1
    });

    db.itineraryItems.create({
      dayId: day1.id,
      title: 'Visit Hadimba Temple & Cedar Forest',
      startTime: '11:00',
      endTime: '13:00',
      transportMode: 'Walking',
      estimatedCost: 200,
      placeName: 'Hadimba Devi Temple',
      notes: 'Traditional wooden pagoda architecture amidst towering deodar trees',
      sortOrder: 2
    });

    // Activities Day 2
    db.itineraryItems.create({
      dayId: day2.id,
      title: 'Drive to Solang Valley for Paragliding',
      startTime: '09:00',
      endTime: '14:00',
      transportMode: 'Car',
      estimatedCost: 3500,
      placeName: 'Solang Valley Ground',
      notes: 'Book tandem paragliding and zorbing at government-certified counter',
      sortOrder: 1
    });

    // Activities Day 3
    db.itineraryItems.create({
      dayId: day3.id,
      title: 'Jogini Waterfall Trek & Vashisht Hot Springs',
      startTime: '10:00',
      endTime: '14:30',
      transportMode: 'Walking',
      estimatedCost: 500,
      placeName: 'Vashisht Village',
      notes: 'Scenic 3km hike to the multi-tier cascading waterfall',
      sortOrder: 1
    });

    // Expenses
    db.expenses.create({
      tripId: sampleTrip.id,
      category: 'Lodging',
      amount: 7500,
      description: '3 Nights Boutique Riverside Resort',
      expenseDate: '2026-11-10'
    });

    db.expenses.create({
      tripId: sampleTrip.id,
      category: 'Transport',
      amount: 4200,
      description: 'Round-trip Volvo bus + local cab hire',
      expenseDate: '2026-11-10'
    });

    db.expenses.create({
      tripId: sampleTrip.id,
      category: 'Activities',
      amount: 3500,
      description: 'Solang paragliding pass',
      expenseDate: '2026-11-11'
    });

    db.expenses.create({
      tripId: sampleTrip.id,
      category: 'Food',
      amount: 2800,
      description: 'Old Manali cafes and local trout dinner',
      expenseDate: '2026-11-12'
    });

    console.log('✓ Created complete sample trip with itinerary & expenses');
  }

  // 4. Seed Reviews
  const sampleReviews = [
    {
      destinationId: 'dest-manali',
      userId: demoUser.id,
      userName: 'Alex Rivera',
      rating: 5,
      comment: 'Solang Valley paragliding was breathtaking! Make sure to stay in Old Manali for peaceful mountain vibes and live music cafes.',
      createdAt: '2026-10-15T10:00:00.000Z'
    },
    {
      destinationId: 'dest-manali',
      userId: 'user-priya',
      userName: 'Priya Sharma',
      rating: 5,
      comment: 'The morning walk through cedar trails to Hadimba temple is pure bliss. Check weather updates before crossing Atal Tunnel.',
      createdAt: '2026-10-20T14:30:00.000Z'
    },
    {
      destinationId: 'dest-goa',
      userId: demoUser.id,
      userName: 'Alex Rivera',
      rating: 5,
      comment: 'South Goa beaches (Palolem & Agonda) are remarkably pristine. Renting a scooter is the most efficient way to get around.',
      createdAt: '2026-09-12T16:00:00.000Z'
    },
    {
      destinationId: 'dest-jaipur',
      userId: 'user-rohit',
      userName: 'Rohit Verma',
      rating: 5,
      comment: 'Amber Fort light & sound show is a must watch! Plan 3 full days to cover all palaces comfortably.',
      createdAt: '2026-10-01T11:20:00.000Z'
    }
  ];

  sampleReviews.forEach(rev => {
    if (!db.reviews.findOne(r => r.destinationId === rev.destinationId && r.userName === rev.userName)) {
      db.reviews.create(rev);
    }
  });
  console.log('✓ Seeded destination reviews');
  console.log('--- Database Initialization Complete ---');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
