'use client';
import {
  Box, Grid, Card, CardContent, Typography, Chip, LinearProgress,
  TableCell,
} from '@mui/material';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import AdminLayout from '../../components/common/AdminLayout';
import ResponsiveTable from '../../components/common/ResponsiveTable';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Placeholder data — real time-series endpoints aren't wired yet. These are
// the same seed values the page shipped with; flagging them here so we don't
// quietly mistake them for live numbers in a future cleanup pass.
const MONTHLY_CARBON = MONTHS.map((m, i) => ({
  month: m,
  generated: Math.floor(280 - i * 10 + Math.random() * 30),
  saved: Math.floor(180 + i * 20 + Math.random() * 40),
  trees: Math.floor(8 + i * 2),
}));

const STATE_CARBON = [
  { state: 'Maharashtra', saved: 1200, generated: 8400, reduction: 14 },
  { state: 'Kerala', saved: 980, generated: 5200, reduction: 19 },
  { state: 'Karnataka', saved: 860, generated: 6100, reduction: 14 },
  { state: 'Rajasthan', saved: 640, generated: 7800, reduction: 8 },
  { state: 'Gujarat', saved: 580, generated: 5900, reduction: 10 },
  { state: 'Tamil Nadu', saved: 520, generated: 4800, reduction: 11 },
];

const USER_CARBON = [
  { name: 'Priya Sharma', monthly: 145, yearly: 1740, level: 'Low' },
  { name: 'Amit Kumar', monthly: 320, yearly: 3840, level: 'Medium' },
  { name: 'Kavita Nair', monthly: 180, yearly: 2160, level: 'Low' },
  { name: 'Suresh Patel', monthly: 480, yearly: 5760, level: 'High' },
  { name: 'Rekha Singh', monthly: 210, yearly: 2520, level: 'Medium' },
];

const LEVEL_COLORS = { Low: '#4CAF50', Medium: '#FF9800', High: '#F44336' };

export default function CarbonReportsPage() {
  const totalSaved = MONTHLY_CARBON.reduce((a, d) => a + d.saved, 0);
  const totalGenerated = MONTHLY_CARBON.reduce((a, d) => a + d.generated, 0);
  const totalTrees = MONTHLY_CARBON.reduce((a, d) => a + d.trees, 0);
  const netReduction = (((totalSaved / totalGenerated) * 100)).toFixed(1);

  return (
    <AdminLayout>
      <Box mb={3}>
        <Typography variant="h4" color="primary" sx={{ fontSize: { xs: 24, md: 32 } }}>🌍 Carbon Reports</Typography>
        <Typography color="text.secondary" mt={0.5}>Platform-wide carbon footprint tracking and reduction insights</Typography>
      </Box>

      {/* KPIs */}
      <Grid container spacing={2} mb={3}>
        {[
          { emoji: '🌍', label: 'Total CO₂ Generated', value: `${totalGenerated.toLocaleString()} kg`, color: '#F44336' },
          { emoji: '♻️', label: 'Total CO₂ Saved', value: `${totalSaved.toLocaleString()} kg`, color: '#4CAF50' },
          { emoji: '📉', label: 'Net Reduction', value: `${netReduction}%`, color: '#2F6B3F' },
          { emoji: '🌳', label: 'Trees Equivalent', value: totalTrees.toLocaleString(), color: '#795548' },
        ].map((s) => (
          <Grid item xs={6} md={3} key={s.label}>
            <Card sx={{ borderTop: `4px solid ${s.color}`, textAlign: 'center' }}>
              <CardContent>
                <Typography sx={{ fontSize: 32 }}>{s.emoji}</Typography>
                <Typography variant="h5" fontWeight={900} sx={{ color: s.color }}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5} mb={3}>
        {/* Carbon Trend */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>📊 Carbon Generated vs Saved (Monthly)</Typography>
              <ResponsiveContainer width="100%" height={{ xs: 220, md: 280 }}>
                <AreaChart data={MONTHLY_CARBON}>
                  <defs>
                    <linearGradient id="genGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F44336" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#F44336" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="savGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#4CAF50" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="generated" stroke="#F44336" fill="url(#genGrad)" name="CO₂ Generated (kg)" strokeWidth={2} />
                  <Area type="monotone" dataKey="saved" stroke="#4CAF50" fill="url(#savGrad)" name="CO₂ Saved (kg)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Trees Saved */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" mb={2}>🌳 Tree Equivalents Saved</Typography>
              <ResponsiveContainer width="100%" height={{ xs: 200, md: 240 }}>
                <BarChart data={MONTHLY_CARBON}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="trees" fill="#2F6B3F" radius={[4,4,0,0]} name="Trees" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        {/* State Carbon Impact */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent sx={{ '&:last-child': { pb: 2 } }}>
              <Typography variant="h6" mb={2}>🗺️ State-wise Carbon Impact</Typography>
              <ResponsiveTable
                headers={['State', 'CO₂ Generated', 'CO₂ Saved', 'Reduction %', 'Progress']}
                rows={STATE_CARBON}
                rowKey={(s) => s.state}
                emptyMessage="No state carbon data"
                renderRow={(s) => (
                  <>
                    <TableCell sx={{ fontWeight: 700 }}>{s.state}</TableCell>
                    <TableCell sx={{ color: '#F44336', fontWeight: 600 }}>{s.generated} kg</TableCell>
                    <TableCell sx={{ color: '#4CAF50', fontWeight: 600 }}>{s.saved} kg</TableCell>
                    <TableCell>
                      <Chip
                        label={`${s.reduction}%`}
                        size="small"
                        sx={{ backgroundColor: s.reduction > 15 ? '#E8F5E9' : s.reduction > 10 ? '#FFF8E1' : '#FFEBEE',
                          color: s.reduction > 15 ? '#4CAF50' : s.reduction > 10 ? '#FF9800' : '#F44336', fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 100 }}>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, s.reduction * 5)}
                        sx={{ height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { backgroundColor: s.reduction > 15 ? '#4CAF50' : s.reduction > 10 ? '#FF9800' : '#F44336' } }}
                      />
                    </TableCell>
                  </>
                )}
                renderMobileCard={(s) => (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 14 }} noWrap>{s.state}</Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }} noWrap>
                          Generated {s.generated.toLocaleString()} kg · Saved {s.saved.toLocaleString()} kg
                        </Typography>
                      </Box>
                      <Chip
                        label={`${s.reduction}%`}
                        size="small"
                        sx={{
                          backgroundColor: s.reduction > 15 ? '#E8F5E9' : s.reduction > 10 ? '#FFF8E1' : '#FFEBEE',
                          color: s.reduction > 15 ? '#4CAF50' : s.reduction > 10 ? '#FF9800' : '#F44336',
                          fontWeight: 700, fontSize: 11,
                        }}
                      />
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, s.reduction * 5)}
                      sx={{ height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { backgroundColor: s.reduction > 15 ? '#4CAF50' : s.reduction > 10 ? '#FF9800' : '#F44336' } }}
                    />
                  </Box>
                )}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* User Carbon Levels */}
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>👥 User Carbon Levels</Typography>
              {USER_CARBON.map((u) => (
                <Box key={u.name} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5, gap: 1, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{u.name}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{u.monthly} kg/mo</Typography>
                      <Chip label={u.level} size="small" sx={{ backgroundColor: `${LEVEL_COLORS[u.level]}20`, color: LEVEL_COLORS[u.level], fontWeight: 700, height: 20, fontSize: 10 }} />
                    </Box>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (u.monthly / 600) * 100)}
                    sx={{ height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { backgroundColor: LEVEL_COLORS[u.level] } }}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </AdminLayout>
  );
}