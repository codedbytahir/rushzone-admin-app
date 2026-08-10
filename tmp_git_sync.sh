#!/bin/bash
cd /project/workspace
D=$(echo rushzone*/)
cd "$D"
echo '=== fetching ==='
git fetch origin feat/foundation-auth-tournaments 2>&1 | tail -3
echo '=== divergence ==='
git rev-list --left-right --count HEAD...origin/feat/foundation-auth-tournaments
echo '=== remote commits we lack ==='
git log --oneline HEAD..origin/feat/foundation-auth-tournaments | head -20
echo '=== our commits remote lacks ==='
git log --oneline origin/feat/foundation-auth-tournaments..HEAD | head -20
