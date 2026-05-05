# Sécurité — InstaWall

> Dernière mise à jour : 2026-05-04

---

## Architecture de sécurité

InstaWall est une application auto-hébergée à administrateur unique. La surface d'attaque est donc réduite : un seul compte, pas d'inscription, pas de données utilisateurs tiers.

---

## Authentification

### Flux de connexion (2 étapes)

```
Navigateur                        Serveur
    │                                │
    │── POST /api/auth/pre-login ────▶│  bcrypt.compare() + rate limit
    │◀── { preToken, requires2FA } ──│  preToken = HMAC-SHA256 (TTL 3 min)
    │                                │
    │── signIn({ preToken, totp }) ──▶│  verifyPreToken() + verifyTOTP()
    │◀── session JWT ────────────────│  httpOnly cookie, 8h
```

Le mot de passe n'est **jamais** transmis à NextAuth — uniquement le preToken HMAC.

### Protections

| Mécanisme | Détail |
|-----------|--------|
| **Hachage** | bcrypt cost 12 — ~400 ms par tentative |
| **Rate limiting** | 5 essais / 15 min par IP, puis 30 min de blocage |
| **Timing-safe** | `crypto.timingSafeEqual` sur tous les secrets ; dummy hash si aucun mot de passe en DB |
| **preToken** | HMAC-SHA256(timestamp.nonce, NEXTAUTH_SECRET), signé à usage unique, TTL 3 min |
| **Session** | JWT 8h, sliding refresh 1h, cookie `httpOnly + sameSite=lax + secure (prod)` |
| **Redirect** | Callback URL limité au même origin — protection open redirect |

---

## Double authentification (2FA obligatoire)

La 2FA TOTP est **obligatoire** : impossible d'accéder à l'administration sans l'avoir configurée.

### Implémentation

- Bibliothèque : `otplib` — TOTP RFC 6238
- Période : 30 secondes, fenêtre de tolérance : ±1 période
- Secret stocké en DB (SQLite) — visible uniquement côté serveur

### Codes de secours

- **8 codes** générés à l'activation, affichés une seule fois
- Format : `XXXXX-XXXXX-XXXXX` (15 chars alphanumériques)
- Stockage : hash SHA-256 en DB — les codes en clair ne sont jamais persistés
- Usage unique : chaque code est consumé après utilisation
- Utiliser un code de secours **désactive la 2FA** et force la reconfiguration
- Rate limit strict : 5 tentatives / heure, puis blocage 24h

---

## Changement de mot de passe

Le changement de mot de passe requiert un code TOTP valide — aucun autre canal.

**Règles de complexité :**
- Minimum 12 caractères, maximum 200
- Au moins 3 classes parmi : minuscules, majuscules, chiffres, symboles

---

## Premier démarrage (DB vide)

La page `/admin/setup` permet de créer le mot de passe initial **uniquement si aucun hash n'existe en DB**. Elle devient automatiquement inaccessible après la première utilisation (HTTP 403).

---

## Protection CSRF

Le middleware intercepte toutes les mutations `POST / PUT / PATCH / DELETE` sur `/api/*` (hors `/api/auth/*` géré par NextAuth) et vérifie que l'`Origin` ou le `Referer` correspond au même origin.

Les requêtes sans header Origin/Referer sur une méthode mutante sont rejetées (HTTP 403).

---

## En-têtes de sécurité HTTP

| En-tête | Valeur |
|---------|--------|
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Content-Security-Policy` | `default-src 'self'` + img CDN Instagram |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` (prod) |
| `X-Robots-Tag` | `noindex, nofollow` sur `/admin/*` |

---

## Uploads de fichiers

- Types autorisés : `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- Taille max : 20 MB
- L'extension est dérivée du **MIME type** — jamais du nom de fichier fourni par l'utilisateur
- Nom de fichier : UUID aléatoire — aucune information utilisateur
- Stockage dans `/public/uploads/` (servi statiquement)

---

## Validation des entrées

| Endpoint | Validation |
|----------|-----------|
| `GET /api/posts?tag=` | Regex `[\p{L}\p{N}_-]{1,64}` — rejeté sinon |
| `GET /api/posts?limit=` | Borné entre 1 et 100 |
| `POST /api/auth/totp/recover` | Format `XXXXX-XXXXX-XXXXX` vérifié avant tout accès DB |
| Mots de passe | 12–200 chars, 3 classes minimum |

---

## Variables d'environnement requises

```env
DATABASE_URL=file:./dev.db
NEXTAUTH_URL=https://votre-domaine.com
NEXTAUTH_SECRET=<minimum 32 caractères aléatoires>
```

Générer un secret fort :
```bash
openssl rand -base64 32
```

---

## Ce qui N'est PAS implémenté (hors périmètre)

- **Chiffrement at-rest des credentials Instagram** : les tokens IG sont stockés en clair en DB. Protégez l'accès fichier à `dev.db`.
- **Audit log** : les connexions et actions admin ne sont pas journalisées.
- **2FA WebAuthn / Passkeys** : uniquement TOTP pour l'instant.

---

## Checklist déploiement production

- [ ] `NEXTAUTH_SECRET` ≥ 32 chars aléatoires (`openssl rand -base64 32`)
- [ ] `NEXTAUTH_URL` = URL HTTPS exacte de production
- [ ] `NODE_ENV=production` (active HSTS, cookies `Secure`, préfixes `__Secure-` / `__Host-`)
- [ ] Accès fichier `*.db` restreint (permissions Unix 600)
- [ ] Reverse proxy (nginx/Caddy) avec TLS — ne pas exposer Next.js directement
- [ ] Sauvegardes régulières de `dev.db`
- [ ] Codes de secours 2FA imprimés ou dans un gestionnaire de mots de passe hors ligne
