import api from './apiService';
import { ENDPOINTS } from '../constants/api';

/**
 * State analytics service — backend-only.
 *
 * Each call hits the real `/analytics/state/:name` endpoint(s) and lets
 * axios errors propagate to the caller. The caller (StateDashboard screen)
 * renders an honest empty state on failure rather than fabricated data.
 *
 * Successful responses are memoized so back-navigation within the session
 * is instant; clearStateAnalyticsCache() drops them on logout / pull-to-refresh.
 */
const cache = new Map();

export async function getStateDashboard(stateName) {
  if (cache.has(stateName)) return cache.get(stateName);
  const res = await api.get(ENDPOINTS.STATE_ANALYTICS(stateName));
  const data = res?.data?.data;
  if (!data) throw new Error('Empty state analytics response');
  cache.set(stateName, data);
  return data;
}

export async function getStateCitySales(stateName, filters = {}) {
  const data = await getStateDashboard(stateName);
  return applyFilters(data.cities, filters);
}

export async function getStateLeaderboard(stateName) {
  const data = await getStateDashboard(stateName);
  return data.leaderboard;
}

/** Clear cache (e.g. on logout or when user pulls-to-refresh). */
export function clearStateAnalyticsCache() {
  cache.clear();
}

// --- helpers ---

function applyFilters(cities, filters) {
  let out = cities;
  if (filters.district && filters.district !== 'all') {
    out = out.filter((c) => c.district === filters.district);
  }
  if (filters.sustainabilityTier && filters.sustainabilityTier !== 'all') {
    const min = { platinum: 85, gold: 70, silver: 55 }[filters.sustainabilityTier] || 0;
    out = out.filter((c) => c.sustainabilityScore >= min);
  }
  // 'category' would join against topProducts/categorySales server-side;
  // preserved here so the filter wiring matches what the real endpoint accepts.
  return out;
}
