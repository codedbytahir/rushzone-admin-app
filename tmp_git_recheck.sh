#!/bin/bash
cd /project/workspace
D=$(echo rushzone*/)
cd "$D"
echo '=== fetching ==='
git fetch origin feat/foundation-auth-tournaments 2>&1 | tail -2
echo '=== divergence (left=HEAD-only, right=remote-only) ==='
git rev-list --left-right --count HEAD...origin/feat/foundation-auth-tournaments
echo '=== remote-only commits ==='
git log --oneline HEAD..origin/feat/foundation-auth-tournaments | head -15
echo '=== remote latest ==='
git log --oneline -1 origin/feat/foundation-auth-tournaments
echo '=== local latest ==='
git log --oneline -1 HEAD
