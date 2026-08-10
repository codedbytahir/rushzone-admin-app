#!/bin/bash
cd /project/workspace
D=$(echo rushzone*/)
head -12 "${D}supabase/config.toml"
echo '=== project_id present? ==='
grep -n 'project_id' "${D}supabase/config.toml" || echo 'NOT present'
