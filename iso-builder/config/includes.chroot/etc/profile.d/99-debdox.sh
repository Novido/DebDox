#!/bin/sh
# DebDox: run setup wizard on first boot, show welcome on subsequent logins
[ -t 0 ] || return 0

if [ ! -f /etc/debdox/.configured ]; then
    /usr/local/bin/debdox-firstrun
else
    /usr/local/bin/debdox-welcome
fi
