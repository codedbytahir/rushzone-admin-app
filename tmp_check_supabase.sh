#!/bin/bash
cd /project/workspace
D=$(echo rushzone*/)
cd "$D"
echo '=== supabase CLI version ==='
npx supabase --version 2>&1 | head -3
echo '=== linked project ==='
cat supabase/.temp/linked-project.json 2>/dev/null || echo 'no linked-project.json'
echo '=== pending migrations (not yet pushed) ==='
ls supabase/migrations/ | sort | tail -8
echo '=== git status of migrations dir ==='
git -C /project/workspace status --short 2>/dev/null | grep -i migration | head
echo '=== remote migrations status ==='
npx supabase migration list --linked 2>&1 | head -20
