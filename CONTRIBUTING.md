# Contribuer

Prérequis : Node.js 22.18 ou plus (exécution native du TypeScript, pour les tests et pour le build). Le plugin demande Obsidian 1.13.0 ou plus (PD-008).

```bash
npm ci
npm run check      # typage, absence de any, linter Obsidian, tests, build : obligatoire avant PR
npm run dev        # compilation sans minification, avec sourcemap
```

Pour tester dans un coffre, copier `main.js`, `manifest.json` et `styles.css` dans `<coffre>/.obsidian/plugins/pronote-dashboard/`.

### Structure

| Fichier | Rôle |
| --- | --- |
| `main.ts` | Point d'entrée : commandes, suivi des renommages |
| `src/migrate.ts` | Reprise des réglages des versions précédentes |
| `src/keys.ts` | Clés stables des séances et des devoirs, tirées du contenu : PRONOTE change les identifiants à chaque connexion |
| `src/client.ts` | Connexion Pawnote-LTS (QR code, jeton), récupération devoirs, cahier de texte, notes |
| `src/sync.ts` | Écriture des notes et pièces jointes, retrouvées par `pronote_id` et par index |
| `src/props.ts` | Frontmatter typé, variables, types de propriétés Obsidian |
| `src/settings.ts` | Page de réglages (mode Enfant ou Parent, import du QR code) |
| `src/screen.ts`, `src/ui/` | Écran (blocs, onglets par enfant), composants communs |
| `src/blocks.ts`, `src/refresh.ts`, `src/cache-policy.ts` | Logique pure : regroupements, niveau estimé, actualisation, cache |
| `src/data/` | Cache IndexedDB et lecture par bloc |
| `src/types.ts` | Modèle de données et valeurs par défaut |
| `scripts/pawnote-patch.ts` | Correctif de Pawnote-LTS appliqué au build (compte parent : élève désigné), à retirer quand l'amont le contient |

Les modules `types`, `props`, `util` et `migrate` sont purs et testés (`test/`, `node:test`). Le reste se vérifie dans Obsidian.

### Publier une version

1. Sur une branche `release/X.Y.Z` : `npm version X.Y.Z --no-git-tag-version` (met à jour `manifest.json` et `versions.json`), puis PR.
2. Après fusion : `git tag X.Y.Z` sur `main`, puis `git push origin X.Y.Z` (sans « v »).
3. La CI construit et publie la Release avec `main.js`, `manifest.json` et `styles.css`. `main.js` n'est jamais committé.
