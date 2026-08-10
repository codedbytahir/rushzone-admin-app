#!/bin/bash
cd /project/workspace
D=$(echo rushzone*/)
F="${D}supabase/migrations/0020_security_hardening.sql"
echo '=== file exists? ==='
ls -la "$F" 2>/dev/null || echo 'MISSING 0020'
echo '=== statements with for r, p ==='
grep -n -B 4 -A 12 'for r, p in' "$F" | head -60
echo '=== all DO blocks ==='
grep -n 'do \$\$\|declare\|for ' "$F" | head -20
