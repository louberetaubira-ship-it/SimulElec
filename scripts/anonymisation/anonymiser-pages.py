#!/usr/bin/env python3
"""
Anonymisation des pages d'un sujet PDF (images servies aux navigateurs).

Rend les pages d'un PDF en JPEG, masque en blanc tout ce qui trahit l'origine du sujet
(cadre de pied de page, en-têtes, mentions dans le corps), puis contrôle chaque image
produite par OCR. AUCUN terme d'origine n'est écrit ici : la détection repose
  - sur la POSITION (bande haute / basse de la page) ;
  - sur les empreintes SHA-256 de `empreintes.json` (même normalisation que `verif.ts` :
    minuscules, sans accents, alphanumérique ; mots, paires et triplets de mots).

Étapes, pour chaque page demandée :
  1. rendu `pdftoppm` (dpi par plage) → JPEG (qualité, progressif, optimisé) ;
  2. mots de la page (`pdftotext -bbox-layout`) → fragments dont l'empreinte est connue ;
     - fragment dans une bande haute/basse : toute la RANGÉE de mots de la bande est prise,
       puis le rectangle est étendu jusqu'aux traits du cadre (tableau de pied de page) ;
     - fragment ailleurs (corps) : les mots concernés sont masqués ;
     - numéro de page isolé « n / N » (ligne courte : « Page n / N », « XXX n/N ») dans une bande :
       idem cadre (une référence « … n/N » dans une phrase du corps est du contenu : gardée) ;
  3. zones manuelles `--masque` (fractions de page) ;
  4. contrôle OCR (tesseract, `fra` si installée sinon `eng`) : texte → empreintes, et motif
     « n/N » isolé (N = nombres de pages des plages) dans les bandes haute/basse. Échec = code 1.

Exemples :
  python3 scripts/anonymisation/anonymiser-pages.py sujet.pdf --sortie public/tp/xxx \\
     --plage sujet:1-32:110 --plage dtr:33-43:110 --plage dtr:44-84:150:12 \\
     --exclure sujet-01,dtr-01 --masque sujet-04:0.08,0.30,0.30,0.45

  # contrôle OCR seul d'images existantes (recadrages…)
  python3 scripts/anonymisation/anonymiser-pages.py --verifier public/tp/xxx/*.jpg --totaux 32,52
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import unicodedata
from dataclasses import dataclass, field
from html import unescape

from PIL import Image, ImageDraw

ICI = os.path.dirname(os.path.abspath(__file__))


# ─── Empreintes ────────────────────────────────────────────────────────────────

def normaliser(s: str) -> str:
    s = unicodedata.normalize('NFD', s)
    s = re.sub(r'[\u0300-\u036f]', '', s).lower()
    return re.sub('[^a-z0-9]+', ' ', s).strip()


def empreinte(s: str) -> str:
    return hashlib.sha256(s.encode('utf-8')).hexdigest()


def charger_empreintes(chemin: str) -> set[str]:
    with open(chemin, encoding='utf-8') as f:
        return set(json.load(f)['empreintes'])


def fragments_interdits(jetons: list[str], emp: set[str]) -> list[tuple[int, int]]:
    """(début, longueur) des fragments de 1 à 3 jetons dont l'empreinte est connue."""
    res = []
    for i in range(len(jetons)):
        for n in (1, 2, 3):
            if i + n <= len(jetons) and empreinte(' '.join(jetons[i:i + n])) in emp:
                res.append((i, n))
    return res


# ─── Mots du PDF ───────────────────────────────────────────────────────────────

@dataclass
class Mot:
    x0: float
    y0: float
    x1: float
    y1: float
    texte: str
    ligne: int  # n° de la ligne pdftotext (<line>) dans la page


@dataclass
class PagePdf:
    largeur: float
    hauteur: float
    mots: list[Mot] = field(default_factory=list)


RE_PAGE = re.compile(r'<page width="([\d.]+)" height="([\d.]+)">(.*?)</page>', re.S)
RE_LIGNE = re.compile(r'<line [^>]*>(.*?)</line>', re.S)
RE_MOT = re.compile(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</word>')


def lire_mots(pdf: str) -> list[PagePdf]:
    with tempfile.TemporaryDirectory() as d:
        sortie = os.path.join(d, 'bbox.html')
        subprocess.run(['pdftotext', '-bbox-layout', pdf, sortie], check=True)
        with open(sortie, encoding='utf-8') as f:
            html = f.read()
    pages = []
    for w, h, corps in RE_PAGE.findall(html):
        p = PagePdf(float(w), float(h))
        for n, ligne in enumerate(RE_LIGNE.findall(corps)):
            for x0, y0, x1, y1, t in RE_MOT.findall(ligne):
                p.mots.append(Mot(float(x0), float(y0), float(x1), float(y1), unescape(t), n))
        pages.append(p)
    return pages


# ─── Détection des zones ───────────────────────────────────────────────────────

RE_NUMERO = re.compile(r'(?<!\d)\d{1,3}\s*/\s*(\d{1,3})(?!\d)')


def numero_isole(texte: str, totaux: set[int]) -> bool:
    """Ligne courte (≤ 4 mots) portant un numéro « n / N » avec N dans totaux : « Page 4 / 32 », « XXX 2/52 ».
    Une référence dans une phrase (« pages 42/52 à 52/52 ») n'est pas isolée."""
    return len(texte.split()) <= 4 and any(int(m.group(1)) in totaux for m in RE_NUMERO.finditer(texte))


def est_numero_page(mots: list[Mot], totaux: set[int]) -> list[int]:
    """Indices des mots des lignes pdftotext qui sont des numéros de page isolés."""
    lignes: dict[int, list[int]] = {}
    for i, m in enumerate(mots):
        lignes.setdefault(m.ligne, []).append(i)
    res: list[int] = []
    for idx in lignes.values():
        if numero_isole(' '.join(mots[i].texte for i in idx), totaux):
            res += idx
    return res


def mots_masques(page: PagePdf, emp: set[str], totaux: set[int], bande: float):
    """Renvoie (indices des mots « de bande » à masquer avec leur cadre, indices des mots du corps)."""
    jetons: list[str] = []
    proprio: list[int] = []
    for i, m in enumerate(page.mots):
        for j in normaliser(m.texte).split():
            jetons.append(j)
            proprio.append(i)
    touches: set[int] = set()
    for deb, n in fragments_interdits(jetons, emp):
        touches.update(proprio[deb:deb + n])

    haut, bas = bande * page.hauteur, (1 - bande) * page.hauteur
    dans_bande = lambda m: m.y1 <= haut or m.y0 >= bas
    # numéro de page isolé : seulement dans les bandes (une référence « DTR n/N » du corps est du contenu)
    touches.update(i for i in est_numero_page(page.mots, totaux) if dans_bande(page.mots[i]))
    bande_idx = {i for i in touches if dans_bande(page.mots[i])}
    corps_idx = touches - bande_idx
    # rangée complète : tous les mots de bande qui chevauchent verticalement un mot touché
    rangee: set[int] = set()
    for i in bande_idx:
        a = page.mots[i]
        for k, m in enumerate(page.mots):
            if dans_bande(m) and m.y0 < a.y1 + 2 and m.y1 > a.y0 - 2:
                rangee.add(k)
    return rangee, corps_idx


def etendre_au_cadre(gris, x0: int, y0: int, x1: int, y1: int, marge_max: int):
    """Étend un rectangle de texte jusqu'aux traits du tableau qui l'entoure (s'il y en a)."""
    import numpy as np
    H, W = gris.shape
    noir = gris < 140
    larg = max(1, x1 - x0)

    def ligne_h(y):
        return noir[y, max(0, x0):min(W, x1)].mean() > 0.6 if 0 <= y < H else False

    top = None
    for y in range(y0, max(-1, y0 - marge_max), -1):
        if ligne_h(y):
            top = y
            while top - 1 >= 0 and ligne_h(top - 1):
                top -= 1
            break
    bot = None
    for y in range(y1, min(H, y1 + marge_max)):
        if ligne_h(y):
            bot = y
            while bot + 1 < H and ligne_h(bot + 1):
                bot += 1
            break
    if top is None or bot is None:
        return None

    def etendre(y, x, pas):
        trou = 0
        while 0 <= x + pas < W and trou <= 3:
            x += pas
            trou = 0 if noir[y, x] else trou + 1
        return x - pas * trou

    gauche = min(etendre(top, x0, -1), etendre(bot, x0, -1))
    droite = max(etendre(top, x1, 1), etendre(bot, x1, 1))
    if droite - gauche < larg:
        return None
    return gauche, top, droite, bot


# ─── OCR ───────────────────────────────────────────────────────────────────────

def langue_ocr() -> str:
    try:
        out = subprocess.run(['tesseract', '--list-langs'], capture_output=True, text=True).stdout
    except FileNotFoundError:
        sys.exit('tesseract introuvable')
    return 'fra' if re.search(r'^fra$', out, re.M) else 'eng'


def ocr(img: Image.Image, lang: str, psm: int = 3) -> str:
    with tempfile.TemporaryDirectory() as d:
        f = os.path.join(d, 'i.png')
        img.save(f)
        r = subprocess.run(['tesseract', f, 'stdout', '-l', lang, '--psm', str(psm)],
                           capture_output=True, text=True, env={**os.environ, 'OMP_THREAD_LIMIT': '1'})
        return r.stdout


def controler_tout(fichiers: list[str], emp: set[str], totaux: set[int], bande: float, lang: str) -> int:
    """Contrôle OCR en parallèle ; affiche les problèmes ; renvoie le nombre d'images en échec."""
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=os.cpu_count() or 4) as ex:
        resultats = list(ex.map(lambda f: controler(f, emp, totaux, bande, lang), fichiers))
    ko = 0
    for f, p in zip(fichiers, resultats):
        if p:
            ko += 1
            print(f'✗ {os.path.basename(f)} : ' + ' ; '.join(p))
    print(f'OCR ({lang}) : {len(fichiers) - ko}/{len(fichiers)} image(s) propre(s).')
    return ko


def controler(chemin: str, emp: set[str], totaux: set[int], bande: float, lang: str) -> list[str]:
    """Problèmes trouvés par OCR dans une image (vide = propre). Ne cite pas les termes."""
    im = Image.open(chemin).convert('L')
    problemes = []
    # page entière, et agrandie ×2 (petits caractères des pieds de page)
    textes = [ocr(im, lang), ocr(im.resize((im.width * 2, im.height * 2), Image.LANCZOS), lang)]
    for t in textes:
        n = len(fragments_interdits(normaliser(t).split(), emp))
        if n:
            problemes.append(f'{n} fragment(s) d\'origine lu(s) par OCR')
            break
    # numéros de page « n/N » isolés dans les bandes haute et basse
    h = int(im.height * bande)
    for nom, zone in (('haut', im.crop((0, 0, im.width, h))), ('bas', im.crop((0, im.height - h, im.width, im.height)))):
        z2 = zone.resize((zone.width * 2, zone.height * 2), Image.LANCZOS)
        lignes = ocr(z2, lang, 6).splitlines() + ocr(z2, lang, 11).splitlines()
        if any(numero_isole(l, totaux) for l in lignes):
            problemes.append(f'numéro de page « n/N » isolé en {nom} de page')
    return problemes


# ─── Programme ─────────────────────────────────────────────────────────────────

@dataclass
class Plage:
    prefixe: str
    debut: int
    fin: int
    dpi: int
    num0: int


def lire_plage(s: str) -> Plage:
    m = re.fullmatch(r'([\w-]+):(\d+)-(\d+)(?::(\d+))?(?::(\d+))?', s)
    if not m:
        raise argparse.ArgumentTypeError(f'plage invalide : {s} (PREFIXE:DEBUT-FIN[:DPI[:NUM0]])')
    return Plage(m.group(1), int(m.group(2)), int(m.group(3)), int(m.group(4) or 110), int(m.group(5) or 1))


def lire_masque(s: str):
    m = re.fullmatch(r'([\w-]+):([\d.]+),([\d.]+),([\d.]+),([\d.]+)', s)
    if not m:
        raise argparse.ArgumentTypeError(f'masque invalide : {s} (PAGE:x0,y0,x1,y1 en fractions)')
    return m.group(1), tuple(float(m.group(i)) for i in range(2, 6))


def main() -> int:
    ap = argparse.ArgumentParser(description='Rend et anonymise les pages d\'un sujet PDF.')
    ap.add_argument('pdf', nargs='?')
    ap.add_argument('--sortie', help='dossier des images produites')
    ap.add_argument('--plage', action='append', type=lire_plage, default=[],
                    help='PREFIXE:DEBUT-FIN[:DPI[:NUM0]] — pages du PDF DEBUT..FIN → PREFIXE-NN.jpg '
                         '(NN à partir de NUM0, défaut 1 ; DPI défaut 110). Répétable.')
    ap.add_argument('--qualite', type=int, default=78, help='qualité JPEG (défaut 78)')
    ap.add_argument('--rotation', action='append', default=[],
                    help='NOM:DEGRES (ex. sujet-26:90), rotation anti-horaire après rendu')
    ap.add_argument('--exclure', default='', help='noms de pages à ne pas produire, séparés par des virgules')
    ap.add_argument('--masque', action='append', type=lire_masque, default=[],
                    help='NOM:x0,y0,x1,y1 — zone supplémentaire en fractions de page (NOM = sujet-04 ou n° de page PDF)')
    ap.add_argument('--empreintes', default=os.path.join(ICI, 'empreintes.json'))
    ap.add_argument('--bande', type=float, default=0.1, help='hauteur des bandes haute/basse (fraction, défaut 0.1)')
    ap.add_argument('--totaux', default='', help='nombres de pages « n/N » à détecter (défaut : tailles des plages par préfixe)')
    ap.add_argument('--verifier', nargs='+', help='contrôle OCR seul des images données')
    ap.add_argument('--sans-ocr', action='store_true', help='ne pas lancer le contrôle OCR')
    a = ap.parse_args()

    emp = charger_empreintes(a.empreintes)
    lang = langue_ocr()
    totaux = {int(x) for x in a.totaux.split(',') if x.strip()}

    if a.verifier:
        return 1 if controler_tout(a.verifier, emp, totaux, a.bande, lang) else 0

    if not (a.pdf and a.sortie and a.plage):
        ap.error('pdf, --sortie et au moins une --plage sont requis (ou --verifier)')
    if not totaux:
        par_prefixe: dict[str, int] = {}
        for p in a.plage:
            par_prefixe[p.prefixe] = max(par_prefixe.get(p.prefixe, 0), p.num0 + p.fin - p.debut)
        totaux = set(par_prefixe.values())

    exclus = {x.strip() for x in a.exclure.split(',') if x.strip()}
    rotations = {k: int(v) for k, v in (r.split(':') for r in a.rotation)}
    masques: dict[str, list] = {}
    for nom, z in a.masque:
        masques.setdefault(nom, []).append(z)

    os.makedirs(a.sortie, exist_ok=True)
    pages_pdf = lire_mots(a.pdf)
    import numpy as np

    produits = []
    with tempfile.TemporaryDirectory() as tmp:
        for pl in a.plage:
            for n_pdf in range(pl.debut, pl.fin + 1):
                nom = f'{pl.prefixe}-{pl.num0 + n_pdf - pl.debut:02d}'
                if nom in exclus:
                    continue
                racine = os.path.join(tmp, nom)
                subprocess.run(['pdftoppm', '-r', str(pl.dpi), '-f', str(n_pdf), '-l', str(n_pdf),
                                '-png', '-singlefile', a.pdf, racine], check=True)
                im = Image.open(racine + '.png').convert('RGB')
                page = pages_pdf[n_pdf - 1]
                sx, sy = im.width / page.largeur, im.height / page.hauteur
                gris = np.asarray(im.convert('L'))
                dessin = ImageDraw.Draw(im)
                journal = []

                rangee, corps = mots_masques(page, emp, totaux, a.bande)
                if rangee:
                    # un cadre par bande (haute / basse)
                    for cote in ('haut', 'bas'):
                        ms = [page.mots[i] for i in rangee
                              if (page.mots[i].y0 < page.hauteur / 2) == (cote == 'haut')]
                        if not ms:
                            continue
                        x0 = int(min(m.x0 for m in ms) * sx); x1 = int(max(m.x1 for m in ms) * sx) + 1
                        y0 = int(min(m.y0 for m in ms) * sy); y1 = int(max(m.y1 for m in ms) * sy) + 1
                        cadre = etendre_au_cadre(gris, x0, y0, x1, y1, marge_max=int(12 * sy))
                        pad = max(2, round(1.5 * sx))
                        if cadre:
                            g, h, d, b = cadre
                            journal.append(f'cadre {cote}')
                        else:
                            g, h, d, b = x0, y0, x1, y1
                            pad = max(pad, round(3 * sx))
                            journal.append(f'texte {cote} (sans cadre)')
                        dessin.rectangle((g - pad, h - pad, d + pad, b + pad), fill='white')
                for i in corps:
                    m = page.mots[i]
                    pad = round(1.5 * sx)
                    dessin.rectangle((int(m.x0 * sx) - pad, int(m.y0 * sy) - pad,
                                      int(m.x1 * sx) + pad, int(m.y1 * sy) + pad), fill='white')
                if corps:
                    journal.append(f'{len(corps)} mot(s) du corps')
                for cle in (nom, str(n_pdf)):
                    for fx0, fy0, fx1, fy1 in masques.get(cle, []):
                        dessin.rectangle((round(fx0 * im.width), round(fy0 * im.height),
                                          round(fx1 * im.width), round(fy1 * im.height)), fill='white')
                        journal.append('zone manuelle')
                if nom in rotations:
                    im = im.rotate(rotations[nom], expand=True)
                dest = os.path.join(a.sortie, nom + '.jpg')
                im.save(dest, 'JPEG', quality=a.qualite, progressive=True, optimize=True)
                produits.append(dest)
                if not rangee:
                    journal.append('AUCUN pied/en-tête détecté')
                print(f'{nom} (p.{n_pdf}, {pl.dpi} dpi, {im.width}×{im.height}) : ' + ', '.join(journal))

    print(f'{len(produits)} image(s) produite(s) dans {a.sortie}')
    if a.sans_ocr:
        return 0
    return 1 if controler_tout(produits, emp, totaux, a.bande, lang) else 0


if __name__ == '__main__':
    sys.exit(main())
