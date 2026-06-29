'use client';
// Unified Admin Dashboard.
// Replaces the analytics-only view with an approvals-focused panel: stats
// strip + three pending queues (products, carbon reports, user signups)
// where the admin can approve/reject inline. Existing /approvals,
// /carbon-reports, and /users pages still host the full lists; this page
// is the "in place" entry point the admin sees first on login.
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Grid, Card, CardContent, Typography, Button, Chip,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, Alert, Snackbar, Avatar, Divider,
  ToggleButton, ToggleButtonGroup, Tooltip as MTooltip, IconButton,
  useMediaQuery, useTheme,
} from '@mui/material';
import AdminLayout from '../../components/common/AdminLayout';
import StatsCard from '../../components/common/StatsCard';
import api from '../../lib/api';

const STATUS_COLORS = { pending: '#FF9800', approved: '#4CAF50', rejected: '#F44336' };
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Pending user-signup endpoint isn't implemented yet (USER model has no
// signup-pending state). We show an empty state with a CTA to the full
// /users page instead of fabricating fake rows.
const SIGNUPS_AWAITING_BACKEND = true;

export default function DashboardPage() {
  const theme = useTheme();
  const fullScreenDialog = useMediaQuery(theme.breakpoints.down('sm'));
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const [stats, setStats] = useState({
    approvedToday: 0, totalUsers: 0, totalRevenue: 0,
  });

  // Approval queues
  const [products, setProducts] = useState([]);
  const [carbon, setCarbon] = useState([]);
  const [signups] = useState([]); // backend queue not implemented
  const [rejectedItems, setRejectedItems] = useState([]);

  // Active filter for the inline approve/reject dialog
  const [dialog, setDialog] = useState({ open: false, type: null, item: null, action: '' });
  const [adminNote, setAdminNote] = useState('');
  const [view, setView] = useState('pending'); // pending | recent (rejected in last 24h)
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all([
        loadStats(cancelled),
        loadProducts(cancelled),
        loadCarbon(cancelled),
      ]);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const loadStats = async (cancelled) => {
    try {
      const res = await api.get('/analytics/dashboard');
      if (cancelled) return;
      const d = res.data.data || {};
      setStats({
        approvedToday: d.approvedToday ?? 0,
        totalUsers: d.overview?.totalUsers ?? 0,
        totalRevenue: d.overview?.totalRevenue ?? 0,
      });
    } catch (err) {
      if (cancelled) return;
      setGlobalError(err.response?.data?.message || 'Analytics endpoint unavailable');
    }
  };

  const loadProducts = async (cancelled) => {
    try {
      const res = await api.get('/products', { params: { status: 'pending', limit: 10 } });
      if (cancelled) return;
      setProducts(res.data.data?.products || []);
    } catch (err) {
      if (cancelled) return;
      setGlobalError((g) => g || err.response?.data?.message || 'Failed to load pending products');
    }
  };

  const loadCarbon = async (cancelled) => {
    // No /carbon/pending endpoint exists in the backend today — surface the
    // empty state honestly rather than inventing rows.
    if (cancelled) return;
    setCarbon([]);
  };

  const openAction = (type, item, action) => {
    setDialog({ open: true, type, item, action });
    setAdminNote('');
  };

  const closeAction = () => {
    if (actionLoading) return;
    setDialog({ open: false, type: null, item: null, action: '' });
    setAdminNote('');
  };

  const performAction = async () => {
    const { type, item, action } = dialog;
    if (!item) return;
    setActionLoading(true);
    try {
      if (type === 'product') {
        await api.patch(`/products/${item._id}/approve`, { status: action, adminNote });
      } else if (type === 'carbon') {
        await api.patch(`/carbon/${item._id}/review`, { status: action, adminNote });
      } else if (type === 'signup') {
        await api.patch(`/users/${item._id}/role`, { role: action === 'approved' ? 'EMPLOYEE' : 'USER', active: action === 'approved' });
      }
      removeFromQueue(type, item._id);
      setSnack({ open: true, msg: `${labelFor(type)} ${action}!`, severity: action === 'approved' ? 'success' : 'warning' });
    } catch (err) {
      // Backend rejected — surface the real error so the admin knows the
      // approval didn't actually persist.
      removeFromQueue(type, item._id); // optimistic UI removal
      setRejectedItems((r) => action === 'rejected'
        ? [{ ...item, _type: type, adminNote, at: Date.now(), failed: true }, ...r].slice(0, 20)
        : r);
      setSnack({
        open: true,
        msg: err.response?.data?.message || `${labelFor(type)} ${action} failed`,
        severity: 'error',
      });
    } finally {
      setActionLoading(false);
      closeAction();
    }
  };

  const removeFromQueue = (type, id) => {
    if (type === 'product') setProducts((prev) => prev.filter((p) => p._id !== id));
    else if (type === 'carbon') setCarbon((prev) => prev.filter((c) => c._id !== id));
    else if (type === 'signup') /* signups list never loaded */;
  };

  const labelFor = (type) =>
    type === 'product' ? 'Product' : type === 'carbon' ? 'Carbon report' : 'Signup request';

  const pendingTotal = products.length + carbon.length + signups.length;

  if (loading) return (
    <AdminLayout>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <CircularProgress color="primary" size={48} />
      </Box>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      {/* Header */}
      <Box sx={{
        mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        flexWrap: 'wrap', gap: 2,
        flexDirection: { xs: 'column', sm: 'row' },
      }}>
        <Box>
          <Typography variant="h4" color="primary" sx={{ fontSize: { xs: 24, md: 32 } }}>🛡️ Admin Dashboard</Typography>
          <Typography color="text.secondary" mt={0.5}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {' · '}
            {pendingTotal > 0
              ? `${pendingTotal} request${pendingTotal === 1 ? '' : 's'} awaiting your action`
              : 'All caught up — no pending requests'}
          </Typography>
        </Box>
        {pendingTotal > 0 && (
          <Chip
            label={`${pendingTotal} pending`}
            sx={{ backgroundColor: '#FF9800', color: '#fff', fontWeight: 800, fontSize: 13, px: 1, height: 32 }}
          />
        )}
      </Box>

      {globalError && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setGlobalError('')}>
          {globalError}
        </Alert>
      )}

      {/* Stats strip — focused on approval-relevant metrics */}
      <Grid container spacing={2.5} mb={3}>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatsCard emoji="🏺" title="Pending Products" value={products.length} color="#FF9800" />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatsCard emoji="🌍" title="Pending Carbon" value={carbon.length} color="#795548" />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatsCard emoji="👋" title="Pending Signups" value={signups.length} color="#2196F3" />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatsCard emoji="✅" title="Approved Today" value={stats.approvedToday} color="#4CAF50" />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatsCard emoji="👥" title="Total Users" value={stats.totalUsers.toLocaleString()} color="#9C27B0" />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatsCard emoji="💰" title="Revenue" value={`₹${(stats.totalRevenue || 0).toLocaleString()}`} color="#2F6B3F" />
        </Grid>
      </Grid>

      {/* View toggle */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ overflowX: 'auto', flex: { xs: '1 1 100%', sm: '0 1 auto' } }}>
          <ToggleButtonGroup value={view} exclusive onChange={(_, v) => v && setView(v)} size="small" sx={{ flexWrap: 'wrap' }}>
            <ToggleButton value="pending" sx={{ fontWeight: 700, px: 2 }}>📥 Pending ({pendingTotal})</ToggleButton>
            <ToggleButton value="rejected" sx={{ fontWeight: 700, px: 2 }}>🗑️ Recently Rejected ({rejectedItems.length})</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', sm: 'auto' } }}>
          <Button size="small" variant="outlined" onClick={() => router.push('/approvals')} sx={{ flex: { xs: 1, sm: '0 0 auto' } }}>All Products →</Button>
          <Button size="small" variant="outlined" onClick={() => router.push('/users')} sx={{ flex: { xs: 1, sm: '0 0 auto' } }}>All Users →</Button>
        </Box>
      </Box>

      {view === 'pending' ? (
        <Grid container spacing={2.5}>
          {/* Products queue */}
          <Grid item xs={12} lg={6}>
            <QueueCard
              title="🏺 Product Submissions"
              count={products.length}
              emptyText="No pending products"
              accent="#FF9800"
            >
              {products.map((p) => (
                <RequestRow
                  key={p._id}
                  icon="🏺"
                  title={p.name}
                  subtitle={`${p.branchId?.name || '—'} · ${p.state} · ₹${p.price} · ${p.carbonSaved}kg CO₂`}
                  time={p.createdAt}
                  onApprove={() => openAction('product', p, 'approved')}
                  onReject={() => openAction('product', p, 'rejected')}
                />
              ))}
            </QueueCard>
          </Grid>

          {/* Carbon reports queue — backend endpoint not implemented */}
          <Grid item xs={12} lg={6}>
            <QueueCard
              title="🌍 Carbon Reports"
              count={carbon.length}
              emptyText="Carbon report approval queue awaiting backend"
              accent="#795548"
            >
              {SIGNUPS_AWAITING_BACKEND && carbon.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Button size="small" variant="outlined" onClick={() => router.push('/carbon-reports')}>
                    Open Carbon Reports →
                  </Button>
                </Box>
              )}
            </QueueCard>
          </Grid>

          {/* Signup requests — backend endpoint not implemented */}
          <Grid item xs={12}>
            <QueueCard
              title="👋 New Signup Requests"
              count={signups.length}
              emptyText="Signup approval queue awaiting backend"
              accent="#2196F3"
            >
              {SIGNUPS_AWAITING_BACKEND && signups.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Button size="small" variant="outlined" onClick={() => router.push('/users')}>
                    Open Users →
                  </Button>
                </Box>
              )}
            </QueueCard>
          </Grid>
        </Grid>
      ) : (
        <Card>
          <CardContent>
            <Typography variant="h6" mb={1}>🗑️ Recently Rejected</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Items you rejected in this session — useful for undo or follow-up.
            </Typography>
            {rejectedItems.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                <Typography sx={{ fontSize: 32 }}>🪹</Typography>
                Nothing here yet.
              </Box>
            ) : (
              rejectedItems.map((r, i) => (
                <Box key={`${r._id}-${i}`}>
                  {i > 0 && <Divider />}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5 }}>
                    <Avatar sx={{ bgcolor: '#F4433620' }}>❌</Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                        {labelFor(r._type)} — {r.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.adminNote || 'No note'} · {new Date(r.at).toLocaleTimeString('en-IN')}
                        {r.failed && ' · (backend rejected)'}
                      </Typography>
                    </Box>
                    <Chip label={r._type} size="small" sx={{ textTransform: 'capitalize' }} />
                  </Box>
                </Box>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Action dialog */}
      <Dialog
        open={dialog.open}
        onClose={closeAction}
        maxWidth="sm" fullWidth
        fullScreen={fullScreenDialog}
        PaperProps={{ sx: { borderRadius: fullScreenDialog ? 0 : 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: dialog.action === 'approved' ? 'success.main' : 'error.main' }}>
          {dialog.action === 'approved' ? '✅ Approve' : '❌ Reject'} {labelFor(dialog.type)}
        </DialogTitle>
        <DialogContent>
          {dialog.item && (
            <Box>
              <Box sx={{ p: 2, backgroundColor: '#f8f8f8', borderRadius: 2, mb: 2 }}>
                <Typography fontWeight={700}>
                  {dialog.item.name || dialog.item.title || labelFor(dialog.type)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {dialog.type === 'product' && `₹${dialog.item.price} · ${dialog.item.state}`}
                  {dialog.type === 'carbon' && `${MONTHS[(dialog.item.month || 1) - 1]} ${dialog.item.year}`}
                  {dialog.type === 'signup' && `${dialog.item.email}`}
                </Typography>
              </Box>
              <TextField
                fullWidth
                multiline
                rows={3}
                label={dialog.action === 'approved' ? 'Admin note (optional)' : 'Reason for rejection *'}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={dialog.action === 'approved' ? 'Any notes for the requester...' : 'Explain why this is being rejected...'}
                required={dialog.action === 'rejected'}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={closeAction} variant="outlined" disabled={actionLoading}>Cancel</Button>
          <Button
            onClick={performAction}
            variant="contained"
            color={dialog.action === 'approved' ? 'success' : 'error'}
            disabled={actionLoading || (dialog.action === 'rejected' && !adminNote)}
          >
            {actionLoading ? <CircularProgress size={18} color="inherit" /> : (dialog.action === 'approved' ? '✅ Approve' : '❌ Reject')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3500} onClose={() => setSnack({ ...snack, open: false })}>
        <Alert severity={snack.severity} onClose={() => setSnack({ ...snack, open: false })} sx={{ borderRadius: 2 }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </AdminLayout>
  );
}

// Reusable queue card so all three panels feel consistent.
function QueueCard({ title, count, emptyText, accent, children }) {
  const hasItems = count > 0;
  return (
    <Card sx={{ borderTop: `4px solid ${accent}`, height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="h6">{title}</Typography>
          <Chip
            label={count}
            size="small"
            sx={{
              backgroundColor: hasItems ? `${accent}25` : '#9E9E9E25',
              color: hasItems ? accent : '#9E9E9E',
              fontWeight: 800,
            }}
          />
        </Box>
        {hasItems ? (
          <Box>{children}</Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
            <Typography sx={{ fontSize: 28 }}>🌱</Typography>
            <Typography variant="body2">{emptyText}</Typography>
            {children}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// One row inside a queue — inline approve/reject buttons.
function RequestRow({ icon, title, subtitle, time, onApprove, onReject }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.25, borderBottom: '1px dashed #eee' }}>
      <Avatar sx={{ bgcolor: '#2F6B3F15', width: 36, height: 36, fontSize: 16 }}>{icon}</Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {subtitle}
        </Typography>
      </Box>
      <MTooltip title={time ? new Date(time).toLocaleString('en-IN') : ''}>
        <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' } }}>
          {time ? new Date(time).toLocaleDateString('en-IN') : ''}
        </Typography>
      </MTooltip>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <IconButton size="small" onClick={onReject} sx={{ backgroundColor: '#F4433615', '&:hover': { backgroundColor: '#F4433630' }, borderRadius: 1.5 }}>
          ❌
        </IconButton>
        <IconButton size="small" onClick={onApprove} sx={{ backgroundColor: '#4CAF5015', '&:hover': { backgroundColor: '#4CAF5030' }, borderRadius: 1.5 }}>
          ✅
        </IconButton>
      </Box>
    </Box>
  );
}
