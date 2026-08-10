import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SunsetStripe } from '../../components/SunsetStripe';
import { View, Platform } from 'react-native';
import { tokens } from '../../src/theme/tokens';

type IonName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: IonName; inactive: IonName }> = {
  dashboard: { active: 'speedometer', inactive: 'speedometer-outline' },
  tournaments: { active: 'trophy', inactive: 'trophy-outline' },
  finance: { active: 'wallet', inactive: 'wallet-outline' },
  players: { active: 'people', inactive: 'people-outline' },
  more: { active: 'settings', inactive: 'settings-outline' },
};

export default function TabsLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.canvas }}>
      <Tabs
        screenOptions={({ route }) => ({
          headerStyle: {
            backgroundColor: tokens.color.surface,
            ...(Platform.OS === 'web'
              ? { boxShadow: '0 1px 0 rgba(0,0,0,0.2)' }
              : { elevation: 0 }),
          },
          headerShadowVisible: false,
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 17,
            color: tokens.color.ink,
          },
          headerTitleAlign: 'left',
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: tokens.color.creamPanel, paddingHorizontal: 10, paddingVertical: 5, borderRadius: tokens.radius.pill, borderWidth: 1, borderColor: tokens.color.border }}>
                <Ionicons name="shield-checkmark" size={13} color={tokens.color.primary} />
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: tokens.color.success }} />
                <View style={{ width: 1, height: 12, backgroundColor: tokens.color.border }} />
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: tokens.color.primary }} />
                <View style={{ width: 1, height: 12, backgroundColor: tokens.color.border }} />
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: tokens.color.coin }} />
              </View>
            </View>
          ),
          headerTintColor: tokens.color.ink,
          tabBarActiveTintColor: tokens.color.primary,
          tabBarInactiveTintColor: tokens.color.secondary,
          tabBarStyle: {
            backgroundColor: tokens.color.surface,
            borderTopWidth: 0,
            height: Platform.OS === 'web' ? 60 : 62,
            paddingTop: 8,
            paddingBottom: Platform.OS === 'web' ? 8 : 10,
          },
          tabBarLabelStyle: {
            fontWeight: '600',
            fontSize: 11,
            marginTop: 2,
          },
          tabBarIcon: ({ focused, color }) => {
            const icons = TAB_ICONS[route.name] ?? TAB_ICONS.dashboard;
            return <Ionicons name={focused ? icons.active : icons.inactive} size={22} color={color} />;
          },
        })}
      >
        <Tabs.Screen name="dashboard" options={{ title: 'Overview', tabBarLabel: 'Overview' }} />
        <Tabs.Screen name="tournaments" options={{ title: 'Tournaments', tabBarLabel: 'Tournaments' }} />
        <Tabs.Screen name="finance" options={{ title: 'Finance', tabBarLabel: 'Finance' }} />
        <Tabs.Screen name="players" options={{ title: 'Players', tabBarLabel: 'Players' }} />
        <Tabs.Screen name="more" options={{ title: 'Admin & System', tabBarLabel: 'More' }} />
      </Tabs>
      <SunsetStripe />
    </View>
  );
}
