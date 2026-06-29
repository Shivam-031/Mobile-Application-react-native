'use client';
import { useState, useEffect, Fragment } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, Chip,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
  CircularProgress, Alert, Snackbar, Avatar,
  Table, TableBody, TableCell, TableHead, TableRow, TablePagination,
  ToggleButton, ToggleButtonGroup, useMediaQuery, useTheme,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../components/common/AdminLayout';
import ResponsiveTable from '../../components/common/ResponsiveTable';
import api from '../../lib/api';

const STATUS_COLORS = { pending: '#FF9800', approved: '#4CAF50', rejected: '#F44336' };

export default function ApprovalsPage() {
  const router = useRouter();
  const theme = useTheme();
  const fullScreenDialog = useMediaQuery(theme.breakpoints.down('sm'));
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(10);
  const [selected, setSelected] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [action, setAction] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

  // Frontend role guard — defence in depth on top of the backend
  // authorize('MASTER_ADMIN') check. If a stale Employee token is somehow active
  // when this page mounts (e.g., role changed in another tab), the page
  // shows an "Access Denied" panel instead of the approval UI. Admin app
  // login already blocks non-admins, but this catches token drift.
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

  // Once the role is confirmed as MASTER_ADMIN, pull every product
  // submission (pending + approved + rejected) so the filter tabs work
  // honestly. limit=200 is the same client-side-pagination pattern the
  // /products page uses — the approval queue rarely exceeds it.
  useEffect(() => {
    if (!roleChecked || role !== 'MASTER_ADMIN') return undefined;
    let cancelled = false;
    (async () => {
      setTableLoading(true);
      setFetchError('');
      try {
        const res = await api.get('/products', { params: { limit: 200, page: 1, status: 'all' } });
        if (cancelled) return;
        setProducts(res.data.data?.products || []);
      } catch (err) {
        if (cancelled) return;
        setFetchError(err.response?.data?.message || 'Failed to load products');
        setProducts([]);
      } finally {
        if (!cancelled) setTableLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [roleChecked, role]);

  const counts = {
    pending: products.filter((p) => p.status === 'pending').length,
    approved: products.filter((p) => p.status === 'approved').length,
    rejected: products.filter((p) => p.status === 'rejected').length,
  };

  const filtered = products.filter((p) => filter === 'all' || p.status === filter);

  const openDialog = (product, act) => {
    setSelected(product);
    setAction(act);
    setAdminNote('');
    setDialogOpen(true);
  };

  const handleAction = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await api.patch(`/products/${selected._id}/approve`, { status: action, adminNote });
      setProducts((prev) => prev.map((p) => p._id === selected._id ? { ...p, status: action, adminNote } : p));
      setSnack({ open: true, msg: `Product ${action} successfully!`, severity: action === 'approved' ? 'success' : 'warning' });
      setDialogOpen(false);
    } catch (err) {
      // Surface the real backend error instead of pretending the approval went
      // through — silent-success hidden bugs here in the past.
      setSnack({
        open: true,
        msg: err.response?.data?.message || `Failed to ${action} product`,
        severity: 'error',
      });
    } finally { setLoading(false); }
  };

  // Loading state while we verify the role.
  if (!roleChecked) {
    return (
      <AdminLayout>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <CircularProgress color="primary" size={48} />
        </Box>
      </AdminLayout>
    );
  }

  // Frontend gate: only ADMIN may see / approve product submissions.
  if (role !== 'MASTER_ADMIN') {
    return (
      <AdminLayout>
        <Box sx={{ maxWidth: 560, mx: 'auto', mt: 6 }}>
          <Card sx={{ borderTop: '4px solid #F44336', textAlign: 'center', p: 4 }}>
            <Typography sx={{ fontSize: 56, mb: 1 }}>🚫</Typography>
            <Typography variant="h5" fontWeight={800} gutterBottom>Access Denied</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Only admins can approve or reject product submissions from Employees.
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
      <Box mb={3}>
        <Typography variant="h4" color="primary" sx={{ fontSize: { xs: 24, md: 32 } }}>✅ Product Approvals</Typography>
        <Typography color="text.secondary" mt={0.5}>Review and approve products submitted by Employees</Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Pending Review', count: counts.pending, color: '#FF9800', emoji: '⏳', urgent: counts.pending > 0 },
          { label: 'Approved', count: counts.approved, color: '#4CAF50', emoji: '✅' },
          { label: 'Rejected', count: counts.rejected, color: '#F44336', emoji: '❌' },
          { label: 'Total Submitted', count: products.length, color: '#2196F3', emoji: '📋' },
        ].map((s) => (
          <Grid item xs={6} md={3} key={s.label}>
            <Card sx={{ borderTop: `4px solid ${s.color}`, ...(s.urgent && { boxShadow: `0 0 20px ${s.color}40` }) }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: 32 }}>{s.emoji}</Typography>
                <Typography variant="h4" fontWeight={900} sx={{ color: s.color }}>{s.count}</Typography>
                <Typography variant="body2" color="text.secondary">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filter Tabs */}
      <Box mb={2} sx={{ overflowX: 'auto' }}>
        <ToggleButtonGroup value={filter} exclusive onChange={(_, v) => v && setFilter(v)} size="small" sx={{ flexWrap: 'wrap' }}>
          {[['all', 'All'], ['pending', `Pending (${counts.pending})`], ['approved', 'Approved'], ['rejected', 'Rejected']].map(([val, lbl]) => (
            <ToggleButton key={val} value={val} sx={{ fontWeight: 700, px: 2 }}>{lbl}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Products Table — ResponsiveTable handles md+ table vs xs/sm cards */}
      <Card>
        <CardContent sx={{ p: { xs: 1, md: 2 }, '&:last-child': { pb: { xs: 1, md: 2 } } }}>
          {fetchError && !tableLoading && (
            <Alert severity="error" sx={{ mb: 2 }}>{fetchError}</Alert>
          )}
          <ResponsiveTable
            headers={['Product', 'Employee', 'State', 'Price', 'Stock', 'CO₂ Saved', 'Submitted', 'Status', 'Actions']}
            rows={filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)}
            rowKey={(p) => p._id}
            loading={tableLoading}
            emptyMessage="No products match this filter."
            renderRow={(product) => (
              <Fragment key={`r-${product._id}`}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: '#2F6B3F15', fontSize: 20 }}>🏺</Avatar>
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{product.name}</Typography>
                      <Chip label={product.category} size="small" variant="outlined" sx={{ fontSize: 10, height: 18 }} />
                    </Box>
                  </Box>
                </TableCell>
                <TableCell sx={{ fontSize: 13 }}>{product.branchId?.name}</TableCell>
                <TableCell><Chip label={product.state} size="small" color="primary" variant="outlined" /></TableCell>
                <TableCell sx={{ fontWeight: 700 }}>₹{product.price}</TableCell>
                <TableCell>{product.stock}</TableCell>
                <TableCell sx={{ color: '#2F6B3F', fontWeight: 600 }}>{product.carbonSaved} kg</TableCell>
                <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {new Date(product.createdAt).toLocaleDateString('en-IN')}
                </TableCell>
                <TableCell>
                  <Chip
                    label={product.status}
                    size="small"
                    sx={{ backgroundColor: `${STATUS_COLORS[product.status]}20`, color: STATUS_COLORS[product.status], fontWeight: 700, textTransform: 'capitalize' }}
                  />
                  {product.adminNote && (
                    <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.5 }}>{product.adminNote}</Typography>
                  )}
                </TableCell>
                <TableCell>
                  {product.status === 'pending' && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button size="small" variant="contained" color="success" onClick={() => openDialog(product, 'approved')} sx={{ minWidth: 0, px: 1.5 }}>✅</Button>
                      <Button size="small" variant="contained" color="error" onClick={() => openDialog(product, 'rejected')} sx={{ minWidth: 0, px: 1.5 }}>❌</Button>
                    </Box>
                  )}
                  {product.status === 'approved' && (
                    <Button size="small" variant="outlined" color="error" onClick={() => openDialog(product, 'rejected')} sx={{ fontSize: 11 }}>Revoke</Button>
                  )}
                  {product.status === 'rejected' && (
                    <Button size="small" variant="outlined" color="success" onClick={() => openDialog(product, 'approved')} sx={{ fontSize: 11 }}>Re-approve</Button>
                  )}
                </TableCell>
              </Fragment>
            )}
            renderMobileCard={(product) => (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Avatar sx={{ bgcolor: '#2F6B3F15', fontSize: 20, width: 36, height: 36 }}>🏺</Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 14 }} noWrap>{product.name}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }} noWrap>
                      By {product.branchId?.name || 'Unknown'} · {new Date(product.createdAt).toLocaleDateString('en-IN')}
                    </Typography>
                  </Box>
                  <Chip
                    label={product.status}
                    size="small"
                    sx={{ backgroundColor: `${STATUS_COLORS[product.status]}20`, color: STATUS_COLORS[product.status], fontWeight: 700, textTransform: 'capitalize' }}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
                  <Chip label={product.state} size="small" color="primary" variant="outlined" />
                  <Chip label={product.category} size="small" variant="outlined" />
                  <Typography sx={{ fontWeight: 700, fontSize: 13, alignSelf: 'center', ml: 'auto' }}>₹{product.price}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, fontSize: 12, color: 'text.secondary', mb: product.status === 'pending' ? 1.5 : 0 }}>
                  <span>📦 {product.stock} in stock</span>
                  <span style={{ color: '#2F6B3F', fontWeight: 600 }}>🌍 {product.carbonSaved} kg CO₂</span>
                </Box>
                {product.status === 'pending' && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button fullWidth size="small" variant="contained" color="success" onClick={() => openDialog(product, 'approved')}>✅ Approve</Button>
                    <Button fullWidth size="small" variant="contained" color="error" onClick={() => openDialog(product, 'rejected')}>❌ Reject</Button>
                  </Box>
                )}
                {product.status === 'approved' && (
                  <Button fullWidth size="small" variant="outlined" color="error" onClick={() => openDialog(product, 'rejected')}>Revoke</Button>
                )}
                {product.status === 'rejected' && (
                  <Button fullWidth size="small" variant="outlined" color="success" onClick={() => openDialog(product, 'approved')}>Re-approve</Button>
                )}
              </Box>
            )}
          />
        </CardContent>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPageOptions={[10]}
          sx={{ '.MuiTablePagination-toolbar': { flexWrap: 'wrap' } }}
        />
      </Card>

      {/* Approve/Reject Dialog — fullScreen on mobile so the note field
          and the action button have real room. Centered card on tablet+ */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth fullScreen={fullScreenDialog} PaperProps={{ sx: { borderRadius: fullScreenDialog ? 0 : 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, color: action === 'approved' ? 'success.main' : 'error.main' }}>
          {action === 'approved' ? '✅ Approve Product' : '❌ Reject Product'}
        </DialogTitle>
        <DialogContent>
          {selected && (
            <Box>
              <Box sx={{ p: 2, backgroundColor: '#f8f8f8', borderRadius: 2, mb: 2 }}>
                <Typography fontWeight={700}>{selected.name}</Typography>
                <Typography variant="body2" color="text.secondary">₹{selected.price} · {selected.state} · {selected.carbonSaved}kg CO₂ saved</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>{selected.description}</Typography>
              </Box>
              <TextField
                fullWidth
                multiline
                rows={3}
                label={action === 'approved' ? 'Admin Note (optional)' : 'Reason for Rejection *'}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={action === 'approved' ? 'Any notes for the employee...' : 'Explain why this product is being rejected...'}
                required={action === 'rejected'}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined">Cancel</Button>
          <Button
            onClick={handleAction}
            variant="contained"
            color={action === 'approved' ? 'success' : 'error'}
            disabled={loading || (action === 'rejected' && !adminNote)}
          >
            {loading ? <CircularProgress size={18} color="inherit" /> : action === 'approved' ? '✅ Approve' : '❌ Reject'}
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
