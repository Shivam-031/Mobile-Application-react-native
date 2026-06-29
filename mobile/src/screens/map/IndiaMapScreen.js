import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import {
  MapView, Camera, MarkerView, ShapeSource, CircleLayer,
  OSM_STYLE_URL, deltaToZoom, pointsToGeoJSON,
} from '../../components/common/MapLibreMap';
import OSMTileAttribution from '../../components/common/OSMTileAttribution';
import IndiaHeatmapSvg from '../../components/common/IndiaHeatmapSvg';
import HeatmapLegend from '../../components/common/HeatmapLegend';
import ZoomableSvg from '../../components/common/ZoomableSvg';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';

// India States with real coordinates
const INDIA_STATES = [
  { name: 'Maharashtra', lat: 19.7515, lng: 75.7139, carbonImpact: 540, products: 1200, plants: 500,
    districts: [
      { name: 'Mumbai', lat: 19.0760, lng: 72.8777, carbon: 180, zones: ['Dharavi Eco Hub', 'Versova Green Zone'] },
      { name: 'Pune', lat: 18.5204, lng: 73.8567, carbon: 140, zones: ['Aundh Nursery', 'Kothrud Plant Market'] },
      { name: 'Nashik', lat: 20.0059, lng: 73.7897, carbon: 120, zones: ['Grape Valley Eco', 'Sula Green Farm'] },
      { name: 'Nagpur', lat: 21.1458, lng: 79.0882, carbon: 100, zones: ['Orange City Garden', 'Futala Eco Park'] },
    ]
  },
  { name: 'Delhi', lat: 28.7041, lng: 77.1025, carbonImpact: 320, products: 860, plants: 210,
    districts: [
      { name: 'South Delhi', lat: 28.5355, lng: 77.2410, carbon: 90, zones: ['Lodhi Garden', 'Mehrauli Green'] },
      { name: 'North Delhi', lat: 28.7270, lng: 77.2120, carbon: 80, zones: ['Ridge Forest', 'Model Town Park'] },
      { name: 'East Delhi', lat: 28.6448, lng: 77.3100, carbon: 75, zones: ['Sanjay Lake', 'Kalindi Kunj'] },
    ]
  },
  { name: 'Kerala', lat: 10.8505, lng: 76.2711, carbonImpact: 480, products: 740, plants: 890,
    districts: [
      { name: 'Wayanad', lat: 11.6854, lng: 76.1320, carbon: 160, zones: ['Wayanad Biodiversity Zone', 'Chembra Peak Forest'] },
      { name: 'Ernakulam', lat: 9.9816, lng: 76.2999, carbon: 120, zones: ['Willingdon Island Green', 'Mangalavanam Bird'] },
      { name: 'Thrissur', lat: 10.5276, lng: 76.2144, carbon: 110, zones: ['Peechi Dam Forest', 'Chimmony Wildlife'] },
    ]
  },
  { name: 'Rajasthan', lat: 27.0238, lng: 74.2179, carbonImpact: 210, products: 560, plants: 310,
    districts: [
      { name: 'Jaipur', lat: 26.9124, lng: 75.7873, carbon: 80, zones: ['Nahargarh Forest', 'Jhalana Leopard Reserve'] },
      { name: 'Jodhpur', lat: 26.2389, lng: 73.0243, carbon: 70, zones: ['Kailana Lake', 'Umaid Garden'] },
      { name: 'Udaipur', lat: 24.5854, lng: 73.7125, carbon: 60, zones: ['Sajjangarh Forest', 'Fateh Sagar Eco'] },
    ]
  },
  { name: 'Karnataka', lat: 15.3173, lng: 75.7139, carbonImpact: 395, products: 680, plants: 720,
    districts: [
      { name: 'Bengaluru', lat: 12.9716, lng: 77.5946, carbon: 130, zones: ['Cubbon Park', 'Bannerghatta Forest'] },
      { name: 'Mysuru', lat: 12.2958, lng: 76.6394, carbon: 110, zones: ['Nagarhole Reserve', 'Brindavan Garden'] },
      { name: 'Coorg', lat: 12.3375, lng: 75.8069, carbon: 155, zones: ['Brahmagiri Forest', 'Talakaveri'] },
    ]
  },
  { name: 'Tamil Nadu', lat: 11.1271, lng: 78.6569, carbonImpact: 430, products: 920, plants: 640, districts: [] },
  { name: 'Gujarat', lat: 22.2587, lng: 71.1924, carbonImpact: 360, products: 780, plants: 340, districts: [] },
  { name: 'West Bengal', lat: 22.9868, lng: 87.8550, carbonImpact: 270, products: 490, plants: 560, districts: [] },
];

const PLANT_ZONES = [
  { lat: 10.5505, lng: 76.2711, name: 'Wayanad Bio Zone', type: 'plant' },
  { lat: 27.5530, lng: 88.5122, name: 'Sikkim Orchid Zone', type: 'plant' },
  { lat: 24.3511, lng: 93.6200, name: 'Manipur Bamboo Zone', type: 'plant' },
];

const POT_ZONES = [
  { lat: 26.9124, lng: 75.7873, name: 'Jaipur Pottery Hub', type: 'pot' },
  { lat: 23.1765, lng: 75.7885, name: 'Ujjain Clay Centre', type: 'pot' },
  { lat: 25.3176, lng: 82.9739, name: 'Varanasi Pot Cluster', type: 'pot' },
];

const MAP_LAYERS = [
  { id: 'carbon', label: '🌍 Carbon', color: COLORS.primary },
];

// Carbon values keyed by state name for the heatmap. Falls back to 0 for
// states/UTs not in INDIA_STATES (Sikkim, NE states, etc.).
const HEATMAP_VALUES = INDIA_STATES.reduce((acc, s) => {
  acc[s.name] = s.carbonImpact;
  return acc;
}, {});

// Drill-down level: india → state → district → zone
const LEVELS = ['india', 'state', 'district', 'zone'];

// MapLibre note: react-native-maps <Callout> has no direct equivalent in
// MapLibre RN. We use a selection-driven bottom panel (already part of the
// existing drill-down UX) — tapping a marker sets state and renders the panel.

// MapLibre note: react-native-maps <Circle radius={meters}> renders a
// geodesic circle. MapLibre's <CircleLayer> renders screen-pixel circles
// (no geodesic projection). We approximate the original visual size using
// an exponential zoom interpolation so circles scale sensibly as the user
// zooms in/out.  At zoom 5 a 80 km circle ≈ 60 px; at zoom 12 ≈ 80 px.
const circleRadiusExpression = (metersAtZoom5, metersAtZoom12) => [
  'interpolate', ['exponential', 2], ['zoom'],
  5, Math.max(20, metersAtZoom5 / 1500),
  12, Math.max(20, metersAtZoom12 / 250),
];

const IndiaMapScreen = ({ navigation }) => {
  const [activeLayer, setActiveLayer] = useState('carbon');
  const [level, setLevel] = useState('india');
  const [selectedState, setSelectedState] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(deltaToZoom(20));
  const cameraRef = useRef(null);

  // Refs let the focus listener see the latest drill-down state without
  // re-subscribing on every change. `useFocusEffect` requires a stable
  // callback identity, so we read state through refs instead of deps.
  const levelRef = useRef(level);
  const selectedStateRef = useRef(selectedState);
  const selectedDistrictRef = useRef(selectedDistrict);
  levelRef.current = level;
  selectedStateRef.current = selectedState;
  selectedDistrictRef.current = selectedDistrict;

  // When MapMain regains focus (returning from a pushed StateDashboard, or
  // coming back to the Map tab), clear any stale drill-down state. Without
  // this, backing out of a State Dashboard would leave the map zoomed into
  // the previous state's panel + camera position. The guard avoids re-flying
  // the camera on initial mount.
  useFocusEffect(useCallback(() => {
    if (
      levelRef.current !== 'india'
      || selectedStateRef.current
      || selectedDistrictRef.current
    ) {
      resetToIndia();
    }
  }, []));

  // react-native-maps used {latitude, longitude} objects with animateToRegion;
  // MapLibre uses [longitude, latitude] arrays with setCamera. We translate.
  const animateTo = (lat, lng, delta) => {
    const z = deltaToZoom(delta);
    setZoomLevel(z);
    cameraRef.current?.setCamera({
      centerCoordinate: [lng, lat],
      zoomLevel: z,
      animationDuration: 800,
      animationMode: 'flyTo',
    });
  };

  // Single-instance navigation helper: always returns the user to a fresh
  // MapMain + StateDashboard(top) stack regardless of where they came from.
  // Without this, every drill-down pushes a new StateDashboard on top of the
  // previous one, so "back" from StateDashboard lands on another state.
  const openStateDashboard = (stateName) => {
    const state = navigation.getState();
    const dashboards = state?.routes?.filter((r) => r.name === 'StateDashboard') || [];
    if (dashboards.length > 0) {
      // Already on a StateDashboard — reset the stack to MapMain, then push a
      // fresh StateDashboard so back returns to the map (not the previous state).
      navigation.reset({
        index: 1,
        routes: [
          { name: 'MapMain' },
          { name: 'StateDashboard', params: { stateName } },
        ],
      });
    } else {
      navigation.navigate('StateDashboard', { stateName });
    }
  };

  const drillToState = (state) => {
    // Push the dedicated State Dashboard screen — this is the primary path
    // described in mapstructure.md (header KPIs, city list, charts, leaderboard).
    // The bottom-sheet peek stays in place for a quick glance.
    openStateDashboard(state.name);
    setSelectedState(state);
    setSelectedDistrict(null);
    setLevel('state');
    animateTo(state.lat, state.lng, 3.5);
  };

  const drillToDistrict = (district) => {
    setSelectedDistrict(district);
    setLevel('district');
    animateTo(district.lat, district.lng, 0.5);
  };

  const drillToZone = (zoneName) => {
    setLevel('zone');
  };

  const goBack = () => {
    if (level === 'zone') { setLevel('district'); }
    else if (level === 'district') { setLevel('state'); setSelectedDistrict(null); animateTo(selectedState.lat, selectedState.lng, 3.5); }
    else if (level === 'state') { setLevel('india'); setSelectedState(null); animateTo(20.5937, 78.9629, 20); }
  };

  const resetToIndia = () => {
    setLevel('india'); setSelectedState(null); setSelectedDistrict(null);
    animateTo(20.5937, 78.9629, 20); // animateTo also resets zoomLevel
  };

  // Zoom in/out by `delta` zoom levels (e.g. +1 / -1), keeping the current
  // center. Clamped so users can't zoom past usable bounds.
  const zoomBy = (delta) => {
    const next = Math.max(3, Math.min(18, zoomLevel + delta));
    if (next === zoomLevel) return;
    cameraRef.current?.setCamera({
      zoomLevel: next,
      animationDuration: 300,
    });
    setZoomLevel(next);
  };

  // Build GeoJSON for current circle set so a single <ShapeSource> + <CircleLayer>
  // renders every circle, replacing react-native-maps <Circle>.
  const stateCirclesGeoJSON = useMemo(() => {
    if (level !== 'india' || activeLayer !== 'carbon') return null;
    return pointsToGeoJSON(
      INDIA_STATES,
      (s) => ({ radiusMeters: Math.max(s.carbonImpact * 800, 80000) }),
    );
  }, [level, activeLayer]);

  const districtCirclesGeoJSON = useMemo(() => {
    if (!(level === 'state' || level === 'district') || !selectedState?.districts?.length) return null;
    return pointsToGeoJSON(selectedState.districts, () => ({ radiusMeters: 15000 }));
  }, [level, selectedState]);

  // At the india level with the carbon layer active, swap the world basemap
  // for the per-state SVG heatmap. Other layers (plants / pot hubs) and deeper
  // drill-down levels keep MapLibre.
  const useHeatmap = level === 'india' && activeLayer === 'carbon';

  const handleHeatmapStatePress = (stateName) => {
    const matched = INDIA_STATES.find((s) => s.name === stateName);
    if (matched) {
      drillToState(matched);
    } else {
      // State has no analytics yet — still open the StateDashboard so the
      // drill-down affordance is consistent. The screen handles its own
      // empty / error state; we just feed it a name.
      openStateDashboard(stateName);
      setSelectedState({ name: stateName, carbonImpact: 0, products: 0, plants: 0, districts: [] });
      setLevel('state');
    }
  };

  return (
    <View style={styles.container}>
      {useHeatmap ? (
        <View style={styles.heatmapContainer}>
          <IndiaHeatmapSvg
            stateValues={HEATMAP_VALUES}
            onStatePress={handleHeatmapStatePress}
            showLabels
          />
        </View>
      ) : (
      <MapView
        style={styles.map}
        styleURL={OSM_STYLE_URL}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled
      >
        <Camera
          ref={cameraRef}
          zoomLevel={deltaToZoom(20)}
          centerCoordinate={[78.9629, 20.5937]}
        />

        {/* State-level carbon circles */}
        {stateCirclesGeoJSON && (
          <ShapeSource id="state-circles" shape={stateCirclesGeoJSON}>
            <CircleLayer
              id="state-circles-fill"
              style={{
                circleRadius: circleRadiusExpression(80000, 80000),
                circleColor: `${COLORS.primary}33`,
                circleStrokeColor: `${COLORS.primary}88`,
                circleStrokeWidth: 1.5,
              }}
            />
          </ShapeSource>
        )}

        {/* State-level markers */}
        {level === 'india' && activeLayer === 'carbon' && INDIA_STATES.map((state) => (
          <MarkerView
            key={state.name}
            coordinate={[state.lng, state.lat]}
            onPress={() => drillToState(state)}
          >
            <View style={styles.markerBubble}>
              <Text style={styles.markerText}>{state.carbonImpact}kg</Text>
            </View>
          </MarkerView>
        ))}

        {/* District-level circles */}
        {districtCirclesGeoJSON && (
          <ShapeSource id="district-circles" shape={districtCirclesGeoJSON}>
            <CircleLayer
              id="district-circles-fill"
              style={{
                circleRadius: circleRadiusExpression(15000, 15000),
                circleColor: `${COLORS.primaryLight}40`,
                circleStrokeColor: `${COLORS.primary}99`,
                circleStrokeWidth: 2,
              }}
            />
          </ShapeSource>
        )}

        {/* District-level markers */}
        {(level === 'state' || level === 'district') && selectedState?.districts?.map((district) => (
          <MarkerView
            key={district.name}
            coordinate={[district.lng, district.lat]}
            onPress={() => drillToDistrict(district)}
          >
            <View style={[styles.markerBubble, { backgroundColor: COLORS.primaryLight }]}>
              <Text style={styles.markerText}>{district.name}</Text>
            </View>
          </MarkerView>
        ))}

        {/* Zone-level markers */}
        {level === 'district' && selectedDistrict?.zones?.map((zone, i) => (
          <MarkerView
            key={zone}
            coordinate={[
              selectedDistrict.lng + (i * 0.015),
              selectedDistrict.lat + (i * 0.02 - 0.02),
            ]}
            onPress={() => drillToZone(zone)}
          >
            <View style={[styles.markerBubble, { backgroundColor: '#4CAF50', paddingHorizontal: 6 }]}>
              <Text style={[styles.markerText, { fontSize: 9 }]}>🌿 Zone</Text>
            </View>
          </MarkerView>
        ))}

        {/* Plant zones */}
        {activeLayer === 'plant' && level === 'india' && PLANT_ZONES.map((z) => (
          <MarkerView key={z.name} coordinate={[z.lng, z.lat]}>
            <View style={[styles.markerBubble, { backgroundColor: '#4CAF50' }]}><Text style={styles.markerText}>🌱</Text></View>
          </MarkerView>
        ))}

        {/* Pot hubs */}
        {activeLayer === 'pot' && level === 'india' && POT_ZONES.map((z) => (
          <MarkerView key={z.name} coordinate={[z.lng, z.lat]}>
            <View style={[styles.markerBubble, { backgroundColor: '#795548' }]}><Text style={styles.markerText}>🏺</Text></View>
          </MarkerView>
        ))}
      </MapView>
      )}

      {/* Breadcrumb drilldown nav */}
      <View style={styles.breadcrumb}>
        <TouchableOpacity onPress={resetToIndia} style={styles.breadcrumbItem}>
          <Text style={[styles.breadcrumbText, level === 'india' && styles.breadcrumbActive]}>🇮🇳 India</Text>
        </TouchableOpacity>
        {selectedState && (
          <>
            <Text style={styles.breadcrumbSep}>›</Text>
            <TouchableOpacity onPress={() => { setLevel('state'); setSelectedDistrict(null); animateTo(selectedState.lat, selectedState.lng, 3.5); }}>
              <Text style={[styles.breadcrumbText, level === 'state' && styles.breadcrumbActive]}>{selectedState.name}</Text>
            </TouchableOpacity>
          </>
        )}
        {selectedDistrict && (
          <>
            <Text style={styles.breadcrumbSep}>›</Text>
            <Text style={[styles.breadcrumbText, styles.breadcrumbActive]}>{selectedDistrict.name}</Text>
          </>
        )}
        {level === 'zone' && (
          <>
            <Text style={styles.breadcrumbSep}>›</Text>
            <Text style={[styles.breadcrumbText, styles.breadcrumbActive]}>Zone</Text>
          </>
        )}
      </View>

      {/* Heatmap legend — only when heatmap is active */}
      {useHeatmap && (
        <View style={styles.legendWrap}>
          <HeatmapLegend
            title="Carbon Saved (kg) — darker = more"
            min={Math.min(...Object.values(HEATMAP_VALUES).filter((v) => v > 0))}
            max={Math.max(...Object.values(HEATMAP_VALUES))}
            compact
          />
        </View>
      )}

      {/* Layer Toggle (only at india level) */}
      {level === 'india' && (
        <View style={styles.layerPanel}>
          {MAP_LAYERS.map((l) => (
            <TouchableOpacity
              key={l.id}
              style={[styles.layerBtn, activeLayer === l.id && { backgroundColor: l.color }]}
              onPress={() => setActiveLayer(l.id)}
            >
              <Text style={[styles.layerBtnText, activeLayer === l.id && { color: '#fff' }]}>{l.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Bottom Panel */}
      {level === 'india' && !selectedState && (
        <View style={styles.bottomPanel}>
          <Text style={styles.bottomPanelTitle}>
            {useHeatmap ? '🇮🇳 India Carbon Map' : '🇮🇳 India Green Map'}
          </Text>
          <Text style={styles.bottomPanelSub}>
            {useHeatmap
              ? 'Tap any state to view its dashboard'
              : 'Quick jump to a top state'}
          </Text>
          {!useHeatmap && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.sm, paddingTop: SPACING.sm }}>
              {INDIA_STATES.slice(0, 6).map((s) => (
                <TouchableOpacity key={s.name} style={styles.stateChip} onPress={() => drillToState(s)}>
                  <Text style={styles.stateChipText}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* State Panel */}
      {level === 'state' && selectedState && (
        <View style={styles.statePanel}>
          <View style={styles.statePanelHeader}>
            <Text style={styles.statePanelTitle}>📍 {selectedState.name}</Text>
            <TouchableOpacity onPress={goBack} style={styles.backBtnPanel}>
              <Text style={styles.backBtnText}>← India</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.sm, paddingBottom: SPACING.sm }}>
            {[
              { emoji: '🌍', label: 'CO₂ Saved', value: `${selectedState.carbonImpact} kg` },
              { emoji: '🏺', label: 'Products', value: selectedState.products },
              { emoji: '🌱', label: 'Plant Species', value: selectedState.plants },
              { emoji: '📍', label: 'Districts', value: selectedState.districts?.length || 0 },
            ].map((s) => (
              <View key={s.label} style={styles.panelStat}>
                <Text style={{ fontSize: 20 }}>{s.emoji}</Text>
                <Text style={styles.panelStatValue}>{s.value}</Text>
                <Text style={styles.panelStatLabel}>{s.label}</Text>
              </View>
            ))}
          </ScrollView>
          {selectedState.districts?.length > 0 && (
            <Text style={styles.drillHint}>Tap a district marker on the map to drill down further</Text>
          )}
          <TouchableOpacity style={styles.shopStateBtn} onPress={() => navigation.navigate('Marketplace')}>
            <Text style={styles.shopStateBtnText}>🛒 Shop from {selectedState.name}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* District Panel */}
      {(level === 'district' || level === 'zone') && selectedDistrict && (
        <View style={styles.statePanel}>
          <View style={styles.statePanelHeader}>
            <Text style={styles.statePanelTitle}>🏘️ {selectedDistrict.name}</Text>
            <TouchableOpacity onPress={goBack} style={styles.backBtnPanel}>
              <Text style={styles.backBtnText}>← {selectedState?.name}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm }}>
            <View style={styles.panelStat}>
              <Text style={{ fontSize: 20 }}>🌍</Text>
              <Text style={styles.panelStatValue}>{selectedDistrict.carbon} kg</Text>
              <Text style={styles.panelStatLabel}>CO₂ Saved</Text>
            </View>
            <View style={styles.panelStat}>
              <Text style={{ fontSize: 20 }}>🌿</Text>
              <Text style={styles.panelStatValue}>{selectedDistrict.zones?.length}</Text>
              <Text style={styles.panelStatLabel}>Eco Zones</Text>
            </View>
          </View>
          <Text style={styles.zonesTitle}>Eco Zones in {selectedDistrict.name}:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {selectedDistrict.zones?.map((zone) => (
              <TouchableOpacity key={zone} style={styles.zoneChip} onPress={() => drillToZone(zone)}>
                <Text style={styles.zoneChipText}>🌿 {zone}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <OSMTileAttribution />

      {/* Floating zoom + reset controls (MapLibre mode only) */}
      {!useHeatmap && (
        <View style={styles.mapControlsWrap}>
          <TouchableOpacity
            style={styles.mapControlBtn}
            onPress={() => zoomBy(1)}
            accessibilityLabel="Zoom in"
            activeOpacity={0.7}
          >
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 5v14M5 12h14"
                stroke={COLORS.primary}
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            </Svg>
          </TouchableOpacity>
          <View style={styles.mapControlDivider} />
          <TouchableOpacity
            style={styles.mapControlBtn}
            onPress={() => zoomBy(-1)}
            accessibilityLabel="Zoom out"
            activeOpacity={0.7}
          >
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path
                d="M5 12h14"
                stroke={COLORS.primary}
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            </Svg>
          </TouchableOpacity>
          <View style={styles.mapControlDivider} />
          <TouchableOpacity
            style={styles.mapControlBtn}
            onPress={resetToIndia}
            accessibilityLabel="Reset to India view"
            activeOpacity={0.7}
          >
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Circle cx={12} cy={12} r={3} fill={COLORS.primary} />
              <Path
                d="M12 2v3M12 19v3M2 12h3M19 12h3"
                stroke={COLORS.primary}
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            </Svg>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  heatmapContainer: { flex: 1 },
  markerBubble: {
    backgroundColor: COLORS.primary, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 2, borderColor: '#fff', ...SHADOWS.card,
  },
  markerText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  callout: { padding: SPACING.sm, minWidth: 150 },
  calloutTitle: { fontWeight: '700', color: COLORS.primary, fontSize: 14, marginBottom: 4 },
  calloutStat: { fontSize: 12, color: COLORS.text.secondary, marginTop: 2 },
  calloutDrill: { fontSize: 11, color: COLORS.primary, fontWeight: '600', marginTop: 6 },
  breadcrumb: {
    position: 'absolute', top: 56, left: SPACING.md, right: SPACING.md,
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 10, ...SHADOWS.card,
    flexWrap: 'wrap', gap: 4,
  },
  breadcrumbItem: {},
  breadcrumbText: { fontSize: 12, color: COLORS.text.secondary, fontWeight: '600' },
  breadcrumbActive: { color: COLORS.primary, fontWeight: '800' },
  breadcrumbSep: { fontSize: 14, color: COLORS.text.muted },
  layerPanel: {
    position: 'absolute', top: 110, left: SPACING.md, right: SPACING.md,
    flexDirection: 'row', gap: 8, backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: RADIUS.lg, padding: SPACING.sm, ...SHADOWS.card,
  },
  layerBtn: {
    flex: 1, borderRadius: RADIUS.md, paddingVertical: 8, alignItems: 'center',
    backgroundColor: `${COLORS.primary}12`,
  },
  layerBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.text.secondary },
  bottomPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.md, paddingBottom: 30, ...SHADOWS.card,
  },
  bottomPanelTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text.primary },
  bottomPanelSub: { fontSize: 12, color: COLORS.text.secondary, marginTop: 2 },
  legendWrap: {
    position: 'absolute', bottom: 220, left: SPACING.md, right: SPACING.md,
    alignItems: 'center',
  },
  stateChip: {
    backgroundColor: `${COLORS.primary}15`, borderRadius: RADIUS.full,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  stateChipText: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
  statePanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg, paddingBottom: 36, ...SHADOWS.card,
  },
  statePanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  statePanelTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text.primary },
  backBtnPanel: { backgroundColor: `${COLORS.primary}15`, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 6 },
  backBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  panelStat: {
    backgroundColor: COLORS.cardBg, borderRadius: RADIUS.md, padding: SPACING.md,
    alignItems: 'center', minWidth: 90,
  },
  panelStatValue: { fontSize: 16, fontWeight: '800', color: COLORS.primary, marginTop: 4 },
  panelStatLabel: { fontSize: 10, color: COLORS.text.muted },
  drillHint: { fontSize: 12, color: COLORS.text.muted, marginBottom: SPACING.sm, fontStyle: 'italic' },
  shopStateBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: SPACING.md,
    alignItems: 'center', marginTop: SPACING.sm,
  },
  shopStateBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  zonesTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text.secondary, marginBottom: 8 },
  zoneChip: {
    backgroundColor: `${COLORS.primary}15`, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  zoneChipText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  mapControlsWrap: {
    position: 'absolute', right: SPACING.md, top: '45%',
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: RADIUS.md,
    ...SHADOWS.card, overflow: 'hidden',
  },
  mapControlBtn: {
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
  },
  mapControlDivider: {
    height: 1, backgroundColor: `${COLORS.text.muted}33`,
    marginHorizontal: SPACING.xs,
  },
});

export default IndiaMapScreen;