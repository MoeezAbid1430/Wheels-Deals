const GOOGLE_MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
const GOOGLE_MAPS_CALLBACK = '__wheelsDealsGoogleMapsReady';
const GOOGLE_MAPS_SCRIPT_ID = 'wheels-deals-google-maps';

export const repairShopCategories = [
  { id: 'workshops', label: 'Workshops', type: 'car_repair', keyword: 'mechanic workshop' },
  { id: 'oil-change', label: 'Oil Change', type: 'car_repair', keyword: 'oil change' },
  { id: 'car-wash', label: 'Car Washes', type: 'car_wash', keyword: 'car wash detailing' },
  { id: 'dealerships', label: 'Dealerships', type: 'car_dealer', keyword: 'car dealership' },
  { id: 'rent-a-car', label: 'Rent a Car', type: 'car_rental', keyword: 'rent a car car rental' },
  { id: 'sell-a-car', label: 'Sell a Car Help', type: 'car_dealer', keyword: 'sell car dealer used cars consignment' },
  { id: 'tyres', label: 'Tyres', type: 'car_repair', keyword: 'tyre shop wheel alignment' },
  { id: 'inspection', label: 'Inspection', type: 'car_repair', keyword: 'vehicle inspection diagnostics' },
  { id: 'towing', label: 'Towing', type: 'car_repair', keyword: 'towing roadside assistance' },
];

export const hasGoogleMapsApiKey = Boolean(GOOGLE_MAPS_KEY);

const loadGoogleMaps = () => {
  if (!GOOGLE_MAPS_KEY) {
    return Promise.reject(new Error('Missing REACT_APP_GOOGLE_MAPS_API_KEY'));
  }

  if (window.google?.maps?.places) return Promise.resolve(window.google);

  const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);
  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(window.google), { once: true });
      existingScript.addEventListener('error', reject, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    window[GOOGLE_MAPS_CALLBACK] = () => resolve(window.google);
    const script = document.createElement('script');
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places&callback=${GOOGLE_MAPS_CALLBACK}`;
    script.async = true;
    script.defer = true;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const normalizePlace = (place, index, origin, category) => {
  const lat = typeof place.geometry?.location?.lat === 'function' ? place.geometry.location.lat() : place.lat;
  const lng = typeof place.geometry?.location?.lng === 'function' ? place.geometry.location.lng() : place.lng;
  return {
    id: place.place_id || place.id || `${category.id}-${index}`,
    rank: index + 1,
    name: place.name,
    city: place.city || 'Near you',
    area: place.vicinity || place.area || 'Local area',
    address: place.vicinity || place.address || place.formatted_address || 'Address available in Maps',
    lat,
    lng,
    distanceKm: place.distanceKm || null,
    rating: place.rating || 0,
    reviews: place.user_ratings_total || place.reviews || 0,
    completedJobs: place.completedJobs || 0,
    communityVotes: place.communityVotes || 0,
    responseTime: place.responseTime || 'Map result',
    verified: Boolean(place.verified || place.business_status === 'OPERATIONAL'),
    openNow: Boolean(place.opening_hours?.open_now ?? place.openNow),
    specialties: [category.label],
    socialLinks: place.socialLinks || {},
    videos: place.videos || [],
    recentReviews: place.recentReviews || [],
    recentQuestions: place.recentQuestions || [],
    source: origin ? 'Google Maps API' : 'Local directory',
  };
};

export const mapsService = {
  getCategory(categoryId) {
    return repairShopCategories.find((category) => category.id === categoryId) || repairShopCategories[0];
  },

  async findNearbyAutomotivePlaces({ lat, lng, categoryId = 'workshops', radius = 8000 }) {
    const apiQuery = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      category: categoryId,
      radius: String(radius),
    });

    try {
      const apiResponse = await fetch(`${API_BASE_URL}/integrations/maps/places?${apiQuery.toString()}`);
      if (apiResponse.ok) {
        const payload = await apiResponse.json();
        if (payload.places?.length) return payload.places;
      }
    } catch {
      // Fall through to the browser Maps SDK when the local API is not running.
    }

    const category = this.getCategory(categoryId);
    const google = await loadGoogleMaps();
    const location = new google.maps.LatLng(lat, lng);
    const serviceNode = document.createElement('div');
    const places = new google.maps.places.PlacesService(serviceNode);

    return new Promise((resolve, reject) => {
      places.nearbySearch(
        {
          location,
          radius,
          type: category.type,
          keyword: category.keyword,
          rankBy: undefined,
        },
        (results, status) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
            reject(new Error(`Google Places search failed: ${status}`));
            return;
          }
          resolve(results.slice(0, 12).map((place, index) => normalizePlace(place, index, true, category)));
        },
      );
    });
  },

  async listRepairShops(query = {}) {
    const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== ''));
    const response = await fetch(`${API_BASE_URL}/repair-shops?${params.toString()}`);
    if (!response.ok) throw new Error('Repair shop API is unavailable.');
    return response.json();
  },

  async getRepairShop(id) {
    const response = await fetch(`${API_BASE_URL}/repair-shops/${id}`);
    if (!response.ok) throw new Error('Repair shop profile is unavailable.');
    return response.json();
  },

  async getRepairShopReviews(id) {
    const response = await fetch(`${API_BASE_URL}/repair-shops/${id}/reviews`);
    if (!response.ok) throw new Error('Repair shop reviews are unavailable.');
    return response.json();
  },

  async createRepairShopReview(id, payload) {
    const response = await fetch(`${API_BASE_URL}/repair-shops/${id}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: this.getAuthHeader() },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Could not save review.');
    return response.json();
  },

  async updateRepairShopSocials(id, payload) {
    const response = await fetch(`${API_BASE_URL}/repair-shops/${id}/socials`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: this.getAuthHeader() },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Could not save social links.');
    return response.json();
  },

  async getRepairShopQuestions(id) {
    const response = await fetch(`${API_BASE_URL}/repair-shops/${id}/questions`);
    if (!response.ok) throw new Error('Repair shop questions are unavailable.');
    return response.json();
  },

  async askRepairShopQuestion(id, payload) {
    const response = await fetch(`${API_BASE_URL}/repair-shops/${id}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: this.getAuthHeader() },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Could not send question.');
    return response.json();
  },

  async answerRepairShopQuestion(id, questionId, payload) {
    const response = await fetch(`${API_BASE_URL}/repair-shops/${id}/questions/${questionId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: this.getAuthHeader() },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Could not save answer.');
    return response.json();
  },

  async getRepairShopVideos(id) {
    const response = await fetch(`${API_BASE_URL}/repair-shops/${id}/videos`);
    if (!response.ok) throw new Error('Repair shop videos are unavailable.');
    return response.json();
  },

  async addRepairShopVideo(id, payload) {
    const response = await fetch(`${API_BASE_URL}/repair-shops/${id}/videos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: this.getAuthHeader() },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Could not save service video.');
    return response.json();
  },

  getAuthHeader() {
    const token = window.localStorage.getItem('wheels_deals_auth_token');
    return token ? `Bearer ${token}` : '';
  },

  async getRepairShopRankings(query = {}) {
    const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== ''));
    const response = await fetch(`${API_BASE_URL}/rankings/repair-shops?${params.toString()}`);
    if (!response.ok) throw new Error('Repair shop ranking API is unavailable.');
    return response.json();
  },

  getDirectionsUrl(shop) {
    const query = shop.lat && shop.lng ? `${shop.lat},${shop.lng}` : `${shop.name} ${shop.address || shop.city}`;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
  },

  getSearchUrl({ city = '', categoryId = 'workshops' } = {}) {
    const category = this.getCategory(categoryId);
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${category.keyword} ${city}`.trim())}`;
  },
};
