#!/bin/bash
cd /project/workspace
D=$(echo rushzone*/)
grep -n -B 2 -A 12 'create table if not exists app.settings\|create table app.settings' "${D}supabase/migrations/"*.sql | head -30
