<p align="center">
  <img src="docs/banner.png" alt="OffFeed — votre espace, pas leur fil. Espace privé pour vos photos, sans algorithme ni bruit." width="100%" />
</p>

*English: [README.en.md](README.en.md)*

# OffFeed

**OffFeed** est une interface minimale inspirée d’Instagram, centrée uniquement sur votre propre contenu.

Le projet part d’un constat simple : publier une photo est devenu indissociable d’un environnement saturé. Aujourd’hui, utiliser Instagram ne se limite plus à créer et partager — cela implique aussi de naviguer dans un flux infini, entre publications, suggestions et contenus sponsorisés. Avec le temps, ce contexte a pris le dessus sur l’acte lui-même.

---

## Intention

OffFeed ne cherche pas à remplacer Instagram. Il cherche à en extraire une partie précise : **l’expérience de publier et de voir son propre contenu**, sans tout le reste.

---

## Concept

L’application propose une version volontairement limitée :

- accès à votre profil et à votre grille de photos  
- publication et édition de contenu  
- édition du profil (description, image)  
- **pas** de fil externe, stories, messagerie ni suggestions  

L’interface reprend les codes familiers du profil Instagram, mais supprime ce qui détourne l’attention.

---

## Intégration avec Instagram (optionnel)

Vous pouvez connecter un compte Instagram via des jetons d’accès (Instagram Graph API) pour :

- publier depuis OffFeed  
- dupliquer des publications sur Instagram  

Vous continuez à alimenter votre présence publique sans passer par l’application mobile pour l’essentiel du flux.

---

## Positionnement

Le projet ne repose pas sur une opposition au partage, mais sur une critique du contexte dans lequel il se fait aujourd’hui. OffFeed propose un espace où votre contenu existe seul, tout en restant partageable ailleurs.

---

## Ce que fait l’application (technique)

- **Mur public** — grille façon Instagram sur `/`, accessible publiquement ou protégée par mot de passe  
- **Détail d’une publication** — `/p/[id]` avec légende, tags et date  
- **Admin** — `/admin` : création, édition, suppression des posts  
- **Import d’archive** — dépôt d’un export Instagram (ZIP) pour reconstruire l’historique en local  
- **Publication vers Instagram** — optionnelle, par post, via l’API Graph  

---

## Stack

- [Next.js 14](https://nextjs.org) (App Router, API routes)  
- [SQLite](https://www.sqlite.org) + [Prisma](https://www.prisma.io)  
- [NextAuth.js](https://next-auth.js.org)  
- [Tailwind CSS](https://tailwindcss.com)  
- [sharp](https://sharp.pixelplumbing.com) — traitement d’images  
- [adm-zip](https://github.com/cthackers/adm-zip) — import ZIP  

---

## Installation

### Prérequis

- Node.js 18 ou plus récent  
- npm (ou pnpm / yarn)  

### 1. Cloner le dépôt et installer les dépendances

```bash
git clone https://github.com/VOTRE_COMPTE/VOTRE_REPO.git
cd VOTRE_REPO
npm install
```

(Remplacez l’URL et le dossier par ceux de votre fork ou dépôt.)

### 2. Variables d’environnement

```bash
cp .env.example .env.local
```

Éditez `.env.local` :

- **`NEXTAUTH_URL`** — en local : `http://localhost:3000` ; en prod : l’URL publique du site  
- **`NEXTAUTH_SECRET`** — secret long et aléatoire (en production, au moins 32 caractères)  

```bash
openssl rand -base64 32
```

- **`DATABASE_URL`** — par défaut : `file:./dev.db` (fichier SQLite à côté du schéma Prisma ; en pratique `prisma/dev.db` à la racine du projet)  

Les clés Instagram (`INSTAGRAM_*`) sont **optionnelles** tant que vous n’utilisez pas la publication vers Instagram.

> Le mot de passe administrateur **n’est pas** dans `.env` : il est défini au premier lancement (voir étape 5).

### 3. Base de données

```bash
npx prisma db push
npm run db:seed
```

### 4. Lancer le serveur de développement

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) pour le mur public et [http://localhost:3000/admin](http://localhost:3000/admin) pour l’administration.

### 5. Première configuration

1. Allez sur `/admin` : vous êtes redirigé vers **`/admin/setup`** pour créer le mot de passe administrateur.  
2. Connectez-vous, puis **activez la 2FA** (TOTP) depuis l’interface d’admin — elle est requise pour accéder au tableau de bord.  

---

## Utilisation

### Importer une archive Instagram

1. Sur Instagram : **Paramètres → Votre activité → Télécharger vos informations** — demandez une exportation au format JSON (ZIP).  
2. Dans l’admin : **Import** — déposez le ZIP.  
3. Les photos et légendes sont stockées localement sous `public/uploads/`.  
4. Réimporter est sans danger : les doublons sont ignorés.  

### Créer un post manuellement

**Admin → Nouveau post** : image, légende, tags.

### Publier sur Instagram (optionnel)

Configurer les jetons dans **Admin → Paramètres**, puis utiliser l’action de publication sur la fiche d’un post (image ou carrousel).

### Site public / privé

Dans **Admin → Paramètres**, décochez **Site public** pour protéger tout le mur par le flux de connexion admin.

---

## Scripts npm

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run start` | Serveur de production |
| `npm run db:push` | Appliquer le schéma Prisma sur la base |
| `npm run db:migrate` | Migrations Prisma |
| `npm run db:studio` | Prisma Studio |
| `npm run db:seed` | Valeurs par défaut des réglages |

---

## Déploiement

L’application tourne sur tout hébergeur Node.js (VPS, [Railway](https://railway.app), [Coolify](https://coolify.io), etc.).

**Checklist production**

- `NODE_ENV=production`  
- `NEXTAUTH_URL` = URL publique  
- Persister **`public/uploads/`** et le fichier SQLite (`DATABASE_URL`)  

En conteneur, montez des volumes pour ces chemins.

---

## Structure du dépôt

```
src/
├── app/
│   ├── page.tsx                  # Mur public
│   ├── p/[id]/page.tsx           # Détail d’un post
│   ├── admin/                    # Admin, setup, import, paramètres…
│   └── api/                      # Posts, upload, import, réglages, Instagram…
├── components/
└── lib/                          # prisma, auth, réglages, Instagram…
prisma/
└── schema.prisma
docs/
└── banner.png                    # Bannière README (GitHub)
```

---

## Licence

MIT
