#!/bin/sh
# Reads what installed Menders have sent home, for whoever is fixing them.
#   tools/telemetry.sh "['mender'] | where level == 'error' | take 50"
#   tools/telemetry.sh            (the last hour of warnings and errors)
# Prints one JSON object per row, empty fields left out.
# Needs the personal token at ~/Documents/dev/.axiom_personal_token.
set -eu
token=$(cat "$HOME/Documents/dev/.axiom_personal_token")
apl=${1:-"['mender'] | where _time > ago(1h) and level in ('warn', 'error') | sort by _time asc"}
body=$(APL="$apl" python3 -c 'import json, os; print(json.dumps({"apl": os.environ["APL"]}))')
curl -sS -X POST 'https://api.axiom.co/v1/datasets/_apl?format=tabular' \
  -H "Authorization: Bearer $token" \
  -H 'x-axiom-org-id: mender-yg0d' \
  -H 'Content-Type: application/json' \
  -d "$body" |
  python3 -c '
import json, sys
out = json.load(sys.stdin)
if "tables" not in out:
    print(json.dumps(out)[:2000])
    sys.exit(1)
for table in out["tables"]:
    names = [field["name"] for field in table["fields"]]
    columns = table.get("columns") or []
    for i in range(len(columns[0]) if columns else 0):
        row = {name: col[i] for name, col in zip(names, columns) if col[i] is not None}
        print(json.dumps(row))
'
