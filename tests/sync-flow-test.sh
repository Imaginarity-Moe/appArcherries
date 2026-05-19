#!/bin/bash
# Sync-Flow-Test: simuliert zwei Browser via curl + getrennte JWTs.
# Validiert Lock, Turn-Rotation, Auto-Station-Wechsel.

set -e
BASE="https://archerries.mossig.de/api/index.php"
CURL="curl.exe --ssl-no-revoke -s"

echo "──── 1) Owner login (claude-test) ────"
T1=$($CURL -X POST -H "Content-Type: application/json" \
  -d '{"email":"claude-test@archerries.local","password":"ClaudeTest_2026!"}' \
  "$BASE/auth/login" | python -c 'import sys,json; print(json.load(sys.stdin)["token"])')
echo "OK Token len: ${#T1}"

echo "──── 2) Gast login (claude-test2) ────"
T2=$($CURL -X POST -H "Content-Type: application/json" \
  -d '{"email":"claude-test2@archerries.local","password":"ClaudeTest2_2026!"}' \
  "$BASE/auth/login" | python -c 'import sys,json; print(json.load(sys.stdin)["token"])')
echo "OK Token len: ${#T2}"

echo "──── 3) Sync-Training erstellen ────"
TR=$($CURL -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $T1" \
  -d '{"discipline":"target_practice","bow_type":"recurve","shared_scoring_mode":"sync","arrows_per_end":3,"num_ends":10,"target_rings":10,"target_distance_m":18,"scoring_mode":"sets","legs_to_win":3,"sets_to_win":2}' \
  "$BASE/trainings")
TID=$(echo "$TR" | python -c 'import sys,json; print(json.load(sys.stdin)["training"]["id"])')
OWNER_PID=$(echo "$TR" | python -c 'import sys,json; t=json.load(sys.stdin)["training"]; print(next(p["id"] for p in t["participants"] if p["is_self"]))')
echo "Training $TID, Owner-Participant $OWNER_PID"
echo "current_turn: $(echo $TR | python -c 'import sys,json; print(json.load(sys.stdin)["training"].get("current_turn_participant_id"))')"
echo "current_station: $(echo $TR | python -c 'import sys,json; print(json.load(sys.stdin)["training"].get("current_station_index"))')"

echo "──── 4) Freund-Beziehung prüfen/aufbauen ────"
# claude-test2 ist User-ID 5 (aus /me)
T2_ME=$($CURL -H "Authorization: Bearer $T2" "$BASE/me")
T2_ID=$(echo "$T2_ME" | python -c 'import sys,json; print(json.load(sys.stdin)["id"])')
echo "Gast-User-ID: $T2_ID"

# Bestehende Friendship-Status checken
FRIENDS=$($CURL -H "Authorization: Bearer $T1" "$BASE/friends")
echo "Bestehende Friends Status: $(echo $FRIENDS | python -c 'import sys,json; d=json.load(sys.stdin); print(\"friends:\", len(d.get(\"friends\",[])), \"incoming:\", len(d.get(\"incoming\",[])), \"outgoing:\", len(d.get(\"outgoing\",[])))')"

echo "──── 5) Gast als Participant zum Training hinzufügen ────"
# Gibt es schon eine accepted Friendship? Wenn nein, friend-request + accept
ACCEPTED=$(echo "$FRIENDS" | python -c "import sys,json; d=json.load(sys.stdin); print(any(f['user']['id']==$T2_ID for f in d.get('friends',[])))")
if [ "$ACCEPTED" != "True" ]; then
  echo "  → Sende Friend-Request..."
  $CURL -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $T1" \
    -d '{"email":"claude-test2@archerries.local"}' \
    "$BASE/friends/requests" > /dev/null
  # claude-test2 akzeptiert
  INCOMING=$($CURL -H "Authorization: Bearer $T2" "$BASE/friends" | python -c "import sys,json; d=json.load(sys.stdin); incoming=d.get('incoming',[]); print(incoming[0]['id'] if incoming else '')")
  if [ -n "$INCOMING" ]; then
    $CURL -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer $T2" \
      -d '{"action":"accept"}' "$BASE/friends/$INCOMING" > /dev/null
    echo "  → Friendship $INCOMING akzeptiert"
  fi
fi

ADD=$($CURL -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $T1" \
  -d "{\"user_id\":$T2_ID}" "$BASE/trainings/$TID/participants")
GAST_PID=$(echo "$ADD" | python -c 'import sys,json; t=json.load(sys.stdin); print(next(p["id"] for p in t["participants"] if not p["is_self"]))')
echo "Gast-Participant-ID: $GAST_PID"

echo "──── 6) Lock-Test: Gast versucht zu scoren (erwartet 423) ────"
LOCK=$($CURL -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $T2" \
  -d '{"target_index":1,"shots":[{"arrow_seq":1,"zone":"10"}]}' \
  "$BASE/trainings/$TID/targets")
echo "Status: $LOCK $([ "$LOCK" = "423" ] && echo "✓ KORREKT" || echo "✗ ERWARTET 423")"

echo "──── 7) Owner scort Station 1 mit yield=true ────"
SAVE=$($CURL -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $T1" \
  -d '{"target_index":1,"shots":[{"arrow_seq":1,"zone":"10"},{"arrow_seq":2,"zone":"9"},{"arrow_seq":3,"zone":"10"}],"yield":true}' \
  "$BASE/trainings/$TID/targets")
echo "Owner-Save OK"

DETAIL=$($CURL -H "Authorization: Bearer $T1" "$BASE/trainings/$TID")
TURN_NOW=$(echo "$DETAIL" | python -c 'import sys,json; print(json.load(sys.stdin)["training"].get("current_turn_participant_id"))')
echo "Turn nach Yield: $TURN_NOW (erwartet: $GAST_PID) $([ "$TURN_NOW" = "$GAST_PID" ] && echo "✓" || echo "✗")"

echo "──── 8) Gast scort jetzt Station 1 ────"
SAVE2=$($CURL -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $T2" \
  -d '{"target_index":1,"shots":[{"arrow_seq":1,"zone":"8"},{"arrow_seq":2,"zone":"9"},{"arrow_seq":3,"zone":"10"}],"yield":true}' \
  "$BASE/trainings/$TID/targets")
echo "Gast-Save Status: $SAVE2"

DETAIL2=$($CURL -H "Authorization: Bearer $T1" "$BASE/trainings/$TID")
ST_NOW=$(echo "$DETAIL2" | python -c 'import sys,json; print(json.load(sys.stdin)["training"].get("current_station_index"))')
TURN2=$(echo "$DETAIL2" | python -c 'import sys,json; print(json.load(sys.stdin)["training"].get("current_turn_participant_id"))')
echo "Station nach beidseits Save: $ST_NOW (erwartet: 2) $([ "$ST_NOW" = "2" ] && echo "✓" || echo "✗")"
echo "Turn nach beidseits Save: $TURN2 (erwartet: $OWNER_PID = Owner zurück) $([ "$TURN2" = "$OWNER_PID" ] && echo "✓" || echo "✗")"

echo "──── 9) Force-Turn: Owner übernimmt Turn von Gast ────"
TAKE=$($CURL -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $T1" \
  -d "{\"participant_id\":$OWNER_PID}" "$BASE/trainings/$TID/turn")
echo "Take-Turn Status: $TAKE $([ "$TAKE" = "200" ] && echo "✓" || echo "✗")"

echo "──── 10) Training löschen (Cleanup) ────"
$CURL -X DELETE -H "Authorization: Bearer $T1" "$BASE/trainings/$TID" > /dev/null
echo "Training $TID gelöscht"

echo ""
echo "═══ Sync-Flow-Test abgeschlossen ═══"
