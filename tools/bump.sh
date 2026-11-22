#!/bin/sh
# Versionsnummer an alle lokalen Modul-Importe hängen (Cache-Busting nach Updates)
cd "$(dirname "$0")/.." || exit 1
V=$(date +%Y%m%d%H%M)
sed -i -E "s#\"\./(app|engine|backend|staff|config)\.js(\?v=[0-9]+)?\"#\"./\1.js?v=$V\"#g" index.html app.js engine.js backend.js staff.js
echo "Version $V"
