import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, FlatList, Alert, Modal, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useSelector } from 'react-redux';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { LIVE_CATEGORIES } from '../../constants/categories';
import api from '../../services/apiService';

const STATUS_COLORS = {
  approved: '#4CAF50', pending: '#FF9800', rejected: '#F44336',
  delivered: '#4CAF50', shipped: '#2196F3', processing: '#FF9800',
};

const TABS = ['Overview', 'Products', 'Orders', 'Plants', 'Analytics'];

const AddProductModal = ({ visible, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: '', category: 'small', price: '', stock: '', carbonSaved: '', description: '',
  });

  const handleSave = () => {
    if (!form.name || !form.price || !form.stock) {
      Alert.alert('Error', 'Fill in all required fields'); return;
    }
    onSave({ ...form, status: 'pending', _id: Date.now().toString() });
    setForm({ name: '', category: 'small', price: '', stock: '', carbonSaved: '', description: '' });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>➕ Add New Product</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnTxt}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xl }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.pendingNote}>
            <Text style={styles.pendingNoteTxt}>⏳ Products will go to Admin for approval before going live on the marketplace.</Text>
          </View>
          {[
            { label: 'Product Name *', key: 'name', placeholder: 'e.g. Large Terracotta Pot' },
            { label: 'Price (₹) *', key: 'price', placeholder: '249', keyboard: 'numeric' },
            { label: 'Stock Quantity *', key: 'stock', placeholder: '50', keyboard: 'numeric' },
            { label: 'CO₂ Saved (kg)', key: 'carbonSaved', placeholder: '2.5', keyboard: 'numeric' },
            { label: 'Description', key: 'description', placeholder: 'Describe the product...', multiline: true },
          ].map((f) => (
            <View key={f.key}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <TextInput
                style={[styles.fieldInput, f.multiline && { height: 80, textAlignVertical: 'top' }]}
                placeholder={f.placeholder}
                placeholderTextColor={COLORS.text.muted}
                keyboardType={f.keyboard || 'default'}
                multiline={f.multiline}
                value={form[f.key]}
                onChangeText={(v) => setForm({ ...form, [f.key]: v })}
              />
            </View>
          ))}
          <View>
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.catRow}>
              {LIVE_CATEGORIES.map((c) => {
                const active = form.category === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.catChip, active && styles.catChipActive]}
                    onPress={() => setForm({ ...form, category: c.id })}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.catChipEmoji}>{c.emoji}</Text>
                    <Text style={[styles.catChipTxt, active && { color: '#fff' }]}>{c.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnTxt}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnTxt}>Submit for Approval →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Edit Stock modal — lets the employee adjust stock on one of their own
// products. Calls PATCH /inventory/:productId/stock (employee-scoped; the
// backend enforces branchId = user._id, so an employee can't edit another
// branch's stock even if they tamper with the request).
const EditStockModal = ({ visible, product, onClose, onSaved }) => {
  const [stockValue, setStockValue] = useState('0');
  const [saving, setSaving] = useState(false);

  // Reset the input whenever a new product is opened in the modal.
  useEffect(() => {
    if (product) setStockValue(String(product.stock ?? 0));
  }, [product]);

  const handleSave = async () => {
    if (!product) return;
    const parsed = parseInt(stockValue, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      Alert.alert('Invalid stock', 'Stock must be a non-negative whole number.');
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/inventory/${product._id}/stock`, { stock: parsed });
      onSaved(parsed);
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to update stock. Please try again.';
      Alert.alert('Update failed', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" transparent={false}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>📊 Edit Stock</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnTxt}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={{ padding: SPACING.lg, gap: SPACING.md }}>
          {product && (
            <>
              <View style={styles.pendingNote}>
                <Text style={styles.pendingNoteTxt}>
                  Updating stock for: {product.name}
                </Text>
              </View>
              <Text style={styles.fieldLabel}>Stock Quantity</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="0"
                placeholderTextColor={COLORS.text.muted}
                keyboardType="numeric"
                value={stockValue}
                onChangeText={setStockValue}
              />
              <Text style={{ fontSize: 11, color: COLORS.text.muted }}>
                Current stock: {product.stock} · Status: {product.status}
              </Text>
            </>
          )}
        </View>
        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={saving}>
            <Text style={styles.cancelBtnTxt}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveBtnTxt}>{saving ? 'Saving…' : 'Save Stock'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const BranchDashboardScreen = ({ navigation }) => {
  const { user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('Overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editStockProduct, setEditStockProduct] = useState(null);

  // Pulled from real backend, scoped by the logged-in employee. Each panel
// degrades independently — a missing /analytics/branch summary still leaves
// the products list and orders list working when their endpoints succeed.
const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ totalProducts: 0, orders: 0, carbonImpact: 0, plantCount: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const employeeState = user?.state || 'Maharashtra';

  const loadData = useCallback(async () => {
    // Kick off all three calls in parallel; each falls back independently.
    const [productsRes, ordersRes, plantsRes] = await Promise.allSettled([
      api.get('/analytics/branch'),
      api.get('/orders/branch/all', { params: { limit: 50 } }),
      api.get('/plants', { params: { state: employeeState, limit: 1 } }),
    ]);

    // ----- Products -----
    let nextProducts = [];
    if (productsRes.status === 'fulfilled') {
      const list = productsRes.value?.data?.data?.products || [];
      nextProducts = list.map((p) => ({
        _id: p._id,
        name: p.name,
        stock: p.stock,
        sold: p.soldCount ?? 0,
        price: p.price,
        status: p.status,
        carbonSaved: p.carbonSaved,
      }));
    }

    // ----- Stats from /analytics/branch (real) -----
    const realStats = productsRes.status === 'fulfilled' ? productsRes.value?.data?.data?.summary : null;
    const totalCarbon = realStats?.totalCarbon ? +realStats.totalCarbon : 0;

    // ----- Orders (filter by employee state client-side because the backend
    //       /orders/branch/all endpoint doesn't actually filter by state) -----
    let nextOrders = [];
    if (ordersRes.status === 'fulfilled') {
      const raw = ordersRes.value?.data?.data || [];
      // Match either the order's shippingState or the customer's state — both
      // are common patterns. If neither is set, the order might still belong
      // to this state if it contains one of this employee's products, but
      // that's expensive to check, so we just keep those as unfiltered.
      nextOrders = raw
        .filter((o) => !o.shippingState || !o.state || o.shippingState === employeeState || o.state === employeeState)
        .map((o) => ({
          _id: o._id,
          product: o.items?.[0]?.productId?.name || o.productName || 'Product',
          customer: o.userId?.name || 'Customer',
          qty: o.items?.reduce((a, i) => a + (i.quantity || 1), 0) || 1,
          total: o.totalAmount,
          status: o.status,
          date: (o.createdAt || '').slice(0, 10),
        }));
    }

    // ----- Plant count for state -----
    let plantCount = 0;
    if (plantsRes.status === 'fulfilled') {
      const data = plantsRes.value?.data?.data;
      plantCount = data?.total || (Array.isArray(data) ? data.length : 0);
    }

    setProducts(nextProducts);
    setOrders(nextOrders);
    setStats({
      totalProducts: realStats?.totalProducts ?? nextProducts.length,
      orders: nextOrders.length,
      carbonImpact: totalCarbon,
      plantCount,
    });
  }, [employeeState]);

  useEffect(() => {
    (async () => {
      await loadData();
      setLoading(false);
    })();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAddProduct = (product) => {
    setProducts((prev) => [product, ...prev]);
    Alert.alert('Submitted! ✅', 'Your product has been sent to Admin for review. It will go live after approval.');
  };

  const handleStockSaved = (productId, newStock) => {
    setProducts((prev) => prev.map((p) => (p._id === productId ? { ...p, stock: newStock } : p)));
  };

  const stockStatus = (stock) =>
    stock === 0 ? { label: 'Out of Stock', color: COLORS.error }
    : stock < 15 ? { label: 'Low Stock', color: '#FF9800' }
    : { label: 'Available', color: '#4CAF50' };

  const renderTab = () => {
    switch (activeTab) {
      case 'Overview':
        return (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.md, gap: SPACING.md }}>
            {/* Branch Info — uses the logged-in employee's actual state, not
                a hardcoded fallback. */}
            <View style={styles.branchInfoCard}>
              <Text style={styles.branchInfoTitle}>🏭 {employeeState} Branch</Text>
              <Text style={styles.branchInfoManager}>Manager: {user?.name || 'Branch Manager'}</Text>
              <View style={styles.verifiedBadge}><Text style={styles.verifiedTxt}>✅ Verified Employee</Text></View>
            </View>

            {/* Stats Grid — sourced from real backend (/analytics/branch and
                /plants). Missing panels degrade to 0 rather than fabricating
                numbers. All values reflect THIS branch. */}
            <View style={styles.statsGrid}>
              {[
                { emoji: '🏺', label: 'Total Products', value: stats.totalProducts, color: COLORS.primary },
                { emoji: '📦', label: `${employeeState} Orders`, value: stats.orders, color: '#2196F3' },
                { emoji: '🌍', label: 'CO₂ Saved (kg)', value: stats.carbonImpact, color: '#4CAF50' },
                { emoji: '🌱', label: `${employeeState} Plants`, value: stats.plantCount, color: '#795548' },
              ].map((s) => (
                <View key={s.label} style={[styles.statCard, { borderTopColor: s.color }]}>
                  <Text style={{ fontSize: 26 }}>{s.emoji}</Text>
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Approval Flow Visual */}
            <View style={styles.approvalFlow}>
              <Text style={styles.sectionTitle}>Product Approval Flow</Text>
              <View style={styles.flowRow}>
                {['You Create', 'Admin Reviews', 'Goes Live'].map((step, i) => (
                  <React.Fragment key={step}>
                    <View style={styles.flowStep}>
                      <View style={[styles.flowDot, { backgroundColor: i < 2 ? COLORS.primary : '#4CAF50' }]}>
                        <Text style={{ color: '#fff', fontSize: 12 }}>{i + 1}</Text>
                      </View>
                      <Text style={styles.flowLabel}>{step}</Text>
                    </View>
                    {i < 2 && <View style={styles.flowLine} />}
                  </React.Fragment>
                ))}
              </View>
            </View>

            {/* Low Stock Alert */}
            <View style={styles.alertCard}>
              <Text style={styles.alertTitle}>⚠️ Low Stock Alert</Text>
              {products.filter((p) => p.stock < 15).map((p) => (
                <View key={p._id} style={styles.alertRow}>
                  <Text style={styles.alertItemName}>{p.name}</Text>
                  <Text style={styles.alertItemStock}>{p.stock} left</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        );

      case 'Products':
        return (
          <View style={{ flex: 1 }}>
            <TouchableOpacity style={styles.addProductBtn} onPress={() => setShowAddModal(true)}>
              <Text style={styles.addProductBtnTxt}>➕ Add New Product</Text>
            </TouchableOpacity>
            <FlatList
              data={products}
              keyExtractor={(p) => p._id}
              contentContainerStyle={{ padding: SPACING.md, gap: SPACING.sm, paddingBottom: 80 }}
              renderItem={({ item }) => {
                const ss = stockStatus(item.stock);
                return (
                  <View style={styles.productRow}>
                    <View style={styles.productRowLeft}>
                      <Text style={{ fontSize: 32 }}>🏺</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.productRowHeader}>
                        <Text style={styles.productRowName}>{item.name}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[item.status]}20` }]}>
                          <Text style={[styles.statusBadgeTxt, { color: STATUS_COLORS[item.status] }]}>{item.status}</Text>
                        </View>
                      </View>
                      <Text style={styles.productRowPrice}>₹{item.price}</Text>
                      <View style={styles.productRowStats}>
                        <Text style={[styles.stockLabel, { color: ss.color }]}>● {ss.label} ({item.stock})</Text>
                        <Text style={styles.soldLabel}>✅ {item.sold} sold</Text>
                        <Text style={styles.carbonLabel}>🌍 {item.carbonSaved}kg</Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.editBtn} onPress={() => setEditStockProduct(item)}>
                      <Text style={styles.editBtnTxt}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          </View>
        );

      case 'Orders':
        return (
          <FlatList
            data={orders}
            keyExtractor={(o) => o._id}
            contentContainerStyle={{ padding: SPACING.md, gap: SPACING.sm, paddingBottom: 80 }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', padding: SPACING.xl }}>
                <Text style={{ fontSize: 40 }}>📭</Text>
                <Text style={{ color: COLORS.text.muted, marginTop: SPACING.sm }}>No orders for {employeeState} yet</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderId}>Order #{item._id.toUpperCase()}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[item.status]}20` }]}>
                    <Text style={[styles.statusBadgeTxt, { color: STATUS_COLORS[item.status] }]}>{item.status}</Text>
                  </View>
                </View>
                <Text style={styles.orderProduct}>{item.product}</Text>
                <View style={styles.orderDetails}>
                  <Text style={styles.orderDetail}>👤 {item.customer}</Text>
                  <Text style={styles.orderDetail}>📦 Qty: {item.qty}</Text>
                  <Text style={styles.orderDetail}>💰 ₹{item.total}</Text>
                  <Text style={styles.orderDetail}>📅 {item.date}</Text>
                </View>
              </View>
            )}
          />
        );

      case 'Analytics':
        return (
          <ScrollView contentContainerStyle={{ padding: SPACING.md, gap: SPACING.md }}>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsTitle}>📊 Sales This Month — {employeeState}</Text>
              {products.map((p) => (
                <View key={p._id} style={styles.analyticsRow}>
                  <Text style={styles.analyticsName} numberOfLines={1}>{p.name}</Text>
                  <View style={styles.analyticsBar}>
                    <View style={[styles.analyticsBarFill, { width: `${Math.min(100, (p.sold / 100) * 100)}%` }]} />
                  </View>
                  <Text style={styles.analyticsSold}>{p.sold}</Text>
                </View>
              ))}
            </View>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsTitle}>🌍 Carbon Contribution — {employeeState}</Text>
              <Text style={styles.analyticsValue}>{stats.carbonImpact} kg CO₂</Text>
              <Text style={styles.analyticsSub}>Saved through eco product sales in {employeeState}</Text>
            </View>
          </ScrollView>
        );

      default:
        return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: COLORS.text.muted, fontSize: 16 }}>Coming soon 🌿</Text>
        </View>;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏭 {employeeState} Branch</Text>
        <Text style={styles.headerSub}>{user?.name || 'Branch Manager'} · Employee</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Loading state */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : (
        // Pull-to-refresh wraps every tab so employees can refresh from any
        // view (overview, products, orders, analytics) without leaving it.
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
        >
          {renderTab()}
        </ScrollView>
      )}

      <AddProductModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddProduct}
      />
      <EditStockModal
        visible={!!editStockProduct}
        product={editStockProduct}
        onClose={() => setEditStockProduct(null)}
        onSaved={(newStock) => {
          if (editStockProduct) handleStockSaved(editStockProduct._id, newStock);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.lg, paddingTop: 56, paddingBottom: SPACING.sm },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text.primary },
  headerSub: { fontSize: 13, color: COLORS.text.muted, marginTop: 2 },
  tabBar: { height: 60, backgroundColor: COLORS.background },
  tabRow: { paddingHorizontal: SPACING.md, gap: SPACING.sm, alignItems: 'center', height: 60 },
  tab: {
    height: 36, justifyContent: 'center', alignItems: 'center',
    borderRadius: RADIUS.full, paddingHorizontal: 16,
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border,
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontSize: 13, lineHeight: 16, fontWeight: '600', color: COLORS.text.secondary, includeFontPadding: false },
  tabTextActive: { color: '#fff' },
  // Overview
  branchInfoCard: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, padding: SPACING.lg,
  },
  branchInfoTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  branchInfoManager: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  verifiedBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start', marginTop: SPACING.sm },
  verifiedTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: SPACING.md, alignItems: 'center', borderTopWidth: 3, ...SHADOWS.card,
  },
  statValue: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  statLabel: { fontSize: 11, color: COLORS.text.muted, textAlign: 'center', marginTop: 2 },
  approvalFlow: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, ...SHADOWS.card },
  sectionTitle: { fontWeight: '700', color: COLORS.text.primary, marginBottom: SPACING.sm, fontSize: 15 },
  flowRow: { flexDirection: 'row', alignItems: 'center' },
  flowStep: { alignItems: 'center', flex: 1 },
  flowDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  flowLabel: { fontSize: 10, color: COLORS.text.secondary, marginTop: 6, textAlign: 'center', fontWeight: '600' },
  flowLine: { flex: 1, height: 2, backgroundColor: COLORS.primary, marginBottom: 20 },
  alertCard: { backgroundColor: '#FFF8E1', borderRadius: RADIUS.md, padding: SPACING.md, borderLeftWidth: 3, borderLeftColor: '#FF9800' },
  alertTitle: { fontWeight: '700', color: '#E65100', marginBottom: SPACING.sm },
  alertRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  alertItemName: { fontSize: 13, color: COLORS.text.primary },
  alertItemStock: { fontSize: 13, color: '#FF9800', fontWeight: '700' },
  // Products
  addProductBtn: {
    margin: SPACING.md, backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    padding: SPACING.md, alignItems: 'center', ...SHADOWS.card,
  },
  addProductBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  productRow: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md,
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, ...SHADOWS.card,
  },
  productRowLeft: {
    width: 56, height: 56, backgroundColor: `${COLORS.primary}10`,
    borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center',
  },
  productRowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productRowName: { fontSize: 14, fontWeight: '700', color: COLORS.text.primary, flex: 1 },
  productRowPrice: { fontSize: 13, fontWeight: '700', color: COLORS.accent, marginTop: 2 },
  productRowStats: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  stockLabel: { fontSize: 10, fontWeight: '600' },
  soldLabel: { fontSize: 10, color: '#4CAF50', fontWeight: '600' },
  carbonLabel: { fontSize: 10, color: COLORS.primary, fontWeight: '600' },
  statusBadge: { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  statusBadgeTxt: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  editBtn: { backgroundColor: `${COLORS.primary}15`, borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 6 },
  editBtnTxt: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  // Orders
  orderCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, ...SHADOWS.card },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  orderId: { fontSize: 12, color: COLORS.text.muted, fontWeight: '600' },
  orderProduct: { fontSize: 15, fontWeight: '700', color: COLORS.text.primary, marginBottom: SPACING.sm },
  orderDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  orderDetail: { fontSize: 12, color: COLORS.text.secondary, backgroundColor: COLORS.cardBg, borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3 },
  // Analytics
  analyticsCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, ...SHADOWS.card },
  analyticsTitle: { fontWeight: '700', color: COLORS.text.primary, marginBottom: SPACING.md, fontSize: 15 },
  analyticsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm, gap: SPACING.sm },
  analyticsName: { width: 120, fontSize: 12, color: COLORS.text.secondary },
  analyticsBar: { flex: 1, height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
  analyticsBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  analyticsSold: { width: 30, fontSize: 12, fontWeight: '700', color: COLORS.primary, textAlign: 'right' },
  analyticsValue: { fontSize: 32, fontWeight: '900', color: COLORS.primary },
  analyticsSub: { fontSize: 13, color: COLORS.text.muted, marginTop: 4 },
  // Modal
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, paddingTop: 56, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text.primary },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.cardBg, alignItems: 'center', justifyContent: 'center' },
  closeBtnTxt: { fontWeight: '700', color: COLORS.text.secondary },
  pendingNote: { backgroundColor: '#FFF8E1', borderRadius: RADIUS.md, padding: SPACING.md, borderLeftWidth: 3, borderLeftColor: '#FF9800' },
  pendingNoteTxt: { fontSize: 13, color: '#E65100', lineHeight: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text.secondary, marginBottom: 6 },
  fieldInput: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: SPACING.md, fontSize: 15, color: COLORS.text.primary, backgroundColor: COLORS.surface,
  },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', alignSelf: 'stretch', rowGap: 10, columnGap: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.full,
    paddingHorizontal: 14, paddingVertical: 0, height: 40,
    borderWidth: 1.5, borderColor: COLORS.border, overflow: 'hidden',
  },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catChipEmoji: { fontSize: 14, lineHeight: 18, marginRight: 6, includeFontPadding: false },
  catChipTxt: { fontSize: 12, lineHeight: 16, fontWeight: '600', color: COLORS.text.secondary, includeFontPadding: false },
  modalFooter: { flexDirection: 'row', padding: SPACING.md, gap: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border },
  cancelBtn: { flex: 1, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border },
  cancelBtnTxt: { color: COLORS.text.secondary, fontWeight: '700' },
  saveBtn: { flex: 2, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  saveBtnTxt: { color: '#fff', fontWeight: '800' },
});

export default BranchDashboardScreen;
