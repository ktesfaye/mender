#!/bin/zsh
# Puts a freshly packaged Mender.app into /Applications the next time Mender is quit.
#
#   nohup apps/mender/tools/install.sh <path/to/Mender.app> >/dev/null 2>&1 & disown
#
# Several sessions build and install at once, so this is the only way any of them should:
# it never quits the running app (agents may be mid-turn inside it), it takes a lock so two
# installs never interleave, it keeps whatever is installed if that is already as new, and it
# swaps the bundle in with a rename so nothing ever launches off a half-copied one. Copying
# straight over /Applications/Mender.app while another waiter opened it is what crashed it.
set -u
NEW=${1:?path to Mender.app}
APP=${MENDER_APP:-/Applications/Mender.app}
LOCK=/tmp/mender-install.lock
plist() { /usr/libexec/PlistBuddy -c "Print CFBundleShortVersionString" "$1/Contents/Info.plist" 2>/dev/null; }
running() { ps -ax -o pid=,command= | awk -v a="$APP/Contents/MacOS/Mender" '$2==a{f=1} END{exit !f}'; }
WANT=$(plist "$NEW") || { echo "no bundle at $NEW"; exit 1; }

while :; do
  while running; do sleep 2; done
  if mkdir "$LOCK" 2>/dev/null; then
    echo $$ > "$LOCK/pid"
    running || break
    rm -rf "$LOCK"
  elif ! kill -0 "$(cat "$LOCK/pid" 2>/dev/null)" 2>/dev/null; then
    rm -rf "$LOCK"
  fi
  sleep 2
done
trap 'rm -rf "$LOCK"' EXIT

HAVE=$(plist "$APP")
if [ -n "$HAVE" ] && [ "$(printf '%s\n' "$HAVE" "$WANT" | sort -V | tail -1)" = "$HAVE" ]; then
  echo "kept $HAVE over $WANT"
else
  rm -rf "$APP.new" "$APP.old"
  ditto "$NEW" "$APP.new" || { echo "copy failed"; exit 1; }
  [ -d "$APP" ] && mv "$APP" "$APP.old"
  mv "$APP.new" "$APP" && rm -rf "$APP.old"
  echo "installed $WANT over ${HAVE:-nothing}"
fi
running || open "$APP"
