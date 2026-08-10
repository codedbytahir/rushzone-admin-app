#!/bin/bash
cd /project/workspace
D=$(echo rushzone*/)
echo '=== env vars ==='
env | grep -i 'SUPABASE\|DB_PASS\|POSTGRES' | sed 's/=.*/=<set>/' || echo 'none set'
echo '=== .env files in project ==='
ls -la "${D}" | grep -i env || echo 'no env files'
ls "${D}supabase/.env" 2>/dev/null && sed 's/=.*/=<redacted>/' "${D}supabase/.env" | head -20 || echo 'no supabase/.env'
echo '=== pooler-url / temp creds ==='
cat "${D}supabase/.temp/pooler-url" 2>/dev/null || echo 'no pooler-url'
echo '=== access token configured? ==='
npx supabase projects list 2>&1 | head -6
