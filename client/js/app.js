/**
 * WanderPlan — Application Controller
 * Handles UI interactions, state synchronization, dynamic rendering, and modals
 */

const AppState = {
  user: null,
  activeTab: 'tab-explore',
  destinations: [],
  trips: [],
  activeTripId: null,
  activeTripDetails: null,
  selectedCategory: 'All',
  selectedDestination: null,
  authMode: 'login', // 'login' or 'register'
  reviewRating: 5
};

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

// Splash Screen Progress Controller
function updateSplash(percent, statusText) {
  const bar = document.getElementById('splash-progress-fill');
  const percentLabel = document.getElementById('splash-percent-label');
  const statusLabel = document.getElementById('splash-status-label');

  if (bar) bar.style.width = `${percent}%`;
  if (percentLabel) percentLabel.textContent = `${percent}%`;
  if (statusLabel && statusText) {
    statusLabel.style.opacity = '0.3';
    setTimeout(() => {
      statusLabel.textContent = statusText;
      statusLabel.style.opacity = '1';
    }, 120);
  }
}

function dismissSplash() {
  const splash = document.getElementById('splash-screen');
  if (!splash) return;
  splash.classList.add('splash-hidden');
  setTimeout(() => {
    splash.remove();
  }, 800);
}

async function initApp() {
  updateSplash(20, '🌍 Initializing WanderPlan Engine...');
  setupNavigation();
  setupEventListeners();

  await new Promise(r => setTimeout(r, 300));
  updateSplash(50, '🔐 Verifying traveler profile & session...');
  await checkAuthSession();

  await new Promise(r => setTimeout(r, 350));
  updateSplash(80, '✈️ Syncing live weather forecasts & route maps...');
  await loadDestinations();
  checkPublicShareRoute();
  
  if (AppState.user) {
    await loadTrips();
  }

  await new Promise(r => setTimeout(r, 400));
  updateSplash(100, '✨ Ready for departure! Welcome aboard...');

  await new Promise(r => setTimeout(r, 500));
  dismissSplash();
  checkRemoteBackendConfig();
}

// Check if visiting a shared link directly e.g. /shared/trip/tr-12345
async function checkPublicShareRoute() {
  const path = window.location.pathname;
  if (path.includes('/shared/trip/')) {
    const token = path.split('/shared/trip/')[1];
    if (token) {
      loadPublicSharedTrip(token);
    }
  }
}

async function loadPublicSharedTrip(token) {
  try {
    const res = await API.trips.getPublicTrip(token);
    if (res.success && res.trip) {
      renderSharedModal(res.trip);
    }
  } catch (err) {
    showToast(err.message || 'Shared trip not found or is private.', 'error');
  }
}

// Auto-prompt to connect Render backend if running on Vercel without a configured API URL
function checkRemoteBackendConfig() {
  const isLocal = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1');
  const configuredUrl = localStorage.getItem('wanderplan_api_url') || window.WANDERPLAN_API_URL;

  if (!isLocal && !configuredUrl) {
    const modal = document.getElementById('backend-config-modal');
    if (modal) {
      setTimeout(() => modal.classList.remove('hidden'), 600);
    }
  }
}

// --- Authentication Session ---
async function checkAuthSession() {
  const token = localStorage.getItem('wanderplan_token');
  if (!token) {
    updateAuthUI(null);
    return;
  }

  try {
    const res = await API.auth.getMe();
    if (res.success && res.user) {
      AppState.user = res.user;
      updateAuthUI(res.user);
    }
  } catch (_) {
    localStorage.removeItem('wanderplan_token');
    updateAuthUI(null);
  }
}

function updateAuthUI(user) {
  const guestSec = document.getElementById('auth-guest-section');
  const userSec = document.getElementById('auth-user-section');
  const displayName = document.getElementById('user-display-name');
  const initials = document.getElementById('user-initials');

  if (user) {
    guestSec.classList.add('hidden');
    userSec.classList.remove('hidden');
    displayName.textContent = user.name;
    const parts = user.name.split(' ');
    initials.textContent = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0][0].toUpperCase();
  } else {
    guestSec.classList.remove('hidden');
    userSec.classList.add('hidden');
  }
}

// --- Navigation Tabs ---
function setupNavigation() {
  const navButtons = document.querySelectorAll('.nav-link');
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  document.getElementById('brand-logo').addEventListener('click', () => {
    switchTab('tab-explore');
  });
}

function switchTab(tabId) {
  // If navigating to protected tabs without user, prompt login
  if ((tabId === 'tab-trips' || tabId === 'tab-itinerary' || tabId === 'tab-budget') && !AppState.user) {
    showToast('Please sign in or use ⚡ Demo Login to view trips and itineraries.', 'info');
    openAuthModal('login');
    return;
  }

  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  const targetPane = document.getElementById(tabId);
  if (targetPane) targetPane.classList.add('active');

  const targetBtn = document.querySelector(`.nav-link[data-tab="${tabId}"]`);
  if (targetBtn) targetBtn.classList.add('active');

  AppState.activeTab = tabId;

  if (tabId === 'tab-itinerary' && AppState.activeTripId) {
    loadActiveTripDetails(AppState.activeTripId);
  } else if (tabId === 'tab-budget') {
    if (!_currencyInited) {
      _currencyInited = true;
      initCurrencyConverter();
    }
    if (AppState.activeTripId) {
      loadBudgetSummary(AppState.activeTripId);
    }
  }
}

// --- Event Listeners Setup ---
function setupEventListeners() {
  // 1. Destination Search & Filters
  const searchInput = document.getElementById('destination-search-input');
  searchInput.addEventListener('input', (e) => {
    filterDestinations(e.target.value, AppState.selectedCategory);
  });

  document.querySelectorAll('.category-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      AppState.selectedCategory = pill.getAttribute('data-category');
      filterDestinations(searchInput.value, AppState.selectedCategory);
    });
  });

  document.getElementById('btn-refresh-destinations').addEventListener('click', loadDestinations);

  // 2. Auth Modal controls
  document.getElementById('btn-open-login').addEventListener('click', () => openAuthModal('login'));
  document.getElementById('btn-open-register').addEventListener('click', () => openAuthModal('register'));
  document.getElementById('close-auth-modal').addEventListener('click', closeAuthModal);
  document.getElementById('btn-toggle-auth-mode').addEventListener('click', toggleAuthMode);
  document.getElementById('auth-form').addEventListener('submit', handleAuthSubmit);
  document.getElementById('btn-logout').addEventListener('click', handleLogout);

  // Quick Demo Login (for Viva presentation)
  document.getElementById('btn-quick-demo').addEventListener('click', handleDemoLogin);

  // 2b. User Profile & Account Settings Modal (Profile CRUD)
  const userProfileBtn = document.getElementById('btn-user-profile');
  if (userProfileBtn) userProfileBtn.addEventListener('click', openProfileModal);
  
  const closeProfileBtn = document.getElementById('close-profile-modal');
  if (closeProfileBtn) closeProfileBtn.addEventListener('click', closeProfileModal);

  const profileEditForm = document.getElementById('profile-edit-form');
  if (profileEditForm) profileEditForm.addEventListener('submit', handleProfileUpdateSubmit);

  const profilePwdForm = document.getElementById('profile-password-form');
  if (profilePwdForm) profilePwdForm.addEventListener('submit', handlePasswordChangeSubmit);

  const deleteAccountBtn = document.getElementById('btn-delete-account');
  if (deleteAccountBtn) deleteAccountBtn.addEventListener('click', handleAccountDelete);

  // Profile modal subtabs navigation
  document.querySelectorAll('.profile-tab-btn').forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      document.querySelectorAll('.profile-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.profile-subtab-pane').forEach(p => p.classList.add('hidden'));
      tabBtn.classList.add('active');
      const targetPane = document.getElementById(tabBtn.getAttribute('data-subtab'));
      if (targetPane) targetPane.classList.remove('hidden');
    });
  });

  // 2c. Backend Server Connection Modal (Vercel -> Render)
  const openBackendBtn = document.getElementById('btn-open-backend-config');
  if (openBackendBtn) {
    openBackendBtn.addEventListener('click', () => {
      const modal = document.getElementById('backend-config-modal');
      const input = document.getElementById('backend-url-input');
      if (input) {
        input.value = localStorage.getItem('wanderplan_api_url') || '';
      }
      if (modal) modal.classList.remove('hidden');
    });
  }

  const closeBackendBtn = document.getElementById('close-backend-modal');
  if (closeBackendBtn) {
    closeBackendBtn.addEventListener('click', () => {
      document.getElementById('backend-config-modal')?.classList.add('hidden');
    });
  }

  const backendForm = document.getElementById('backend-config-form');
  if (backendForm) {
    backendForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('backend-url-input');
      const rawUrl = input.value.trim().replace(/\/+$/, '');
      if (rawUrl) {
        localStorage.setItem('wanderplan_api_url', rawUrl);
        showToast(`Connected to backend: ${rawUrl}! Reloading...`, 'success');
        setTimeout(() => window.location.reload(), 800);
      }
    });
  }

  const resetBackendBtn = document.getElementById('btn-reset-backend-url');
  if (resetBackendBtn) {
    resetBackendBtn.addEventListener('click', () => {
      localStorage.removeItem('wanderplan_api_url');
      showToast('Reset backend URL to default. Reloading...', 'info');
      setTimeout(() => window.location.reload(), 800);
    });
  }

  // 3. Create Trip Modal
  document.getElementById('btn-open-create-trip').addEventListener('click', openCreateTripModal);
  document.getElementById('close-create-trip-modal').addEventListener('click', closeCreateTripModal);
  document.getElementById('btn-cancel-create-trip').addEventListener('click', closeCreateTripModal);
  document.getElementById('create-trip-form').addEventListener('submit', handleCreateTripSubmit);

  // 4. Trip Selection Dropdowns
  document.getElementById('active-trip-select').addEventListener('change', (e) => {
    AppState.activeTripId = e.target.value;
    loadActiveTripDetails(AppState.activeTripId);
  });

  document.getElementById('budget-trip-select').addEventListener('change', (e) => {
    AppState.activeTripId = e.target.value;
    loadBudgetSummary(AppState.activeTripId);
  });

  // 5. Itinerary Activity Modal
  document.getElementById('close-activity-modal').addEventListener('click', closeActivityModal);
  document.getElementById('btn-cancel-act-modal').addEventListener('click', closeActivityModal);
  document.getElementById('activity-form').addEventListener('submit', handleActivitySubmit);

  // 6. Expense Modal
  document.getElementById('btn-open-add-expense').addEventListener('click', openExpenseModal);
  document.getElementById('close-expense-modal').addEventListener('click', closeExpenseModal);
  document.getElementById('btn-cancel-expense').addEventListener('click', closeExpenseModal);
  document.getElementById('expense-form').addEventListener('submit', handleExpenseSubmit);

  // 7. Destination Detail & Reviews Modal
  document.getElementById('close-dest-modal').addEventListener('click', closeDestinationModal);
  document.getElementById('btn-toggle-add-review').addEventListener('click', toggleAddReviewForm);
  document.getElementById('btn-cancel-review').addEventListener('click', toggleAddReviewForm);
  document.getElementById('add-review-form').addEventListener('submit', handleReviewSubmit);

  // Star selector in review form
  document.querySelectorAll('.star-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const val = parseInt(btn.getAttribute('data-value'));
      AppState.reviewRating = val;
      updateStarSelector(val);
    });
  });

  // 8. Sharing Modal & Clipboard
  document.getElementById('btn-share-trip-link').addEventListener('click', handleShareTripClick);
  document.getElementById('close-share-dialog').addEventListener('click', closeShareDialog);
  document.getElementById('btn-copy-share-url').addEventListener('click', handleCopyShareUrl);
  document.getElementById('close-shared-modal').addEventListener('click', () => {
    document.getElementById('shared-trip-modal').classList.add('hidden');
  });

  // 9. AI Generator & Packing Checklist & Print PDF
  document.getElementById('btn-open-ai-generator').addEventListener('click', openAiGeneratorModal);
  document.getElementById('close-ai-modal').addEventListener('click', closeAiGeneratorModal);
  document.getElementById('btn-cancel-ai-modal').addEventListener('click', closeAiGeneratorModal);
  document.getElementById('ai-generator-form').addEventListener('submit', handleAiGenerateSubmit);

  document.getElementById('btn-open-packing-list').addEventListener('click', openPackingListModal);
  document.getElementById('close-packing-modal').addEventListener('click', closePackingListModal);
  document.getElementById('btn-print-itinerary').addEventListener('click', () => window.print());
}

// --- Destinations Module ---
async function loadDestinations() {
  try {
    const res = await API.destinations.getAll();
    if (res.success) {
      AppState.destinations = res.destinations;
      document.getElementById('stats-places-count').textContent = `${res.destinations.length}+`;
      renderDestinations(res.destinations);
    }
  } catch (err) {
    showToast('Failed to fetch destinations: ' + err.message, 'error');
  }
}

function filterDestinations(query, category) {
  let list = AppState.destinations;
  if (category && category !== 'All') {
    list = list.filter(d => d.category?.toLowerCase() === category.toLowerCase());
  }
  if (query) {
    const q = query.toLowerCase();
    list = list.filter(d =>
      d.name.toLowerCase().includes(q) ||
      (d.state && d.state.toLowerCase().includes(q)) ||
      d.country.toLowerCase().includes(q)
    );
  }
  renderDestinations(list);
}

function renderDestinations(destinations) {
  const container = document.getElementById('destinations-container');
  if (!destinations || destinations.length === 0) {
    container.innerHTML = `<div class="empty-state">No destinations found matching your filters.</div>`;
    return;
  }

  container.innerHTML = destinations.map(dest => `
    <div class="destination-card">
      <div class="dest-img-box">
        <img src="${dest.imageUrl}" alt="${dest.name}" loading="lazy">
        <span class="dest-category-tag">${dest.category || 'Travel'}</span>
        <span class="dest-rating-tag">★ ${dest.avgRating || '4.8'}</span>
      </div>
      <div class="dest-body">
        <div class="dest-location">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          <span>${dest.state ? dest.state + ', ' : ''}${dest.country}</span>
        </div>
        <h3 class="dest-title">${dest.name}</h3>
        <p class="dest-desc">${dest.description}</p>
        <div class="dest-footer">
          <button class="btn btn-outline btn-sm" onclick="openDestinationModal('${dest.id}')">
            🌦️ Weather & Reviews (${dest.totalReviews || 0})
          </button>
          <button class="btn btn-primary btn-sm" onclick="quickPlanTripForDest('${dest.name}', '${dest.id}')">
            + Plan Trip
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// --- Destination Detail & Live Weather Modal ---
async function openDestinationModal(destId) {
  const modal = document.getElementById('destination-modal');
  modal.classList.remove('hidden');

  try {
    const res = await API.destinations.getById(destId);
    if (!res.success) return;

    const dest = res.destination;
    AppState.selectedDestination = dest;

    document.getElementById('dest-modal-title').textContent = dest.name;
    document.getElementById('dest-modal-subtitle').textContent = `${dest.state ? dest.state + ', ' : ''}${dest.country} • Best Season: ${dest.bestSeason || 'Year-round'}`;
    document.getElementById('dest-modal-img').src = dest.imageUrl;
    document.getElementById('dest-modal-desc').textContent = dest.description;

    document.getElementById('dest-rating-summary').innerHTML = `
      <span class="star-rating-large">★ ${dest.avgRating}</span>
      <span class="review-count">(${dest.totalReviews} verified traveler reviews)</span>
    `;

    renderReviewsList(dest.reviews || []);

    // Fetch destination live weather
    const weatherContainer = document.getElementById('dest-modal-weather-content');
    weatherContainer.innerHTML = `<div class="weather-loading-text">Fetching live weather & travel advisory...</div>`;

    const weatherRes = await API.destinations.getWeather(destId);
    if (weatherRes.success && weatherRes.weather) {
      const w = weatherRes.weather;
      weatherContainer.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <span style="font-size:2rem;">${w.current.icon || '⛅'}</span>
            <div>
              <div style="font-size:1.5rem; font-weight:800; font-family:var(--font-heading);">${w.current.temperature}°C</div>
              <div style="font-size:0.85rem; color:#93c5fd;">${w.current.condition} • Humidity ${w.current.humidity} • Wind ${w.current.wind}</div>
            </div>
          </div>
          <div class="weather-advisory-pill">
            <span>💡 Advisory:</span>
            <span>${w.travelAdvisory || 'Ideal conditions for travel.'}</span>
          </div>
        </div>
      `;
    }
  } catch (err) {
    showToast('Failed to load destination details: ' + err.message, 'error');
  }
}

function closeDestinationModal() {
  document.getElementById('destination-modal').classList.add('hidden');
  document.getElementById('add-review-form').classList.add('hidden');
}

function toggleAddReviewForm() {
  if (!AppState.user) {
    showToast('Please sign in or use Demo Login to post a review.', 'info');
    openAuthModal('login');
    return;
  }
  const form = document.getElementById('add-review-form');
  form.classList.toggle('hidden');
}

function updateStarSelector(rating) {
  document.querySelectorAll('.star-btn').forEach(btn => {
    const val = parseInt(btn.getAttribute('data-value'));
    btn.classList.toggle('active', val <= rating);
  });
}

async function handleReviewSubmit(e) {
  e.preventDefault();
  if (!AppState.selectedDestination) return;

  const comment = document.getElementById('review-comment-input').value;
  try {
    const res = await API.destinations.addReview(AppState.selectedDestination.id, {
      rating: AppState.reviewRating,
      comment
    });

    if (res.success) {
      showToast('Review submitted successfully!', 'success');
      document.getElementById('review-comment-input').value = '';
      toggleAddReviewForm();
      // Reload destination details
      openDestinationModal(AppState.selectedDestination.id);
      loadDestinations(); // update card average
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderReviewsList(reviews) {
  const container = document.getElementById('dest-reviews-list');
  if (!reviews || reviews.length === 0) {
    container.innerHTML = `<p style="font-size:0.85rem; color:var(--text-dim);">No traveler reviews yet. Be the first to share your experience!</p>`;
    return;
  }

  container.innerHTML = reviews.map(r => `
    <div class="review-item">
      <div class="rev-header">
        <span class="rev-author">${r.userName || 'Traveler'}</span>
        <span class="rev-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
      </div>
      <p class="rev-comment">"${r.comment}"</p>
    </div>
  `).join('');
}

// --- Quick Plan Trip Trigger ---
function quickPlanTripForDest(destName, destId) {
  if (!AppState.user) {
    showToast('Please sign in to start planning a trip.', 'info');
    openAuthModal('login');
    return;
  }
  openCreateTripModal();
  document.getElementById('trip-title-input').value = `Trip to ${destName}`;
  document.getElementById('trip-city-input').value = destName;
}

// --- Trips Module ---
async function loadTrips() {
  try {
    const res = await API.trips.getMyTrips();
    if (res.success) {
      AppState.trips = res.trips;
      document.getElementById('trips-count-badge').textContent = res.trips.length;
      renderTrips(res.trips);
      populateTripSelectors(res.trips);

      if (res.trips.length > 0 && !AppState.activeTripId) {
        AppState.activeTripId = res.trips[0].id;
      }
    }
  } catch (err) {
    console.error('Failed to load trips:', err);
  }
}

function populateTripSelectors(trips) {
  const activeSelect = document.getElementById('active-trip-select');
  const budgetSelect = document.getElementById('budget-trip-select');

  const options = trips.map(t => `<option value="${t.id}" ${t.id === AppState.activeTripId ? 'selected' : ''}>${t.title} (${t.destinationCity})</option>`).join('');

  activeSelect.innerHTML = options || '<option value="">No trips available</option>';
  budgetSelect.innerHTML = options || '<option value="">No trips available</option>';
}

function renderTrips(trips) {
  const container = document.getElementById('trips-container');
  if (!trips || trips.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
        <h3>No Trips Planned Yet</h3>
        <p style="color:var(--text-muted); margin: 0.5rem 0 1.5rem;">Create your first itinerary or use the ⚡ Demo login to view the sample Manali trip.</p>
        <button class="btn btn-primary" onclick="openCreateTripModal()">+ Create Trip</button>
      </div>
    `;
    return;
  }

  container.innerHTML = trips.map(trip => `
    <div class="trip-card">
      <div class="trip-card-header">
        <div>
          <h3 class="trip-card-title">${trip.title}</h3>
          <span class="trip-card-city">📍 ${trip.destinationCity}</span>
        </div>
        <span class="badge ${trip.isPublic ? 'badge-success' : 'badge-outline'}" style="font-size:0.75rem; padding:0.2rem 0.5rem; border-radius:4px; background:rgba(255,255,255,0.05);">
          ${trip.isPublic ? '🔗 Public' : '🔒 Private'}
        </span>
      </div>

      <div class="trip-card-dates">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        <span>${trip.startDate} to ${trip.endDate} (${trip.totalDays || 1} Days)</span>
      </div>

      <div class="trip-stats-grid">
        <div>
          <div class="trip-stat-num">${trip.totalActivities || 0}</div>
          <div class="trip-stat-lbl">Activities</div>
        </div>
        <div>
          <div class="trip-stat-num">₹${trip.totalSpent || 0}</div>
          <div class="trip-stat-lbl">Spent</div>
        </div>
        <div>
          <div class="trip-stat-num">₹${trip.totalBudget || 0}</div>
          <div class="trip-stat-lbl">Budget</div>
        </div>
      </div>

      <div class="trip-card-actions">
        <button class="btn btn-primary btn-sm btn-block" onclick="viewTripItinerary('${trip.id}')">
          View & Edit Itinerary
        </button>
        <button class="btn btn-outline btn-sm" onclick="viewTripBudget('${trip.id}')" title="Budget Analytics">
          💰 Budget
        </button>
        <button class="btn btn-icon btn-sm" onclick="deleteTrip('${trip.id}')" title="Delete Trip">
          🗑️
        </button>
      </div>
    </div>
  `).join('');
}

function viewTripItinerary(tripId) {
  AppState.activeTripId = tripId;
  const select = document.getElementById('active-trip-select');
  if (select) select.value = tripId;
  switchTab('tab-itinerary');
  loadActiveTripDetails(tripId);
}

function viewTripBudget(tripId) {
  AppState.activeTripId = tripId;
  const select = document.getElementById('budget-trip-select');
  if (select) select.value = tripId;
  switchTab('tab-budget');
  loadBudgetSummary(tripId);
}

async function deleteTrip(tripId) {
  if (!confirm('Are you sure you want to delete this trip and its itineraries?')) return;
  try {
    const res = await API.trips.delete(tripId);
    if (res.success) {
      showToast('Trip deleted.', 'success');
      await loadTrips();
      if (AppState.trips.length > 0) {
        AppState.activeTripId = AppState.trips[0].id;
      } else {
        AppState.activeTripId = null;
      }
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// --- Itinerary Canvas & Weather Integration ---
async function loadActiveTripDetails(tripId) {
  if (!tripId) return;
  try {
    const res = await API.trips.getDetails(tripId);
    if (res.success && res.trip) {
      AppState.activeTripDetails = res.trip;
      renderItinerary(res.trip);
      renderWeatherBanner(res.trip.weather, res.trip.destinationCity);
      renderTripSidebarMeta(res.trip);
      renderItineraryMap(res.trip);
    }
  } catch (err) {
    showToast('Failed to load itinerary: ' + err.message, 'error');
  }
}

function renderWeatherBanner(weather, city) {
  const banner = document.getElementById('trip-weather-banner');
  if (!weather || !weather.current) {
    banner.innerHTML = `<div>Weather forecast currently unavailable for ${city}.</div>`;
    return;
  }

  const cur = weather.current;
  const forecastHtml = (weather.forecast || []).map(f => `
    <div class="forecast-card-mini">
      <div class="forecast-day-name">${f.dayName}</div>
      <div class="forecast-day-icon">${f.icon || '⛅'}</div>
      <div class="forecast-day-temp">${f.tempMax}° / ${f.tempMin}°</div>
    </div>
  `).join('');

  banner.innerHTML = `
    <div class="weather-header">
      <div class="weather-cur-group">
        <div class="weather-cur-icon">${cur.icon || '⛅'}</div>
        <div>
          <div class="weather-cur-temp">${cur.temperature}°C</div>
          <div class="weather-cur-cond">${cur.condition} in ${city} • Humidity: ${cur.humidity} • Wind: ${cur.wind}</div>
        </div>
      </div>
      <div class="weather-advisory-pill">
        <span>⚠️ Travel Advisory:</span>
        <span>${weather.travelAdvisory || 'Normal weather conditions. Safe for exploration.'}</span>
      </div>
    </div>
    ${weather.forecast && weather.forecast.length > 0 ? `
      <div class="forecast-days-strip">
        ${forecastHtml}
      </div>
    ` : ''}
  `;
}

function renderTripSidebarMeta(trip) {
  const container = document.getElementById('trip-sidebar-meta');
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:0.75rem; font-size:0.85rem;">
      <div><strong>Destination:</strong> ${trip.destinationCity}</div>
      <div><strong>Dates:</strong> ${trip.startDate} to ${trip.endDate}</div>
      <div><strong>Total Budget:</strong> ₹${trip.totalBudget}</div>
      <div><strong>Total Spent:</strong> ₹${trip.totalSpent}</div>
      <div><strong>Balance:</strong> ₹${trip.budgetRemaining}</div>
      <div><strong>Share Status:</strong> ${trip.isPublic ? 'Publicly Viewable' : 'Private'}</div>
    </div>
  `;
}

function renderItinerary(trip) {
  const container = document.getElementById('itinerary-days-container');
  if (!trip.days || trip.days.length === 0) {
    container.innerHTML = `<div class="empty-state">No days generated for this trip.</div>`;
    return;
  }

  container.innerHTML = trip.days.map(day => {
    const itemsHtml = (day.items || []).map(item => `
      <div class="activity-item-card" id="act-item-${item.id}">
        <div class="act-info">
          <div class="act-meta-row">
            <span class="time-pill">⏰ ${item.startTime} - ${item.endTime}</span>
            <span class="transport-badge">${getTransportIcon(item.transportMode)} ${item.transportMode}</span>
            ${item.estimatedCost > 0 ? `<span class="act-cost-badge">₹${item.estimatedCost}</span>` : ''}
          </div>
          <div class="act-title">${item.title}</div>
          ${item.placeName ? `<div class="act-place">📍 ${item.placeName}</div>` : ''}
          ${item.notes ? `<div class="act-notes">${item.notes}</div>` : ''}
        </div>
        <div class="act-actions">
          <button class="btn btn-icon btn-sm" onclick="deleteActivity('${trip.id}', '${item.id}')" title="Delete Activity">
            ✕
          </button>
        </div>
      </div>
    `).join('');

    return `
      <div class="day-card" id="day-${day.id}">
        <div class="day-header">
          <div>
            <span class="day-pill">Day ${day.dayNumber}</span>
            <span class="day-date">${day.date}</span>
            <span style="font-size:0.82rem; color:var(--text-dim); margin-left:0.5rem;">${day.notes || ''}</span>
          </div>
          <button class="btn btn-outline btn-sm" onclick="openAddActivityModal('${day.id}')">
            + Add Activity / Route
          </button>
        </div>
        <div class="activities-timeline">
          ${itemsHtml || '<div style="font-size:0.85rem; color:var(--text-dim); padding:0.5rem 0;">No activities added yet for Day ' + day.dayNumber + '. Click "+ Add Activity" above to schedule places.</div>'}
        </div>
      </div>
    `;
  }).join('');
}

function getTransportIcon(mode) {
  switch ((mode || '').toLowerCase()) {
    case 'flight': return '✈️';
    case 'train': return '🚆';
    case 'bus': return '🚌';
    case 'car': return '🚗';
    case 'ferry': return '⛴️';
    default: return '🚶';
  }
}

// --- Activity Modal ---
function openAddActivityModal(dayId) {
  document.getElementById('activity-day-id').value = dayId;
  document.getElementById('activity-item-id').value = '';
  document.getElementById('activity-modal-title').textContent = 'Add Activity to Itinerary';
  document.getElementById('activity-form').reset();
  document.getElementById('activity-modal').classList.remove('hidden');
}

function closeActivityModal() {
  document.getElementById('activity-modal').classList.add('hidden');
}

async function handleActivitySubmit(e) {
  e.preventDefault();
  const dayId = document.getElementById('activity-day-id').value;
  const tripId = AppState.activeTripId;

  const data = {
    title: document.getElementById('act-title-input').value,
    placeName: document.getElementById('act-place-input').value,
    startTime: document.getElementById('act-start-time').value,
    endTime: document.getElementById('act-end-time').value,
    transportMode: document.getElementById('act-transport-select').value,
    estimatedCost: document.getElementById('act-cost-input').value,
    notes: document.getElementById('act-notes-input').value
  };

  try {
    const res = await API.trips.addActivity(tripId, dayId, data);
    if (res.success) {
      showToast('Activity added to day schedule!', 'success');
      closeActivityModal();
      loadActiveTripDetails(tripId);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteActivity(tripId, itemId) {
  if (!confirm('Remove this activity from the itinerary?')) return;
  try {
    const res = await API.trips.deleteActivity(tripId, itemId);
    if (res.success) {
      showToast('Activity removed.', 'success');
      loadActiveTripDetails(tripId);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// --- Budget Tracker Module ---
async function loadBudgetSummary(tripId) {
  if (!tripId) return;
  try {
    const res = await API.trips.getBudget(tripId);
    if (res.success && res.budget) {
      renderBudget(res.budget);
    }
  } catch (err) {
    showToast('Failed to load budget: ' + err.message, 'error');
  }
}

function renderBudget(budget) {
  document.getElementById('budget-kpi-total').textContent = `₹${budget.totalBudget.toLocaleString()}`;
  document.getElementById('budget-kpi-spent').textContent = `₹${budget.totalSpent.toLocaleString()}`;
  document.getElementById('budget-kpi-spent-percent').textContent = `${budget.utilizationPercent}% of allocated budget`;

  const remainingEl = document.getElementById('budget-kpi-remaining');
  const statusEl = document.getElementById('budget-kpi-status-text');

  remainingEl.textContent = `₹${budget.remaining.toLocaleString()}`;
  if (budget.isOverBudget) {
    remainingEl.className = 'kpi-value text-red';
    statusEl.textContent = '⚠️ Over budget limit!';
  } else {
    remainingEl.className = 'kpi-value text-green';
    statusEl.textContent = 'Within planned limits';
  }

  // Progress Bar
  const pBar = document.getElementById('budget-progress-bar');
  const pText = document.getElementById('budget-progress-percent');
  const percent = Math.min(100, budget.utilizationPercent);
  pBar.style.width = `${percent}%`;
  pText.textContent = `${budget.utilizationPercent}%`;
  pBar.style.background = budget.isOverBudget
    ? 'linear-gradient(90deg, #f87171, #ef4444)'
    : 'linear-gradient(90deg, #38bdf8, #818cf8)';

  // Categories Breakdown
  const catContainer = document.getElementById('budget-categories-list');
  const catColors = {
    Lodging: '#38bdf8',
    Transport: '#818cf8',
    Food: '#fbbf24',
    Activities: '#34d399',
    Shopping: '#f472b6',
    Miscellaneous: '#94a3b8'
  };

  const catItems = Object.entries(budget.breakdown || {}).map(([cat, amount]) => {
    const catPercent = budget.totalSpent > 0 ? Math.round((amount / budget.totalSpent) * 100) : 0;
    const color = catColors[cat] || '#94a3b8';
    return `
      <div class="cat-item-row">
        <div class="cat-labels">
          <span>${cat}</span>
          <span style="font-weight:700;">₹${amount.toLocaleString()} (${catPercent}%)</span>
        </div>
        <div class="cat-track">
          <div class="cat-bar" style="width: ${catPercent}%; background: ${color};"></div>
        </div>
      </div>
    `;
  }).join('');
  catContainer.innerHTML = catItems;

  // Expenses Table
  const tableBody = document.getElementById('expense-table-body');
  if (!budget.expenses || budget.expenses.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-dim); padding:1.5rem;">No expenses recorded yet. Click "+ Add Expense" to log costs.</td></tr>`;
    return;
  }

  tableBody.innerHTML = budget.expenses.map(e => `
    <tr>
      <td>${e.expenseDate || e.createdAt.split('T')[0]}</td>
      <td><span class="transport-badge" style="background:rgba(255,255,255,0.08); color:#e2e8f0;">${e.category}</span></td>
      <td>${e.description || '—'}</td>
      <td style="font-weight:700; color:#fbbf24;">₹${Number(e.amount).toLocaleString()}</td>
      <td>
        <button class="btn btn-icon btn-sm" onclick="deleteExpense('${AppState.activeTripId}', '${e.id}')" title="Delete Expense">✕</button>
      </td>
    </tr>
  `).join('');
}

// --- Expense Modal ---
function openExpenseModal() {
  if (!AppState.activeTripId) {
    showToast('Please select or create a trip first.', 'info');
    return;
  }
  document.getElementById('expense-form').reset();
  document.getElementById('exp-date-input').value = new Date().toISOString().split('T')[0];
  document.getElementById('expense-modal').classList.remove('hidden');
}

function closeExpenseModal() {
  document.getElementById('expense-modal').classList.add('hidden');
}

async function handleExpenseSubmit(e) {
  e.preventDefault();
  const tripId = AppState.activeTripId;

  const data = {
    category: document.getElementById('exp-category-select').value,
    amount: document.getElementById('exp-amount-input').value,
    description: document.getElementById('exp-desc-input').value,
    expenseDate: document.getElementById('exp-date-input').value
  };

  try {
    const res = await API.trips.addExpense(tripId, data);
    if (res.success) {
      showToast('Expense logged successfully!', 'success');
      closeExpenseModal();
      loadBudgetSummary(tripId);
      loadTrips(); // updates cards
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteExpense(tripId, expId) {
  if (!confirm('Delete this expense entry?')) return;
  try {
    const res = await API.trips.deleteExpense(tripId, expId);
    if (res.success) {
      showToast('Expense deleted.', 'success');
      loadBudgetSummary(tripId);
      loadTrips();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// --- Trip Sharing System ---
async function handleShareTripClick() {
  if (!AppState.activeTripId) return;
  try {
    const res = await API.trips.toggleShare(AppState.activeTripId, true);
    if (res.success) {
      const fullUrl = `${window.location.origin}/shared/trip/${res.shareToken}`;
      document.getElementById('share-link-input').value = fullUrl;
      document.getElementById('share-dialog-modal').classList.remove('hidden');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function closeShareDialog() {
  document.getElementById('share-dialog-modal').classList.add('hidden');
}

function handleCopyShareUrl() {
  const input = document.getElementById('share-link-input');
  input.select();
  navigator.clipboard.writeText(input.value).then(() => {
    showToast('Public itinerary link copied to clipboard!', 'success');
  }).catch(() => {
    document.execCommand('copy');
    showToast('Link copied!', 'success');
  });
}

function renderSharedModal(trip) {
  const modal = document.getElementById('shared-trip-modal');
  document.getElementById('shared-modal-trip-title').textContent = trip.title;
  document.getElementById('shared-modal-trip-meta').textContent = `Dest: ${trip.destinationCity} • ${trip.startDate} to ${trip.endDate} • Planned by: ${trip.createdBy}`;

  const body = document.getElementById('shared-modal-body');
  const daysHtml = (trip.days || []).map(day => `
    <div style="margin-bottom:1.5rem; background:rgba(255,255,255,0.03); padding:1rem; border-radius:8px;">
      <div style="font-weight:700; color:var(--primary); margin-bottom:0.5rem;">Day ${day.dayNumber} (${day.date})</div>
      <div>
        ${(day.items || []).map(i => `
          <div style="display:flex; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid rgba(255,255,255,0.05); font-size:0.85rem;">
            <div>
              <strong>${i.startTime} - ${i.endTime}</strong> • ${i.title}
              <div style="color:var(--text-dim); font-size:0.8rem;">${i.placeName || ''} (${i.transportMode})</div>
            </div>
            ${i.estimatedCost > 0 ? `<div style="color:#fbbf24; font-weight:600;">₹${i.estimatedCost}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  body.innerHTML = daysHtml;
  modal.classList.remove('hidden');
}

// --- Create Trip Modal ---
function openCreateTripModal() {
  if (!AppState.user) {
    showToast('Please sign in or use Demo Login first.', 'info');
    openAuthModal('login');
    return;
  }
  document.getElementById('create-trip-form').reset();
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  document.getElementById('trip-start-date').value = today;
  document.getElementById('trip-end-date').value = nextWeek;
  document.getElementById('create-trip-modal').classList.remove('hidden');
}

function closeCreateTripModal() {
  document.getElementById('create-trip-modal').classList.add('hidden');
}

async function handleCreateTripSubmit(e) {
  e.preventDefault();
  const data = {
    title: document.getElementById('trip-title-input').value,
    destinationCity: document.getElementById('trip-city-input').value,
    startDate: document.getElementById('trip-start-date').value,
    endDate: document.getElementById('trip-end-date').value,
    totalBudget: document.getElementById('trip-budget-input').value
  };

  try {
    const res = await API.trips.create(data);
    if (res.success) {
      showToast(res.message, 'success');
      closeCreateTripModal();
      await loadTrips();
      AppState.activeTripId = res.trip.id;
      viewTripItinerary(res.trip.id);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// --- Auth Modal & Handlers ---
function openAuthModal(mode = 'login') {
  AppState.authMode = mode;
  const modal = document.getElementById('auth-modal');
  const title = document.getElementById('auth-modal-title');
  const nameGroup = document.getElementById('auth-name-group');
  const submitBtn = document.getElementById('auth-submit-btn');
  const prompt = document.getElementById('auth-toggle-prompt');
  const toggleBtn = document.getElementById('btn-toggle-auth-mode');

  if (mode === 'login') {
    title.textContent = 'Sign In to WanderPlan';
    nameGroup.classList.add('hidden');
    submitBtn.textContent = 'Sign In';
    prompt.textContent = "Don't have an account?";
    toggleBtn.textContent = 'Create One';
  } else {
    title.textContent = 'Create WanderPlan Account';
    nameGroup.classList.remove('hidden');
    submitBtn.textContent = 'Register Account';
    prompt.textContent = 'Already have an account?';
    toggleBtn.textContent = 'Sign In';
  }

  modal.classList.remove('hidden');
}

function closeAuthModal() {
  document.getElementById('auth-modal').classList.add('hidden');
}

function toggleAuthMode() {
  openAuthModal(AppState.authMode === 'login' ? 'register' : 'login');
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('auth-email-input').value;
  const password = document.getElementById('auth-password-input').value;

  try {
    let res;
    if (AppState.authMode === 'login') {
      res = await API.auth.login({ email, password });
    } else {
      const name = document.getElementById('auth-name-input').value;
      res = await API.auth.register({ name, email, password });
    }

    if (res.success && res.token) {
      localStorage.setItem('wanderplan_token', res.token);
      AppState.user = res.user;
      updateAuthUI(res.user);
      closeAuthModal();
      showToast(`Welcome, ${res.user.name}!`, 'success');
      await loadTrips();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleDemoLogin() {
  try {
    const res = await API.auth.login({
      email: 'alex@traveler.com',
      password: 'Password123'
    });
    if (res.success && res.token) {
      localStorage.setItem('wanderplan_token', res.token);
      AppState.user = res.user;
      updateAuthUI(res.user);
      showToast('Signed in as Demo Traveler (Alex Rivera)!', 'success');
      await loadTrips();
      switchTab('tab-trips');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function handleLogout() {
  localStorage.removeItem('wanderplan_token');
  AppState.user = null;
  updateAuthUI(null);
  showToast('You have signed out.', 'info');
  switchTab('tab-explore');
}

// --- User Profile & Account CRUD Operations ---
async function openProfileModal() {
  if (!AppState.user) {
    showToast('Please sign in first to manage your profile.', 'info');
    openAuthModal('login');
    return;
  }

  const modal = document.getElementById('profile-modal');
  modal.classList.remove('hidden');

  // Reset to first subtab
  document.querySelectorAll('.profile-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.profile-subtab-pane').forEach(p => p.classList.add('hidden'));
  const editTabBtn = document.getElementById('tab-btn-edit-profile');
  const editPane = document.getElementById('subtab-profile-edit');
  if (editTabBtn) editTabBtn.classList.add('active');
  if (editPane) editPane.classList.remove('hidden');

  try {
    const res = await API.auth.getProfile();
    if (res.success && res.user) {
      const u = res.user;
      AppState.user = { ...AppState.user, ...u };

      // Populate Hero Card
      const nameEl = document.getElementById('profile-card-name');
      const emailEl = document.getElementById('profile-card-email');
      const roleEl = document.getElementById('profile-card-role');
      const bioEl = document.getElementById('profile-card-bio');
      const bigInitials = document.getElementById('profile-big-initials');

      if (nameEl) nameEl.textContent = u.name;
      if (emailEl) emailEl.textContent = u.email;
      if (roleEl) roleEl.textContent = u.role === 'admin' ? 'Administrator' : 'Verified Traveler';
      if (bioEl) bioEl.textContent = u.bio || 'Passionate traveler exploring the world.';
      
      const parts = u.name.split(' ');
      const initialsText = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0][0].toUpperCase();
      if (bigInitials) bigInitials.textContent = initialsText;

      // Populate Stats
      const statTrips = document.getElementById('profile-stat-trips');
      const statExpenses = document.getElementById('profile-stat-expenses');
      const statSpent = document.getElementById('profile-stat-spent');
      const statJoined = document.getElementById('profile-stat-joined');

      if (statTrips) statTrips.textContent = u.stats ? u.stats.totalTrips : (AppState.trips ? AppState.trips.length : 0);
      if (statExpenses) statExpenses.textContent = u.stats ? u.stats.totalExpensesLogged : 0;
      if (statSpent) statSpent.textContent = `₹${u.stats ? u.stats.totalSpent.toLocaleString() : '0'}`;
      if (statJoined) {
        const year = u.createdAt ? new Date(u.createdAt).getFullYear() : '2026';
        statJoined.textContent = year;
      }

      // Populate Form Fields
      const nameInput = document.getElementById('profile-name-input');
      const emailInput = document.getElementById('profile-email-input');
      const phoneInput = document.getElementById('profile-phone-input');
      const styleSelect = document.getElementById('profile-style-select');
      const bioInput = document.getElementById('profile-bio-input');

      if (nameInput) nameInput.value = u.name || '';
      if (emailInput) emailInput.value = u.email || '';
      if (phoneInput) phoneInput.value = u.phone || '';
      if (styleSelect && u.travelStyle) styleSelect.value = u.travelStyle;
      if (bioInput) bioInput.value = u.bio || '';
    }
  } catch (err) {
    showToast(`Could not load profile: ${err.message}`, 'error');
  }
}

function closeProfileModal() {
  const modal = document.getElementById('profile-modal');
  if (modal) modal.classList.add('hidden');
}

async function handleProfileUpdateSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('profile-name-input').value.trim();
  const email = document.getElementById('profile-email-input').value.trim();
  const phone = document.getElementById('profile-phone-input').value.trim();
  const travelStyle = document.getElementById('profile-style-select').value;
  const bio = document.getElementById('profile-bio-input').value.trim();

  const saveBtn = document.getElementById('btn-save-profile');
  const origText = saveBtn.innerHTML;
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span>⏳ Saving...</span>';

  try {
    const res = await API.auth.updateProfile({ name, email, phone, travelStyle, bio });
    if (res.success && res.user) {
      if (res.token) {
        localStorage.setItem('wanderplan_token', res.token);
      }
      AppState.user = { ...AppState.user, ...res.user };
      updateAuthUI(AppState.user);

      // Update card details in modal
      document.getElementById('profile-card-name').textContent = res.user.name;
      document.getElementById('profile-card-email').textContent = res.user.email;
      document.getElementById('profile-card-bio').textContent = res.user.bio || 'Exploring the world!';
      const parts = res.user.name.split(' ');
      document.getElementById('profile-big-initials').textContent = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0][0].toUpperCase();

      showToast('Profile updated successfully! ✨', 'success');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = origText;
  }
}

async function handlePasswordChangeSubmit(e) {
  e.preventDefault();
  const currentPassword = document.getElementById('profile-current-password').value;
  const newPassword = document.getElementById('profile-new-password').value;
  const confirmPassword = document.getElementById('profile-confirm-password').value;

  if (newPassword !== confirmPassword) {
    showToast('New passwords do not match. Please verify.', 'error');
    return;
  }

  if (newPassword.length < 6) {
    showToast('New password must be at least 6 characters.', 'error');
    return;
  }

  const updateBtn = document.getElementById('btn-update-password');
  const origText = updateBtn.innerHTML;
  updateBtn.disabled = true;
  updateBtn.innerHTML = '<span>⏳ Updating...</span>';

  try {
    const res = await API.auth.changePassword({ currentPassword, newPassword });
    if (res.success) {
      document.getElementById('profile-password-form').reset();
      showToast('Password changed successfully! 🔐', 'success');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    updateBtn.disabled = false;
    updateBtn.innerHTML = origText;
  }
}

async function handleAccountDelete() {
  const confirmed = confirm(
    '⚠️ WARNING: Are you sure you want to permanently delete your account?\n\n' +
    'This will delete:\n' +
    '• All your planned and completed trips\n' +
    '• All day-by-day itineraries and activity schedules\n' +
    '• All recorded travel budget expenses\n\n' +
    'This action cannot be undone. Click OK to confirm.'
  );

  if (!confirmed) return;

  try {
    const res = await API.auth.deleteAccount();
    if (res.success) {
      closeProfileModal();
      localStorage.removeItem('wanderplan_token');
      AppState.user = null;
      AppState.trips = [];
      AppState.activeTripId = null;
      updateAuthUI(null);
      showToast('Account and all associated trips permanently deleted.', 'info');
      switchTab('tab-explore');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}


// --- Leaflet Route Map Implementation ---
let currentLeafletMap = null;

function renderItineraryMap(trip) {
  const mapEl = document.getElementById('itinerary-map');
  if (!mapEl || typeof L === 'undefined') return;

  // Cleanup old map instance if re-rendering
  if (currentLeafletMap) {
    currentLeafletMap.remove();
    currentLeafletMap = null;
  }

  // City coordinate map fallback
  const cityCoords = {
    manali: [32.2432, 77.1892],
    goa: [15.2993, 74.1240],
    jaipur: [26.9124, 75.7873],
    tokyo: [35.6762, 139.6503],
    paris: [48.8566, 2.3522],
    bali: [-8.4095, 115.1889]
  };

  const cKey = (trip.destinationCity || '').toLowerCase();
  let baseCoords = [28.6139, 77.2090]; // default New Delhi

  for (const [k, coords] of Object.entries(cityCoords)) {
    if (cKey.includes(k)) {
      baseCoords = coords;
      break;
    }
  }

  try {
    currentLeafletMap = L.map('itinerary-map').setView(baseCoords, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap contributors'
    }).addTo(currentLeafletMap);

    // Main Destination Marker
    const mainMarker = L.marker(baseCoords).addTo(currentLeafletMap);
    mainMarker.bindPopup(`<b>📍 ${trip.destinationCity}</b><br>${trip.title}`).openPopup();

    // Plot slight offset route markers for activities
    const routePoints = [baseCoords];
    const days = trip.days || [];
    let actIndex = 1;

    days.forEach(day => {
      (day.items || []).forEach((item, idx) => {
        // Generate small local offsets for visual activity points
        const offsetLat = baseCoords[0] + (idx % 2 === 0 ? 0.008 : -0.009) * (actIndex * 0.7);
        const offsetLng = baseCoords[1] + (idx % 2 === 0 ? 0.012 : -0.011) * (actIndex * 0.7);
        const pt = [offsetLat, offsetLng];
        routePoints.push(pt);

        const marker = L.circleMarker(pt, {
          radius: 7,
          fillColor: '#38bdf8',
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9
        }).addTo(currentLeafletMap);

        marker.bindPopup(`<b>Day ${day.dayNumber}: ${item.title}</b><br>⏰ ${item.startTime} • ${item.transportMode}`);
        actIndex++;
      });
    });

    // Draw route polyline if activities exist
    if (routePoints.length > 1) {
      L.polyline(routePoints, {
        color: '#0ea5e9',
        weight: 3,
        opacity: 0.8,
        dashArray: '6, 8'
      }).addTo(currentLeafletMap);
    }

    setTimeout(() => {
      if (currentLeafletMap) currentLeafletMap.invalidateSize();
    }, 200);
  } catch (err) {
    console.warn('Map initialization note:', err);
  }
}

// --- AI Auto-Generator Handlers ---
function openAiGeneratorModal() {
  if (!AppState.activeTripId) {
    showToast('Please select or create a trip first.', 'info');
    return;
  }
  document.getElementById('ai-generator-modal').classList.remove('hidden');
}

function closeAiGeneratorModal() {
  document.getElementById('ai-generator-modal').classList.add('hidden');
}

async function handleAiGenerateSubmit(e) {
  e.preventDefault();
  const tripId = AppState.activeTripId;
  const styleEl = document.querySelector('input[name="travelStyle"]:checked');
  const travelStyle = styleEl ? styleEl.value : 'Adventure';
  const budgetTier = document.getElementById('ai-budget-tier').value;

  const btn = document.getElementById('btn-submit-ai-gen');
  btn.disabled = true;
  btn.innerHTML = '<span>⏳ Curating Plan...</span>';

  try {
    const res = await API.trips.autoGenerate(tripId, { travelStyle, budgetTier });
    if (res.success) {
      showToast(res.message, 'success');
      closeAiGeneratorModal();
      await loadActiveTripDetails(tripId);
      await loadTrips();
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>✨ Generate Itinerary</span>';
  }
}

// --- Packing Checklist Handlers ---
async function openPackingListModal() {
  if (!AppState.activeTripId) {
    showToast('Please select or create a trip first.', 'info');
    return;
  }
  const modal = document.getElementById('packing-list-modal');
  const content = document.getElementById('packing-checklist-content');
  content.innerHTML = '<div style="padding:1.5rem; text-align:center; color:var(--text-dim);">Analyzing destination climate and preparing checklist...</div>';
  modal.classList.remove('hidden');

  try {
    const res = await API.trips.getPackingChecklist(AppState.activeTripId);
    if (res.success && res.checklist) {
      document.getElementById('packing-modal-subtitle').textContent = `Targeting ${res.city} (${res.weather?.temperature}°C • ${res.weather?.condition})`;
      renderPackingChecklist(res.checklist);
    }
  } catch (err) {
    showToast('Failed to load packing checklist: ' + err.message, 'error');
  }
}

function closePackingListModal() {
  document.getElementById('packing-list-modal').classList.add('hidden');
}

function renderPackingChecklist(checklist) {
  const container = document.getElementById('packing-checklist-content');

  const categories = [
    { key: 'essentials', title: '📋 Essential Documents & Cash', items: checklist.essentials || [] },
    { key: 'clothing', title: '👕 Climate-Aware Clothing', items: checklist.clothing || [] },
    { key: 'electronics', title: '🔌 Gadgets & Chargers', items: checklist.electronics || [] },
    { key: 'destinationSpecific', title: '🎒 Weather & Destination Gear', items: checklist.destinationSpecific || [] }
  ];

  container.innerHTML = categories.map(cat => `
    <div class="packing-cat-card">
      <div class="packing-cat-title">${cat.title}</div>
      <div class="checklist-items">
        ${cat.items.map((item, i) => `
          <label class="checklist-row">
            <input type="checkbox" onchange="this.parentElement.classList.toggle('checked', this.checked)">
            <span>${item.name}</span>
          </label>
        `).join('')}
      </div>
    </div>
  `).join('');
}

// =============================================================================
// 💱 Multi-Currency Converter Module
// =============================================================================

// Fixed INR exchange rates (approximate 2026 rates)
const CURRENCY_RATES = [
  { code: 'USD', name: 'US Dollar',        symbol: '$',  flag: '🇺🇸', rate: 0.01195 },
  { code: 'EUR', name: 'Euro',             symbol: '€',  flag: '🇪🇺', rate: 0.01105 },
  { code: 'GBP', name: 'British Pound',    symbol: '£',  flag: '🇬🇧', rate: 0.00945 },
  { code: 'JPY', name: 'Japanese Yen',     symbol: '¥',  flag: '🇯🇵', rate: 1.8050  },
  { code: 'AED', name: 'UAE Dirham',       symbol: 'د.إ',flag: '🇦🇪', rate: 0.04390 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬', rate: 0.01600 },
  { code: 'AUD', name: 'Australian Dollar',symbol: 'A$', flag: '🇦🇺', rate: 0.01850 },
  { code: 'CAD', name: 'Canadian Dollar',  symbol: 'C$', flag: '🇨🇦', rate: 0.01620 },
  { code: 'THB', name: 'Thai Baht',        symbol: '฿',  flag: '🇹🇭', rate: 0.43500 },
  { code: 'MYR', name: 'Malaysian Ringgit',symbol: 'RM', flag: '🇲🇾', rate: 0.05600 }
];

function initCurrencyConverter() {
  const input = document.getElementById('currency-inr-input');
  const useTripBtn = document.getElementById('btn-use-trip-budget');

  // Initial render
  convertAndRender(parseFloat(input.value) || 30000);

  // Live update on input
  input.addEventListener('input', () => {
    const amount = parseFloat(input.value);
    if (!isNaN(amount) && amount > 0) {
      convertAndRender(amount);
    }
  });

  // Populate from trip budget
  useTripBtn.addEventListener('click', () => {
    if (!AppState.activeTripId) {
      showToast('Select a trip first to use its budget.', 'info');
      return;
    }
    const activeTrip = AppState.trips.find(t => t.id === AppState.activeTripId);
    if (activeTrip && activeTrip.totalBudget > 0) {
      input.value = activeTrip.totalBudget;
      convertAndRender(activeTrip.totalBudget);
      showToast(`Budget loaded: ₹${activeTrip.totalBudget.toLocaleString()}`, 'success');
    } else {
      showToast('No budget set for the selected trip.', 'info');
    }
  });
}

function convertAndRender(inrAmount) {
  const grid = document.getElementById('currency-results-grid');
  if (!grid) return;

  grid.innerHTML = CURRENCY_RATES.map(currency => {
    const converted = (inrAmount * currency.rate).toFixed(2);
    const formattedConverted = parseFloat(converted).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    const rateDisplay = `1 ₹ = ${currency.rate.toFixed(5)} ${currency.code}`;

    return `
      <div class="currency-result-card" title="${rateDisplay}">
        <div class="currency-flag-code">
          <span class="currency-flag">${currency.flag}</span>
          <span class="currency-code-badge">${currency.code}</span>
        </div>
        <div class="currency-converted-amount">${currency.symbol}${formattedConverted}</div>
        <div class="currency-name">${currency.name}</div>
        <div class="currency-rate-note">${rateDisplay}</div>
      </div>
    `;
  }).join('');
}

// Initialize currency converter
let _currencyInited = false;
document.addEventListener('DOMContentLoaded', () => {
  // Pre-initialize on page load
  if (document.getElementById('currency-inr-input') && !_currencyInited) {
    _currencyInited = true;
    setTimeout(initCurrencyConverter, 200);
  }
  // Also observe nav-link click for budget tab
  document.addEventListener('click', (e) => {
    const navBtn = e.target.closest('.nav-link[data-tab="tab-budget"]');
    if (navBtn && !_currencyInited) {
      _currencyInited = true;
      setTimeout(initCurrencyConverter, 100);
    }
  });
});

