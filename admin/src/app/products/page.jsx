'use client';
import { useState, useEffect, Fragment } from 'react';
import {
  Box, Card, CardContent, Typography, Table, TableBody, TableCell, TableHead,
  TableRow, TablePagination, Chip, Button, TextField, InputAdornment,
  Avatar, ToggleButtonGroup, ToggleButton, CircularProgress,
  Snackbar, Alert,
} from '@mui/material';
import AdminLayout from '../../components/common/AdminLayout';
import ResponsiveTable from '../../components/common/ResponsiveTable';
import api from '../../lib/api';

const STATUS_COLORS = { approved: '#4CAF50', pending: '#FF9800', rejected: '#F44336' };

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'error' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Fetch a large page once; pagination is client-side so we don't
        // hammer the API when the admin is scrubbing filters.
        const res = await api.get('/products', { params: { limit: 200, page: 1 } });
        if (cancelled) return;
        setProducts(res.data.data?.products || []);
      } catch (err) {
        if (cancelled) return;
        setProducts([]);
        setSnack({ open: true, msg: err.response?.data?.message || 'Failed to load products', severity: 'error' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = products
    .filter((p) => statusFilter === 'all' || p.status === statusFilter)
    .filter((p) =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.state?.toLowerCase().includes(search.toLowerCase())
    );

  const stockStatus = (stock) =>
    stock === 0 ? { label: 'Out of Stock', color: '#F44336' }
    : stock < 15 ? { label: 'Low Stock', color: '#FF9800' }
    : { label: 'In Stock', color: '#4CAF50' };

  return (
    <AdminLayout>
      <Box
        mb={3}
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Box>
          <Typography variant="h4" color="primary" sx={{ fontSize: { xs: 24, md: 32 } }}>🏺 Products</Typography>
          <Typography color="text.secondary" mt={0.5}>All marketplace products across India</Typography>
        </Box>
        <Button variant="outlined" color="primary" href="/approvals" sx={{ width: { xs: '100%', sm: 'auto' } }}>
          ⏳ Review Pending ({products.filter((p) => p.status === 'pending').length})
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search products or state..." size="small" value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: { xs: '100%', sm: 280 }, flex: { xs: '1 1 100%', sm: '0 1 auto' } }}
          InputProps={{ startAdornment: <InputAdornment position="start">🔍</InputAdornment> }}
        />
        <Box sx={{ overflowX: 'auto', flex: { xs: '1 1 100%', sm: '0 1 auto' } }}>
          <ToggleButtonGroup value={statusFilter} exclusive onChange={(_, v) => v && setStatusFilter(v)} size="small" sx={{ flexWrap: 'wrap' }}>
            {[['all','All'],['approved','Approved'],['pending','Pending'],['rejected','Rejected']].map(([val, lbl]) => (
              <ToggleButton key={val} value={val} sx={{ fontWeight: 700, px: 2, fontSize: 12 }}>{lbl}</ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      </Box>

      <Card>
        <CardContent sx={{ p: { xs: 1, md: 2 }, '&:last-child': { pb: { xs: 1, md: 2 } } }}>
          <ResponsiveTable
            headers={['Product', 'Category', 'State', 'Price', 'Stock', 'Sold', 'CO₂', 'Eco', 'Status']}
            rows={filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)}
            rowKey={(p) => p._id}
            loading={loading}
            emptyMessage="No products match your filters"
            renderRow={(p) => {
              const ss = stockStatus(p.stock ?? 0);
              return (
              <Fragment key={`r-${p._id}`}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ bgcolor: '#2F6B3F15', fontSize: 18, width: 36, height: 36 }}>
                      {p.images?.[0]?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.images[0].url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : '🏺'}
                    </Avatar>
                    <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{p.name}</Typography>
                  </Box>
                </TableCell>
                <TableCell><Chip label={p.category} size="small" variant="outlined" /></TableCell>
                <TableCell><Chip label={p.state} size="small" color="primary" variant="outlined" /></TableCell>
                <TableCell sx={{ fontWeight: 700 }}>₹{p.price}</TableCell>
                <TableCell>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: ss.color }}>{p.stock ?? 0} ({ss.label})</Typography>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#2F6B3F' }}>{p.soldCount ?? 0}</TableCell>
                <TableCell sx={{ color: '#795548', fontWeight: 600 }}>{p.carbonSaved ?? 0}kg</TableCell>
                <TableCell>{'⭐'.repeat(p.ecoRating || 0)}</TableCell>
                <TableCell>
                  <Chip label={p.status} size="small"
                    sx={{ backgroundColor: `${STATUS_COLORS[p.status] || '#9E9E9E'}20`, color: STATUS_COLORS[p.status] || '#9E9E9E', fontWeight: 700, textTransform: 'capitalize' }}
                  />
                </TableCell>
              </Fragment>
              );
            }}
            renderMobileCard={(p) => {
              const ss = stockStatus(p.stock ?? 0);
              return (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Avatar sx={{ bgcolor: '#2F6B3F15', fontSize: 18, width: 36, height: 36 }}>
                    {p.images?.[0]?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0].url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : '🏺'}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 14 }} noWrap>{p.name}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.25, flexWrap: 'wrap' }}>
                      <Chip label={p.category} size="small" variant="outlined" sx={{ fontSize: 10, height: 18 }} />
                      <Chip label={p.state} size="small" color="primary" variant="outlined" sx={{ fontSize: 10, height: 18 }} />
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography sx={{ fontWeight: 900, fontSize: 15 }}>₹{p.price}</Typography>
                    <Chip label={p.status} size="small"
                      sx={{ backgroundColor: `${STATUS_COLORS[p.status] || '#9E9E9E'}20`, color: STATUS_COLORS[p.status] || '#9E9E9E', fontWeight: 700, textTransform: 'capitalize', mt: 0.25 }}
                    />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, fontSize: 12, color: 'text.secondary' }}>
                  <span style={{ fontWeight: 700, color: ss.color }}>📦 {p.stock ?? 0} · {ss.label}</span>
                  <span style={{ fontWeight: 700, color: '#2F6B3F' }}>✅ {p.soldCount ?? 0} sold</span>
                  <span style={{ fontWeight: 600, color: '#795548' }}>🌍 {p.carbonSaved ?? 0}kg</span>
                  <span>{'⭐'.repeat(p.ecoRating || 0) || '—'}</span>
                </Box>
              </Box>
              );
            }}
          />
        </CardContent>
        <TablePagination component="div" count={filtered.length} page={page} rowsPerPage={rowsPerPage} onPageChange={(_, p) => setPage(p)} rowsPerPageOptions={[10]} sx={{ '.MuiTablePagination-toolbar': { flexWrap: 'wrap' } }} />
      </Card>
      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })}>
        <Alert severity={snack.severity} onClose={() => setSnack({ ...snack, open: false })} sx={{ borderRadius: 2 }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </AdminLayout>
  );
}