#!/bin/sh
# Intègre la bibliothèque de symboles DANS la maquette, entre ses deux marqueurs.
#
# Elle y était d'abord chargée par <script src="symboles.js">. C'était une
# erreur : la maquette doit s'ouvrir seule, depuis n'importe où — un aperçu, une
# pièce jointe, une clé USB — et un fichier voisin ne suit pas. Le bloc inséré
# ici est ENGENDRÉ : on ne le modifie jamais à la main, on modifie
# `src/lib/schema/symboles.ts` et on relance ce script.
set -e
LIB=src/lib/schema/symboles.ts
PAGE=docs/maquettes/hypotheses-tests.html
TMP=$(mktemp /tmp/symboles.XXXXXX.js)

npx esbuild "$LIB" --bundle --format=iife --global-name=SYM \
  --outfile="$TMP" --log-level=warning

python3 - "$PAGE" "$TMP" <<'PY'
import sys, re
page, bundle = sys.argv[1], sys.argv[2]
js = open(bundle).read()
html = open(page).read()
bloc = ('<!-- SYMBOLES:DEBUT — engendré par scripts/symboles.sh depuis\n'
        '     src/lib/schema/symboles.ts. Ne pas modifier à la main. -->\n'
        '<script>\n' + js + '</script>\n'
        '<!-- SYMBOLES:FIN -->')
if 'SYMBOLES:DEBUT' in html:
    html = re.sub(r'<!-- SYMBOLES:DEBUT.*?<!-- SYMBOLES:FIN -->', bloc, html, flags=re.S)
else:
    html = html.replace('<script src="symboles.js"></script>', bloc, 1)
open(page, 'w').write(html)
PY

rm -f "$TMP" docs/maquettes/symboles.js
echo "Symboles intégrés dans $PAGE depuis $LIB."
