import { Tabs } from 'expo-router';
import { SunsetStripe } from '../../components/SunsetStripe';
import { View, Text, Platform } from 'react-native';
import { tokens } from '../../src/theme/tokens';

export default function TabsLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.canvas }}>
      <Tabs
        screenOptions={{
          headerStyle: {
            backgroundColor: tokens.color.surface,
            elevation: 1,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
          },
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 18,
            color: tokens.color.ink,
          },
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
              <View style={{ backgroundColor: tokens.color.creamPanel, paddingHorizontal: 10, paddingVertical: 4, borderRadius: tokens.radius.pill, borderWidth: 1, borderColor: tokens.color.border }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: tokens.color.secondary }}>CONTROL HUB</Text>
              </View>
            </View>
          ),
          headerTintColor: tokens.color.ink,
          tabBarStyle: {
            backgroundColor: tokens.color.surface,
            borderTopWidth: 1,
            borderTopColor: tokens.color.border,
            height: Platform.OS === 'web' ? 56 : 60,
            paddingBottom: Platform.OS === 'web' ? 6 : 8,
            paddingTop: 6,
          },
          tabBarActiveTintColor: tokens.color.primary,
          tabBarInactiveTintColor: tokens.color.secondary,
          tabBarLabelStyle: {
            fontWeight: '600',
            fontSize: 12,
          },
        }}
      >
        <Tabs.Screen name="dashboard" options={{ title: 'Dashboard', tabBarLabel: 'Dashboard' }} />
        <Tabs.Screen name="tournaments" options={{ title: 'Tournaments', tabBarLabel: 'Tournaments' }} />
        <Tabs.Screen name="finance" options={{ title: 'Finance Queue', tabBarLabel: 'Finance' }} />
        <Tabs.Screen name="players" options={{ title: 'Player Moderation', tabBarLabel: 'Players' }} />
        <Tabs.Screen name="more" options={{ title: 'Admin & System', tabBarLabel: 'More' }} />
      </Tabs>
      <SunsetStripe />
    </View>
  );
}
