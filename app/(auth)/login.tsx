// app/(auth)/login.tsx — Staff Email -> OTP -> Super Key (stubs for foundation)
import { View, Text, TextInput, Pressable } from 'react-native';
import { useState } from 'react';
import { tokens } from '../../src/theme/tokens';
import { SunsetStripe } from '../../components/SunsetStripe';

export default function Login() {
  const [step, setStep] = useState<'email'|'otp'|'superkey'>('email');
  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.canvas, padding: 24, justifyContent: 'center' }}>
      <Text style={{ fontSize: 28, fontWeight: '800', color: tokens.color.ink, marginBottom: 8 }}>Rush Zone Control</Text>
      <Text style={{ color: tokens.color.secondary, marginBottom: 24 }}>Owner-approved access · Email OTP + Super Key</Text>
      <View style={{ backgroundColor: tokens.color.surface, borderRadius: tokens.radius.card, padding: 16, borderWidth: 1, borderColor: tokens.color.border }}>
        {step==='email' && (
          <>
            <Text style={{ color: tokens.color.ink, marginBottom: 8 }}>Staff email</Text>
            <TextInput placeholder="owner@rushzone.pk" placeholderTextColor={tokens.color.disabled} style={{ borderWidth:1, borderColor: tokens.color.border, borderRadius: tokens.radius.input, padding: 12, color: tokens.color.ink }} />
            <Pressable onPress={()=>setStep('otp')} style={{ backgroundColor: tokens.color.primary, borderRadius: tokens.radius.button, padding: 14, alignItems: 'center', marginTop: 16 }}>
              <Text style={{ color: 'white', fontWeight: '700' }}>Send OTP</Text>
            </Pressable>
            <Text style={{ color: tokens.color.secondary, fontSize: 12, marginTop: 12 }}>This key is assigned and rotated only by the Rush Zone Owner.</Text>
          </>
        )}
        {step==='otp' && (
          <>
            <Text style={{ color: tokens.color.ink, marginBottom: 8 }}>Email OTP</Text>
            <TextInput placeholder="6-digit code" keyboardType="number-pad" maxLength={6} style={{ borderWidth:1, borderColor: tokens.color.border, borderRadius: tokens.radius.input, padding: 12, letterSpacing: 8, textAlign: 'center' }} />
            <Pressable onPress={()=>setStep('superkey')} style={{ backgroundColor: tokens.color.primary, borderRadius: tokens.radius.button, padding: 14, alignItems: 'center', marginTop: 16 }}>
              <Text style={{ color: 'white', fontWeight: '700' }}>Verify OTP</Text>
            </Pressable>
          </>
        )}
        {step==='superkey' && (
          <>
            <Text style={{ color: tokens.color.ink, marginBottom: 8 }}>Owner-issued Admin Super Key</Text>
            <TextInput placeholder="••••••••" secureTextEntry style={{ borderWidth:1, borderColor: tokens.color.border, borderRadius: tokens.radius.input, padding: 12 }} />
            <Pressable style={{ backgroundColor: tokens.color.ink, borderRadius: tokens.radius.button, padding: 14, alignItems: 'center', marginTop: 16 }}>
              <Text style={{ color: 'white', fontWeight: '700' }}>Verify Super Key</Text>
            </Pressable>
          </>
        )}
      </View>
      <View style={{ position: 'absolute', left:0, right:0, bottom:0 }}><SunsetStripe /></View>
    </View>
  );
}
