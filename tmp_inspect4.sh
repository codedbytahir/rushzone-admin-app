#!/bin/bash
cd /project/workspace
D=$(echo rushzone*/)
echo '=== tournaments modal styles ==='
grep -n -A 8 'modalBackdrop:\|modalScrollContent:\|modalCard:\|modalBtnRow:\|chip:' "${D}app/(tabs)/tournaments.tsx" | head -60
echo '=== more.tsx admin row + approveRoleRow styles ==='
grep -n -A 6 'approveRoleRow:\|itemRow:' "${D}app/(tabs)/more.tsx" | head -20
echo '=== finance.tsx style rows ==='
grep -n -A 6 'tabRow:\|filterRow:\|queueRow:\|statRow:' "${D}app/(tabs)/finance.tsx" | head -30
echo '=== players.tsx search row ==='
grep -n -A 6 'searchRow:\|filterRow:' "${D}app/(tabs)/players.tsx" | head -16
