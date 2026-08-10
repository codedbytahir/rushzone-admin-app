#!/bin/bash
cd /project/workspace
D=$(echo rushzone*/)
F="${D}supabase/migrations/0020_security_hardening.sql"
echo '=== lines 20-40 with visible delimiters ==='
sed -n '20,40p' "$F" | cat -A | head -25
echo '=== count of $$ ==='
grep -c '\$\$' "$F"
echo '=== does file end with proper delimiter? ==='
tail -3 "$F" | cat -A
