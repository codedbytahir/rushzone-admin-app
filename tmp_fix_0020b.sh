#!/bin/bash
cd /project/workspace
D=$(echo rushzone*/)
F="${D}supabase/migrations/0020_security_hardening.sql"
node -e "
const fs = require('fs');
const f = process.argv[1];
let s = fs.readFileSync(f, 'utf8');
const before = s;
s = s.replace(/end \\\$;/g, 'end \$\$;');
if (s !== before) { fs.writeFileSync(f, s); console.log('closing delimiter fixed'); } else console.log('NO CHANGE — pattern not found');
" "$F"
echo '=== verify ==='
grep -n 'end \$\$' "$F" | head -3
echo '=== lines 20-38 ==='
sed -n '20,38p' "$F"
