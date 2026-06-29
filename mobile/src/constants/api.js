import Config from 'react-native-config';

// `react-native-config` exposes the .env values declared at the project root.
// In __DEV__ (Metro / debug build) the Android emulator reaches the host
// machine via 10.0.2.2; on iOS sim and physical devices in dev we use the
// local IP. The production build uses API_URL from .env, falling back to the
// deployed Render backend if the env var is missing.
const DEV_API_URL = 'https://green-yatra-backend.onrender.com/api/v1';

export const API_BASE_URL = __DEV__
  ? DEV_API_URL
  : (Config.API_URL || 'https://green-yatra-backend.onrender.com/api/v1');

export const ENDPOINTS = {
  REGISTER: '/auth/register',
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REFRESH_TOKEN: '/auth/refresh-token',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: (token) => `/auth/reset-password/${token}`,
  ME: '/auth/me',
  PRODUCTS: '/products',
  PRODUCT_DETAIL: (id) => `/products/${id}`,
  PRODUCTS_BRANCH_MINE: '/products/branch/mine',
  ANALYTICS_BRANCH: '/analytics/branch',
  PLANTS: '/plants',
  CARBON_CALCULATE: '/carbon/calculate',
  CARBON_HISTORY: '/carbon/history',
  ORDERS: '/orders',
  ORDERS_BRANCH: '/orders/branch/all',
  LOCATIONS: '/locations',
  STATE_ANALYTICS: (name) => `/analytics/state/${encodeURIComponent(name)}`,
  STATE_CITIES: (name) => `/analytics/state/${encodeURIComponent(name)}/cities`,
  STATE_LEADERBOARD: (name) => `/analytics/state/${encodeURIComponent(name)}/leaderboard`,
};
