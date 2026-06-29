'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, Chip,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, Alert, Snackbar, Avatar,
  Table, TableBody, TableCell, TablePagination,
  ToggleButton, ToggleButtonGroup, Select, MenuItem, FormControl, InputLabel,
  useMediaQuery, useTheme,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../components/common/AdminLayout';
import ResponsiveTable from '../../components/common/ResponsiveTable';
import api from '../../lib/api';

const STATUS_COLORS = { pending: '#FF9800', approved: '#4CAF50', rejected: '#F44336' };

const INDIAN_STATES = [
  'Maharashtra', 'Delhi', 'Kerala', 'Rajasthan', 'Karnataka', 'Tamil Nadu',
  'Gujarat', 'West Bengal', 'UP', 'MP', 'Assam', 'Manipur', 'Meghalaya',
  'Punjab', 'Odisha', 'Bihar', 'Haryana', 'Jharkhand', 'Telangana',
];

const stockColor = (stock) =>
  stock === 0 ? '#F44336' : stock < 15 ? '#FF9800' : '#4CAF50';

const stockLabel = (stock) =>
  stock === 0 ? 'Out of Stock' : stock < 15 ? 'Low Stock' : 'In Stock';

export default function InventoryPage() {
  const theme = useTheme();
  const fullScreenDialog = useMediaQuery(theme.breakpoints.down('sm'));
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [stateFilter, setStateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(25);
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState('');          // 'approved' | 'rejected'
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockValue, setStockValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

  // Frontend role guard — same pattern as /approvals. Backend authorize('MASTER_ADMIN')
  // is the source of truth; this is defence in depth for stale tokens.
  const [role, setRole] = useState(null);
  const [roleChecked, setRoleChecked] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/auth/me');
        if (!cancelled) setRole(res.data.data.user.role);
      } catch {
        if (!cancelled) setRole(null);
      } finally {
        if (!cancelled) setRoleChecked(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Refetch when filters, page, or role changes.
  const loadInventory = async () => {
    setLoadingList(true);
    try {
      const params = { page, limit: rowsPerPage };
      if (stateFilter !== 'all') params.state = stateFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search.trim()) params.q = search.trim();
      const res = await api.get('/inventory/admin', { params });
      setProducts(res.data.data.items);
      setTotalCount(res.data.data.total);
    } catch (err) {
      setSnack({ open: true, msg: err.response?.data?.message || 'Failed to load inventory', severity: 'error' });
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!roleChecked || role !== 'MASTER_ADMIN') return;
    loadInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateFilter, statusFilter, search, page, roleChecked, role]);

  // Filter is applied server-side now; this is a no-op pass-through kept so the
  // existing counts memo doesn't change shape.
  const filtered = useMemo(() => products, [products]);

  const counts = useMemo(() => ({
    total: totalCount,
    available: filtered.filter((p) => p.stock >= 15).length,
    lowStock: filtered.filter((p) => p.stock > 0 && p.stock < 15).length,
    outOfStock: filtered.filter((p) => p.stock === 0).length,
    pending: filtered.filter((p) => p.status === 'pending').length,
  }), [filtered, totalCount]);

  const openApproveDialog = (product, act) => {
    setSelected(product);
    setAction(act);
    setAdminNote('');
    setDialogOpen(true);
  };

  const openStockDialog = (product) => {
    setSelected(product);
    setStockValue(product.stock);
    setStockDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await api.patch(`/products/${selected._id}/approve`, { status: action, adminNote });
      setSnack({ open: true, msg: `Product ${action} successfully!`, severity: action === 'approved' ? 'success' : 'warning' });
      setDialogOpen(false);
      loadInventory();
    } catch (err) {
      setSnack({ open: true, msg: err.response?.data?.message || `Failed to ${action} product`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleStockSave = async () => {
    if (!selected) return;
    if (!Number.isFinite(stockValue) || stockValue < 0) {
      setSnack({ open: true, msg: 'Stock must be a non-negative number', severity: 'error' });
      return;
    }
    setLoading(true);
    try {
      await api.patch(`/inventory/admin/${selected._id}/stock`, { stock: stockValue });
      setSnack({ open: true, msg: 'Stock updated successfully!', severity: 'success' });
      setStockDialogOpen(false);
      loadInventory();
    } catch (err) {
      setSnack({ open: true, msg: err.response?.data?.message || 'Failed to update stock', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (!roleChecked) {
    return (
      <AdminLayout>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <CircularProgress color="primary" size={48} />
        </Box>
      </AdminLayout>
    );
  }

  if (role !== 'MASTER_ADMIN') {
    return (
      <AdminLayout>
        <Box sx={{ maxWidth: 560, mx: 'auto', mt: 6 }}>
          <Card sx={{ borderTop: '4px solid #F44336', textAlign: 'center', p: 4 }}>
            <Typography sx={{ fontSize: 56, mb: 1 }}>🚫</Typography>
            <Typography variant="h5" fontWeight={800} gutterBottom>Access Denied</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Only admins can view and manage inventory across all states.
              If you believe this is a mistake, contact a platform administrator.
            </Typography>
            <Button variant="contained" onClick={() => router.push('/login')}>Back to Login</Button>
          </Card>
        </Box>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Box mb={3} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" color="primary" sx={{ fontSize: { xs: 24, md: 32 } }}>📦 All-State Inventory</Typography>
          <Typography color="text.secondary" mt={0.5}>View, edit stock, and approve/reject products across every branch and state</Typography>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Total Products', value: counts.total, color: '#2196F3', emoji: '📋' },
          { label: 'In Stock (≥15)', value: counts.available, color: '#4CAF50', emoji: '✅' },
          { label: 'Low Stock', value: counts.lowStock, color: '#FF9800', emoji: '⚠️' },
          { label: 'Out of Stock', value: counts.outOfStock, color: '#F44336', emoji: '🚫' },
          { label: 'Pending Review', value: counts.pending, color: '#795548', emoji: '⏳' },
        ].map((s) => (
          <Grid item xs={6} md={2.4} key={s.label}>
            <Card sx={{ borderTop: `4px solid ${s.color}` }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: 28 }}>{s.emoji}</Typography>
                <Typography variant="h5" fontWeight={900} sx={{ color: s.color }}>{s.value}</Typography>
                <Typography variant="body2" color="text.secondary">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filters: search + state + status */}
      <Card sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            placeholder="Search by name..." size="small" sx={{ minWidth: { xs: '100%', sm: 240 }, flex: { xs: '1 1 100%', sm: 1 } }}
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 200 }, flex: { xs: '1 1 100%', sm: '0 0 auto' } }}>
            <InputLabel>State</InputLabel>
            <Select
              value={stateFilter}
              label="State"
              onChange={(e) => { setStateFilter(e.target.value); setPage(0); }}
            >
              <MenuItem value="all">All states</MenuItem>
              {INDIAN_STATES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>
          <Box sx={{ overflowX: 'auto', flex: { xs: '1 1 100%', sm: '0 0 auto' } }}>
            <ToggleButtonGroup
              value={statusFilter} exclusive
              onChange={(_, v) => { if (v) { setStatusFilter(v); setPage(0); } }}
              size="small"
              sx={{ flexWrap: 'wrap' }}
            >
              <ToggleButton value="all" sx={{ fontWeight: 700, px: 2 }}>All</ToggleButton>
              <ToggleButton value="approved" sx={{ fontWeight: 700, px: 2 }}>Approved</ToggleButton>
              <ToggleButton value="pending" sx={{ fontWeight: 700, px: 2 }}>Pending</ToggleButton>
              <ToggleButton value="rejected" sx={{ fontWeight: 700, px: 2 }}>Rejected</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>
      </Card>

      {/* Inventory Table */}
      <Card>
        <ResponsiveTable
          headers={['Product', 'Branch', 'State', 'Price', 'Stock', 'CO₂ Saved', 'Status', 'Actions']}
          rows={filtered}
          rowKey={(p) => p._id}
          loading={loadingList}
          emptyMessage="No products match the current filters."
          renderRow={(product) => {
            const sc = stockColor(product.stock);
            return (
              <>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: '#2F6B3F15', fontSize: 20 }}>🏺</Avatar>
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{product.name}</Typography>
                      <Chip label={product.category} size="small" variant="outlined" sx={{ fontSize: 10, height: 18 }} />
                    </Box>
                  </Box>
                </TableCell>
                <TableCell sx={{ fontSize: 13 }}>{product.branchId?.name || '—'}</TableCell>
                <TableCell><Chip label={product.state} size="small" color="primary" variant="outlined" /></TableCell>
                <TableCell sx={{ fontWeight: 700 }}>₹{product.price}</TableCell>
                <TableCell>
                  <Chip
                    label={product.stock}
                    size="small"
                    sx={{ backgroundColor: `${sc}20`, color: sc, fontWeight: 700, minWidth: 40 }}
                  />
                </TableCell>
                <TableCell sx={{ color: '#2F6B3F', fontWeight: 600 }}>{product.carbonSaved} kg</TableCell>
                <TableCell>
                  <Chip
                    label={product.status}
                    size="small"
                    sx={{ backgroundColor: `${STATUS_COLORS[product.status]}20`, color: STATUS_COLORS[product.status], fontWeight: 700, textTransform: 'capitalize' }}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    <Button size="small" variant="outlined" onClick={() => openStockDialog(product)} sx={{ fontSize: 11 }}>
                      📊 Stock
                    </Button>
                    {product.status === 'pending' && (
                      <>
                        <Button size="small" variant="contained" color="success" onClick={() => openApproveDialog(product, 'approved')} sx={{ minWidth: 0, px: 1.2 }}>
                          ✅
                        </Button>
                        <Button size="small" variant="contained" color="error" onClick={() => openApproveDialog(product, 'rejected')} sx={{ minWidth: 0, px: 1.2 }}>
                          ❌
                        </Button>
                      </>
                    )}
                    {product.status === 'approved' && (
                      <Button size="small" variant="outlined" color="error" onClick={() => openApproveDialog(product, 'rejected')} sx={{ fontSize: 11 }}>
                        Revoke
                      </Button>
                    )}
                    {product.status === 'rejected' && (
                      <Button size="small" variant="outlined" color="success" onClick={() => openApproveDialog(product, 'approved')} sx={{ fontSize: 11 }}>
                        Re-approve
                      </Button>
                    )}
                  </Box>
                </TableCell>
              </>
            );
          }}
          renderMobileCard={(product) => {
            const sc = stockColor(product.stock);
            return (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Avatar sx={{ bgcolor: '#2F6B3F15', fontSize: 20, width: 36, height: 36 }}>🏺</Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 14 }} noWrap>{product.name}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }} noWrap>
                      {product.branchId?.name || '—'}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontWeight: 900, fontSize: 15 }}>₹{product.price}</Typography>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
                  <Chip label={product.state} size="small" color="primary" variant="outlined" sx={{ fontSize: 10, height: 18 }} />
                  {product.category && <Chip label={product.category} size="small" variant="outlined" sx={{ fontSize: 10, height: 18 }} />}
                  <Chip
                    label={product.status}
                    size="small"
                    sx={{ backgroundColor: `${STATUS_COLORS[product.status]}20`, color: STATUS_COLORS[product.status], fontWeight: 700, fontSize: 10, height: 18, textTransform: 'capitalize' }}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, fontSize: 12, color: 'text.secondary', mb: 1.25, alignItems: 'center' }}>
                  <Chip
                    label={`📦 ${product.stock} · ${stockLabel(product.stock)}`}
                    size="small"
                    sx={{ backgroundColor: `${sc}20`, color: sc, fontWeight: 700, fontSize: 11 }}
                  />
                  <span style={{ color: '#2F6B3F', fontWeight: 600 }}>🌍 {product.carbonSaved} kg</span>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                  <Button size="small" variant="outlined" onClick={() => openStockDialog(product)} sx={{ flex: 1 }}>
                    📊 Stock
                  </Button>
                  {product.status === 'pending' && (
                    <>
                      <Button size="small" variant="contained" color="success" onClick={() => openApproveDialog(product, 'approved')} sx={{ flex: 1 }}>
                        ✅ Approve
                      </Button>
                      <Button size="small" variant="contained" color="error" onClick={() => openApproveDialog(product, 'rejected')} sx={{ flex: 1 }}>
                        ❌ Reject
                      </Button>
                    </>
                  )}
                  {product.status === 'approved' && (
                    <Button size="small" variant="outlined" color="error" onClick={() => openApproveDialog(product, 'rejected')} sx={{ flex: 1 }}>
                      Revoke
                    </Button>
                  )}
                  {product.status === 'rejected' && (
                    <Button size="small" variant="outlined" color="success" onClick={() => openApproveDialog(product, 'approved')} sx={{ flex: 1 }}>
                      Re-approve
                    </Button>
                  )}
                </Box>
              </Box>
            );
          }}
        />
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPageOptions={[25]}
          sx={{ '.MuiTablePagination-toolbar': { flexWrap: 'wrap' } }}
        />
      </Card>

      {/* Approve / Reject Dialog — mirrors /approvals flow, fullScreen on xs */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm" fullWidth
        fullScreen={fullScreenDialog}
        PaperProps={{ sx: { borderRadius: fullScreenDialog ? 0 : 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: action === 'approved' ? 'success.main' : 'error.main' }}>
          {action === 'approved' ? '✅ Approve Product' : '❌ Reject Product'}
        </DialogTitle>
        <DialogContent>
          {selected && (
            <Box>
              <Box sx={{ p: 2, backgroundColor: '#f8f8f8', borderRadius: 2, mb: 2 }}>
                <Typography fontWeight={700}>{selected.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  ₹{selected.price} · {selected.state} · {selected.carbonSaved}kg CO₂ saved · stock {selected.stock}
                </Typography>
              </Box>
              <TextField
                fullWidth multiline rows={3}
                label={action === 'approved' ? 'Admin Note (optional)' : 'Reason for Rejection *'}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                required={action === 'rejected'}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined">Cancel</Button>
          <Button
            onClick={handleApprove} variant="contained"
            color={action === 'approved' ? 'success' : 'error'}
            disabled={loading || (action === 'rejected' && !adminNote)}
          >
            {loading ? <CircularProgress size={18} color="inherit" /> : action === 'approved' ? '✅ Approve' : '❌ Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit-stock dialog — admin-scoped update, no branch ownership check */}
      <Dialog
        open={stockDialogOpen}
        onClose={() => setStockDialogOpen(false)}
        maxWidth="xs" fullWidth
        fullScreen={fullScreenDialog}
        PaperProps={{ sx: { borderRadius: fullScreenDialog ? 0 : 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>📊 Update Stock</DialogTitle>
        <DialogContent>
          {selected && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {selected.name} · {selected.state}
              </Typography>
              <TextField
                fullWidth type="number" label="Stock quantity" size="small"
                value={stockValue}
                onChange={(e) => setStockValue(Number(e.target.value))}
                inputProps={{ min: 0 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setStockDialogOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleStockSave} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={18} color="inherit" /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })}>
        <Alert severity={snack.severity} onClose={() => setSnack({ ...snack, open: false })} sx={{ borderRadius: 2 }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </AdminLayout>
  );
}