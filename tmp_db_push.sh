#!/bin/bash
cd /project/workspace
D=$(echo rushzone*/)
cd "$D"
echo '=== pushing migrations to linked project ==='
npx supabase db push --linked 2>&1 | tail -30
echo 'PUSH_EXIT='${PIPESTATUS[0]}
