#!/bin/bash
cd /project/workspace
D=$(echo rushzone*/)
echo '=== 0021 ==='
cat "${D}supabase/migrations/0021_policy_links.sql"
echo '=== 0022 ==='
cat "${D}supabase/migrations/0022_admin_status_rejected.sql"
echo '=== 0019 hash wrapper (last applied remotely?) — check $ quoting ==='
grep -c '\$\$' "${D}supabase/migrations/0019_public_hash_wrapper.sql"
