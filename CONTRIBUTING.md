# Contribuer

Prérequis : Node.js 22.18 ou plus (TypeScript exécuté nativement, pour les tests et le build). Le plugin demande Obsidian 1.13.0 ou plus.

```bash
npm ci
npm run check      # typage, absence de any, linter Obsidian, tests, build : obligatoire avant PR
npm run dev        # compilation sans minification, avec sourcemap
```

Pour tester dans un coffre de test fictif, copier `main.js`, `manifest.json` et `styles.css` dans `<coffre>/.obsidian/plugins/pronote-dashboard/`.

## Règles

- Branche depuis `origin/main` (`lot/`, `fix/`, `chore/`, `docs/`, `release/`), puis PR vers `main`. `main` est protégée côté GitHub : PR obligatoire, contrôles « Quality checks » et « Contrôle des secrets » requis.
- Un correctif de bug commence par un test qui échoue ; la ligne d'échec va dans la PR.
- **Aucune donnée réelle** dans le dépôt, une issue ou une PR : ni nom d'élève, de parent ou d'établissement, ni note, ni devoir, ni jeton, ni adresse de serveur Pronote. Décrire avec des comptes (« 3 évaluations ») ou des données inventées.
- Pas de `any`, d'`eslint-disable` ni de `@ts-ignore` ; pas d'API Node dans le plugin ; pas d'`innerHTML` avec du HTML venu de Pronote ; pas de nouvelle dépendance sans risque précis nommé dans la PR.
- Les failles de sécurité se signalent en privé (`docs/SECURITY.md`), jamais en issue publique.

## Structure

| Fichier | Rôle |
| --- | --- |
| `main.ts` | Point d'entrée : commandes, minuteur d'actualisation, suivi des renommages |
| `src/migrate.ts` | Reprise des réglages des versions précédentes |
| `src/keys.ts` | Clés stables des séances et des devoirs, tirées du contenu : Pronote change les identifiants à chaque connexion |
| `src/client.ts` | Connexion Pawnote-LTS (QR code, jeton), lecture devoirs, cahier de texte, notes |
| `src/sync.ts` | Écriture des notes et pièces jointes, retrouvées par `pronote_id` et par index |
| `src/props.ts` | Frontmatter typé, variables, types de propriétés Obsidian |
| `src/settings.ts` | Page de réglages (mode Enfant ou Parent, import du QR code) |
| `src/screen.ts`, `src/ui/` | Écran (blocs, onglets par enfant), composants communs |
| `src/blocks.ts`, `src/refresh.ts`, `src/cache-policy.ts` | Logique pure : regroupements, niveau estimé, actualisation, cache |
| `src/data/` | Cache IndexedDB et lecture par bloc |
| `src/types.ts` | Modèle de données et valeurs par défaut |
| `scripts/pawnote-patch.ts` | Correctif de Pawnote-LTS appliqué au build (compte parent : élève désigné) |

Les modules sans import d'`obsidian` sont testés (`test/`, `node:test`) ; le reste se vérifie dans Obsidian.

## Publier une version

1. Branche `release/X.Y.Z` : `npm version X.Y.Z --no-git-tag-version` (met à jour `manifest.json` et `versions.json`), puis PR.
2. Après fusion, le mainteneur pose le tag `X.Y.Z` (sans « v ») sur `main` : `git tag X.Y.Z`, puis `git push origin X.Y.Z`.
3. La CI construit et publie la Release : `main.js`, `manifest.json`, `styles.css` et l'archive `pronote-dashboard-X.Y.Z.zip`. `main.js` n'est jamais committé.
