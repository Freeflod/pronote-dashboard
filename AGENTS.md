# Instructions pour les agents

**OBLIGATOIRE, dans cet ordre, pour toute tâche même minime : (1) ta toute première action est de lire `~/Brain/PERSO/wiki/projets/pronote-dashboard/etat.md` (dans la boîte : `/brain/perso/wiki/projets/pronote-dashboard/etat.md`) ; (2) ta toute dernière action avant de répondre est d'y consigner ce qui vient d'être fait ou décidé (30 lignes au plus : où on en est, ce qui bloque, la suite, décisions en attente ; sans secret). 30 lignes au plus. Réécris le fichier, n'ajoute pas à la suite : supprime ce qui est terminé, ne garde ni historique de session ni détail de commande ; (3) si le superviseur donne une consigne valable pour tous les projets, ajoute-la à `~/Brain/PERSO/wiki/a-valider.md` (à monter au SOCLE) au lieu de seulement l'appliquer, et ne modifie pas le SOCLE depuis ce projet.**

Règles communes : dossier `~/Brain/SOCLE` (dans la boîte : `/brain/socle`). **Avant de répondre à une question de méthode (choix de modèle, agents, git, tests, sécurité, dépendances), lire `index.md` du SOCLE puis le fichier de `regles/` du thème : ces règles priment sur ta connaissance générale.** Celui-ci ne garde que ce qui est propre au projet ; en cas de conflit, la règle la plus prudente l'emporte.

Plugin Obsidian **Pronote Dashboard**, pour un usage familial : il lit Pronote (compte élève ou parent, connexion par QR code) et affiche devoirs, emploi du temps, cahier de texte, ressources, messages, notes et compétences ; il peut écrire les séances en notes Markdown. TypeScript 6 compilé par esbuild en un seul `main.js`. Embarqués : `@blockshub/pawnote-lts` (GPL-3.0, bibliothèque non officielle) et `jsqr` (Apache-2.0). Aucun serveur, aucune télémétrie. Mobile compris, Obsidian 1.13.0 minimum. Licence GPL-3.0-or-later.

Lire, par extraits : [`CONTRIBUTING.md`](CONTRIBUTING.md) (commandes, workflow, interdits, structure du code), [`CONTEXT.md`](CONTEXT.md) (le sens des mots), [`docs/OBSIDIAN.md`](docs/OBSIDIAN.md) (règles des plugins Obsidian), puis l'ADR concerné dans [`docs/adr/`](docs/adr/README.md).

Avant toute PR : `npm run check` vert. Aucune donnée réelle d'enfant ni jeton nulle part (un rapport donne des comptes, jamais du contenu).

## Branches et portes dures

- **Niveau** : ordinaire. `main` est protégée côté GitHub (PR et contrôles requis) ; travail par branches `lot/…`, `fix/…`, `chore/…`, `docs/…`, `release/…`, puis PR. Fusion de PR autonome (PR toujours obligatoire, contrôles verts).
- **Portes dures propres au projet** : pousser un tag de version (publie une Release) ; lire les fichiers de test locaux exclus de git (jetons réels) ; toute connexion Pronote avec un compte réel d'enfant ; supprimer une branche distante ou le dépôt.
- **Versions** : à chaque nouvelle version compilée, proposer la publication (`release/X.Y.Z`, PR, puis tag avec l'accord du superviseur).

## Relecture

Une relecture indépendante (agent neuf ou personne qui n'a pas écrit le code) donne, pour chaque constat, une preuve et un scénario de panne ; zéro constat est valide. Elle vérifie : aucune donnée réelle ni jeton dans le diff ; aucune API Node dans le plugin ; tout HTML de Pronote passe par `htmlToMarkdown`, `textContent` ou `renderRichHtml` (liste blanche, DOM reconstruit par `createEl`) ; aucune réécriture d'une note de séance existante ; les règles de `docs/OBSIDIAN.md` ; aucune vérification affaiblie.

## Agents en parallèle

Un agent par groupe de fichiers disjoint (deux tâches sur le même fichier vont au même agent), chacun dans son worktree, dans un dossier exclu de git (`.git/info/exclude`), sur une branche coupée de `origin/main`. Une fois la branche fusionnée : `git worktree remove` puis `git branch -d`, sans `--force` ; un refus de git signale du travail non fusionné.
