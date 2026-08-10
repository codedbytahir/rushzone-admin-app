#!/bin/bash
cd /project/workspace
echo '=== expo/eas credential files ==='
(cat ~/.expo/settings.json 2>/dev/null | head -20; echo '---'; ls -la ~/.expo 2>/dev/null; echo '---'; ls -la ~/.eas* 2>/dev/null)
echo '=== search repo for EXPO_TOKEN ==='
D=$(echo rushzone*/)
grep -rIn 'EXPO_TOKEN\|expo_token\|accessToken' "$D/.env" "$D/supabase/.env" "$D/.env.example" "$D/eas.json" 2>/dev/null | sed 's/=.*/=<redacted>/' | head
echo '=== git log last 5 ==='
cd "$D"
git log --oneline -5
echo '=== git status count ==='
git status --short | wc -l
echo '=== untracked ==='
git status --short | grep '^??' | head
