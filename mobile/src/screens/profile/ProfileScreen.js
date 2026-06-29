import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../../store/slices/authSlice';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';

const BADGES = [
  { emoji: '🌱', label: 'Beginner Green User', earned: true },
  { emoji: '🌳', label: 'Tree Protector', earned: true },
  { emoji: '🏺', label: 'Eco Buyer', earned: false },
  { emoji: '🌍', label: 'Carbon Warrior', earned: false },
  { emoji: '🦋', label: 'Biodiversity Champion', earned: false },
  { emoji: '☀️', label: 'Solar Pioneer', earned: false },
];

const MENU_ITEMS = [
  { emoji: '📦', label: 'My Orders', screen: 'Orders' },
  { emoji: '🌍', label: 'Carbon History', screen: 'CarbonHistory' },
  { emoji: '🌿', label: 'Saved Plants', screen: 'Plants' },
  { emoji: '⚙️', label: 'Settings', screen: 'Settings' },
  { emoji: '❓', label: 'Help & Support', screen: 'Help' },
  { emoji: '📜', label: 'About Green Yatra', screen: 'About' },
];

const ProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive',
        onPress: () => dispatch(logoutUser()),
      },
    ]);
  };

  const getScoreLevel = (score) => {
    if (score < 100) return { label: 'Seedling 🌱', color: '#8BC34A', next: 100 };
    if (score < 500) return { label: 'Sapling 🌿', color: '#4CAF50', next: 500 };
    if (score < 1000) return { label: 'Tree 🌳', color: '#2F6B3F', next: 1000 };
    return { label: 'Forest 🌲', color: '#1A4A2A', next: null };
  };

  const level = getScoreLevel(user?.greenScore || 0);
  const earnedBadges = BADGES.filter((b) => b.earned);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarCircle}>
          <Text style={{ fontSize: 52 }}>🧑‍🌾</Text>
        </View>
        <Text style={styles.profileName}>{user?.name || 'Eco Traveler'}</Text>
        <Text style={styles.profileEmail}>{user?.email}</Text>
        {user?.state && <Text style={styles.profileState}>📍 {user.state}</Text>}
        <View style={[styles.roleBadge, user?.role === 'MASTER_ADMIN' && { backgroundColor: '#9C27B0' }, user?.role === 'EMPLOYEE' && { backgroundColor: COLORS.accent }]}>
          <Text style={styles.roleText}>{({ USER: 'Customer', EMPLOYEE: 'Employee', MASTER_ADMIN: 'Admin' })[user?.role] || 'Customer'}</Text>
        </View>
      </View>

      {/* Green Score */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreHeader}>
          <Text style={styles.scoreTitle}>🌟 Green Score</Text>
          <Text style={[styles.scoreLevel, { color: level.color }]}>{level.label}</Text>
        </View>
        <Text style={styles.scoreValue}>{user?.greenScore || 0} pts</Text>
        {level.next && (
          <>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, {
                width: `${Math.min(100, ((user?.greenScore || 0) / level.next) * 100)}%`,
                backgroundColor: level.color,
              }]} />
            </View>
            <Text style={styles.progressLabel}>{(user?.greenScore || 0)} / {level.next} pts to next level</Text>
          </>
        )}
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        {[
          { label: 'Orders', value: '0', emoji: '📦' },
          { label: 'CO₂ Saved', value: '0 kg', emoji: '🌍' },
          { label: 'Badges', value: earnedBadges.length, emoji: '🏅' },
        ].map((s) => (
          <View key={s.label} style={styles.statBox}>
            <Text style={{ fontSize: 22 }}>{s.emoji}</Text>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Badges */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏅 Badges</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesRow}>
          {BADGES.map((b) => (
            <View key={b.label} style={[styles.badgeCard, !b.earned && styles.badgeCardLocked]}>
              <Text style={{ fontSize: 28, opacity: b.earned ? 1 : 0.3 }}>{b.emoji}</Text>
              <Text style={[styles.badgeLabel, !b.earned && { color: COLORS.text.muted }]}>{b.label}</Text>
              {!b.earned && <Text style={styles.lockedText}>🔒 Locked</Text>}
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Admin-only quick link — surfaced prominently so MASTER_ADMIN
          users always have a way to reach the Admin Dashboard. */}
      {user?.role === 'MASTER_ADMIN' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Administration</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('AdminDashboard')}
            >
              <Text style={styles.menuEmoji}>🛡️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>Admin Dashboard</Text>
                <Text style={styles.menuSubLabel}>Review & approve product submissions</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Menu */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, index < MENU_ITEMS.length - 1 && styles.menuItemBorder]}
              onPress={() => navigation.navigate(item.screen)}
            >
              <Text style={styles.menuEmoji}>{item.emoji}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>🚪 Logout</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>Green Yatra India v1.0.0 🌿</Text>
      <View style={{ height: 80 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  profileHeader: {
    backgroundColor: COLORS.primary, paddingTop: 70, paddingBottom: SPACING.xl,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
  },
  profileName: { fontSize: 22, fontWeight: '800', color: '#fff' },
  profileEmail: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  profileState: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: RADIUS.full,
    paddingHorizontal: 14, paddingVertical: 4, marginTop: SPACING.sm,
  },
  roleText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  scoreCard: {
    margin: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.lg, ...SHADOWS.card,
  },
  scoreHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text.primary },
  scoreLevel: { fontSize: 13, fontWeight: '700' },
  scoreValue: { fontSize: 36, fontWeight: '900', color: COLORS.primary, marginTop: 4 },
  progressBarBg: { height: 8, backgroundColor: COLORS.border, borderRadius: 4, marginTop: SPACING.sm, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  progressLabel: { fontSize: 11, color: COLORS.text.muted, marginTop: 6 },
  statsRow: { flexDirection: 'row', marginHorizontal: SPACING.md, gap: SPACING.sm, marginBottom: SPACING.sm },
  statBox: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md,
    alignItems: 'center', ...SHADOWS.card,
  },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.primary, marginTop: 4 },
  statLabel: { fontSize: 11, color: COLORS.text.muted, marginTop: 2 },
  section: { marginHorizontal: SPACING.md, marginBottom: SPACING.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text.primary, marginBottom: SPACING.sm },
  badgesRow: { gap: SPACING.sm, paddingBottom: SPACING.sm },
  badgeCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md,
    alignItems: 'center', minWidth: 100, ...SHADOWS.card,
  },
  badgeCardLocked: { backgroundColor: COLORS.cardBg },
  badgeLabel: { fontSize: 10, fontWeight: '600', color: COLORS.text.secondary, textAlign: 'center', marginTop: 4, maxWidth: 90 },
  lockedText: { fontSize: 9, color: COLORS.text.muted, marginTop: 2 },
  menuCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, overflow: 'hidden', ...SHADOWS.card },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuEmoji: { fontSize: 20, width: 32 },
  menuLabel: { flex: 1, fontSize: 15, color: COLORS.text.primary, fontWeight: '500' },
  menuSubLabel: { fontSize: 12, color: COLORS.text.muted, marginTop: 2 },
  menuArrow: { fontSize: 20, color: COLORS.text.muted },
  logoutBtn: {
    margin: SPACING.md, borderRadius: RADIUS.md, padding: SPACING.md,
    alignItems: 'center', backgroundColor: '#FFEBEE', borderWidth: 1.5, borderColor: '#FFCDD2',
  },
  logoutBtnText: { color: COLORS.error, fontWeight: '700', fontSize: 15 },
  versionText: { textAlign: 'center', color: COLORS.text.muted, fontSize: 12, marginBottom: SPACING.md },
});

export default ProfileScreen;
