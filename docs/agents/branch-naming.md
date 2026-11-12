# Nommage des branches

Toute branche part de `origin/main` et revient par une PR vers `main`.

| Préfixe | Usage | Exemple |
|---|---|---|
| `lot/` | une fonctionnalité ou un ensemble cohérent de changements | `lot/competences-pastilles` |
| `fix/` | un correctif de bug (test qui échoue d'abord) | `fix/liens-texte` |
| `chore/` | outillage, dépendances, nettoyage | `chore/setup-node-7` |
| `docs/` | documentation seule | `docs/readme-communaute` |
| `release/` | préparation d'une version | `release/0.5.0` |

Règles : minuscules, mots séparés par des tirets, sans numéro de ticket obligatoire. Une branche = un sujet ; ne pas accumuler plusieurs tâches. Un worktree porte le nom de sa branche.

**Release.** Sur `release/X.Y.Z` : `npm version X.Y.Z --no-git-tag-version` met à jour `manifest.json` et `versions.json`, puis PR. Après fusion, le mainteneur pose le tag `X.Y.Z` (sans `v`) sur `main` : la CI publie la Release.

## Protection de `main` (PD-014)

Réglage côté GitHub (Settings → Branches ou Rules), puisqu'aucun hook versionné ne la porte :

- pull request obligatoire avant toute fusion dans `main` ;
- contrôles requis : « Quality checks » et « Contrôle des secrets » (noms des jobs de `.github/workflows/ci.yml`) ;
- pas de push direct ni de push forcé sur `main`, pas de suppression de la branche.

Les alertes Dependabot, la mise à jour automatique des dépendances (`.github/dependabot.yml`), l'analyse des secrets (secret scanning) et le signalement privé des failles sont activés dans Settings → Security.

