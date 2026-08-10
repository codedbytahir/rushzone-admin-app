#!/bin/bash
cd /project/workspace
D=$(echo rushzone*/)
cd "$D"
TOKEN='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'
echo '=== pushing ==='
git push "https://x-access-token:${TOKEN}@github.com/codedbytahir/rushzone-admin-app.git" HEAD:feat/foundation-auth-tournaments 2>&1 | tail -4
echo '=== opening PR (create if absent, else update) ==='
curl -s -X POST \
  -H "Authorization: token ${TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/codedbytahir/rushzone-admin-app/pulls \
  -d '{
    "title": "feat: tournament thumbnails, carousel fix, owner/employee access model, mobile UX",
    "head": "feat/foundation-auth-tournaments",
    "base": "main",
    "body": "## Summary\n- **Tournament thumbnails**: upload a cover image when creating/editing tournaments (web file picker, stored in `tournament-thumbnails` bucket), shown on tournament cards. Backend `admin-tournaments-create`/`update` now persist `cover_path`.\n- **Carousel fix**: BannerSlideshow no longer hangs on \"Loading carousel…\" — the placeholder now measures its own width so the pager can initialize.\n- **Owner/Employee access model**: login role switcher (Owner vs Employee), owner bootstrap claim, super-key verification, employee request-access flow with owner approval/rejection, auto-generated Super Key handoff with copy modal, per-admin permission toggles (isolated custom permission set per assignment).\n- **Mobile UX**: modal cards capped at 94% height with scrolling, wrapping stats/action rows, dark-theme polish.\n- **Backend hardening**: service_role grants migration, public RPC wrappers for app-schema functions, reconciliation return-type fix, migrations 0020–0025.\n\n## Validation\n- `tsc --noEmit` ✅\n- ESLint ✅\n- Edge-function typecheck (`tsc -p tsconfig.deno.json`) ✅\n- Changed edge functions deployed to Supabase (`gwtipxyhyalikdaqnvdp`) ✅\n\n## Deploy notes\n- Migrations 0020–0025 included; run `npx supabase db push --linked` locally if not already applied.\n- New edge functions to deploy: `admin-request-access`, `admin-permissions-update`, `admin-permissions-list`, `owner-admins-reject`."}' | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);if(j.html_url)console.log('PR_URL='+j.html_url);else if(j.errors)console.log('PR_ERROR: '+JSON.stringify(j.errors));else console.log('PR_MSG: '+(j.message||d.slice(0,400)));}catch(e){console.log('PR_RAW: '+d.slice(0,400));}})"
