import { View, Text } from 'react-native';
import { tokens } from '../../src/theme/tokens';
export default function Screen(){ return <View style={{ flex:1, backgroundColor: tokens.color.canvas, padding:16 }}><Text style={{ color: tokens.color.ink, fontWeight:'700' }}>${f}</Text><Text style={{ color: tokens.color.secondary, marginTop:8 }}>Stub — foundation ready, feature implementation next.</Text></View>; }
