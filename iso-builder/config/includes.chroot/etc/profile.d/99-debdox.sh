#!/bin/sh
# DebDox: launch installer in live mode, setup wizard on first boot,
# welcome banner on subsequent logins
[ -t 0 ] || return 0

if [ -d /run/live ]; then
    exec /usr/local/bin/debdox-install
elif [ ! -f /etc/debdox/.configured ]; then
    /usr/local/bin/debdox-firstrun
else
    /usr/local/bin/debdox-welcome
fi
