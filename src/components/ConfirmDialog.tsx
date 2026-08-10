import React from 'react';
import { Modal, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '../theme/tokens';
import { AppButton } from './ui';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: tokens.color.backdrop, alignItems: 'center', justifyContent: 'center', padding: tokens.space.md }}>
        <View style={{ backgroundColor: tokens.color.surface, borderRadius: tokens.radius.card, borderWidth: 1, borderColor: tokens.color.border, padding: tokens.space.lg, width: '100%', maxWidth: 440, gap: tokens.space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: danger ? tokens.color.dangerSoft : tokens.color.creamPanel, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={danger ? 'warning' : 'help-circle'} size={20} color={danger ? tokens.color.danger : tokens.color.primary} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: danger ? tokens.color.danger : tokens.color.ink, flex: 1 }}>{title}</Text>
          </View>
          {message ? <Text style={{ fontSize: 14, color: tokens.color.secondary, lineHeight: 21, marginTop: 4 }}>{message}</Text> : null}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: tokens.space.sm, marginTop: tokens.space.md }}>
            <AppButton variant="ghost" label="Cancel" onPress={onCancel} disabled={loading} />
            <AppButton
              label={confirmLabel}
              variant={danger ? 'danger' : 'primary'}
              icon={danger ? 'trash-outline' : 'checkmark-circle-outline'}
              loading={loading}
              onPress={onConfirm}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
