import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '../theme/tokens';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Card, EmptyState } from './ui';

type Banner = {
  id: string;
  image_path: string;
  link_url?: string | null;
  sort_order?: number;
  active?: boolean;
};

export function bannerPublicUrl(imagePath: string): string {
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  return supabase.storage.from('banners').getPublicUrl(imagePath).data.publicUrl;
}

/**
 * Auto-advancing carousel of the active home-screen banners.
 * Used on the dashboard (slideshow preview) and inside the Content section.
 */
export function BannerSlideshow({ height = 150 }: { height?: number }) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [width, setWidth] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unpauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [paused, setPaused] = useState(false);

  const loadBanners = useCallback(async () => {
    try {
      const res = await api.listBanners();
      const raw: Banner[] = Array.isArray(res.data)
        ? res.data
        : Array.isArray((res.data as any)?.banners)
          ? (res.data as any).banners
          : [];
      const active = raw
        .filter((b) => b.active !== false)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      setBanners(active);
      setIndex(0);
    } catch {
      setBanners([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  const goTo = useCallback(
    (i: number) => {
      const next = (i + banners.length) % banners.length;
      setIndex(next);
      if (width > 0) scrollRef.current?.scrollTo({ x: next * width, animated: true });
    },
    [banners.length, width]
  );

  useEffect(() => {
    if (banners.length < 2 || paused) return;
    timerRef.current = setInterval(() => goTo(index + 1), 4000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [banners.length, index, goTo, paused]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (unpauseTimerRef.current) clearTimeout(unpauseTimerRef.current);
    };
  }, []);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - width) > 1) setWidth(w);
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width <= 0) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i >= 0 && i < banners.length) setIndex(i);
  };

  if (loading || width <= 0) {
    return (
      <View style={[styles.placeholder, { height }]} onLayout={onLayout}>
        <Text style={styles.placeholderText}>Loading carousel…</Text>
      </View>
    );
  }

  if (banners.length === 0) {
    return (
      <Card style={{ padding: tokens.space.md }}>
        <EmptyState
          icon="images-outline"
          title="No active banners"
          subtitle="Add banners in More → Content & Banners to build the home carousel"
        />
      </Card>
    );
  }

  return (
    <View
      style={[styles.wrap, { height }]}
      onLayout={onLayout}
      onTouchStart={() => {
        setPaused(true);
        if (unpauseTimerRef.current) clearTimeout(unpauseTimerRef.current);
      }}
      onTouchEnd={() => {
        if (unpauseTimerRef.current) clearTimeout(unpauseTimerRef.current);
        unpauseTimerRef.current = setTimeout(() => setPaused(false), 2000);
      }}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        scrollEventThrottle={16}
        style={styles.scroller}
      >
        {banners.map((b) => (
          <Pressable
            key={b.id}
            style={[styles.slide, { width: width > 0 ? width : undefined }]}
            onPress={() => {
              if (b.link_url && Platform.OS === 'web') window.open(b.link_url, '_blank');
            }}
          >
            <Image
              source={{ uri: bannerPublicUrl(b.image_path) }}
              style={[styles.image, { height: height - 24 }]}
              resizeMode="cover"
            />
            {b.link_url ? (
              <View style={styles.linkPill}>
                <Ionicons name="open-outline" size={11} color={tokens.color.onPrimary} />
                <Text style={styles.linkText}>Open</Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>

      {banners.length > 1 && (
        <View style={styles.dots}>
          {banners.map((b, i) => (
            <Pressable key={b.id} onPress={() => goTo(i)} hitSlop={6}>
              <View style={[styles.dot, i === index && styles.dotActive]} />
            </Pressable>
          ))}
        </View>
      )}

      {banners.length > 1 && (
        <>
          <Pressable style={[styles.arrow, styles.arrowLeft]} onPress={() => goTo(index - 1)} hitSlop={8}>
            <Ionicons name="chevron-back" size={16} color={tokens.color.ink} />
          </Pressable>
          <Pressable style={[styles.arrow, styles.arrowRight]} onPress={() => goTo(index + 1)} hitSlop={8}>
            <Ionicons name="chevron-forward" size={16} color={tokens.color.ink} />
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: tokens.radius.card,
    backgroundColor: tokens.color.surface,
  },
  scroller: {
    flex: 1,
  },
  slide: {
    height: '100%',
    padding: tokens.space.sm,
    flexShrink: 0,
  },
  image: {
    width: '100%',
    borderRadius: tokens.radius.card - 4,
    backgroundColor: tokens.color.canvas,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.card,
  },
  placeholderText: {
    color: tokens.color.secondary,
    fontSize: 13,
  },
  dots: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: tokens.color.border,
  },
  dotActive: {
    backgroundColor: tokens.color.primary,
    width: 18,
  },
  arrow: {
    position: 'absolute',
    top: '42%',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowLeft: { left: 10 },
  arrowRight: { right: 10 },
  linkPill: {
    position: 'absolute',
    right: 14,
    top: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: tokens.radius.pill,
  },
  linkText: {
    color: tokens.color.onPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
});
