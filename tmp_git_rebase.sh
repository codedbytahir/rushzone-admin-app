#!/bin/bash
cd /project/workspace
D=$(echo rushzone*/)
cd "$D"
echo '=== merge-base ==='
MB=$(git merge-base HEAD origin/feat/foundation-auth-tournaments)
echo "merge-base: $MB"
git log --oneline -1 $MB
echo '=== is origin/feat ancestor of HEAD? ==='
git merge-base --is-ancestor origin/feat/foundation-auth-tournaments HEAD && echo YES || echo NO
echo '=== is HEAD ancestor of origin/feat? ==='
git merge-base --is-ancestor HEAD origin/feat/foundation-auth-tournaments && echo YES || echo NO
