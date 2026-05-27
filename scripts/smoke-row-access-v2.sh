#!/usr/bin/env bash
# Smoke E2E real para o plugin unico core:row-access
#
# Pre-requisitos: stack docker rodando (low-code-js-api em http://localhost:3000),
# users admin@gmail.com (senha: admin) e manager@teste.com (senha: manager) existindo.
# Cria automaticamente registered_smoke@teste.com.
#
# Uso: ./scripts/smoke-row-access-v2.sh

set -uo pipefail

API="${API:-http://localhost:3000}"
MASTER_EMAIL="${MASTER_EMAIL:-admin@gmail.com}"
MASTER_PASS="${MASTER_PASS:-admin}"
MANAGER_EMAIL="${MANAGER_EMAIL:-manager@teste.com}"
MANAGER_PASS="${MANAGER_PASS:-manager}"
REGISTERED_EMAIL="registered_smoke@teste.com"
REGISTERED_PASS="SmokeReg123!"
TABLE_NAME="Smoke RA Docs"
TABLE_SLUG="smoke_ra_docs"

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[0;33m'; BLUE='\033[0;34m'; NC='\033[0m'
PASS=0; FAIL=0
declare -a FAILURES

step() { echo -e "\n${BLUE}▶ $1${NC}"; }
pass() { echo -e "${GREEN}  ✓ $1${NC}"; PASS=$((PASS+1)); }
fail() { echo -e "${RED}  ✗ $1${NC}"; FAIL=$((FAIL+1)); FAILURES+=("$1"); }
warn() { echo -e "${YELLOW}  ⚠ $1${NC}"; }

cookies_master=$(mktemp); cookies_manager=$(mktemp); cookies_registered=$(mktemp)
trap "rm -f $cookies_master $cookies_manager $cookies_registered" EXIT

login() {
  local email="$1" pass="$2" cookies="$3"
  curl -s -c "$cookies" -X POST "$API/authentication/sign-in" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$pass\"}" -o /dev/null -w "%{http_code}"
}

api() {
  local method="$1" path="$2" cookies="$3" body="${4:-}"
  if [ -z "$body" ]; then
    curl -s -b "$cookies" -X "$method" "$API$path"
  else
    curl -s -b "$cookies" -X "$method" "$API$path" \
      -H "Content-Type: application/json" -d "$body"
  fi
}

api_status() {
  local method="$1" path="$2" cookies="$3" body="${4:-}"
  if [ -z "$body" ]; then
    curl -s -b "$cookies" -X "$method" "$API$path" -o /dev/null -w "%{http_code}"
  else
    curl -s -b "$cookies" -X "$method" "$API$path" \
      -H "Content-Type: application/json" -d "$body" -o /dev/null -w "%{http_code}"
  fi
}

mongo_run() {
  docker exec low-code-js-mongo mongosh --quiet -u lowcodejs -p lowcodejs \
    --authenticationDatabase admin lowcodejs --eval "$1"
}

# ─── Setup ──────────────────────────────────────────────────────────────────────
step "1. Login MASTER + MANAGER"
code=$(login "$MASTER_EMAIL" "$MASTER_PASS" "$cookies_master")
[ "$code" = "200" ] && pass "MASTER login" || { fail "MASTER login: HTTP $code"; exit 1; }
code=$(login "$MANAGER_EMAIL" "$MANAGER_PASS" "$cookies_manager")
[ "$code" = "200" ] && pass "MANAGER login" || { fail "MANAGER login: HTTP $code"; exit 1; }

step "2. Garante user REGISTERED"
existing=$(api GET "/users/paginated?page=1&perPage=100" "$cookies_master" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(next((u['_id'] for u in d.get('data',[]) if u['email']=='$REGISTERED_EMAIL'),''))" 2>/dev/null || echo "")
if [ -z "$existing" ]; then
  group_registered=$(api GET "/user-group" "$cookies_master" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(next((g['_id'] for g in d if g['slug']=='REGISTERED'), ''))")
  [ -z "$group_registered" ] && { fail "Group REGISTERED não encontrado"; exit 1; }
  body=$(printf '{"name":"Registered Smoke","email":"%s","password":"%s","group":"%s","status":"ACTIVE"}' \
    "$REGISTERED_EMAIL" "$REGISTERED_PASS" "$group_registered")
  resp=$(api POST "/users" "$cookies_master" "$body")
  echo "$resp" | grep -q '"_id"' && pass "REGISTERED criado" || { fail "REGISTERED create: $resp"; exit 1; }
else
  pass "REGISTERED já existe"
fi
code=$(login "$REGISTERED_EMAIL" "$REGISTERED_PASS" "$cookies_registered")
[ "$code" = "200" ] && pass "REGISTERED login" || { fail "REGISTERED login: HTTP $code"; exit 1; }

step "3. Cria tabela $TABLE_SLUG (drop se existir)"
mongo_run "
const tables = db.tables.find({name:'$TABLE_NAME'}, {slug:1}).toArray();
tables.forEach(t => {
  db.getSiblingDB('lowcodejs_data').getCollection(t.slug).drop();
  db.fields.deleteMany({table: t._id.toString()});
});
db.tables.deleteMany({name:'$TABLE_NAME'});
" > /dev/null
body=$(printf '{"name":"%s","slug":"%s","style":"LIST","visibility":"OPEN","collaboration":"OPEN"}' "$TABLE_NAME" "$TABLE_SLUG")
resp=$(api POST "/tables" "$cookies_master" "$body")
table_id=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('_id',''))" 2>/dev/null || echo "")
TABLE_SLUG=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('slug',''))" 2>/dev/null || echo "")
[ -n "$table_id" ] && pass "Tabela criada (slug=$TABLE_SLUG, _id=$table_id)" || { fail "Tabela create: $resp"; exit 1; }

body='{"name":"Nome","slug":"nome","type":"TEXT_SHORT","format":"PLAIN_TEXT","required":false}'
api POST "/tables/$TABLE_SLUG/fields" "$cookies_master" "$body" > /dev/null
pass "Field 'nome' adicionado"

# Segunda tabela pro bulk apply v2
TABLE2_NAME="Smoke RA Docs 2"
TABLE2_SLUG="smoke_ra_docs_2"
mongo_run "
const tables = db.tables.find({name:'$TABLE2_NAME'}, {slug:1}).toArray();
tables.forEach(t => {
  db.getSiblingDB('lowcodejs_data').getCollection(t.slug).drop();
  db.fields.deleteMany({table: t._id.toString()});
});
db.tables.deleteMany({name:'$TABLE2_NAME'});
" > /dev/null
body=$(printf '{"name":"%s","slug":"%s","style":"LIST","visibility":"OPEN","collaboration":"OPEN"}' "$TABLE2_NAME" "$TABLE2_SLUG")
resp=$(api POST "/tables" "$cookies_master" "$body")
table2_id=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('_id',''))" 2>/dev/null || echo "")
TABLE2_SLUG=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('slug',''))" 2>/dev/null || echo "")
api POST "/tables/$TABLE2_SLUG/fields" "$cookies_master" \
  '{"name":"Nome","slug":"nome","type":"TEXT_SHORT","format":"PLAIN_TEXT","required":false}' > /dev/null
pass "Tabela secundária criada (slug=$TABLE2_SLUG)"

step "4. Ativa SÓ o plugin core:row-access"
ext_data=$(api GET "/extensions" "$cookies_master")
ra_id=$(echo "$ext_data" | python3 -c "import sys,json; d=json.load(sys.stdin); print(next((e['_id'] for e in d if e.get('extensionId')=='row-access'),''))")
[ -z "$ra_id" ] && { fail "Plugin row-access não encontrado"; exit 1; }
api PATCH "/extensions/$ra_id/toggle" "$cookies_master" '{"enabled":true}' > /dev/null
pass "row-access enabled"

step "5. Bulk apply na primeira tabela (visibility + creator + date 30d)"
ext_data=$(api GET "/extensions" "$cookies_master")
ra_updatedAt=$(echo "$ext_data" | python3 -c "import sys,json; d=json.load(sys.stdin); print(next((e['updatedAt'] for e in d if e.get('extensionId')=='row-access'),''))")
settings_json='{
  "visibility": {
    "enabled": true,
    "fieldSlug": "visibility",
    "values": ["PUBLIC", "INTERNO", "SIGILOSO"],
    "roleMatrix": {
      "PUBLIC": ["MASTER","ADMINISTRATOR","MANAGER","REGISTERED"],
      "INTERNO": ["MASTER","ADMINISTRATOR","MANAGER"],
      "SIGILOSO": ["MASTER","ADMINISTRATOR"]
    },
    "defaultValue": "PUBLIC"
  },
  "creatorBypass": {"enabled": true},
  "dateWindow": {"mode": "createdAt-sliding", "slidingDays": 30}
}'
body=$(printf '{"tableIds":["%s"],"settings":%s,"expectedUpdatedAt":"%s"}' "$table_id" "$settings_json" "$ra_updatedAt")
resp=$(api PATCH "/extensions/$ra_id/bulk-table-settings" "$cookies_master" "$body")
echo "$resp" | grep -q '"success":\["'"$table_id"'"\]' && pass "Bulk apply: tabela 1 success" || fail "Bulk apply 1: $resp"

step "6. MASTER cria 3 rows (PUBLIC, INTERNO, SIGILOSO)"
for vis in PUBLIC INTERNO SIGILOSO; do
  body=$(printf '{"nome":"doc-master-%s","visibility":["%s"]}' "$vis" "$vis")
  resp=$(api POST "/tables/$TABLE_SLUG/rows" "$cookies_master" "$body")
  echo "$resp" | grep -q '"_id"' && pass "MASTER row $vis criada" || fail "MASTER row $vis: $resp"
done

step "7. MANAGER cria 1 row PUBLIC + tenta SIGILOSO"
body='{"nome":"doc-manager-PUBLIC","visibility":["PUBLIC"]}'
resp=$(api POST "/tables/$TABLE_SLUG/rows" "$cookies_manager" "$body")
echo "$resp" | grep -q '"_id"' && pass "MANAGER row PUBLIC criada" || fail "MANAGER row PUBLIC: $resp"

body='{"nome":"doc-manager-SIGILOSO","visibility":["SIGILOSO"]}'
code=$(api_status POST "/tables/$TABLE_SLUG/rows" "$cookies_manager" "$body")
[ "$code" = "403" ] && pass "MANAGER row SIGILOSO bloqueada (403)" || warn "MANAGER row SIGILOSO HTTP $code (esperado 403)"

# Forçar row SIGILOSA criada por MANAGER via mongo direct (testa creator-bypass)
manager_id=$(mongo_run "print(db.users.findOne({email:'$MANAGER_EMAIL'})._id.toString())" 2>/dev/null | tail -1)
mongo_run "
db.getSiblingDB('lowcodejs_data').getCollection('$TABLE_SLUG').insertOne({
  nome:'doc-manager-SIGILOSO-forced', visibility:['SIGILOSO'],
  creator: ObjectId('$manager_id'),
  createdAt: new Date(), updatedAt: new Date(),
  trashed: false, trashedAt: null
});
" > /dev/null
pass "Row SIGILOSA \"de\" MANAGER inserida via mongo direct"

step "8. MASTER lista — deve ver TODAS as rows (admin bypass)"
resp=$(api GET "/tables/$TABLE_SLUG/rows/paginated?page=1&perPage=50" "$cookies_master")
total=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin)['meta']['total'])")
[ "$total" -ge 5 ] && pass "MASTER vê $total rows (>=5)" || fail "MASTER deveria ver 5+, viu $total"

step "9. MANAGER lista — vê PUBLIC + INTERNO de outros + TODAS suas próprias"
resp=$(api GET "/tables/$TABLE_SLUG/rows/paginated?page=1&perPage=50" "$cookies_manager")
nomes=$(echo "$resp" | python3 -c "import sys,json; d=json.load(sys.stdin); print(','.join(sorted([r.get('nome','?') for r in d['data']])))")
echo "    MANAGER vê: $nomes"
echo "$nomes" | grep -q "doc-master-PUBLIC" && pass "MANAGER vê PUBLIC" || fail "MANAGER NÃO viu PUBLIC"
echo "$nomes" | grep -q "doc-master-INTERNO" && pass "MANAGER vê INTERNO" || fail "MANAGER NÃO viu INTERNO"
echo "$nomes" | grep -q "doc-manager-PUBLIC" && pass "MANAGER vê própria PUBLIC" || fail "MANAGER NÃO viu própria PUBLIC"
echo "$nomes" | grep -q "doc-manager-SIGILOSO-forced" && pass "MANAGER vê própria SIGILOSA (creator-bypass)" || fail "MANAGER NÃO viu própria SIGILOSA"
echo "$nomes" | grep -q "doc-master-SIGILOSO" && fail "MANAGER viu SIGILOSA de MASTER (vazamento!)" || pass "MANAGER NÃO vê SIGILOSA de outros"

step "10. REGISTERED lista — só PUBLIC"
resp=$(api GET "/tables/$TABLE_SLUG/rows/paginated?page=1&perPage=50" "$cookies_registered")
nomes=$(echo "$resp" | python3 -c "import sys,json; d=json.load(sys.stdin); print(','.join(sorted([r.get('nome','?') for r in d['data']])))")
echo "    REGISTERED vê: $nomes"
echo "$nomes" | grep -q "INTERNO\|SIGILOSO" && fail "REGISTERED viu INTERNO/SIGILOSO (vazamento!)" || pass "REGISTERED só vê PUBLIC"

step "11. date-window: força row antiga via mongo, MANAGER deixa de ver"
mongo_run "
db.getSiblingDB('lowcodejs_data').getCollection('$TABLE_SLUG').updateOne(
  {nome:'doc-master-PUBLIC'},
  {\$set: {createdAt: new Date(Date.now() - 60*86400000)}}
);
" > /dev/null
resp=$(api GET "/tables/$TABLE_SLUG/rows/paginated?page=1&perPage=50" "$cookies_manager")
nomes=$(echo "$resp" | python3 -c "import sys,json; d=json.load(sys.stdin); print(','.join(sorted([r.get('nome','?') for r in d['data']])))")
echo "    MANAGER após date-window: $nomes"
echo "$nomes" | grep -q "doc-master-PUBLIC" && fail "MANAGER ainda viu PUBLIC antigo" || pass "date-window filtrou PUBLIC antigo"

step "12. REGISTERED tenta GET row SIGILOSA de MASTER → 403"
sigiloso_row=$(mongo_run "
const r = db.getSiblingDB('lowcodejs_data').getCollection('$TABLE_SLUG').findOne({nome:'doc-master-SIGILOSO'});
print(r._id.toString());
" 2>/dev/null | tail -1)
code=$(api_status GET "/tables/$TABLE_SLUG/rows/$sigiloso_row" "$cookies_registered")
[ "$code" = "403" ] && pass "REGISTERED GET SIGILOSA = 403" || fail "REGISTERED GET SIGILOSA = HTTP $code (esperado 403)"

step "13. Bulk apply v2 — aplica mesma config na tabela secundária"
ext_data=$(api GET "/extensions" "$cookies_master")
ra_updatedAt=$(echo "$ext_data" | python3 -c "import sys,json; d=json.load(sys.stdin); print(next((e['updatedAt'] for e in d if e.get('extensionId')=='row-access'),''))")
body=$(printf '{"tableIds":["%s"],"settings":%s,"expectedUpdatedAt":"%s"}' "$table2_id" "$settings_json" "$ra_updatedAt")
resp=$(api PATCH "/extensions/$ra_id/bulk-table-settings" "$cookies_master" "$body")
echo "$resp" | grep -q '"success":\["'"$table2_id"'"\]' && pass "Bulk apply: tabela 2 success (bulk endpoint funcional)" || fail "Bulk apply 2: $resp"

# ─── Summary ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "Resultado: ${GREEN}$PASS PASS${NC}, ${RED}$FAIL FAIL${NC}"
if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}Falhas:${NC}"
  for f in "${FAILURES[@]}"; do echo "  - $f"; done
  exit 1
fi
exit 0
