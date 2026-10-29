const env = require('../config/env');
const https = require('https');

// 30-minute in-memory cache for weather data
const weatherCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000;

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Generate high-fidelity realistic weather model if no API key or offline
function generateSimulatedWeather(city, lat, lon) {
  const cLower = (city || '').toLowerCase();
  
  let baseTemp = 24;
  let condition = 'Partly Cloudy';
  let icon = '⛅';
  let humidity = 60;
  let windSpeed = 12;
  let advisory = 'Pleasant travel conditions. Ideal for daytime sightseeing.';

  if (cLower.includes('manali') || cLower.includes('ladakh') || cLower.includes('shimla')) {
    baseTemp = 11;
    condition = 'Crisp Mountain Breeze';
    icon = '🏔️';
    humidity = 48;
    windSpeed = 14;
    advisory = 'Chilly evenings expected. Pack layered thermal wear, gloves, and windcheater.';
  } else if (cLower.includes('goa') || cLower.includes('bali') || cLower.includes('phuket')) {
    baseTemp = 29;
    condition = 'Sunny Coastal Warmth';
    icon = '☀️';
    humidity = 76;
    windSpeed = 16;
    advisory = 'Tropical sunshine. Carry high-SPF sunscreen, sunglasses, and stay hydrated.';
  } else if (cLower.includes('jaipur') || cLower.includes('dubai') || cLower.includes('cairo')) {
    baseTemp = 31;
    condition = 'Clear & Dry';
    icon = '🌞';
    humidity = 35;
    windSpeed = 10;
    advisory = 'Bright sunny weather. Early mornings and late afternoons are best for fort walks.';
  } else if (cLower.includes('tokyo') || cLower.includes('paris') || cLower.includes('london')) {
    baseTemp = 17;
    condition = 'Mild & Clear';
    icon = '🌤️';
    humidity = 55;
    windSpeed = 11;
    advisory = 'Excellent city exploration conditions. Light jacket recommended for twilight hours.';
  }

  // 5-day forecast
  const forecast = [];
  const now = new Date();
  for (let i = 0; i < 5; i++) {
    const fDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const dayVariation = (i % 2 === 0 ? 1 : -1) * (i * 1.2);
    forecast.push({
      date: fDate.toISOString().split('T')[0],
      dayName: fDate.toLocaleDateString('en-US', { weekday: 'short' }),
      tempMax: Math.round(baseTemp + 2 + dayVariation),
      tempMin: Math.round(baseTemp - 5 + dayVariation),
      condition: i === 2 ? 'Scattered Clouds' : condition,
      icon: icon,
      precipitationProb: i === 2 ? '20%' : '5%'
    });
  }

  return {
    source: 'simulated-engine',
    city: city,
    coordinates: { lat, lon },
    current: {
      temperature: baseTemp,
      feelsLike: baseTemp + 1,
      humidity: `${humidity}%`,
      wind: `${windSpeed} km/h`,
      condition: condition,
      icon: icon,
      updatedAt: new Date().toISOString()
    },
    travelAdvisory: advisory,
    forecast: forecast
  };
}

async function getDestinationWeather(city, lat = 0, lon = 0) {
  const cacheKey = `${(city || '').toLowerCase()}_${lat}_${lon}`;
  const cached = weatherCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return { ...cached.data, cached: true };
  }

  // If OpenWeatherMap API key is provided, attempt live call
  if (env.OPENWEATHER_API_KEY) {
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${env.OPENWEATHER_API_KEY}`;
      const res = await fetchJson(url);
      
      if (res.status === 200 && res.data) {
        const d = res.data;
        const liveResult = {
          source: 'open-weather-map-live',
          city: d.name,
          coordinates: { lat: d.coord.lat, lon: d.coord.lon },
          current: {
            temperature: Math.round(d.main.temp),
            feelsLike: Math.round(d.main.feels_like),
            humidity: `${d.main.humidity}%`,
            wind: `${Math.round(d.wind.speed * 3.6)} km/h`,
            condition: d.weather[0]?.main || 'Clear',
            iconUrl: `https://openweathermap.org/img/wn/${d.weather[0]?.icon}@2x.png`,
            updatedAt: new Date().toISOString()
          },
          travelAdvisory: `Live weather reports ${d.weather[0]?.description || 'clear skies'}. Plan routes accordingly.`,
          forecast: [] // Live forecast can be expanded with OWM 5-day
        };
        weatherCache.set(cacheKey, { timestamp: Date.now(), data: liveResult });
        return liveResult;
      }
    } catch (err) {
      console.warn('OpenWeatherMap API request failed, falling back to simulated engine:', err.message);
    }
  }

  // Fallback to high-quality simulation
  const result = generateSimulatedWeather(city, lat, lon);
  weatherCache.set(cacheKey, { timestamp: Date.now(), data: result });
  return result;
}

module.exports = { getDestinationWeather };
