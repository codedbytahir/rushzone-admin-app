import { Tabs } from 'expo-router';
import { SunsetStripe } from '../../components/SunsetStripe';
import { View } from 'react-native';
import { tokens } from '../../src/theme/tokens';
export default function TabsLayout(){
  return (
    <View style={{ flex:1 }}>
      <Tabs screenOptions={{ headerStyle:{ backgroundColor: tokens.color.surface }, headerTintColor: tokens.color.ink, tabBarStyle:{ backgroundColor: tokens.color.surface, borderTopWidth:0 }, tabBarActiveTintColor: tokens.color.primary }}>
        <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
        <Tabs.Screen name="tournaments" options={{ title: 'Tournaments' }} />
        <Tabs.Screen name="finance" options={{ title: 'Finance' }} />
        <Tabs.Screen name="players" options={{ title: 'Players' }} />
        <Tabs.Screen name="more" options={{ title: 'More' }} />
      </Tabs>
      <SunsetStripe />
    </View>
  );
}
