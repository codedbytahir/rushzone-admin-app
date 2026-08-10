#!/bin/bash
cd /project/workspace
D=$(echo rushzone*/)
cd "$D"
echo '=== attempt 1: via origin remote ==='
git push origin HEAD:feat/foundation-auth-tournaments 2>&1
echo "EXIT1=$?"
echo '=== attempt 2: force-with-lease (safe: preserves ancestor) ==='
git push --force-with-lease=feat/foundation-auth-tournaments:14a63a7dd95e4ecfb21e950333b6e44d3bb09999 origin HEAD:feat/foundation-auth-tournaments 2>&1
echo "EXIT2=$?"
echo '=== final remote ref ==='
git ls-remote origin refs/heads/feat/foundation-auth-tournaments
