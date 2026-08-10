#!/bin/bash
cd /project/workspace
D=$(echo rushzone*/)
echo '=== .env key names (values redacted) ==='
sed 's/=.*/=<redacted>/' "${D}.env"
echo '=== .env.example key names ==='
sed 's/=.*/=<redacted>/' "${D}.env.example"
