import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text } from 'react-native';
import { useSelector } from 'react-redux';
import { COLORS } from '../constants/theme';

// Auth screens
import HomeScreen from '../screens/home/HomeScreen';
import CarbonCalculatorScreen from '../screens/home/CarbonCalculatorScreen';
import CarbonHistoryScreen from '../screens/carbon/CarbonHistoryScreen';
import NearbyEcoLocationsScreen from '../screens/home/NearbyEcoLocationsScreen';

// Map
import IndiaMapScreen from '../screens/map/IndiaMapScreen';
import StateDashboardScreen from '../screens/map/StateDashboardScreen';

// Marketplace
import MarketplaceScreen from '../screens/marketplace/MarketplaceScreen';
import ProductDetailScreen from '../screens/marketplace/ProductDetailScreen';
import CartScreen from '../screens/marketplace/CartScreen';
import CheckoutScreen from '../screens/marketplace/CheckoutScreen';
import OrderSuccessScreen from '../screens/orders/OrderSuccessScreen';
import MyOrdersScreen from '../screens/orders/MyOrdersScreen';
import OrderDetailScreen from '../screens/orders/OrderDetailScreen';

// Plants
import PlantDashboardScreen from '../screens/plants/PlantDashboardScreen';
import StatewisePlantsScreen from '../screens/plants/StatewisePlantsScreen';

// Profile
import ProfileScreen from '../screens/profile/ProfileScreen';

// Inventory
import BranchDashboardScreen from '../screens/inventory/BranchDashboardScreen';
import BranchAnalyticsScreen from '../screens/inventory/BranchAnalyticsScreen';

// Admin
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const MapStack = createStackNavigator();
const MarketStack = createStackNavigator();
const PlantStack = createStackNavigator();
const ProfileStack = createStackNavigator();
const RootStack = createStackNavigator();

const HomeStackNav = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen name="HomeMain" component={HomeScreen} />
    <HomeStack.Screen name="Carbon" component={CarbonCalculatorScreen} />
    <HomeStack.Screen name="CarbonHistory" component={CarbonHistoryScreen} />
    <HomeStack.Screen name="NearbyEco" component={NearbyEcoLocationsScreen} />
    <HomeStack.Screen name="MyOrders" component={MyOrdersScreen} />
    <HomeStack.Screen name="OrderDetail" component={OrderDetailScreen} />
  </HomeStack.Navigator>
);

const MapStackNav = () => (
  <MapStack.Navigator screenOptions={{ headerShown: false }}>
    <MapStack.Screen name="MapMain" component={IndiaMapScreen} />
    <MapStack.Screen name="StateDashboard" component={StateDashboardScreen} />
  </MapStack.Navigator>
);

const MarketStackNav = () => (
  <MarketStack.Navigator screenOptions={{ headerShown: false }}>
    <MarketStack.Screen name="MarketMain" component={MarketplaceScreen} />
    <MarketStack.Screen name="ProductDetail" component={ProductDetailScreen} />
    <MarketStack.Screen name="Cart" component={CartScreen} />
    <MarketStack.Screen name="Checkout" component={CheckoutScreen} />
    <MarketStack.Screen name="OrderSuccess" component={OrderSuccessScreen} />
    <MarketStack.Screen name="OrderDetail" component={OrderDetailScreen} />
  </MarketStack.Navigator>
);

const PlantStackNav = () => (
  <PlantStack.Navigator screenOptions={{ headerShown: false }}>
    <PlantStack.Screen name="PlantMain" component={PlantDashboardScreen} />
    <PlantStack.Screen name="StatewisePlants" component={StatewisePlantsScreen} />
  </PlantStack.Navigator>
);

const ProfileStackNav = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
    <ProfileStack.Screen name="MyOrders" component={MyOrdersScreen} />
    <ProfileStack.Screen name="OrderDetail" component={OrderDetailScreen} />
    <ProfileStack.Screen name="CarbonHistory" component={CarbonHistoryScreen} />
    <ProfileStack.Screen name="Orders" component={MyOrdersScreen} />
    <ProfileStack.Screen name="Settings" component={ProfileScreen} />
    <ProfileStack.Screen name="Help" component={ProfileScreen} />
    <ProfileStack.Screen name="About" component={ProfileScreen} />
  </ProfileStack.Navigator>
);

const TAB_ICONS = {
  Home: '🏠', Map: '🗺️', Marketplace: '🛒', Plants: '🌿', Profile: '👤',
};

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused }) => (
        <Text style={{ fontSize: focused ? 26 : 22 }}>{TAB_ICONS[route.name]}</Text>
      ),
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.text.muted,
      tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginBottom: 4 },
      tabBarStyle: {
        backgroundColor: '#fff',
        borderTopWidth: 0,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 12,
        height: 68,
        paddingTop: 6,
      },
    })}
  >
    <Tab.Screen name="Home" component={HomeStackNav} />
    <Tab.Screen name="Map" component={MapStackNav} />
    <Tab.Screen name="Marketplace" component={MarketStackNav} />
    <Tab.Screen name="Plants" component={PlantStackNav} />
    <Tab.Screen name="Profile" component={ProfileStackNav} />
  </Tab.Navigator>
);

const AppNavigator = () => {
  const { user } = useSelector((s) => s.auth);
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Main" component={MainTabs} />
      {/* Employee-only screens — the EMPLOYEE role is presented to users
          as "Employee"; route names stay as-is to preserve navigation links. */}
      {(user?.role === 'EMPLOYEE' || user?.role === 'MASTER_ADMIN') && (
        <RootStack.Screen
          name="BranchDashboard"
          component={BranchDashboardScreen}
          options={{ presentation: 'modal' }}
        />
      )}
      {(user?.role === 'EMPLOYEE' || user?.role === 'MASTER_ADMIN') && (
        <RootStack.Screen
          name="BranchAnalytics"
          component={BranchAnalyticsScreen}
          options={{ presentation: 'modal' }}
        />
      )}
      {/* Admin-only screen — MASTER_ADMIN sees this INSTEAD of the
          employee dashboard so they can review & approve product submissions
          from branch employees. */}
      {user?.role === 'MASTER_ADMIN' && (
        <RootStack.Screen
          name="AdminDashboard"
          component={AdminDashboardScreen}
          options={{ presentation: 'modal' }}
        />
      )}
    </RootStack.Navigator>
  );
};

export default AppNavigator;
