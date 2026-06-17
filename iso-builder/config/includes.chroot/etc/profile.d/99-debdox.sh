#!/bin/sh
# DebDox: show the welcome dashboard on interactive console/SSH login.
# All configuration is done by the installer, so there is no first-run wizard.
[ -t 0 ] || return 0
[ -x /usr/local/bin/debdox-welcome ] && /usr/local/bin/debdox-welcome
