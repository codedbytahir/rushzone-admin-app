#!/bin/bash
cd /project/workspace
D=$(echo rushzone*/)
cat "${D}supabase/migrations/0020_security_hardening.sql"
