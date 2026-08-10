#!/bin/bash
cd /project/workspace
D=$(echo rushzone*/)
cd "$D"
TOKEN='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'
echo '=== raw remote ref ==='
git ls-remote "https://x-access-token:${TOKEN}@github.com/codedbytahir/rushzone-admin-app.git" refs/heads/feat/foundation-auth-tournaments refs/heads/main
echo '=== local HEAD and origin/feat ==='
git rev-parse HEAD
git rev-parse origin/feat/foundation-auth-tournaments
echo '=== parent of local HEAD ==='
git rev-parse HEAD^
