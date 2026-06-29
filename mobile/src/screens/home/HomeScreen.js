import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, Animated,
} from 'react-native';
import { useSelector } from 'react-redux';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';

const HomeScreen = ({ navigation }) => {
  const { user } = useSelector((state) => state.auth);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = new Animated.Value(0);

  const stats = { carbonSavedToday: 12.5, plantSpeciesCount: 250, greenZones: 18 };

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, []);

  const onRefresh = async () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 800); };

  const StatCard = ({ emoji, value, label, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color || COLORS.primary }]}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={[styles.statValue, { color: color || COLORS.primary }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const QuickAction = ({ emoji, label, onPress }) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.quickActionIcon}><Text style={{ fontSize: 26 }}>{emoji}</Text></View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );

  const isAdmin = user?.role === 'MASTER_ADMIN';

  return (
    <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>🌿 Namaste,</Text>
            <Text style={styles.userName}>{user?.name?.split(' ')[0] || 'Eco Traveler'}!</Text>
            <Text style={styles.headerSub}>Let's make India greener today</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.iconBtn}>
              <Text style={{ fontSize: 22 }}>🧑‍🌾</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Admin Banner — only MASTER_ADMIN sees this; it goes to the
            admin dashboard where they can review & approve product
            submissions from branch employees. */}
        {isAdmin && (
          <TouchableOpacity
            style={[styles.branchBanner, styles.adminBanner]}
            onPress={() => navigation.navigate('AdminDashboard')}
            activeOpacity={0.85}
          >
            <View>
              <Text style={styles.branchBannerTitle}>🛡️ Admin Dashboard</Text>
              <Text style={styles.branchBannerSub}>Review & approve product submissions from branch employees</Text>
            </View>
            <Text style={styles.branchBannerArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* Employee Banner — shown to Employees only (admins get the
            AdminDashboard banner above). */}
        {user?.role === 'EMPLOYEE' && (
          <TouchableOpacity
            style={styles.branchBanner}
            onPress={() => navigation.navigate('BranchDashboard')}
            activeOpacity={0.85}
          >
            <View>
              <Text style={styles.branchBannerTitle}>🏭 Employee Dashboard</Text>
              <Text style={styles.branchBannerSub}>Manage products, orders & analytics for {user?.state || 'your state'}</Text>
            </View>
            <Text style={styles.branchBannerArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* Green Score Banner */}
        <View style={styles.scoreBanner}>
          <View>
            <Text style={styles.scoreBannerLabel}>Your Green Score</Text>
            <Text style={styles.scoreBannerValue}>🌟 {user?.greenScore || 0} pts</Text>
            <Text style={styles.scoreBannerSub}>Keep going — plant more, buy eco, save carbon!</Text>
          </View>
          <TouchableOpacity
            style={styles.calcCarbonBtn}
            onPress={() => navigation.navigate('Carbon')}
          >
            <Text style={styles.calcCarbonBtnText}>Calculate Carbon →</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <Text style={styles.sectionTitle}>Today's Impact</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
          <StatCard emoji="🌍" value={`${stats.carbonSavedToday} kg`} label="CO₂ Saved" color={COLORS.primary} />
          <StatCard emoji="🌱" value={stats.plantSpeciesCount} label="Plant Species" color="#4CAF50" />
          <StatCard emoji="📍" value={stats.greenZones} label="Green Zones" color="#795548" />
          <StatCard emoji="🏺" value="120+" label="Eco Products" color="#FF9800" />
        </ScrollView>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <QuickAction emoji="🗺️" label="India Map" onPress={() => navigation.navigate('Map')} />
          <QuickAction emoji="🛒" label="Shop Eco" onPress={() => navigation.navigate('Marketplace')} />
          <QuickAction emoji="🌿" label="Plants" onPress={() => navigation.navigate('Plants')} />
          <QuickAction emoji="📊" label="Carbon Calc" onPress={() => navigation.navigate('Carbon')} />
          <QuickAction emoji="📍" label="Nearby Eco" onPress={() => navigation.navigate('NearbyEco')} />
          <QuickAction emoji="📦" label="My Orders" onPress={() => navigation.navigate('MyOrders')} />
          <QuickAction emoji="📈" label="Carbon History" onPress={() => navigation.navigate('CarbonHistory')} />
          <QuickAction emoji="🗺️" label="State Plants" onPress={() => navigation.navigate('Plants', { screen: 'StatewisePlants' })} />
        </View>

        {/* Nearby Eco Locations teaser */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📍 Nearby Eco Locations</Text>
          <TouchableOpacity onPress={() => navigation.navigate('NearbyEco')}>
            <Text style={styles.seeAll}>See All →</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: SPACING.sm, paddingBottom: SPACING.sm }}>
          {[
            { name: 'Green Yatra Store', type: 'store', emoji: '🏪', dist: '1.2 km', open: true },
            { name: 'Neem Plantation Zone', type: 'plant', emoji: '🌳', dist: '2.0 km', open: true },
            { name: 'Recycling Centre', type: 'recycle', emoji: '♻️', dist: '2.4 km', open: true },
            { name: 'Organic Farmers Market', type: 'market', emoji: '🥬', dist: '3.8 km', open: true },
          ].map((loc, i) => (
            <TouchableOpacity
              key={i}
              style={styles.nearbyCard}
              onPress={() => navigation.navigate('NearbyEco')}
              activeOpacity={0.85}
            >
              <View style={styles.nearbyIconBg}>
                <Text style={{ fontSize: 28 }}>{loc.emoji}</Text>
              </View>
              <Text style={styles.nearbyName} numberOfLines={2}>{loc.name}</Text>
              <Text style={styles.nearbyDist}>{loc.dist}</Text>
              <View style={[styles.nearbyStatus, { backgroundColor: loc.open ? '#E8F5E9' : '#FFEBEE' }]}>
                <Text style={[styles.nearbyStatusTxt, { color: loc.open ? '#4CAF50' : '#F44336' }]}>
                  {loc.open ? '● Open' : '● Closed'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured Products */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Products</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Marketplace')}>
            <Text style={styles.seeAll}>See All →</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: SPACING.sm, paddingBottom: SPACING.sm }}>
          {[
            { name: 'Small Organic Pot', price: '₹149', carbon: '1.2 kg', location: 'Maharashtra' },
            { name: 'Medium Clay Pot', price: '₹249', carbon: '2.5 kg', location: 'Rajasthan' },
            { name: 'Decorative Pot', price: '₹399', carbon: '3.0 kg', location: 'Kerala' },
          ].map((p, i) => (
            <TouchableOpacity
              key={i} style={styles.productCard}
              onPress={() => navigation.navigate('Marketplace')}
              activeOpacity={0.85}
            >
              <View style={styles.productImagePlaceholder}><Text style={{ fontSize: 40 }}>🏺</Text></View>
              <Text style={styles.productName}>{p.name}</Text>
              <Text style={styles.productLocation}>📍 {p.location}</Text>
              <Text style={styles.productCarbon}>🌍 Saves {p.carbon} CO₂</Text>
              <View style={styles.productFooter}>
                <Text style={styles.productPrice}>{p.price}</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('Marketplace')}>
                  <Text style={styles.addBtnText}>+ Add</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Eco Coming Soon */}
        <View style={styles.comingSoonCard}>
          <Text style={styles.comingSoonTitle}>🚀 Coming Soon to Green Yatra</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.sm, paddingTop: SPACING.sm }}>
            {[
              { emoji: '🌸', label: 'Phool Products' },
              { emoji: '🎋', label: 'Bamboo Range' },
              { emoji: '♻️', label: 'Recycled Items' },
              { emoji: '🌱', label: 'Organic Seeds' },
              { emoji: '🌻', label: 'Plant Accessories' },
            ].map((item) => (
              <View key={item.label} style={styles.comingSoonChip}>
                <Text style={{ fontSize: 18 }}>{item.emoji}</Text>
                <Text style={styles.comingSoonLabel}>{item.label}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Green Stories */}
        <Text style={styles.sectionTitle}>Green Stories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: SPACING.sm, paddingBottom: SPACING.sm }}>
          {[
            { emoji: '🌳', title: 'Neem Saves Lives', desc: 'How neem trees reduce urban heat by 3°C in Delhi' },
            { emoji: '🏺', title: 'Organic Pots', desc: 'Clay pots from Rajasthan supporting 500 artisans' },
            { emoji: '💚', title: 'Carbon Free Zone', desc: 'Kerala\'s Wayanad becomes India\'s first carbon-neutral district' },
          ].map((s, i) => (
            <View key={i} style={styles.storyCard}>
              <Text style={{ fontSize: 32 }}>{s.emoji}</Text>
              <Text style={styles.storyTitle}>{s.title}</Text>
              <Text style={styles.storyDesc}>{s.desc}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={{ height: 90 }} />
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingTop: 60, paddingBottom: SPACING.md,
  },
  headerLeft: { flex: 1 },
  headerRight: { flexDirection: 'row', gap: SPACING.sm },
  greeting: { fontSize: 14, color: COLORS.text.secondary },
  userName: { fontSize: 26, fontWeight: '800', color: COLORS.primary },
  headerSub: { fontSize: 12, color: COLORS.text.muted, marginTop: 2 },
  iconBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center', ...SHADOWS.card,
  },
  branchBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: SPACING.md, marginBottom: SPACING.sm,
    backgroundColor: COLORS.accent, borderRadius: RADIUS.md, padding: SPACING.md,
    ...SHADOWS.card,
  },
  // Admin banner uses a distinct purple so admins immediately see a different
  // entry point from the employee one — and so it can't be mistaken for an
  // employee screen.
  adminBanner: {
    backgroundColor: '#9C27B0',
    borderWidth: 2, borderColor: '#FFD54F',
  },
  branchBannerTitle: { fontSize: 14, fontWeight: '800', color: '#fff' },
  branchBannerSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  branchBannerArrow: { fontSize: 24, color: '#fff', fontWeight: '700' },
  scoreBanner: {
    margin: SPACING.md, borderRadius: RADIUS.lg, padding: SPACING.lg,
    backgroundColor: COLORS.primary, ...SHADOWS.card,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  scoreBannerLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
  scoreBannerValue: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 4 },
  scoreBannerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 4, maxWidth: 140 },
  calcCarbonBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  calcCarbonBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text.primary, paddingHorizontal: SPACING.lg, marginTop: SPACING.md, marginBottom: SPACING.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: SPACING.lg },
  seeAll: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  statsRow: { paddingHorizontal: SPACING.md, gap: SPACING.sm, paddingBottom: SPACING.sm },
  statCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md,
    width: 110, borderLeftWidth: 3, ...SHADOWS.card,
  },
  statEmoji: { fontSize: 22 },
  statValue: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  statLabel: { fontSize: 10, color: COLORS.text.muted, marginTop: 2 },
  quickActionsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.md,
    gap: SPACING.sm, marginBottom: SPACING.sm,
  },
  quickAction: {
    width: '22%', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md, padding: SPACING.sm, ...SHADOWS.card,
  },
  quickActionIcon: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  quickActionLabel: { fontSize: 9, color: COLORS.text.secondary, fontWeight: '600', textAlign: 'center' },
  nearbyCard: {
    width: 130, backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: SPACING.sm, ...SHADOWS.card,
  },
  nearbyIconBg: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: `${COLORS.primary}10`,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm,
  },
  nearbyName: { fontSize: 12, fontWeight: '700', color: COLORS.text.primary, lineHeight: 16 },
  nearbyDist: { fontSize: 11, color: COLORS.primary, fontWeight: '600', marginTop: 3 },
  nearbyStatus: { borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6, alignSelf: 'flex-start' },
  nearbyStatusTxt: { fontSize: 10, fontWeight: '700' },
  productCard: {
    width: 165, backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: SPACING.sm, ...SHADOWS.card,
  },
  productImagePlaceholder: {
    width: '100%', height: 90, backgroundColor: `${COLORS.primary}10`,
    borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm,
  },
  productName: { fontSize: 13, fontWeight: '700', color: COLORS.text.primary },
  productLocation: { fontSize: 10, color: COLORS.text.muted, marginTop: 2 },
  productCarbon: { fontSize: 10, color: COLORS.primary, marginTop: 2, fontWeight: '600' },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.sm },
  productPrice: { fontSize: 14, fontWeight: '800', color: COLORS.accent },
  addBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 4 },
  addBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  comingSoonCard: {
    marginHorizontal: SPACING.md, backgroundColor: `${COLORS.primary}08`,
    borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: `${COLORS.primary}20`,
  },
  comingSoonTitle: { fontWeight: '700', color: COLORS.primary, fontSize: 14 },
  comingSoonChip: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, paddingHorizontal: 14,
    paddingVertical: 10, alignItems: 'center', gap: 4, ...SHADOWS.card,
    minWidth: 100,
  },
  comingSoonLabel: { fontSize: 11, fontWeight: '600', color: COLORS.text.secondary },
  storyCard: {
    width: 200, backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: SPACING.md, ...SHADOWS.card,
  },
  storyTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text.primary, marginTop: SPACING.sm },
  storyDesc: { fontSize: 12, color: COLORS.text.secondary, marginTop: 4, lineHeight: 18 },
});

export default HomeScreen;
