const express = require('express');
const router = express.Router();
const Product = require('../../products/model/Product');
const Order = require('../../orders/model/Order');
const Plant = require('../../plants/model/Plant');
const User = require('../../users/model/User');
const { protect, authorize } = require('../../../middleware/authMiddleware');

// GET /analytics/dashboard - admin
router.get('/dashboard', protect, authorize('MASTER_ADMIN'), async (req, res) => {
  try {
    const [totalUsers, totalProducts, totalOrders, totalPlants] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Product.countDocuments({ isActive: true }),
      Order.countDocuments(),
      Plant.countDocuments({ isActive: true }),
    ]);

    const carbonData = await Order.aggregate([
      { $group: { _id: null, totalCarbonSaved: { $sum: '$totalCarbonSaved' }, totalRevenue: { $sum: '$totalAmount' } } }
    ]);

    const topProducts = await Product.find({ status: 'approved' }).sort({ soldCount: -1 }).limit(5).select('name soldCount state carbonSaved');
    const stateStats = await Product.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$state', products: { $sum: 1 }, totalCarbonSaved: { $sum: '$carbonSaved' } } },
      { $sort: { products: -1 } },
    ]);

    res.json({
      success: true,
      data: {
        overview: { totalUsers, totalProducts, totalOrders, totalPlants, ...carbonData[0] },
        topProducts,
        stateStats,
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /analytics/branch - employee
router.get('/branch', protect, authorize('EMPLOYEE', 'MASTER_ADMIN'), async (req, res) => {
  try {
    const products = await Product.find({ branchId: req.user._id }).select('name soldCount carbonSaved stock status');
    const totalRevenue = products.reduce((acc, p) => acc + p.soldCount * (p.price || 0), 0);
    const totalCarbon = products.reduce((acc, p) => acc + p.carbonSaved * p.soldCount, 0);

    res.json({
      success: true,
      data: {
        products,
        summary: { totalProducts: products.length, totalCarbon: totalCarbon.toFixed(2) },
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ---- State-level analytics --------------------------------------------------
// Aggregates real data from Product and Order collections. Anything not
// present in the database returns 0 / [] rather than fabricated values —
// better an honest empty screen than invented numbers.
//
// All three routes share the same heavy aggregation via buildStatePayload(),
// so the cities and leaderboard wrappers don't hit Mongo twice.

const TREE_CO2_KG = 20; // 1 tree absorbs ~20 kg CO₂ per year

// Extract a city name from a Product.location free-text string. The schema
// currently stores location as a comma-separated string ("Maharashtra,
// Pune"). The segment after the last comma is treated as the city. Returns
// `null` if no usable city can be parsed — the city list will simply omit
// that product, never invent a city for it.
function cityFromLocation(location) {
  if (!location || typeof location !== 'string') return null;
  const parts = location.split(',').map((p) => p.trim()).filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 1] : null;
}

async function buildStatePayload(stateName) {
  const products = await Product.find({ state: stateName, status: 'approved' }).select(
    'name soldCount price carbonSaved ecoRating category location district',
  );

  // KPIs from products
  const revenue = products.reduce((acc, p) => acc + p.soldCount * (p.price || 0), 0);
  const orders = products.reduce((acc, p) => acc + p.soldCount, 0);
  const ecoProducts = products.length;
  const carbonSaved = +products.reduce((acc, p) => acc + p.soldCount * (p.carbonSaved || 0), 0).toFixed(1);
  const treesPlanted = Math.round(carbonSaved / TREE_CO2_KG);
  const sustainabilityScore = products.length
    ? Math.round((products.reduce((acc, p) => acc + (p.ecoRating || 0) * 20, 0) / products.length))
    : 0;

  const kpis = { revenue, orders, ecoProducts, carbonSaved, treesPlanted, sustainabilityScore };

  // Cities — group products by the city parsed from `location`. We never
  // invent a city; if a product has no parseable city, it's silently dropped
  // from the per-city rollup.
  const byCity = new Map();
  for (const p of products) {
    const city = cityFromLocation(p.location);
    if (!city) continue;
    const bucket = byCity.get(city) || { name: city, revenue: 0, orders: 0, ecoProducts: 0, carbonSaved: 0, treesPlanted: 0, sustainabilityScoreSum: 0, ecoRatingCount: 0 };
    bucket.revenue += p.soldCount * (p.price || 0);
    bucket.orders += p.soldCount;
    bucket.ecoProducts += 1;
    bucket.carbonSaved += p.soldCount * (p.carbonSaved || 0);
    bucket.treesPlanted += (p.soldCount * (p.carbonSaved || 0)) / TREE_CO2_KG;
    bucket.sustainabilityScoreSum += (p.ecoRating || 0) * 20;
    bucket.ecoRatingCount += 1;
    byCity.set(city, bucket);
  }
  const cities = [...byCity.values()].map((c, idx) => ({
    id: `${stateName}-${c.name}-${idx}`,
    name: c.name,
    revenue: c.revenue,
    orders: c.orders,
    ecoProducts: c.ecoProducts,
    carbonSaved: +c.carbonSaved.toFixed(1),
    treesPlanted: Math.round(c.treesPlanted),
    // activeCustomers needs a per-city order join we don't have today; branches
    // needs an employee count in this state — both legitimately 0 until the
    // data is queried separately. No fabricated constants.
    activeCustomers: 0,
    branches: 0,
    growthPct: 0,
    sustainabilityScore: c.ecoRatingCount ? Math.round(c.sustainabilityScoreSum / c.ecoRatingCount) : 0,
    lastUpdated: new Date().toISOString().slice(0, 10),
  }));

  // Orders scoped to this state (shipping address)
  const stateOrders = await Order.find({ 'address.state': stateName }).select(
    'totalAmount totalCarbonSaved createdAt userId',
  );

  // Monthly sales/carbon over the last 12 calendar months.
  const now = new Date();
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyBuckets = Array.from({ length: 12 }, (_, i) => ({
    label: monthLabels[i],
    year: now.getFullYear() - (now.getMonth() < i ? 1 : 0),
    monthIndex: i,
    revenue: 0,
    carbon: 0,
  }));
  for (const o of stateOrders) {
    const m = o.createdAt.getMonth();
    const orderYear = o.createdAt.getFullYear();
    const bucket = monthlyBuckets.find((b) => b.monthIndex === m && b.year === orderYear);
    if (bucket) {
      bucket.revenue += o.totalAmount || 0;
      bucket.carbon += o.totalCarbonSaved || 0;
    }
  }
  const monthly = monthlyBuckets.map(({ label, revenue }) => ({ label, value: Math.round(revenue) }));
  const carbonTrend = monthlyBuckets.map(({ label, carbon, monthIndex, year }) => ({
    label,
    carbon: +carbon.toFixed(1),
    trees: Math.round(carbon / TREE_CO2_KG),
    _sortKey: year * 100 + monthIndex,
  })).sort((a, b) => a._sortKey - b._sortKey).map(({ _sortKey, ...rest }) => rest);

  // Weekly — last 12 weeks (rolling). No data → empty.
  const weeklyStart = new Date(now);
  weeklyStart.setDate(weeklyStart.getDate() - 12 * 7);
  const weeklyBuckets = Array.from({ length: 12 }, (_, i) => ({ label: `W${i + 1}`, value: 0 }));
  for (const o of stateOrders) {
    if (o.createdAt < weeklyStart) continue;
    const weeksAgo = Math.floor((now - o.createdAt) / (7 * 86400_000));
    const idx = 11 - weeksAgo;
    if (idx >= 0 && idx < 12) weeklyBuckets[idx].value += o.totalAmount || 0;
  }
  const weekly = weeklyBuckets.map((b) => ({ label: b.label, value: Math.round(b.value) }));

  // Daily — last 7 days. No data → empty.
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dailyStart = new Date(now);
  dailyStart.setDate(dailyStart.getDate() - 7);
  const dailyBuckets = Array.from({ length: 7 }, (_, i) => ({ label: dayLabels[(now.getDay() - (6 - i) + 7) % 7], value: 0 }));
  for (const o of stateOrders) {
    if (o.createdAt < dailyStart) continue;
    const daysAgo = Math.floor((now - o.createdAt) / 86400_000);
    const idx = 6 - daysAgo;
    if (idx >= 0 && idx < 7) dailyBuckets[idx].value += o.totalAmount || 0;
  }
  const daily = dailyBuckets.map((b) => ({ label: b.label, value: Math.round(b.value) }));

  // Top products — top 6 by soldCount in this state.
  const topProducts = [...products]
    .sort((a, b) => b.soldCount - a.soldCount)
    .slice(0, 6)
    .map((p) => ({
      name: p.name,
      sold: p.soldCount,
      revenue: Math.round(p.soldCount * (p.price || 0)),
    }));

  // Category split — group by category, sum revenue, return percentages.
  const categoryTotals = new Map();
  for (const p of products) {
    const cat = p.category || 'other';
    categoryTotals.set(cat, (categoryTotals.get(cat) || 0) + p.soldCount * (p.price || 0));
  }
  const catSum = [...categoryTotals.values()].reduce((s, v) => s + v, 0);
  const categorySales = catSum > 0
    ? [...categoryTotals.entries()].map(([category, value]) => ({
        category,
        share: Math.round((value / catSum) * 100),
        value: Math.round(value),
      }))
    : [];

  // Customer insights — real distinct-user count from state orders; repeat
  // rate requires per-user order counts and at least 2 orders total before
  // it has any meaning, otherwise return 0.
  const distinctUserIds = new Set(stateOrders.map((o) => String(o.userId)));
  const totalOrdersInState = stateOrders.length;
  const repeatRate = totalOrdersInState >= 2
    ? Math.round(((totalOrdersInState - distinctUserIds.size) / totalOrdersInState) * 100)
    : 0;
  const customerInsights = {
    newCustomers: distinctUserIds.size,
    returningCustomers: totalOrdersInState - distinctUserIds.size,
    repeatRate,
    growthPct: 0,
    // Empty when there's no real per-month customer-count signal. The mobile
    // chart will render an honest zero rather than a fabricated line.
    trend: monthly.slice(0, 6).map((b) => ({ label: b.label, value: 0 })),
  };

  // Leaderboards — top 5 cities per dimension. Empty arrays where the data
  // is insufficient (e.g. growthPct needs ≥ 2 months of history).
  const top5 = (sortFn) => [...cities].sort(sortFn).slice(0, 5);
  const leaderboard = {
    byRevenue: top5((a, b) => b.revenue - a.revenue),
    byOrders: top5((a, b) => b.orders - a.orders),
    byCarbon: top5((a, b) => b.carbonSaved - a.carbonSaved),
    byTrees: top5((a, b) => b.treesPlanted - a.treesPlanted),
    // Growth requires at least 2 months of data points per city. With only
    // product-level revenue (not per-city month-over-month), we don't have
    // enough signal — return an empty list rather than fake a percentage.
    byGrowth: stateOrders.length === 0 ? [] : [],
    bySustainability: top5((a, b) => b.sustainabilityScore - a.sustainabilityScore),
  };

  return {
    state: { name: stateName, lat: 0, lng: 0 },
    kpis,
    analytics: { monthly, weekly, daily, topProducts, categorySales, carbonTrend, customerInsights },
    leaderboard,
    cities,
  };
}

// GET /analytics/state/:name
router.get('/state/:name', protect, async (req, res) => {
  try {
    const stateName = decodeURIComponent(req.params.name);
    if (!stateName || stateName.length > 100) {
      return res.status(400).json({ success: false, message: 'Invalid state name' });
    }
    const data = await buildStatePayload(stateName);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /analytics/state/:name/cities
router.get('/state/:name/cities', protect, async (req, res) => {
  try {
    const stateName = decodeURIComponent(req.params.name);
    const data = await buildStatePayload(stateName);
    res.json({ success: true, data: data.cities });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /analytics/state/:name/leaderboard
router.get('/state/:name/leaderboard', protect, async (req, res) => {
  try {
    const stateName = decodeURIComponent(req.params.name);
    const data = await buildStatePayload(stateName);
    res.json({ success: true, data: data.leaderboard });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;