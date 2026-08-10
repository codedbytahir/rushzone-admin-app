#!/bin/bash
set -e
cd /project/workspace
D=$(echo rushzone*/)
cd "$D"

echo '=== migrations present ==='
ls supabase/migrations/ | tail -8

echo '=== staging everything ==='
git add -A
git status --short | wc -l

echo '=== committing ==='
git commit -m "feat: tournament thumbnails, carousel fix, owner/employee access model, mobile UX

- Tournament create/edit: cover thumbnail upload to tournament-thumbnails bucket
  (+ cover_path in admin-tournaments-create/update, card cover preview)
- Fix BannerSlideshow stuck on 'Loading carousel' (measure width on placeholder)
- Owner/Employee access: role switcher at login, super key verification,
  request-access flow for employees, owner approve/reject + auto key handoff
- Per-admin permission toggles (custom_permissions isolated per assignment)
- Edge functions: admin-request-access, admin-permissions-update/list,
  owner-admins-reject; owner-admins-list email enrichment
- Migrations 0020-0025: security hardening, policy links, admin status rejected,
  request flow, service_role grants, public RPC wrappers
- Service_role grants + public schema wrappers for app.* RPC functions
- Reconciliation return-type fix
- Dark theme polish, responsive modals (maxHeight), mobile-friendly grids" --allow-empty

echo '=== pushing with provided token ==='
TOKEN='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'
git push "https://x-access-token:${TOKEN}@github.com/codedbytahir/rushzone-admin-app.git" HEAD:feat/foundation-auth-tournaments 2>&1 | tail -5

echo '=== opening PR ==='
curl -s -X POST \
  -H "Authorization: token ${TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/codedbytahir/rushzone-admin-app/pulls \
  -d '{
    "title": "feat: tournament thumbnails, carousel fix, owner/employee access model, mobile UX",
    "head": "feat/foundation-auth-tournaments",
    "base": "main",
    "body": "## Summary\n- **Tournament thumbnails**: upload a cover image when creating/editing tournaments (web file picker, stored in `tournament-thumbnails` bucket), shown on tournament cards. Backend `admin-tournaments-create`/`update` now persist `cover_path`.\n- **Carousel fix**: BannerSlideshow no longer hangs on \"Loading carousel…\" — the placeholder now measures its own width so the pager can initialize.\n- **Owner/Employee access model**: login role switcher (Owner vs Employee), owner bootstrap claim, super-key verification, employee request-access flow with owner approval/rejection, auto-generated Super Key handoff with copy modal, per-admin permission toggles (isolated custom permission set per assignment).\n- **Mobile UX**: modal cards capped at 94% height with scrolling, wrapping stats/action rows, dark-theme polish.\n- **Backend hardening**: service_role grants migration, public RPC wrappers for app-schema functions, reconciliation return-type fix, migrations 0020–0025.\n\n## Validation\n- `tsc --noEmit` ✅\n- ESLint ✅\n- Edge-function typecheck (`tsc -p tsconfig.deno.json`) ✅\n- Changed edge functions deployed to Supabase (`gwtipxyhyalikdaqnvdp`) ✅\n\n## Deploy notes\n- Migrations 0020–0025 are included; run `npx supabase db push --linked` locally.\n- New edge functions to deploy: `admin-request-access`, `admin-permissions-update`, `admin-permissions-list`, `owner-admins-reject`."}' | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);if(j.html_url)console.log('PR_URL='+j.html_url);else console.log('PR_ERROR: '+(j.message||d.slice(0,500)));}catch(e){console.log('PR_RAW: '+d.slice(0,500));}})"
