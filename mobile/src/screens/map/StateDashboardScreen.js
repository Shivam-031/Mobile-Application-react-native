import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import {
  getStateDashboard, clearStateAnalyticsCache,
} from '../../services/stateAnalyticsService';

import StateHeader from './components/StateHeader';
import SearchBar from './components/SearchBar';
import FiltersBar from './components/FiltersBar';
import SortBar from './components/SortBar';
import CityCard from './components/CityCard';
import Leaderboard from './components/Leaderboard';
import CityDetailModal from './components/CityDetailModal';
import SalesChart from './components/charts/SalesChart';
import ProductChart from './components/charts/ProductChart';
import CarbonChart from './components/charts/CarbonChart';
import CustomerChart from './components/charts/CustomerChart';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';

const DEFAULT_FILTERS = { district: 'all', category: 'all', sustainabilityTier: 'all' };
const DEFAULT_SORT = 'revenue';

// Approximate height of a CityCard — used for FlatList getItemLayout so the
// list can virtualize even when the user has 80+ cities after a real backend.
const CITY_ROW_HEIGHT = 168;

const StateDashboardScreen = ({ navigation, route }) => {
  const stateName = route?.params?.stateName || 'Maharashtra';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payload, setPayload] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState(DEFAULT_SORT);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState(null);

  // Fetch (cached) payload on focus — reuses getStateDashboard's in-module
  // cache. Errors are captured (not swallowed) so the screen can render an
  // honest empty state instead of an indefinite "Loading…" spinner.
  const [loadError, setLoadError] = useState(null);
  const load = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) clearStateAnalyticsCache();
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getStateDashboard(stateName);
      setPayload(data);
    } catch (e) {
      setLoadError(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [stateName]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  // Top bar is always rendered so the user always sees context + a back button,
  // even during loading or after a fatal error. Otherwise an early-return below
  // leaves the screen blank.
  const TopBar = (
    <View style={styles.topBar}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={styles.backTxt}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.topTitle}>{stateName} Dashboard</Text>
      <View style={{ width: 60 }} />
    </View>
  );

  // City list — derived from payload + filters + search + sort. Memoized so the
  // FlatList doesn't re-render rows unless the result actually changed.
  const filteredCities = useMemo(() => {
    if (!payload) return [];
    let list = payload.cities;

    if (filters.district && filters.district !== 'all') {
      list = list.filter((c) => c.district === filters.district);
    }
    if (filters.sustainabilityTier && filters.sustainabilityTier !== 'all') {
      const min = { platinum: 85, gold: 70, silver: 55 }[filters.sustainabilityTier] || 0;
      list = list.filter((c) => c.sustainabilityScore >= min);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }

    const sorted = [...list].sort((a, b) => {
      const av = a[sortBy] ?? 0;
      const bv = b[sortBy] ?? 0;
      return bv - av;
    });
    return sorted;
  }, [payload, filters, searchQuery, sortBy]);

  if (loading && !payload) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        {TopBar}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading {stateName} dashboard…</Text>
        </View>
      </View>
    );
  }

  if (loadError && !payload) {
    const msg = loadError.response?.data?.message || loadError.message || 'Unable to load state data.';
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        {TopBar}
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyEmoji}>📡</Text>
          <Text style={styles.emptyText}>Couldn't load {stateName} analytics.</Text>
          <Text style={[styles.emptyText, { marginTop: 4, fontSize: 12 }]}>{msg}</Text>
          <TouchableOpacity
            style={styles.emptyReset}
            onPress={() => load(true)}
          >
            <Text style={styles.emptyResetTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const ListHeader = (
    <View>
      <StateHeader stateName={stateName} kpis={payload.kpis} cityCount={payload.cities.length} />

      {/* 2x2 chart grid */}
      <View style={styles.gridWrap}>
        <Text style={styles.sectionTitle}>📈 Analytics</Text>
        <View style={styles.grid}>
          <View style={{ width: '100%' }}>
            <SalesChart analytics={payload.analytics} />
          </View>
          <View style={{ width: '100%' }}>
            <ProductChart analytics={payload.analytics} />
          </View>
          <View style={{ width: '100%' }}>
            <CarbonChart kpis={payload.kpis} analytics={payload.analytics} />
          </View>
          <View style={{ width: '100%' }}>
            <CustomerChart analytics={payload.analytics} />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🏙️ City-wise Sales</Text>
          <Text style={styles.sectionMeta}>
            {filteredCities.length} of {payload.cities.length} cities
          </Text>
        </View>

        <SearchBar value={searchQuery} onChange={setSearchQuery} />
        <FiltersBar
          filters={filters}
          onChange={setFilters}
          cities={payload.cities}
        />
        <SortBar sortBy={sortBy} onChange={setSortBy} />
      </View>
    </View>
  );

  const ListEmpty = (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>🔍</Text>
      <Text style={styles.emptyText}>
        No cities match your filters or search.
      </Text>
      <TouchableOpacity
        style={styles.emptyReset}
        onPress={() => { setFilters(DEFAULT_FILTERS); setSearchQuery(''); }}
      >
        <Text style={styles.emptyResetTxt}>Reset</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {TopBar}

      <FlatList
        data={filteredCities}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <CityCard city={item} rank={index + 1} onPress={setSelectedCity} />
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={
          <Leaderboard leaderboard={payload.leaderboard} />
        }
        contentContainerStyle={{ paddingBottom: SPACING.xxl }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        // Performance: virtualize aggressively for very long city lists.
        initialNumToRender={6}
        windowSize={5}
        removeClippedSubviews
        getItemLayout={(_, index) => ({
          length: CITY_ROW_HEIGHT,
          offset: CITY_ROW_HEIGHT * index,
          index,
        })}
      />

      <CityDetailModal
        visible={!!selectedCity}
        city={selectedCity}
        onClose={() => setSelectedCity(null)}
        onShop={() => navigation.navigate('Marketplace')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: { marginTop: SPACING.sm, color: COLORS.text.secondary, fontSize: 13 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    paddingTop: SPACING.lg,
  },
  backBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.15)',
  },
  backTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  section: { marginTop: SPACING.sm },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
    paddingHorizontal: SPACING.md, marginTop: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 16, fontWeight: '900', color: COLORS.text.primary,
    paddingHorizontal: SPACING.md, marginTop: SPACING.md, marginBottom: 4,
  },
  sectionMeta: { fontSize: 11, color: COLORS.text.muted, fontWeight: '600' },
  gridWrap: { paddingHorizontal: SPACING.md, marginTop: SPACING.sm },
  grid: { gap: SPACING.md },
  emptyState: { alignItems: 'center', padding: SPACING.xl },
  emptyEmoji: { fontSize: 36 },
  emptyText: { color: COLORS.text.muted, fontSize: 13, marginTop: SPACING.sm },
  emptyReset: {
    marginTop: SPACING.md, paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: RADIUS.full, backgroundColor: COLORS.primary,
  },
  emptyResetTxt: { color: '#fff', fontSize: 12, fontWeight: '800' },
});

export default StateDashboardScreen;
