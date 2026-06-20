#!/bin/bash
# Delete a user (default pramitdasml@gmail.com) and all their data — for demo resets.
#   bash scripts/reset-user.sh [email]
set -e
cd "$(dirname "$0")/.."
EMAIL="${1:-pramitdasml@gmail.com}"
KEYFILE="supabase/.service.key"

# Cache the service-role key once (gitignored); re-fetch via CLI if missing.
if [ ! -s "$KEYFILE" ]; then
  npx supabase projects api-keys --project-ref mgzkwieamccnjnqgxpnx 2>/dev/null | head -1 \
    | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const o=JSON.parse(d);const svc=(o.keys||o).find(k=>k.name==='service_role')?.api_key;require('fs').writeFileSync('$KEYFILE',svc??'')})"
fi

EMAIL="$EMAIL" node -e '
const svc = require("fs").readFileSync("supabase/.service.key","utf8").trim();
const base = "https://mgzkwieamccnjnqgxpnx.supabase.co/auth/v1/admin/users";
const headers = { apikey: svc, Authorization: `Bearer ${svc}` };
const email = process.env.EMAIL;
(async () => {
  const { users = [] } = await (await fetch(`${base}?per_page=200`, { headers })).json();
  const t = users.find(u => u.email === email);
  if (!t) { console.log(email + ": not found — nothing to delete"); }
  else {
    const r = await fetch(`${base}/${t.id}`, { method: "DELETE", headers });
    console.log("deleted " + email + " (cascades all data): " + r.status);
  }
  const after = await (await fetch(`${base}?per_page=200`, { headers })).json();
  console.log("remaining users:");
  (after.users||[]).forEach(u => console.log("  -", u.email, "|", (u.app_metadata?.providers||[]).join("+")));
})();
'
