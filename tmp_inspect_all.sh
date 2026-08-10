#!/bin/bash
cd /project/workspace
D=$(echo rushzone*/)
echo '=== 1. tournament cover/thumbnail in tournaments.tsx ==='
grep -n -i 'cover\|thumb\|upload\|Image' "${D}app/(tabs)/tournaments.tsx" | head -20
echo '=== 2. tournaments create/update payload cover field ==='
grep -n 'cover_path\|createPayload\|updatePayload' "${D}app/(tabs)/tournaments.tsx" | head -10
echo '=== 3. BannerSlideshow loading logic ==='
grep -n -B 2 -A 6 'loading\|width <= 0' "${D}src/components/BannerSlideshow.tsx" | head -30
echo '=== 4. git state ==='
git -C /project/workspace remote -v 2>/dev/null | head -4
git -C /project/workspace branch -a 2>/dev/null | head -6
git -C /project/workspace status --short 2>/dev/null | head -20
echo '=== 5. git repo location ==='
ls -d /project/workspace/.git 2>/dev/null && echo 'root repo' || echo 'no root .git'
ls -d "${D}.git" 2>/dev/null && echo 'rushzone dir repo' || echo 'no rushzone .git'
echo '=== 6. eas config ==='
cat "${D}eas.json" 2>/dev/null | head -30
echo '=== 7. build env ==='
env | grep -i 'EAS\|EXPO_TOKEN' | sed 's/=.*/=<set>/' || echo 'no eas env'
which java gradle adb 2>/dev/null | head -3
echo '=== 8. storage buckets for uploads ==='
grep -rn 'cover\|banners' "${D}supabase/migrations/0016_storage_buckets.sql" 2>/dev/null | head -10
