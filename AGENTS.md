# Instructions pour les agents

Plugin Obsidian **Pronote Dashboard**, pour un usage familial : il lit Pronote (compte élève ou parent, connexion par QR code) et affiche devoirs, emploi du temps, cahier de texte, ressources, messages, notes et compétences ; il peut écrire les séances en notes Markdown. TypeScript 6 compilé par esbuild en un seul `main.js`. Embarqués : `@blockshub/pawnote-lts` (GPL-3.0, bibliothèque non officielle, fork maintenu de Pawnote) et `jsqr` (Apache-2.0). Aucun serveur, aucune télémétrie. Mobile compris (`isDesktopOnly: false`), Obsidian 1.13.0 minimum. Licence GPL-3.0-or-later.

Lire par extraits : `CONTEXT.md` (le sens des mots) et, pour une décision, l'ADR concerné dans `docs/adr/` (décisions en vigueur, identifiants `PD-NNN`). Une décision nouvelle, ou qui en change une, s'écrit en ADR avant le code.

## Branches et contrôles

- `main` correspond à ce qui est publié, protégée côté GitHub (PR obligatoire, contrôles « Quality checks » et « Contrôle des secrets » requis). Pas de hook Git versionné. Créer la branche depuis `origin/main`, jamais depuis une copie locale en avance : `lot/` (fonctionnalité), `fix/` (bug), `chore/` (outillage), `docs/`, `release/X.Y.Z`. Minuscules, tirets, un sujet par branche.
- Avant d'ouvrir une PR, vérifier que seuls tes commits y figurent : `git log --oneline origin/main..HEAD`.

```bash
npm ci
npm run check   # typage, absence de any, linter Obsidian, tests, build : obligatoire avant PR
```

- Une PR dont `npm run check` échoue ne s'ouvre pas. Un correctif de bug commence par un test qui reproduit le bug et échoue ; la ligne d'échec figure dans la PR.
- Une fonctionnalité est terminée quand elle a tourné dans Obsidian sur un coffre de test fictif (copier `main.js`, `manifest.json`, `styles.css` dans `<coffre>/.obsidian/plugins/pronote-dashboard/`) : clavier seul, thème clair et sombre, panneau étroit, mobile en émulation. Connexion au serveur de démonstration Pronote seulement.
- Commits conventionnels (`feat:`, `fix:`, `refactor:`, `chore:`, `test:`, `docs:`), PR ouverte dès que le travail est committé. Une PR qui corrige une issue écrit `Closes #N`.
- Release : branche `release/X.Y.Z`, `npm version X.Y.Z --no-git-tag-version`, PR. Le tag `X.Y.Z` (sans `v`) déclenche la Release ; il se pousse seulement sur demande explicite du mainteneur. `main.js` n'est jamais committé.

## Couches

- **Modules purs, sans import d'`obsidian`, testés** : `src/types.ts`, `props.ts`, `util.ts`, `migrate.ts`, `keys.ts`, `blocks.ts`, `refresh.ts`, `cache-policy.ts`. Leurs imports relatifs portent l'extension `.ts` (Node exécute les tests).
- **Modules qui parlent à Obsidian**, vérifiés dans Obsidian : `src/client.ts` (Pawnote-LTS), `sync.ts` (coffre), `screen.ts`, `ui/`, `data/`, `settings.ts`.
- `scripts/pawnote-patch.ts` : correctif de Pawnote-LTS appliqué au build (PD-007).
- Mobile : aucune API Node dans `main.ts` ni dans `src/` ; le réseau passe par `requestUrl`.
- Styles : variables CSS d'Obsidian (`var(--…)`) dans `styles.css`, jamais de couleur en dur.

## Interdits

- `any`, y compris `as unknown as`, `eslint-disable`, `@ts-ignore` : `npm run check:any` les refuse. Aucune exclusion de lint ajoutée, aucun test sauté, aucune assertion affaiblie pour faire passer un contrôle : corriger la cause.
- `innerHTML`, `outerHTML`, `insertAdjacentHTML` avec du HTML venu de Pronote : passer par `htmlToMarkdown` ou `textContent`.
- Réécrire une note de séance existante du coffre de l'utilisateur.
- Ajouter une dépendance sans la justifier dans la PR par un risque précis qu'elle couvre.
- Ajouter un hook Git versionné (PD-014).

## Données d'enfants mineurs

Le plugin lit des noms, notes et devoirs d'enfants. **Aucune donnée réelle ni aucun jeton ne figure dans le dépôt** : ni code, ni test, ni capture, ni issue, ni PR, ni message de commit. Les jeux d'essai et les captures sont fictifs (prénoms inventés, établissement absent). Un rapport donne des comptes (« 12 devoirs »), jamais du contenu. Ne jamais lire ni afficher le `data.json` d'un coffre : il contient les jetons Pronote. Aucune connexion Pronote avec un compte réel d'enfant.

## Issues

Un bug ou une idée hors du périmètre d'une PR devient une issue, pas seulement un commentaire dans le code ; une dette acceptée aussi (étiquette `dette`). Étiquettes : `bug`, `enhancement`, `dette`, `documentation`, `question`, `good first issue`. Un bug décrit : version du plugin et d'Obsidian, mobile ou ordinateur, mode (Enfant ou Parent), étapes, résultat attendu et obtenu. Une faille de sécurité ne s'ouvre jamais en issue publique.

## Relecture

Une relecture indépendante (d'un agent ou d'une personne qui n'a pas écrit le code) donne, pour chaque constat, une preuve et un scénario de panne ; zéro constat est valide. Elle vérifie : aucune donnée réelle ni jeton dans le diff ; aucune API Node dans le plugin ; tout HTML de Pronote passe par `htmlToMarkdown` ou `textContent` ; aucune réécriture d'une note de séance existante ; les règles Obsidian du skill `.agents/skills/changement-pronote-dashboard/SKILL.md` ; aucune vérification affaiblie.

## Agents en parallèle

Un agent par groupe de fichiers disjoint (deux tâches sur le même fichier vont au même agent), chacun dans son worktree, dans un dossier exclu de git (`.git/info/exclude`), sur une branche coupée de `origin/main`. Une fois la branche fusionnée : `git worktree remove` puis `git branch -d`, sans `--force` ; un refus de git signale du travail non fusionné.
