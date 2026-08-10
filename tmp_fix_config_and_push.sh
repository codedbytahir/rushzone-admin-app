#!/bin/bash
cd /project/workspace
D=$(echo rushzone*/)
F="${D}supabase/config.toml"

# Add project_id at the top of the file if missing
grep -q '^project_id' "$F" || {
  echo 'project_id = "gwtipxyhyalikdaqnvdp"' > /tmp/config_head.toml
  cat "$F" >> /tmp/config_head.toml
  mv /tmp/config_head.toml "$F"
  echo 'project_id added'
}
head -3 "$F"

cd "$D"
echo '=== pushing migrations ==='
npx supabase db push --linked 2>&1 | tail -40
echo 'PUSH_EXIT='${PIPESTATUS[0]}
