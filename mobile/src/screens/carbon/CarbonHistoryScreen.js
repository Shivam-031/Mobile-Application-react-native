import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/apiService';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - SPACING.lg * 2;
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Empty-state placeholder for the carbon chart. When the backend returns
// no records we render an empty array so the chart math still works
// instead of fabricating a year of invented data.
const EMPTY_HISTORY = [];

const BarChart = ({ data, maxVal }) => {
  const barWidth = (CHART_WIDTH - 40) / data.length - 6;
  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartBars}>
        {data.map((d, i) => {
          const barH = Math.max(4, ((d.totalGenerated || 0) / maxVal) * 140);
          const isHighest = d.totalGenerated === Math.max(...data.map((x) => x.totalGenerated));
          const isLowest = d.totalGenerated === Math.min(...data.map((x) => x.totalGenerated));
          return (
            <View key={i} style={[styles.barWrapper, { width: barWidth }]}>
              {isLowest && <Text style={styles.barTag}>🏆</Text>}
              <Text style={styles.barValue}>{d.totalGenerated}</Text>
              <View style={[
                styles.bar,
                { height: barH, backgroundColor: isHighest ? '#F44336' : isLowest ? COLORS.primary : `${COLORS.primary}99` },
              ]} />
              <Text style={styles.barLabel}>{MONTHS[d.month - 1]}</Text>
            </View>
          );
        })}
      </View>
      {/* Y-axis guide lines */}
      <View style={styles.yAxisLines}>
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <View key={p} style={[styles.yLine, { bottom: p * 140 + 22 }]}>
            <Text style={styles.yLabel}>{Math.round(maxVal * p)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const CarbonHistoryScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('monthly');

  const { data: history, isLoading, isError, error } = useQuery({
    queryKey: ['carbonHistory'],
    queryFn: async () => {
      const res = await api.get('/carbon/history');
      return res.data.data || [];
    },
  });

  const data = (history && history.length ? history : EMPTY_HISTORY);
  const hasData = data.length > 0;
  const maxVal = Math.max(...data.map((d) => d.totalGenerated || 0), 100);
  const totalYearly = data.reduce((acc, d) => acc + (d.totalGenerated || 0), 0);
  const avgMonthly = data.length ? (totalYearly / data.length).toFixed(0) : 0;
  const bestMonth = hasData
    ? data.reduce((best, d) => (d.totalGenerated < best.totalGenerated ? d : best), data[0])
    : null;
  const worstMonth = hasData
    ? data.reduce((worst, d) => (d.totalGenerated > worst.totalGenerated ? d : worst), data[0])
    : null;
  const trend = data.length >= 2
    ? data[data.length - 1].totalGenerated < data[0].totalGenerated ? 'improving' : 'worsening'
    : 'stable';

  const avgBreakdown = data.length
    ? {
        travel: (data.reduce((a, d) => a + (d.breakdown?.travel || 0), 0) / data.length).toFixed(0),
        food: (data.reduce((a, d) => a + (d.breakdown?.food || 0), 0) / data.length).toFixed(0),
        electricity: (data.reduce((a, d) => a + (d.breakdown?.electricity || 0), 0) / data.length).toFixed(0),
        lpg: (data.reduce((a, d) => a + (d.breakdown?.lpg || 0), 0) / data.length).toFixed(0),
      }
    : {};

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🌍 Carbon History</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Error banner */}
        {isError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>
              ⚠️ {error?.message || 'Could not load carbon history'}
            </Text>
          </View>
        )}

        {/* Empty state — only when the backend returned no records and no error */}
        {!hasData && !isError && (
          <View style={styles.emptyWrap}>
            <Text style={{ fontSize: 60 }}>🌍</Text>
            <Text style={styles.emptyTitle}>No carbon history yet</Text>
            <Text style={styles.emptySub}>Log your first month to start tracking your footprint.</Text>
            <TouchableOpacity style={styles.calcBtn} onPress={() => navigation.navigate('Carbon')}>
              <Text style={styles.calcBtnText}>📊 Calculate This Month's Carbon</Text>
            </TouchableOpacity>
          </View>
        )}

        {hasData && (
          <>
        {/* Trend Banner */}
        <View style={[styles.trendBanner, { backgroundColor: trend === 'improving' ? COLORS.primary : '#F44336' }]}>
          <Text style={styles.trendEmoji}>{trend === 'improving' ? '📉' : '📈'}</Text>
          <View>
            <Text style={styles.trendTitle}>
              Your carbon footprint is {trend === 'improving' ? 'improving! 🎉' : 'increasing ⚠️'}
            </Text>
            <Text style={styles.trendSub}>
              {trend === 'improving'
                ? `Down from ${data[0]?.totalGenerated} to ${data[data.length - 1]?.totalGenerated} kg this year`
                : 'Try using public transport and reducing electricity usage'}
            </Text>
          </View>
        </View>

        {/* Summary Stats */}
        <View style={styles.statsGrid}>
          {[
            { label: 'Yearly Total', value: `${totalYearly} kg`, emoji: '📊', color: COLORS.primary },
            { label: 'Monthly Avg', value: `${avgMonthly} kg`, emoji: '📅', color: '#2196F3' },
            { label: 'Best Month', value: MONTHS[(bestMonth?.month || 1) - 1], emoji: '🏆', color: '#4CAF50' },
            { label: 'Worst Month', value: MONTHS[(worstMonth?.month || 1) - 1], emoji: '⚠️', color: '#FF9800' },
          ].map((s) => (
            <View key={s.label} style={[styles.statCard, { borderTopColor: s.color }]}>
              <Text style={{ fontSize: 22 }}>{s.emoji}</Text>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Tab toggle */}
        <View style={styles.tabRow}>
          {['monthly', 'breakdown'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && { color: '#fff' }]}>
                {tab === 'monthly' ? '📊 Monthly Chart' : '🍕 Breakdown'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'monthly' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Monthly CO₂ (kg) — 2024</Text>
            <BarChart data={data} maxVal={maxVal} />
            <Text style={styles.chartNote}>🔴 Highest · 🏆 Lowest (best)</Text>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Average Monthly Breakdown</Text>
            {[
              { label: 'Travel', value: avgBreakdown.travel, emoji: '🚗', color: '#2196F3' },
              { label: 'Food & Diet', value: avgBreakdown.food, emoji: '🍽️', color: '#4CAF50' },
              { label: 'Electricity', value: avgBreakdown.electricity, emoji: '⚡', color: '#FF9800' },
              { label: 'LPG / Gas', value: avgBreakdown.lpg, emoji: '🔥', color: '#F44336' },
            ].map((b) => {
              const total = Object.values(avgBreakdown).reduce((a, v) => a + parseFloat(v || 0), 0);
              const pct = total ? ((parseFloat(b.value || 0) / total) * 100).toFixed(0) : 0;
              return (
                <View key={b.label} style={styles.breakdownRow}>
                  <Text style={{ fontSize: 20, width: 30 }}>{b.emoji}</Text>
                  <Text style={styles.breakdownLabel}>{b.label}</Text>
                  <View style={styles.breakdownBarBg}>
                    <View style={[styles.breakdownBarFill, { width: `${pct}%`, backgroundColor: b.color }]} />
                  </View>
                  <Text style={styles.breakdownValue}>{b.value} kg</Text>
                  <Text style={[styles.breakdownPct, { color: b.color }]}>{pct}%</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Monthly detail list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Month-by-Month</Text>
          {[...data].reverse().map((d, i) => {
            const prev = data[data.length - 2 - i];
            const change = prev ? d.totalGenerated - prev.totalGenerated : 0;
            return (
              <View key={i} style={styles.monthRow}>
                <View style={styles.monthLeft}>
                  <Text style={styles.monthName}>{MONTHS[d.month - 1]} {d.year}</Text>
                  <Text style={styles.monthValue}>{d.totalGenerated} kg CO₂</Text>
                </View>
                <View style={styles.monthBar}>
                  <View style={[styles.monthBarFill, {
                    width: `${(d.totalGenerated / maxVal) * 100}%`,
                    backgroundColor: d.totalGenerated === Math.min(...data.map((x) => x.totalGenerated)) ? COLORS.primary : `${COLORS.primary}60`,
                  }]} />
                </View>
                {change !== 0 && (
                  <Text style={[styles.changeText, { color: change < 0 ? '#4CAF50' : '#F44336' }]}>
                    {change < 0 ? '↓' : '↑'}{Math.abs(change)}
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.calcBtn} onPress={() => navigation.navigate('Carbon')}>
          <Text style={styles.calcBtnText}>📊 Calculate This Month's Carbon</Text>
        </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: 56, paddingBottom: SPACING.sm,
  },
  backBtn: { padding: 8 },
  backBtnText: { fontSize: 24, color: COLORS.primary, fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text.primary },
  trendBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    margin: SPACING.md, borderRadius: RADIUS.md, padding: SPACING.md,
  },
  trendEmoji: { fontSize: 36 },
  trendTitle: { fontSize: 14, fontWeight: '700', color: '#fff' },
  trendSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4, lineHeight: 18 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.md, gap: SPACING.sm, marginBottom: SPACING.sm },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: SPACING.md, alignItems: 'center', borderTopWidth: 3, ...SHADOWS.card,
  },
  statValue: { fontSize: 16, fontWeight: '800', marginTop: 4 },
  statLabel: { fontSize: 10, color: COLORS.text.muted, marginTop: 2, textAlign: 'center' },
  tabRow: {
    flexDirection: 'row', marginHorizontal: SPACING.md, marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 4, ...SHADOWS.card,
  },
  tab: { flex: 1, borderRadius: RADIUS.sm, paddingVertical: 10, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.text.secondary },
  section: { marginHorizontal: SPACING.md, marginBottom: SPACING.md },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text.primary, marginBottom: SPACING.sm },
  chartContainer: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, ...SHADOWS.card, position: 'relative' },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', height: 180, paddingTop: 30 },
  barWrapper: { alignItems: 'center', justifyContent: 'flex-end' },
  bar: { borderRadius: 4, width: '80%' },
  barLabel: { fontSize: 9, color: COLORS.text.muted, marginTop: 4 },
  barValue: { fontSize: 8, color: COLORS.text.muted, marginBottom: 2 },
  barTag: { fontSize: 10, marginBottom: 2 },
  yAxisLines: { position: 'absolute', left: 0, top: 0, bottom: 22 },
  yLine: { position: 'absolute', left: 4 },
  yLabel: { fontSize: 8, color: COLORS.text.muted },
  chartNote: { fontSize: 11, color: COLORS.text.muted, textAlign: 'center', marginTop: 8 },
  breakdownRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm, padding: SPACING.sm, marginBottom: SPACING.sm, gap: 6, ...SHADOWS.card,
  },
  breakdownLabel: { width: 70, fontSize: 12, color: COLORS.text.secondary, fontWeight: '600' },
  breakdownBarBg: { flex: 1, height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
  breakdownBarFill: { height: '100%', borderRadius: 4 },
  breakdownValue: { width: 50, fontSize: 11, fontWeight: '700', color: COLORS.text.primary, textAlign: 'right' },
  breakdownPct: { width: 32, fontSize: 10, fontWeight: '700', textAlign: 'right' },
  monthRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm, padding: SPACING.sm, marginBottom: SPACING.sm, gap: SPACING.sm, ...SHADOWS.card,
  },
  monthLeft: { width: 80 },
  monthName: { fontSize: 12, fontWeight: '700', color: COLORS.text.primary },
  monthValue: { fontSize: 10, color: COLORS.text.muted },
  monthBar: { flex: 1, height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
  monthBarFill: { height: '100%', borderRadius: 4 },
  changeText: { fontSize: 11, fontWeight: '700', width: 40, textAlign: 'right' },
  calcBtn: {
    marginHorizontal: SPACING.md, backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    padding: SPACING.md, alignItems: 'center', ...SHADOWS.card,
  },
  calcBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  emptyWrap: { alignItems: 'center', padding: SPACING.xl, gap: SPACING.sm },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text.primary },
  emptySub: { fontSize: 13, color: COLORS.text.muted, textAlign: 'center' },
  errorBanner: {
    margin: SPACING.md, padding: SPACING.md,
    backgroundColor: '#FFEBEE', borderRadius: RADIUS.md,
    borderLeftWidth: 4, borderLeftColor: '#F44336',
  },
  errorBannerText: { color: '#B71C1C', fontSize: 13 },
});

export default CarbonHistoryScreen;
