#!/bin/bash
cd /project/workspace
D=$(echo rushzone*/)
cd "$D"
TOKEN='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'
echo '=== token identity ==='
curl -s -H "Authorization: token ${TOKEN}" https://api.github.com/user | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);console.log('login='+j.login+' scopes-check-ok');}catch(e){console.log('AUTH_FAIL: '+d.slice(0,200));}})"
echo '=== full push output ==='
git push "https://x-access-token:${TOKEN}@github.com/codedbytahir/rushzone-admin-app.git" HEAD:feat/foundation-auth-tournaments 2>&1
echo "PUSH_EXIT=$?"
