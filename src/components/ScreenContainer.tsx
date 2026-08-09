import React from 'react';
import { View, ScrollView, StyleSheet, Platform, ViewStyle, RefreshControl } from 'react-native';
import { tokens } from '../theme/tokens';

interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  style?: ViewStyle;
}

export function ScreenContainer({
  children,
  scrollable = true,
  onRefresh,
  refreshing = false,
  style,
}: ScreenContainerProps) {
  const content = (
    <View style={[styles.innerContainer, style]}>
      {children}
    </View>
  );

  if (scrollable) {
    return (
      <View style={styles.outerContainer}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[tokens.color.primary]} />
            ) : undefined
          }
        >
          {content}
        </ScrollView>
      </View>
    );
  }

  return <View style={styles.outerContainer}>{content}</View>;
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: tokens.color.canvas,
    width: '100%',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: tokens.space.md,
    paddingHorizontal: Platform.OS === 'web' ? tokens.space.lg : tokens.space.md,
  },
  innerContainer: {
    width: '100%',
    maxWidth: 1200,
    gap: tokens.space.md,
  },
});
