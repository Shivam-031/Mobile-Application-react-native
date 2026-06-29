// AdminDashboardScreen — replaces the Employee Dashboard for MASTER_ADMIN users.
// Lists product submissions from branch employees and lets the admin approve
// or reject them inline. Uses GET /products?status=pending + PATCH /products/:id/approve
// (already wired in the backend). On backend failure the screen renders an
// empty state — no fabricated product list.
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, Alert, Modal, TextInput, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useSelector } from 'react-redux';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import api from '../../services/apiService';

const STATUS_COLORS = { pending: '#FF9800', approved: '#4CAF50', rejected: '#F44336' };
const ROLE_COLORS = { MASTER_ADMIN: '#9C27B0' };

const TABS = [
  { key: 'pending',  label: 'Pending',  emoji: '⏳' },
  { key: 'approved', label: 'Approved', emoji: '✅' },
  { key: 'rejected', label: 'Rejected', emoji: '❌' },
];

const ActionModal = ({ visible, action, product, onClose, onConfirm, busy }) => {
  const [note, setNote] = useState('');
  useEffect(() => { if (visible) setNote(''); }, [visible]);

  const handleConfirm = () => {
    if (action === 'rejected' && !note.trim()) {
      Alert.alert('Reason required', 'Please tell the employee why this product is being rejected.');
      return;
    }
    onConfirm(note.trim());
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={[styles.modalAccent, { backgroundColor: STATUS_COLORS[action] }]} />
          <Text style={styles.modalTitle}>
            {action === 'approved' ? '✅ Approve Product' : '❌ Reject Product'}
          </Text>
          {product && (
            <View style={styles.modalSummary}>
              <Text style={styles.modalSummaryName}>{product.name}</Text>
              <Text style={styles.modalSummaryMeta}>
                ₹{product.price} · {product.state} · {product.carbonSaved}kg CO₂
              </Text>
              <Text style={styles.modalSummaryMeta}>
                Submitted by {product.branchId?.name || 'Unknown'}
              </Text>
            </View>
          )}
          <Text style={styles.fieldLabel}>
            {action === 'approved' ? 'Admin Note (optional)' : 'Reason for Rejection *'}
          </Text>
          <TextInput
            style={styles.fieldInput}
            placeholder={action === 'approved' ? 'Any notes for the employee...' : 'Explain why this is being rejected...'}
            placeholderTextColor={COLORS.text.muted}
            multiline
            value={note}
            onChangeText={setNote}
          />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={busy}>
              <Text style={styles.cancelBtnTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: STATUS_COLORS[action] }, busy && { opacity: 0.6 }]}
              onPress={handleConfirm}
              disabled={busy}
            >
              {busy
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.confirmBtnTxt}>
                    {action === 'approved' ? '✅ Approve' : '❌ Reject'}
                  </Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const AdminDashboardScreen = ({ navigation }) => {
  const { user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('pending');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState({ open: false, action: null, product: null });
  const [busy, setBusy] = useState(false);
  const [recentlyActed, setRecentlyActed] = useState([]);

  const counts = {
    pending:  products.filter((p) => p.status === 'pending').length,
    approved: products.filter((p) => p.status === 'approved').length,
    rejected: products.filter((p) => p.status === 'rejected').length,
  };

  const loadPending = useCallback(async () => {
    try {
      const res = await api.get('/products', { params: { status: 'pending', limit: 50 } });
      const list = res.data?.data?.products || res.data?.data || [];
      setProducts(Array.isArray(list) ? list : []);
    } catch {
      // Backend not reachable — render the empty state below rather than
      // fabricated products.
      setProducts([]);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadPending();
    setRefreshing(false);
  }, [loadPending]);

  useEffect(() => {
    (async () => {
      await loadPending();
      setLoading(false);
    })();
  }, [loadPending]);

  const openAction = (product, action) => {
    setModal({ open: true, action, product });
  };

  const closeAction = () => {
    if (busy) return;
    setModal({ open: false, action: null, product: null });
  };

  const handleConfirm = async (adminNote) => {
    const { action, product } = modal;
    if (!product) return;
    setBusy(true);
    try {
      await api.patch(`/products/${product._id}/approve`, { status: action, adminNote });
      // Move the item out of the visible list and remember it for the "recent" strip.
      setProducts((prev) => prev.filter((p) => p._id !== product._id));
      setRecentlyActed((r) => [{ ...product, _action: action, _at: Date.now(), _note: adminNote }, ...r].slice(0, 5));
      Alert.alert(
        action === 'approved' ? 'Approved ✅' : 'Rejected ❌',
        `${product.name} has been ${action}.`,
      );
    } catch (err) {
      // Backend rejected the action — don't fake a local success. Surface the
      // server message (or a generic one) and leave the list untouched.
      const msg = err?.response?.data?.message || err?.message || 'Could not reach the server.';
      Alert.alert(
        action === 'approved' ? 'Approve failed' : 'Reject failed',
        msg,
      );
    } finally {
      setBusy(false);
      closeAction();
    }
  };

  const filtered = products.filter((p) => p.status === activeTab);

  const renderProduct = ({ item }) => {
    const isPending = item.status === 'pending';
    return (
      <View style={styles.productCard}>
        <View style={styles.productHeader}>
          <View style={styles.productIconWrap}>
            <Text style={{ fontSize: 30 }}>🏺</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.productMeta}>
              {item.branchId?.name || 'Unknown'} · {item.state}
            </Text>
            <View style={styles.productTags}>
              <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[item.status]}20` }]}>
                <Text style={[styles.statusBadgeTxt, { color: STATUS_COLORS[item.status] }]}>{item.status}</Text>
              </View>
              <Text style={styles.productMetaSm}>{item.category}</Text>
            </View>
          </View>
          <View style={styles.productPriceCol}>
            <Text style={styles.productPrice}>₹{item.price}</Text>
            <Text style={styles.productMetaSm}>{item.stock} in stock</Text>
          </View>
        </View>

        <View style={styles.productFooter}>
          <View style={styles.productFooterStat}>
            <Text style={styles.productFooterEmoji}>🌍</Text>
            <Text style={styles.productFooterVal}>{item.carbonSaved} kg</Text>
            <Text style={styles.productFooterLbl}>CO₂ saved</Text>
          </View>
          <View style={styles.productFooterStat}>
            <Text style={styles.productFooterEmoji}>📅</Text>
            <Text style={styles.productFooterVal}>
              {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </Text>
            <Text style={styles.productFooterLbl}>Submitted</Text>
          </View>
          {isPending ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: COLORS.error }]}
                onPress={() => openAction(item, 'rejected')}
              >
                <Text style={styles.actionBtnTxt}>❌</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: COLORS.success }]}
                onPress={() => openAction(item, 'approved')}
              >
                <Text style={styles.actionBtnTxt}>✅</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.reviewBtn]}
                onPress={() => Alert.alert('Already decided', `This product is already ${item.status}.`)}
              >
                <Text style={styles.reviewBtnTxt}>View</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnTxt}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>🛡️ Admin Dashboard</Text>
          <Text style={styles.headerSub}>
            {user?.name?.split(' ')[0] || 'Admin'} · {counts.pending} request{counts.pending === 1 ? '' : 's'} awaiting action
          </Text>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS.MASTER_ADMIN }]}>
          <Text style={styles.roleBadgeTxt}>ADMIN</Text>
        </View>
      </View>

      {/* Stats strip */}
      <View style={styles.statsRow}>
        {TABS.map((t) => {
          const active = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.statTab, active && styles.statTabActive]}
              onPress={() => setActiveTab(t.key)}
              activeOpacity={0.85}
            >
              <Text style={{ fontSize: 20 }}>{t.emoji}</Text>
              <Text style={[styles.statTabValue, active && { color: '#fff' }]}>{counts[t.key]}</Text>
              <Text style={[styles.statTabLabel, active && { color: '#fff' }]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Recently acted (only when there is something to show) */}
      {recentlyActed.length > 0 && activeTab === 'pending' && (
        <View style={styles.recentStrip}>
          <Text style={styles.recentTitle}>🕒 Just now</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: SPACING.md }}>
            {recentlyActed.map((r, i) => (
              <View key={`${r._id}-${i}`} style={[styles.recentChip, { borderColor: STATUS_COLORS[r._action] }]}>
                <Text style={styles.recentChipEmoji}>{r._action === 'approved' ? '✅' : '❌'}</Text>
                <Text style={styles.recentChipName} numberOfLines={1}>{r.name}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(p) => p._id}
        renderItem={renderProduct}
        contentContainerStyle={{ padding: SPACING.md, gap: SPACING.sm, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48 }}>{activeTab === 'pending' ? '🌱' : activeTab === 'approved' ? '🎉' : '🪹'}</Text>
            <Text style={styles.emptyTitle}>
              {activeTab === 'pending' ? 'All caught up!' : `No ${activeTab} products yet`}
            </Text>
            <Text style={styles.emptySub}>
              {activeTab === 'pending'
                ? 'No product submissions waiting for your approval.'
                : `Products ${activeTab === 'approved' ? 'approved' : 'rejected'} will appear here.`}
            </Text>
          </View>
        }
      />

      <ActionModal
        visible={modal.open}
        action={modal.action}
        product={modal.product}
        onClose={closeAction}
        onConfirm={handleConfirm}
        busy={busy}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, paddingTop: 56, paddingBottom: SPACING.md,
    backgroundColor: '#9C27B0',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnTxt: { color: '#fff', fontSize: 24, fontWeight: '700', marginTop: -3 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  roleBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  statsRow: {
    flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingTop: SPACING.md,
  },
  statTab: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: SPACING.sm, alignItems: 'center', borderTopWidth: 3, borderTopColor: COLORS.border,
    ...SHADOWS.card,
  },
  statTabActive: { backgroundColor: '#9C27B0', borderTopColor: '#9C27B0' },
  statTabValue: { fontSize: 20, fontWeight: '900', color: COLORS.text.primary, marginTop: 2 },
  statTabLabel: { fontSize: 10, color: COLORS.text.muted, fontWeight: '700', letterSpacing: 0.5 },

  recentStrip: { marginTop: SPACING.md },
  recentTitle: { fontSize: 12, fontWeight: '700', color: COLORS.text.secondary, paddingHorizontal: SPACING.md, marginBottom: 6 },
  recentChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1.5,
  },
  recentChipEmoji: { fontSize: 14 },
  recentChipName: { fontSize: 12, fontWeight: '600', color: COLORS.text.primary, maxWidth: 140 },

  productCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, ...SHADOWS.card,
  },
  productHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  productIconWrap: {
    width: 52, height: 52, borderRadius: RADIUS.sm,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center', justifyContent: 'center',
  },
  productName: { fontSize: 15, fontWeight: '800', color: COLORS.text.primary },
  productMeta: { fontSize: 12, color: COLORS.text.muted, marginTop: 2 },
  productMetaSm: { fontSize: 11, color: COLORS.text.muted, marginTop: 2 },
  productTags: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  statusBadge: { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  statusBadgeTxt: { fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
  productPriceCol: { alignItems: 'flex-end' },
  productPrice: { fontSize: 18, fontWeight: '900', color: COLORS.primary },

  productFooter: {
    flexDirection: 'row', alignItems: 'center', marginTop: SPACING.md, paddingTop: SPACING.sm,
    borderTopWidth: 1, borderTopColor: COLORS.border, gap: SPACING.md,
  },
  productFooterStat: { alignItems: 'flex-start', minWidth: 70 },
  productFooterEmoji: { fontSize: 14 },
  productFooterVal: { fontSize: 13, fontWeight: '700', color: COLORS.text.primary, marginTop: 2 },
  productFooterLbl: { fontSize: 10, color: COLORS.text.muted, marginTop: 1 },
  actionRow: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  actionBtn: {
    width: 44, height: 36, borderRadius: RADIUS.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  actionBtnTxt: { fontSize: 18 },
  reviewBtn: { backgroundColor: `${COLORS.primary}15`, width: 'auto', paddingHorizontal: 14 },
  reviewBtnTxt: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },

  emptyState: { alignItems: 'center', padding: SPACING.xl, gap: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text.primary, marginTop: SPACING.sm },
  emptySub: { fontSize: 13, color: COLORS.text.muted, textAlign: 'center', maxWidth: 280 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg,
    padding: SPACING.lg, gap: SPACING.md,
  },
  modalAccent: { width: 56, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text.primary },
  modalSummary: { backgroundColor: COLORS.cardBg, borderRadius: RADIUS.md, padding: SPACING.md },
  modalSummaryName: { fontSize: 15, fontWeight: '800', color: COLORS.text.primary },
  modalSummaryMeta: { fontSize: 12, color: COLORS.text.secondary, marginTop: 4 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text.secondary },
  fieldInput: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: SPACING.md, fontSize: 14, color: COLORS.text.primary,
    backgroundColor: COLORS.surface, minHeight: 80, textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center',
  },
  cancelBtnTxt: { color: COLORS.text.secondary, fontWeight: '700' },
  confirmBtn: { flex: 2, paddingVertical: 14, borderRadius: RADIUS.md, alignItems: 'center' },
  confirmBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
});

export default AdminDashboardScreen;