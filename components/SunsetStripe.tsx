// components/SunsetStripe.tsx — Red -> Orange -> Yellow -> Cream stripe above bottom nav (required on every admin screen per spec 05-ui)
import { View } from 'react-native';
import { tokens } from '../src/theme/tokens';

export function SunsetStripe() {
  return (
    <View style={{ height: tokens.sunsetStripeHeight, flexDirection: 'row' }}>
      {tokens.color.sunset.map((c) => (
        <View key={c} style={{ flex: 1, backgroundColor: c }} />
      ))}
    </View>
  );
}
