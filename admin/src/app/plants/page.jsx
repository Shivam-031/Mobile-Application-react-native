'use client';
import { useState, useEffect } from 'react';
import {
  Box, Card, Typography, Grid, Table, TableBody, TableCell,
  Chip, Button, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem,
  Select, FormControl, InputLabel, CircularProgress, Snackbar, Alert,
  useMediaQuery, useTheme,
} from '@mui/material';
import AdminLayout from '../../components/common/AdminLayout';
import ResponsiveTable from '../../components/common/ResponsiveTable';
import api from '../../lib/api';

const CARBON_COLORS = { Low: '#FF9800', Medium: '#2196F3', High: '#4CAF50', 'Very High': '#2F6B3F' };

const EMPTY_FORM = { name: '', scientificName: '', description: '', category: 'native', speciesCount: '', carbonAbsorption: 'Medium', benefits: '', states: [], region: '' };

const INDIAN_STATES = ['Maharashtra','Delhi','Kerala','Rajasthan','Karnataka','Tamil Nadu','Gujarat','West Bengal','UP','MP','Assam','Manipur','Meghalaya','Punjab','Odisha'];

export default function PlantsPage() {
  const theme = useTheme();
  const fullScreenDialog = useMediaQuery(theme.breakpoints.down('sm'));
  const [plants, setPlants] = useState([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/plants');
        if (cancelled) return;
        setPlants(res.data.data || []);
      } catch (err) {
        if (cancelled) return;
        setPlants([]);
        setSnack({ open: true, msg: err.response?.data?.message || 'Failed to load plants', severity: 'error' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = plants.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.scientificName?.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setDialogOpen(true); };
  const openEdit = (plant) => { setForm({ ...plant, states: plant.states || [] }); setEditId(plant._id); setDialogOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editId) {
        const res = await api.put(`/plants/${editId}`, form);
        const updated = res.data.data || form;
        setPlants((prev) => prev.map((p) => p._id === editId ? { ...p, ...updated } : p));
        setSnack({ open: true, msg: 'Plant updated successfully!', severity: 'success' });
      } else {
        const res = await api.post('/plants', form);
        const created = res.data.data;
        if (created) setPlants((prev) => [created, ...prev]);
        else {
          // Backend didn't echo — refetch to stay honest with the DB.
          const fresh = await api.get('/plants');
          setPlants(fresh.data.data || []);
        }
        setSnack({ open: true, msg: 'Plant added successfully!', severity: 'success' });
      }
    } catch (err) {
      setSnack({ open: true, msg: err.response?.data?.message || 'Failed to save plant', severity: 'error' });
    } finally {
      setSaving(false);
      setDialogOpen(false);
    }
  };

  return (
    <AdminLayout>
      <Box mb={3} sx={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        flexWrap: 'wrap', gap: 2,
        flexDirection: { xs: 'column', sm: 'row' },
      }}>
        <Box>
          <Typography variant="h4" color="primary" sx={{ fontSize: { xs: 24, md: 32 } }}>🌿 Plant Management</Typography>
          <Typography color="text.secondary" mt={0.5}>Manage India's plant biodiversity database</Typography>
        </Box>
        <Button variant="contained" onClick={openAdd} sx={{ fontWeight: 700, width: { xs: '100%', sm: 'auto' } }}>➕ Add Plant Species</Button>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Total Species', value: plants.length, color: '#2F6B3F', emoji: '🌿' },
          { label: 'Native', value: plants.filter((p) => p.category === 'native').length, color: '#4CAF50', emoji: '🌱' },
          { label: 'Protected', value: plants.filter((p) => p.category === 'protected').length, color: '#FF9800', emoji: '🛡️' },
          { label: 'Endangered', value: plants.filter((p) => p.isEndangered).length, color: '#F44336', emoji: '⚠️' },
        ].map((s) => (
          <Grid item xs={6} md={3} key={s.label}>
            <Card sx={{ borderTop: `3px solid ${s.color}` }}>
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography sx={{ fontSize: 28 }}>{s.emoji}</Typography>
                <Typography variant="h5" fontWeight={900} sx={{ color: s.color }}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Search */}
      <TextField
        placeholder="Search plants..." size="small" fullWidth sx={{ mb: 2, maxWidth: { xs: '100%', sm: 400 } }}
        value={search} onChange={(e) => setSearch(e.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start">🔍</InputAdornment> }}
      />

      <Card>
        <ResponsiveTable
          headers={['Plant', 'Scientific Name', 'Category', 'Count', 'Carbon Absorption', 'States', 'Status', 'Actions']}
          rows={filtered}
          rowKey={(p) => p._id}
          loading={loading}
          emptyMessage="No plants found"
          renderRow={(plant) => (
            <>
              <TableCell sx={{ fontWeight: 700 }}>{plant.name}</TableCell>
              <TableCell sx={{ fontSize: 12, fontStyle: 'italic', color: 'text.secondary' }}>{plant.scientificName}</TableCell>
              <TableCell>
                <Chip label={plant.category} size="small" color={plant.category === 'protected' ? 'warning' : 'default'} variant="outlined" />
              </TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#2F6B3F' }}>{(plant.speciesCount ?? 0).toLocaleString()}</TableCell>
              <TableCell>
                <Chip
                  label={plant.carbonAbsorption}
                  size="small"
                  sx={{ backgroundColor: `${CARBON_COLORS[plant.carbonAbsorption] || '#9E9E9E'}20`, color: CARBON_COLORS[plant.carbonAbsorption] || '#9E9E9E', fontWeight: 700 }}
                />
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(plant.states || []).slice(0, 2).map((s) => <Chip key={s} label={s} size="small" variant="outlined" color="primary" sx={{ fontSize: 10, height: 20 }} />)}
                  {plant.states?.length > 2 && <Chip label={`+${plant.states.length - 2}`} size="small" sx={{ fontSize: 10, height: 20 }} />}
                </Box>
              </TableCell>
              <TableCell>
                {plant.isEndangered && <Chip label="⚠️ Endangered" size="small" color="error" />}
              </TableCell>
              <TableCell>
                <Button size="small" variant="outlined" color="primary" onClick={() => openEdit(plant)} sx={{ fontSize: 11 }}>Edit</Button>
              </TableCell>
            </>
          )}
          renderMobileCard={(plant) => (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 14 }} noWrap>{plant.name}</Typography>
                  <Typography sx={{ fontSize: 11, fontStyle: 'italic', color: 'text.secondary' }} noWrap>{plant.scientificName}</Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography sx={{ fontWeight: 900, color: '#2F6B3F', fontSize: 15 }}>
                    {(plant.speciesCount ?? 0).toLocaleString()}
                  </Typography>
                  <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>species</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
                <Chip label={plant.category} size="small" color={plant.category === 'protected' ? 'warning' : 'default'} variant="outlined" sx={{ fontSize: 10, height: 18 }} />
                <Chip
                  label={plant.carbonAbsorption}
                  size="small"
                  sx={{ backgroundColor: `${CARBON_COLORS[plant.carbonAbsorption] || '#9E9E9E'}20`, color: CARBON_COLORS[plant.carbonAbsorption] || '#9E9E9E', fontWeight: 700, fontSize: 10, height: 18 }}
                />
                {plant.isEndangered && <Chip label="⚠️ Endangered" size="small" color="error" sx={{ fontSize: 10, height: 18 }} />}
              </Box>
              {plant.states?.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.25 }}>
                  {plant.states.slice(0, 4).map((s) => (
                    <Chip key={s} label={s} size="small" variant="outlined" color="primary" sx={{ fontSize: 10, height: 18 }} />
                  ))}
                  {plant.states.length > 4 && (
                    <Chip label={`+${plant.states.length - 4}`} size="small" sx={{ fontSize: 10, height: 18 }} />
                  )}
                </Box>
              )}
              <Button fullWidth size="small" variant="outlined" color="primary" onClick={() => openEdit(plant)}>
                ✏️ Edit
              </Button>
            </Box>
          )}
        />
      </Card>

      {/* Add/Edit Dialog — fullScreen on mobile so the multi-state picker has room */}
      <Dialog
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        maxWidth="sm" fullWidth
        fullScreen={fullScreenDialog}
        PaperProps={{ sx: { borderRadius: fullScreenDialog ? 0 : 3 } }}
      >
        <DialogTitle fontWeight={800}>{editId ? '✏️ Edit Plant' : '➕ Add Plant Species'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {[
            { label: 'Plant Name *', key: 'name' },
            { label: 'Scientific Name *', key: 'scientificName' },
            { label: 'Region', key: 'region' },
            { label: 'Species Count', key: 'speciesCount', type: 'number' },
            { label: 'Benefits', key: 'benefits', multiline: true, rows: 2 },
            { label: 'Description', key: 'description', multiline: true, rows: 2 },
          ].map((f) => (
            <TextField key={f.key} label={f.label} fullWidth size="small"
              type={f.type || 'text'} multiline={f.multiline} rows={f.rows}
              value={form[f.key] || ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
            />
          ))}
          <FormControl size="small" fullWidth>
            <InputLabel>Category</InputLabel>
            <Select value={form.category} label="Category" onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {['native','protected','exotic','medicinal'].map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>Carbon Absorption</InputLabel>
            <Select value={form.carbonAbsorption} label="Carbon Absorption" onChange={(e) => setForm({ ...form, carbonAbsorption: e.target.value })}>
              {['Low','Medium','High','Very High'].map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>States</InputLabel>
            <Select multiple value={form.states || []} label="States"
              onChange={(e) => setForm({ ...form, states: e.target.value })}
              renderValue={(selected) => selected.join(', ')}
            >
              {INDIAN_STATES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined" disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving || !form.name || !form.scientificName}>
            {saving ? <CircularProgress size={18} color="inherit" /> : editId ? 'Update' : 'Add Plant'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}>
        <Alert severity={snack.severity} sx={{ borderRadius: 2 }}>{snack.msg}</Alert>
      </Snackbar>
    </AdminLayout>
  );
}