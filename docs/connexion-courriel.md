# Connexion par courriel — ce qu'il reste à régler chez Supabase

Le code du lien de connexion est en place. Il ne s'activera qu'une fois les trois
réglages ci-dessous faits dans le tableau de bord Supabase : ce sont les seules
pièces qui ne peuvent pas venir du dépôt.

## Ce que Supabase envoie — et ce qu'il n'envoie pas

**Supabase n'envoie jamais un mot de passe en clair.** Un mot de passe qui circule
par courriel est un mot de passe compromis : il reste dans la boîte d'envoi, dans
celle de réception, et dans les journaux des serveurs traversés. Ce qui part, c'est
un **lien à usage unique**, valable une heure.

Trois chemins coexistent donc dans SimulElec, du plus simple au plus contraignant :

| chemin | pour qui | ce que la personne reçoit |
|---|---|---|
| adresse + mot de passe | tout le monde | rien : l'administrateur remet le mot de passe de la main à la main |
| lien de connexion | adresse académique, à distance | un lien à usage unique |
| Google | adresses Gmail inscrites | rien |

## 1. Un serveur d'envoi à soi (indispensable)

Le serveur d'envoi intégré à Supabase est un serveur de **démonstration** : quelques
messages par heure, et **uniquement vers les adresses des membres de l'organisation
Supabase**. Un envoi vers `prenom.nom@ac-guyane.fr` ne partira pas.

Il faut donc déclarer un serveur SMTP dans *Authentication → Emails → SMTP Settings* :
celui du rectorat s'il est ouvert, ou un service d'envoi (Brevo, Resend, Postmark…).

Deux points qui décident de l'arrivée réelle du message :

- **le domaine d'envoi doit être authentifié** — SPF et DKIM publiés dans le DNS du
  domaine utilisé comme expéditeur. Sans cela, une académie classe le message en
  indésirable, quand elle ne le rejette pas ;
- **l'adresse d'expédition doit appartenir à ce domaine**. Un expéditeur en
  `@gmail.com` envoyé par un service tiers est rejeté par DMARC.

## 2. Les URL de retour

Dans *Authentication → URL Configuration* :

- **Site URL** : `https://simul-elec.vercel.app`
- **Redirect URLs** : ajouter `https://simul-elec.vercel.app/auth/confirm` et
  `https://simul-elec.vercel.app/auth/callback`, plus leurs équivalents
  `http://localhost:3000/...` pour le développement.

Sans ces entrées, Supabase refuse la redirection et la personne retombe sur la page
d'accueil sans session.

## 3. Le gabarit du message (recommandé, pas obligatoire)

Dans *Authentication → Emails → Templates → Magic Link*, remplacer l'URL du lien par :

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

Ce gabarit fait passer le jeton par la route `/auth/confirm`, qui ouvre la session
côté serveur. Le jeton ne transite alors jamais dans le fragment de l'URL, donc
jamais dans l'historique du navigateur ni dans les journaux d'un serveur mandataire.

Le gabarit **par défaut** fonctionne aussi : il passe par `/auth/v1/verify` chez
Supabase, qui redirige ensuite avec un code PKCE vers `/auth/callback` — la route
qui sert déjà à Google. C'est simplement moins propre.

## Ce que le code garantit déjà

- La **liste blanche** `teacher_allowlist` tranche dans tous les cas. Demander un
  lien pour une adresse absente ne crée aucun compte : le trigger
  `handle_new_user` lève une erreur, et la page affiche « adresse non autorisée ».
- `/auth/confirm` n'accepte que les types d'OTP attendus et refuse une redirection
  vers un domaine extérieur.
- Le lien ne sert qu'une fois ; un second clic affiche un message explicite plutôt
  qu'une page blanche.

## Vérifier que ça marche

1. Depuis `/login`, onglet **Professeur**, saisir une adresse **inscrite** et
   demander le lien : le message de confirmation doit apparaître.
2. Saisir une adresse **non inscrite** : le refus doit être explicite, et aucun
   compte ne doit apparaître dans `auth.users`.
3. Ouvrir le lien reçu : la session doit s'ouvrir et mener au catalogue.
