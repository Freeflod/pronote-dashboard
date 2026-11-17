# Instructions pour les agents

Plugin Obsidian **Pronote Dashboard**, pour un usage familial : il lit Pronote (compte élève ou parent, connexion par QR code) et affiche devoirs, emploi du temps, cahier de texte, ressources, messages, notes et compétences ; il peut écrire les séances en notes Markdown. TypeScript 6 compilé par esbuild en un seul `main.js`. Embarqués : `@blockshub/pawnote-lts` (GPL-3.0, bibliothèque non officielle) et `jsqr` (Apache-2.0). Aucun serveur, aucune télémétrie. Mobile compris, Obsidian 1.13.0 minimum. Licence GPL-3.0-or-later.

Lire, par extraits : [`CONTRIBUTING.md`](CONTRIBUTING.md) (commandes, workflow, interdits, structure du code), [`CONTEXT.md`](CONTEXT.md) (le sens des mots), [`docs/OBSIDIAN.md`](docs/OBSIDIAN.md) (règles des plugins Obsidian), puis l'ADR concerné dans [`docs/adr/`](docs/adr/README.md).

Avant toute PR : `npm run check` vert. Aucune donnée réelle d'enfant ni jeton nulle part (un rapport donne des comptes, jamais du contenu).

## Relecture

Une relecture indépendante (agent neuf ou personne qui n'a pas écrit le code) donne, pour chaque constat, une preuve et un scénario de panne ; zéro constat est valide. Elle vérifie : aucune donnée réelle ni jeton dans le diff ; aucune API Node dans le plugin ; tout HTML de Pronote passe par `htmlToMarkdown`, `textContent` ou `renderRichHtml` (liste blanche, DOM reconstruit par `createEl`) ; aucune réécriture d'une note de séance existante ; les règles de `docs/OBSIDIAN.md` ; aucune vérification affaiblie.

## Agents en parallèle

Un agent par groupe de fichiers disjoint (deux tâches sur le même fichier vont au même agent), chacun dans son worktree, dans un dossier exclu de git (`.git/info/exclude`), sur une branche coupée de `origin/main`. Une fois la branche fusionnée : `git worktree remove` puis `git branch -d`, sans `--force` ; un refus de git signale du travail non fusionné.
