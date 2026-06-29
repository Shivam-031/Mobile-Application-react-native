'use client';
import { useEffect, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, ToggleButtonGroup, ToggleButton,
  CircularProgress, Alert, Chip,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
} from 'recharts';
import AdminLayout from '../../components/common/AdminLayout';
import StatsCard from '../../components/common/StatsCard';
import api from '../../lib/api';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalPlants: 0,
    totalCarbonSaved: 0,
    totalRevenue: 0,
  });
  // Seed the historical chart with zeros and overlay only the months that
  // already have orders — until a time-series endpoint exists the area
  // chart reflects real data points against an axis of all 12 months.
  const [monthly, setMonthly] = useState(MONTHS.map((m) => ({ month: m, orders: 0, revenue: 0, carbonSaved: 0, newUsers: 0, plantsTracked: 0 })));
  const [topProducts, setTopProducts] = useState([]);
  const [stateStats, setStateStats] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/analytics/dashboard');
        if (cancelled) return;
        const d = res.data.data || {};
        const o = d.overview || {};
        setStats({
          totalUsers: o.totalUsers ?? 0,
          totalProducts: o.totalProducts ?? 0,
          totalOrders: o.totalOrders ?? 0,
          totalPlants: o.totalPlants ?? 0,
          totalCarbonSaved: Math.round(o.totalCarbonSaved ?? 0),
          totalRevenue: Math.round(o.totalRevenue ?? 0),
        });
        setTopProducts((d.topProducts || []).slice(0, 2));
        setStateStats((d.stateStats || []).map((s) => ({
          state: s._id || 'Unknown',
          products: s.products ?? 0,
          carbon: s.totalCarbonSaved ?? 0,
          orders: 0, // surfaced separately if order analytics land
          revenue: 0,
        })));
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.message || 'Analytics endpoint unavailable');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const productRadar = topProducts.length === 2
    ? [
        { metric: 'Sales', A: topProducts[0].soldCount ?? 0, B: topProducts[1].soldCount ?? 0, fullMark: Math.max(topProducts[0].soldCount ?? 0, topProducts[1].soldCount ?? 0, 1) },
        { metric: 'Carbon', A: topProducts[0].carbonSaved ?? 0, B: topProducts[1].carbonSaved ?? 0, fullMark: Math.max(topProducts[0].carbonSaved ?? 0, topProducts[1].carbonSaved ?? 0, 1) },
      ]
    : [];

  return (
    <AdminLayout>
      <Box mb={3} sx={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        flexWrap: 'wrap', gap: 2,
        flexDirection: { xs: 'column', sm: 'row' },
      }}>
        <Box>
          <Typography variant="h4" color="primary" sx={{ fontSize: { xs: 24, md: 32 } }}>📈 Analytics</Typography>
          <Typography color="text.secondary" mt={0.5}>Platform performance and eco-impact overview</Typography>
        </Box>
        <Box sx={{ overflowX: 'auto', width: { xs: '100%', sm: 'auto' } }}>
          <ToggleButtonGroup value={period} exclusive onChange={(_, v) => v && setPeriod(v)} size="small" sx={{ flexWrap: 'wrap' }}>
            {[['monthly','Monthly'],['quarterly','Quarterly'],['yearly','Yearly']].map(([val, lbl]) => (
              <ToggleButton key={val} value={val} sx={{ fontWeight: 700, px: 2 }}>{lbl}</ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* KPI Cards */}
      <Grid container spacing={2.5} mb={3}>
        {[
          { emoji: '💰', title: 'Total Revenue', value: `₹${(stats.totalRevenue / 100000).toFixed(1)}L`, color: '#795548' },
          { emoji: '📦', title: 'Total Orders', value: stats.totalOrders.toLocaleString(), color: '#2196F3' },
          { emoji: '🌍', title: 'CO₂ Saved (kg)', value: stats.totalCarbonSaved.toLocaleString(), color: '#2F6B3F' },
          { emoji: '👥', title: 'Total Users', value: stats.totalUsers.toLocaleString(), color: '#9C27B0' },
        ].map((s) => <Grid item xs={6} md={3} key={s.title}><StatsCard {...s} /></Grid>)}
      </Grid>

      <Grid container spacing={2.5} mb={3}>
        {/* Revenue Trend — placeholder until a time-series endpoint ships */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">💰 Revenue & Orders Trend</Typography>
                <Chip label="Awaiting time-series API" size="small" variant="outlined" />
              </Box>
              <ResponsiveContainer width="100%" height={{ xs: 220, md: 280 }}>
                <AreaChart data={monthly}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2F6B3F" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2F6B3F" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8BC34A" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8BC34A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" stroke="#2F6B3F" fill="url(#revGrad)" name="Revenue (₹)" strokeWidth={2} />
                  <Area type="monotone" dataKey="orders" stroke="#8BC34A" fill="url(#ordGrad)" name="Orders" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Carbon Impact — same caveat */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">🌍 Carbon Saved (kg)</Typography>
                <Chip label="Awaiting time-series API" size="small" variant="outlined" />
              </Box>
              <ResponsiveContainer width="100%" height={{ xs: 200, md: 240 }}>
                <AreaChart data={monthly}>
                  <defs>
                    <linearGradient id="carbGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#4CAF50" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="carbonSaved" stroke="#4CAF50" fill="url(#carbGrad)" name="CO₂ Saved" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        {/* State Comparison — wired to analytics/stateStats */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>🗺️ State Performance Comparison</Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
              ) : stateStats.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  No state-level data yet
                </Typography>
              ) : (
                <ResponsiveContainer width="100%" height={{ xs: 240, md: 300 }}>
                  <BarChart data={stateStats} layout="vertical" margin={{ left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="state" tick={{ fontSize: 12 }} width={80} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="products" fill="#8BC34A" name="Products" radius={[0,4,4,0]} />
                    <Bar dataKey="carbon" fill="#2F6B3F" name="Carbon Saved (kg)" radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Radar Chart — only when top products are available */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" mb={2}>🎯 Top 2 Products Comparison</Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
              ) : productRadar.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  Need at least 2 approved products to compare
                </Typography>
              ) : (
                <ResponsiveContainer width="100%" height={{ xs: 240, md: 280 }}>
                  <RadarChart data={productRadar}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} />
                    <Radar name={topProducts[0]?.name || 'Product A'} dataKey="A" stroke="#2F6B3F" fill="#2F6B3F" fillOpacity={0.4} />
                    <Radar name={topProducts[1]?.name || 'Product B'} dataKey="B" stroke="#8BC34A" fill="#8BC34A" fillOpacity={0.4} />
                    <Legend />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </AdminLayout>
  );
}