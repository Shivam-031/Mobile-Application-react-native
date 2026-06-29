'use client';
import { useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip,
  Table, TableBody, TableCell, TableHead, TableRow, LinearProgress,
} from '@mui/material';
import AdminLayout from '../../components/common/AdminLayout';
import ResponsiveTable from '../../components/common/ResponsiveTable';

// Placeholder data — the live /states endpoint isn't wired yet, so we surface
// the curated list rather than fabricate a separate mock service.
const STATES_DATA = [
  { name: 'Maharashtra', products: 24, orders: 120, carbon: 1200, plants: 500, revenue: 48000, branches: 3, emoji: '🏙️' },
  { name: 'Rajasthan', products: 18, orders: 85, carbon: 860, plants: 310, revenue: 32000, branches: 2, emoji: '🏜️' },
  { name: 'Kerala', products: 16, orders: 72, carbon: 780, plants: 890, revenue: 28000, branches: 2, emoji: '🌴' },
  { name: 'Gujarat', products: 14, orders: 63, carbon: 640, plants: 340, revenue: 24000, branches: 2, emoji: '🦁' },
  { name: 'Karnataka', products: 14, orders: 58, carbon: 580, plants: 720, revenue: 22000, branches: 2, emoji: '🌿' },
  { name: 'Tamil Nadu', products: 12, orders: 51, carbon: 520, plants: 640, revenue: 19000, branches: 1, emoji: '🎭' },
  { name: 'Delhi', products: 10, orders: 45, carbon: 380, plants: 210, revenue: 16000, branches: 1, emoji: '🏛️' },
  { name: 'West Bengal', products: 8, orders: 38, carbon: 320, plants: 560, revenue: 13000, branches: 1, emoji: '🐯' },
  { name: 'Madhya Pradesh', products: 8, orders: 32, carbon: 290, plants: 420, revenue: 11000, branches: 1, emoji: '🌳' },
  { name: 'Assam', products: 6, orders: 24, carbon: 240, plants: 640, revenue: 8500, branches: 1, emoji: '🍵' },
];

const maxCarbon = Math.max(...STATES_DATA.map((s) => s.carbon));
const maxPlants = Math.max(...STATES_DATA.map((s) => s.plants));
const maxRevenue = Math.max(...STATES_DATA.map((s) => s.revenue));

export default function StatesPage() {
  const [selected, setSelected] = useState(null);

  const totals = {
    products: STATES_DATA.reduce((a, s) => a + s.products, 0),
    carbon: STATES_DATA.reduce((a, s) => a + s.carbon, 0),
    revenue: STATES_DATA.reduce((a, s) => a + s.revenue, 0),
    plants: STATES_DATA.reduce((a, s) => a + s.plants, 0),
  };

  return (
    <AdminLayout>
      <Box mb={3}>
        <Typography variant="h4" color="primary" sx={{ fontSize: { xs: 24, md: 32 } }}>🗺️ State Management</Typography>
        <Typography color="text.secondary" mt={0.5}>India-wide green impact overview by state</Typography>
      </Box>

      {/* Totals */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'States Active', value: STATES_DATA.length, emoji: '🗺️', color: '#2F6B3F' },
          { label: 'Total Products', value: totals.products, emoji: '🏺', color: '#795548' },
          { label: 'Total CO₂ Saved', value: `${totals.carbon} kg`, emoji: '🌍', color: '#4CAF50' },
          { label: 'Total Revenue', value: `₹${(totals.revenue/100000).toFixed(1)}L`, emoji: '💰', color: '#FF9800' },
        ].map((s) => (
          <Grid item xs={6} md={3} key={s.label}>
            <Card sx={{ borderTop: `3px solid ${s.color}`, textAlign: 'center' }}>
              <CardContent>
                <Typography sx={{ fontSize: 32 }}>{s.emoji}</Typography>
                <Typography variant="h5" fontWeight={900} sx={{ color: s.color }}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* State Table — ResponsiveTable preserves the click-to-select behaviour on mobile */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <ResponsiveTable
            headers={['State', 'Branches', 'Products', 'Orders', 'CO₂ Saved', 'Plant Species', 'Revenue']}
            rows={STATES_DATA}
            rowKey={(s) => s.name}
            loading={false}
            emptyMessage="No states"
            renderRow={(state, i) => (
              <TableRow
                hover
                onClick={() => setSelected(selected === state.name ? null : state.name)}
                sx={{ cursor: 'pointer', backgroundColor: selected === state.name ? '#2F6B3F08' : 'transparent' }}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography sx={{ fontSize: 24 }}>{state.emoji}</Typography>
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{state.name}</Typography>
                      <Chip label={`#${i + 1}`} size="small" sx={{ height: 18, fontSize: 10, backgroundColor: i < 3 ? '#FFD70030' : '#f0f0f0' }} />
                    </Box>
                  </Box>
                </TableCell>
                <TableCell><Chip label={state.branches} size="small" color="primary" /></TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{state.products}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{state.orders}</TableCell>
                <TableCell>
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#2F6B3F' }}>{state.carbon} kg</Typography>
                    <LinearProgress variant="determinate" value={(state.carbon / maxCarbon) * 100} sx={{ height: 4, borderRadius: 2, mt: 0.5, '& .MuiLinearProgress-bar': { backgroundColor: '#2F6B3F' } }} />
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#4CAF50' }}>{state.plants}</Typography>
                    <LinearProgress variant="determinate" value={(state.plants / maxPlants) * 100} sx={{ height: 4, borderRadius: 2, mt: 0.5, '& .MuiLinearProgress-bar': { backgroundColor: '#4CAF50' } }} />
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#795548' }}>₹{state.revenue.toLocaleString()}</Typography>
                    <LinearProgress variant="determinate" value={(state.revenue / maxRevenue) * 100} sx={{ height: 4, borderRadius: 2, mt: 0.5, '& .MuiLinearProgress-bar': { backgroundColor: '#795548' } }} />
                  </Box>
                </TableCell>
              </TableRow>
            )}
            renderMobileCard={(state, i) => (
              <Box
                onClick={() => setSelected(selected === state.name ? null : state.name)}
                sx={{
                  cursor: 'pointer',
                  backgroundColor: selected === state.name ? '#2F6B3F08' : 'transparent',
                  borderRadius: 1,
                  p: 0.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Typography sx={{ fontSize: 28 }}>{state.emoji}</Typography>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 15 }} noWrap>{state.name}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.25, alignItems: 'center' }}>
                      <Chip label={`#${i + 1}`} size="small" sx={{ height: 18, fontSize: 10, backgroundColor: i < 3 ? '#FFD70030' : '#f0f0f0' }} />
                      <Chip label={`${state.branches} branches`} size="small" color="primary" sx={{ fontSize: 10, height: 18 }} />
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography sx={{ fontWeight: 900, fontSize: 15, color: '#795548' }}>₹{(state.revenue / 1000).toFixed(0)}k</Typography>
                    <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>revenue</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, fontSize: 12, color: 'text.secondary', mb: 1, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: '#2F6B3F' }}>🌍 {state.carbon} kg CO₂</span>
                  <span>📦 {state.products}</span>
                  <span>🛒 {state.orders}</span>
                  <span style={{ fontWeight: 600, color: '#4CAF50' }}>🌿 {state.plants}</span>
                </Box>
                {/* Mobile carries the same progress bars the desktop table has,
                    so the comparison between states stays legible on small screens */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'text.secondary' }}>
                      <span>CO₂</span>
                      <span style={{ color: '#2F6B3F', fontWeight: 700 }}>{state.carbon} kg</span>
                    </Box>
                    <LinearProgress variant="determinate" value={(state.carbon / maxCarbon) * 100} sx={{ height: 4, borderRadius: 2, '& .MuiLinearProgress-bar': { backgroundColor: '#2F6B3F' } }} />
                  </Box>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'text.secondary' }}>
                      <span>Plants</span>
                      <span style={{ color: '#4CAF50', fontWeight: 700 }}>{state.plants}</span>
                    </Box>
                    <LinearProgress variant="determinate" value={(state.plants / maxPlants) * 100} sx={{ height: 4, borderRadius: 2, '& .MuiLinearProgress-bar': { backgroundColor: '#4CAF50' } }} />
                  </Box>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'text.secondary' }}>
                      <span>Revenue</span>
                      <span style={{ color: '#795548', fontWeight: 700 }}>₹{state.revenue.toLocaleString()}</span>
                    </Box>
                    <LinearProgress variant="determinate" value={(state.revenue / maxRevenue) * 100} sx={{ height: 4, borderRadius: 2, '& .MuiLinearProgress-bar': { backgroundColor: '#795548' } }} />
                  </Box>
                </Box>
              </Box>
            )}
          />
        </CardContent>
      </Card>
    </AdminLayout>
  );
}