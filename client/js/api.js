/**
 * WanderPlan — Centralized API Client
 * Connects Frontend UI to Express.js Server-Side Endpoints
 */

// Auto-detect backend URL from ?api= query parameter (e.g. ?api=https://wanderplan-api.onrender.com)
try {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('api')) {
    const rawApi = urlParams.get('api');
    if (rawApi) {
      localStorage.setItem('wanderplan_api_url', rawApi.trim());
    }
  }
} catch (_) {}

window.setBackendUrl = function(url) {
  if (url) {
    localStorage.setItem('wanderplan_api_url', url.trim());
    window.location.reload();
  } else {
    localStorage.removeItem('wanderplan_api_url');
    window.location.reload();
  }
};

// Dynamic API Base URL (Supports Localhost, Render, and Vercel deployments)
const customBackendUrl = window.WANDERPLAN_API_URL || localStorage.getItem('wanderplan_api_url');
const API_BASE_URL = customBackendUrl
  ? (customBackendUrl.endsWith('/api') ? customBackendUrl : `${customBackendUrl.replace(/\/+$/, '')}/api`)
  : (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
      ? `${window.location.origin}/api`
      : '/api');

// --- Toast Alerts ---
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';

  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// --- Request Wrapper ---
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('wanderplan_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.message || `Request failed with status ${response.status}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err);
    throw err;
  }
}

// --- API Service Methods ---
const API = {
  // Auth & User Profile CRUD
  auth: {
    login: (credentials) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    register: (userData) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
    getMe: () => apiRequest('/auth/me'),
    getProfile: () => apiRequest('/auth/profile'),
    getAllUsers: () => apiRequest('/auth/users'),
    updateProfile: (profileData) => apiRequest('/auth/profile', { method: 'PUT', body: JSON.stringify(profileData) }),
    changePassword: (pwdData) => apiRequest('/auth/change-password', { method: 'PUT', body: JSON.stringify(pwdData) }),
    deleteAccount: () => apiRequest('/auth/account', { method: 'DELETE' })
  },

  // Destinations & Weather
  destinations: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/destinations${query ? '?' + query : ''}`);
    },
    getById: (id) => apiRequest(`/destinations/${id}`),
    getWeather: (id) => apiRequest(`/destinations/${id}/weather`),
    getReviews: (id) => apiRequest(`/destinations/${id}/reviews`),
    addReview: (id, reviewData) => apiRequest(`/destinations/${id}/reviews`, {
      method: 'POST',
      body: JSON.stringify(reviewData)
    })
  },

  // Trips & Dynamic Itinerary
  trips: {
    getMyTrips: () => apiRequest('/trips'),
    create: (tripData) => apiRequest('/trips', { method: 'POST', body: JSON.stringify(tripData) }),
    getDetails: (id) => apiRequest(`/trips/${id}`),
    update: (id, updates) => apiRequest(`/trips/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    delete: (id) => apiRequest(`/trips/${id}`, { method: 'DELETE' }),

    // Day activities
    addActivity: (tripId, dayId, itemData) => apiRequest(`/trips/${tripId}/days/${dayId}/items`, {
      method: 'POST',
      body: JSON.stringify(itemData)
    }),
    updateActivity: (tripId, itemId, itemData) => apiRequest(`/trips/${tripId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(itemData)
    }),
    deleteActivity: (tripId, itemId) => apiRequest(`/trips/${tripId}/items/${itemId}`, {
      method: 'DELETE'
    }),
    reorderActivities: (tripId, dayId, itemIds) => apiRequest(`/trips/${tripId}/days/${dayId}/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ itemIds })
    }),

    // Budget & Expenses
    getBudget: (tripId) => apiRequest(`/trips/${tripId}/expenses`),
    addExpense: (tripId, expData) => apiRequest(`/trips/${tripId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(expData)
    }),
    deleteExpense: (tripId, expId) => apiRequest(`/trips/${tripId}/expenses/${expId}`, {
      method: 'DELETE'
    }),

    // Sharing
    toggleShare: (tripId, isPublic) => apiRequest(`/trips/${tripId}/share`, {
      method: 'POST',
      body: JSON.stringify({ isPublic })
    }),
    getPublicTrip: (shareToken) => apiRequest(`/shared/trip/${shareToken}`),

    // AI Itinerary Auto-Generator & Packing
    autoGenerate: (tripId, options) => apiRequest(`/trips/${tripId}/auto-generate`, {
      method: 'POST',
      body: JSON.stringify(options)
    }),
    getPackingChecklist: (tripId) => apiRequest(`/trips/${tripId}/packing-checklist`)
  }
};
