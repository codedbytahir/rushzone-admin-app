#!/bin/bash
cd /project/workspace
D=$(echo rushzone*/)
F="${D}app/(auth)/login.tsx"
node -e "
const fs = require('fs');
const f = process.argv[1];
let s = fs.readFileSync(f, 'utf8');
s = s.replace(/^autoCapitalize=\"none\"\$/m, '                  autoCapitalize=\"none\"');
fs.writeFileSync(f, s);
console.log('indent fixed');
" "$F"
sed -n '192,196p' "$F"
echo '=== LINT ==='
cd "$D"
npx eslint "app/(auth)/login.tsx" 2>&1 | head -5
echo 'LINT_EXIT='${PIPESTATUS[0]}
