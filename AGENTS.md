# Instructions pour les agents

Plugin Obsidian **Pronote Dashboard** : tableau de bord (devoirs, cahier de texte, notes, compétences) et synchronisation des séances en notes Markdown. Il passe par Pawnote-LTS, une bibliothèque non officielle. Licence GPL-3.0-or-later.

Lire dans cet ordre, une seule fois, par extraits : ce fichier, `CONTEXT.md` (le sens des mots), `.agents/project-context.md`, puis l'ADR concerné dans `docs/adr/`. Pour une modification, suivre `.agents/skills/changement-pronote-dashboard/SKILL.md`.

## Branche de base

`main` correspond à ce qui est publié. Créer une branche depuis `origin/main`, jamais depuis une copie locale en avance. Nommage : `docs/agents/branch-naming.md`. Les commits directs sur `main` sont refusés par la protection de branche de GitHub, pas par un script local (PD-014).

Avant d'ouvrir une PR, vérifier que seuls tes commits y figurent : `git log --oneline origin/main..HEAD`.

## Contrôles

```bash
npm ci
npm run check   # typage, absence de any, linter Obsidian, tests, build : obligatoire avant PR
```

Une PR dont `npm run check` échoue ne s'ouvre pas. Un correctif de bug commence par un test qui reproduit le bug et échoue ; la ligne d'échec figure dans la PR.

## Couches

- **Modules purs, sans import d'`obsidian`, testés** : `src/types.ts`, `src/props.ts`, `src/util.ts`, `src/migrate.ts`, `src/keys.ts`, `src/blocks.ts`, `src/refresh.ts`, `src/cache-policy.ts`. Leurs imports relatifs portent l'extension `.ts` (Node exécute les tests).
- **Modules qui parlent à Obsidian** : `src/client.ts` (Pawnote-LTS), `src/sync.ts` (coffre), `src/screen.ts`, `src/ui/`, `src/data/`, `src/settings.ts`. Ils se vérifient dans Obsidian.
- `scripts/pawnote-patch.ts` : correctif de Pawnote-LTS appliqué au build (PD-007), à retirer quand l'amont le contient.
- Code exécuté sur mobile : aucune API Node dans `main.ts` ni dans `src/`. Le réseau passe par `requestUrl`.
- Styles : variables CSS d'Obsidian (`var(--…)`) dans `styles.css`, jamais de couleur en dur.

## Interdits

- `any`, y compris `as unknown as`, `eslint-disable`, `@ts-ignore` : `npm run check:any` les refuse. Aucune exclusion de lint ajoutée, aucun test sauté, aucune assertion affaiblie pour faire passer un contrôle : corriger la cause.
- `innerHTML`, `outerHTML`, `insertAdjacentHTML` avec du HTML venu de Pronote : passer par `htmlToMarkdown` ou `textContent`.
- Réécrire une note de séance existante du coffre de l'utilisateur.
- Ajouter une dépendance sans la justifier dans la PR par un risque précis qu'elle couvre (PD-001).
- Ajouter un hook Git versionné (PD-014).

## Données d'enfants mineurs

Le plugin lit des noms, notes et devoirs d'enfants. **Aucune donnée réelle ni aucun jeton ne figure dans le dépôt** : ni code, ni test, ni capture, ni issue, ni PR, ni message de commit. Les jeux d'essai et les captures sont fictifs (prénoms inventés, établissement absent). Un rapport donne des comptes (« 12 devoirs »), jamais du contenu. Ne jamais lire ni afficher le `data.json` d'un coffre : il contient les jetons Pronote. Aucune connexion Pronote avec un compte réel d'enfant ; le serveur de démonstration Pronote suffit pour les essais.

## Grille de relecture propre au projet

Une relecture indépendante (d'un agent ou d'une personne qui n'a pas écrit le code) vérifie, avec preuve et scénario de panne pour chaque constat :

1. aucune donnée réelle ni jeton dans le diff ;
2. aucune API Node dans le code du plugin ;
3. tout HTML venu de Pronote passe par `htmlToMarkdown` ou `textContent` ;
4. les écritures dans le coffre ne réécrivent jamais une note de séance existante ;
5. les règles Obsidian du skill (`.agents/skills/changement-pronote-dashboard/`) ;
6. aucune vérification affaiblie. Zéro constat est un résultat valide.

## Worktrees

Un agent qui travaille en parallèle utilise son propre worktree, dans un dossier exclu de git (`.git/info/exclude`), sur une branche coupée de `origin/main`. Deux tâches qui touchent le même fichier vont au même agent. Une fois la branche fusionnée : `git worktree remove` puis `git branch -d`, sans `--force` ; un refus de git signale du travail non fusionné.

## Publication d'une version

Voir « Publier une version » dans `CONTRIBUTING.md`. Le tag `X.Y.Z` (sans `v`) déclenche la Release ; il se pousse seulement sur demande explicite du mainteneur. `main.js` n'est jamais committé.
