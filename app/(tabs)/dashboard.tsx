import { View, Text } from 'react-native';
import { tokens } from '../../src/theme/tokens';
export default function Dashboard(){
  return (
    <View style={{ flex:1, backgroundColor: tokens.color.canvas, padding:16 }}>
      <View style={{ backgroundColor: tokens.color.creamPanel, borderRadius: tokens.radius.card, padding:16, borderWidth:1, borderColor: tokens.color.border }}>
        <Text style={{ fontWeight:'800', color: tokens.color.ink }}>Permission-filtered Dashboard</Text>
        <Text style={{ color: tokens.color.secondary, marginTop:8 }}>Top-ups pending · Withdrawals near SLA · Results pending · Room release actions will appear here (priority-ordered).</Text>
      </View>
      <Text style={{ color: tokens.color.secondary, marginTop:16, fontSize:12 }}>Foundation stub — queue cards wired to Edge Functions next.</Text>
    </View>
  );
}
