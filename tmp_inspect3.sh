#!/bin/bash
cd /project/workspace
D=$(echo rushzone*/)
echo '=== tournaments create modal fields (470-570) ==='
sed -n '470,575p' "${D}app/(tabs)/tournaments.tsx"
echo '=== dashboard metricsGrid style ==='
grep -n -A 12 'metricsGrid:' "${D}app/(tabs)/tournaments.tsx" "${D}app/(tabs)/dashboard.tsx" 2>/dev/null | head -30
echo '=== BannerSlideshow full (for loading fix) ==='
sed -n '1,60p' "${D}src/components/BannerSlideshow.tsx"
