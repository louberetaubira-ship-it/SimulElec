# SimulElec

Simulateur web (PWA) d'armoires et de montages électrotechniques pour le **Bac Pro MELEC** et le **BTS Électrotechnique**.
L'élève choisit l'appareillage, pose les modules sur les rails DIN, câble les borniers X1 / X2, réalise les contrôles
hors tension, met sous tension, mesure et cherche la panne. Un professeur virtuel le guide sans jamais donner la réponse.
Le professeur suit en temps réel les tentatives de ses classes.

Stack : Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Auth Google, Postgres + RLS, Realtime) · Anthropic SDK · Vercel.

---

## Installation

```bash
npm install
cp .env.example .env.local   # puis renseigner les variables ci-dessous
npm run dev                  # http://localhost:3000
```

## Variables d'environnement

| Variable | Portée | Rôle |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | client + serveur | URL du projet Supabase (`https://<ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + serveur | clé publishable / anon (jamais la clé service) |
| `ANTHROPIC_API_KEY` | **serveur uniquement** | professeur virtuel (`/api/prof`). Absente → l'API renvoie `503 {"error":"no_key"}` et le bot est simplement désactivé. |
| `ANTHROPIC_MODEL` | serveur | facultatif, défaut `claude-sonnet-4-5` |
| `SUPABASE_SERVICE_ROLE_KEY` | **script de seed uniquement** | contourne les RLS pour remplir la table `tps`. Ne jamais l'exposer au navigateur ni la mettre dans une variable `NEXT_PUBLIC_*`. |

## Base de données

Le schéma déployé est documenté dans [`supabase/migrations/0001_core.sql`](supabase/migrations/0001_core.sql)
(tables `profiles`, `classes`, `tps`, `assignments`, `attempts`, `measurements`, `messages`, `projects`,
fonctions `handle_new_user`, `is_teacher`, `teaches_student`, `join_class`, politiques RLS, Realtime sur `attempts`).
Le fichier est idempotent : il sert de référence versionnée et permet de recréer un environnement.

### Seed du catalogue de TP

`attempts.tp_id` référence `tps.id` : **la table `tps` doit contenir les TP avant qu'un élève démarre une tentative.**

```bash
SUPABASE_SERVICE_ROLE_KEY=... npm run seed
```

Le script (`scripts/seed-tps.ts`) fait un upsert des définitions `TPS` de `src/lib/data/` dans la table `tps`
(colonne `definition` en JSONB). Le catalogue côté application lit la table et retombe sur les définitions du
code si elle est vide.

### Rôle professeur

Le trigger `handle_new_user` crée chaque profil avec le rôle `eleve`. Pour ouvrir l'espace `/prof`, passer le rôle
à `professeur` depuis le SQL editor de Supabase :

```sql
update public.profiles set role = 'professeur' where email = 'prof@exemple.fr';
```

## Authentification Google

1. **Google Cloud Console** → *APIs & Services* → *Credentials* → *Create credentials* → *OAuth client ID* →
   type **Web application**.
   - *Authorized JavaScript origins* : `http://localhost:3000` et l'URL de production Vercel.
   - *Authorized redirect URI* : `https://mlbbzkjttloqaptkvamp.supabase.co/auth/v1/callback`
     (adapter `<ref>` pour un autre projet Supabase).
   - Renseigner l'écran de consentement OAuth (nom de l'application, e-mail de support, domaine).
2. **Supabase** → *Authentication* → *Providers* → *Google* : activer, coller le **Client ID** et le
   **Client Secret** de l'étape 1, enregistrer.
3. **Supabase** → *Authentication* → *URL Configuration* :
   - *Site URL* : l'URL de production.
   - *Redirect URLs* : `http://localhost:3000/auth/callback` et `https://<domaine-vercel>/auth/callback`.

Flux applicatif : `/login` appelle `signInWithOAuth({ provider: 'google', redirectTo: origin + '/auth/callback' })`,
puis `src/app/auth/callback/route.ts` échange le code (`exchangeCodeForSession`) et redirige vers `next` ou `/tp`.
`src/middleware.ts` rafraîchit la session à chaque requête et renvoie vers `/login` les routes `/tp`, `/prof`, `/compte`
si aucune session n'est présente. La déconnexion passe par `POST /auth/signout`.

## Déploiement Vercel

1. Importer le dépôt sur [vercel.com/new](https://vercel.com/new) (framework Next.js détecté automatiquement).
2. *Settings* → *Environment Variables* : ajouter `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `ANTHROPIC_API_KEY` et, si besoin, `ANTHROPIC_MODEL`.
   **Ne pas ajouter `SUPABASE_SERVICE_ROLE_KEY`** : le seed se lance depuis un poste local.
3. Déployer, puis reporter l'URL de production dans Google Cloud Console (origins) et dans Supabase
   (*Site URL* + *Redirect URLs*).

## PWA

`public/manifest.json` (`display: standalone`, thème `#141A21`) et les icônes `public/icons/icon-192.png`,
`icon-512.png`, `icon-maskable-512.png` permettent l'installation sur l'écran d'accueil Android.

## Structure

```
src/app/            pages (landing, login, auth/callback, tp, prof, compte) + api/prof
src/components/     Nav, panel/, parcours/, ui/
src/lib/supabase/   clients browser / server / middleware
src/lib/db/         helpers typés (attempts, profiles, classes, tps) + types du contrat
src/lib/sim/        moteur de simulation (pur, sans React)
src/lib/data/       catalogue d'appareillages et définitions de TP
supabase/migrations schéma de référence
scripts/            seed du catalogue de TP
```

Les conventions du projet (palette, typographies, contrat entre modules) sont dans [`CLAUDE.md`](CLAUDE.md).
