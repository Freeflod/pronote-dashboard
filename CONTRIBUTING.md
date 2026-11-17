# Contribuer

Guide unique pour les contributeurs et leurs agents. Le sens des mots est dans [`CONTEXT.md`](CONTEXT.md), les raisons des choix dans [`docs/adr/`](docs/adr/README.md), les règles propres aux plugins Obsidian dans [`docs/OBSIDIAN.md`](docs/OBSIDIAN.md).

## Démarrer

Prérequis : Node.js 22.18 ou plus (TypeScript exécuté nativement, pour les tests et le build). Le plugin demande Obsidian 1.13.0 ou plus.

```bash
npm ci
npm run check      # typage, absence de any, linter Obsidian, tests, build : obligatoire avant PR
npm run dev        # compilation sans minification, avec sourcemap
```

Pour essayer le plugin : copier `main.js`, `manifest.json` et `styles.css` dans `<coffre de test>/.obsidian/plugins/pronote-dashboard/`, avec un coffre fictif et le serveur de démonstration Pronote. Une fonctionnalité est terminée quand elle a tourné ainsi : clavier seul, thème clair et sombre, panneau étroit, mobile en émulation.

## Travailler

1. Une décision nouvelle, ou qui en change une, s'écrit en ADR avant le code.
2. Branche depuis `origin/main`, jamais depuis une copie locale en avance : `lot/` (fonctionnalité), `fix/` (bug), `chore/` (outillage), `docs/`, `release/X.Y.Z`. Minuscules, tirets, un sujet par branche.
3. Un correctif de bug commence par un test qui reproduit le bug et échoue ; la ligne d'échec va dans la PR. Un bug non testable unitairement reçoit un scénario vérifié dans Obsidian, en échec avant et réussi après.
4. Logique pure dans un module pur testé ; accès à Obsidian dans les autres modules.
5. `npm run check` vert, sans affaiblir aucun contrôle.
6. Commits conventionnels (`feat:`, `fix:`, `refactor:`, `chore:`, `test:`, `docs:`), PR ouverte dès que le travail est committé. `git log --oneline origin/main..HEAD` ne montre que tes commits. `Closes #N` dans la description si une issue est corrigée.

`main` est protégée côté GitHub : PR obligatoire, contrôles « Quality checks » et « Contrôle des secrets » requis. Aucun hook Git versionné.

## Interdits

- `any`, `as unknown as`, `eslint-disable`, `@ts-ignore` (`npm run check:any` les refuse). Aucun test sauté, aucune assertion affaiblie, aucune exclusion de lint ajoutée : corriger la cause.
- API Node dans `main.ts` ou `src/` (mobile compris) : le réseau passe par `requestUrl`.
- `innerHTML`, `outerHTML`, `insertAdjacentHTML` avec du HTML venu de Pronote : passer par `htmlToMarkdown`, `textContent` ou `renderRichHtml` (`src/ui/rich-html.ts` : liste blanche, DOM reconstruit par `createEl`).
- Réécrire une note de séance existante du coffre de l'utilisateur.
- Couleur en dur dans `styles.css` : variables CSS d'Obsidian.
- Nouvelle dépendance sans risque précis nommé dans la PR.
- **Donnée réelle ou jeton** dans le dépôt, une issue, une PR, une capture ou un message de commit : ni nom d'élève, de parent ou d'établissement, ni note, ni devoir, ni adresse de serveur Pronote. Décrire avec des comptes (« 3 évaluations ») ou des données inventées. Ne jamais lire ni afficher le `data.json` d'un coffre. Aucune connexion avec un compte réel d'enfant.

## Structure

| Fichier | Rôle | Pur et testé |
| --- | --- | --- |
| `main.ts` | Point d'entrée : commandes, minuteur d'actualisation, suivi des renommages | |
| `src/types.ts` | Modèle de données et valeurs par défaut | oui |
| `src/migrate.ts` | Reprise des réglages des versions précédentes | oui |
| `src/keys.ts` | Clés stables des séances et des devoirs, tirées du contenu : Pronote change les identifiants à chaque connexion | oui |
| `src/props.ts`, `src/util.ts` | Frontmatter typé, variables ; utilitaires | oui |
| `src/blocks.ts`, `src/refresh.ts`, `src/cache-policy.ts` | Regroupements, niveau estimé, actualisation, cache | oui |
| `src/client.ts` | Connexion Pawnote-LTS (QR code, jeton), lecture devoirs, cahier de texte, notes | |
| `src/sync.ts` | Écriture des notes et pièces jointes, retrouvées par `pronote_id` et par index | |
| `src/settings.ts` | Page de réglages (mode Enfant ou Parent, import du QR code) | |
| `src/screen.ts`, `src/ui/` | Écran (blocs, onglets par enfant), composants communs | |
| `src/data/` | Cache IndexedDB et lecture par bloc | |
| `scripts/pawnote-patch.ts` | Correctif de Pawnote-LTS appliqué au build (compte parent : élève désigné) | |
| `scripts/version-bump.mjs` | Reporte la version de `package.json` dans `manifest.json` et `versions.json` | |

Les imports relatifs des modules purs portent l'extension `.ts` (Node exécute les tests dans `test/`, `node:test`). Les modules sans « oui » se vérifient dans Obsidian.

## Issues

Un bug ou une idée hors du périmètre d'une PR devient une issue, pas seulement un commentaire dans le code. Étiquettes : `bug`, `enhancement`, `documentation`, `question`, `good first issue`. Un bug décrit : version du plugin et d'Obsidian, mobile ou ordinateur, mode (Enfant ou Parent), étapes, résultat attendu et obtenu. Une faille de sécurité ne s'ouvre jamais en issue publique : [`docs/SECURITY.md`](docs/SECURITY.md).

## Publier une version

1. Branche `release/X.Y.Z` : ajouter l'entrée `WHATS_NEW` de la version (`src/whats-new.ts`) ; un test l'exige. Le texte est écrit pour un enfant ou un adulte néophyte (phrases courtes, aucun terme technique), relu par des lecteurs neufs, puis validé par le mainteneur avant la fusion ; la fenêtre porte le lien Ko-fi. Puis `npm version X.Y.Z --no-git-tag-version` (met à jour `manifest.json` et `versions.json`), puis PR.
2. Après fusion, un mainteneur pose le tag `X.Y.Z` (sans « v ») sur `main` : `git tag X.Y.Z`, puis `git push origin X.Y.Z`.
3. La CI construit et publie la Release : `main.js`, `manifest.json`, `styles.css` et l'archive `pronote-dashboard-X.Y.Z.zip`. `main.js` n'est jamais committé.
