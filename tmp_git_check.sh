#!/bin/bash
cd /project/workspace
D=$(echo rushzone*/)
cd "$D"
echo '=== branches ==='
git branch -a
echo '=== remote HEAD (default branch) ==='
git ls-remote --symref origin HEAD 2>/dev/null | head -3
echo '=== gitignore env lines ==='
grep -nE '^\.env|\.env|\btmp_|\.temp|supabase/\.env' .gitignore | head -20
echo '=== check-ignore ==='
git check-ignore .env supabase/.env dist 2>/dev/null || echo '(not ignored)'
echo '=== .temp tracked? ==='
git ls-files supabase/.temp | head -3
echo '=== staged/committed files count ==='
git diff --stat HEAD | tail -1
echo '=== git config user ==='
git config user.name; git config user.email
