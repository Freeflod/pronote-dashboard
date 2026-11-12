# PD-014 · Pas de hooks versionnés, protection de `main` côté serveur

- **Statut** : Acceptée
- **Date** : 2026-11-12
- **Poids** : Moyen

**Contexte.** Le dépôt devient public et partagé. Les hooks Git (`.githooks/`) ne s'appliquent qu'à celui qui les active (`core.hooksPath`) : un fork ou un contributeur occasionnel les ignore, ils ne protègent donc pas `main`. Sur un dépôt public, la protection de branche côté GitHub est la vraie barrière.

**Retenu.**
- Aucun hook versionné dans le dépôt.
- La CI est la barrière commune : « Quality checks » (`npm run check`) et « Contrôle des secrets » (gitleaks) doivent réussir.
- `main` est protégée côté serveur : PR obligatoire, contrôles requis. Détails des réglages dans `docs/agents/`.
- Le mainteneur peut garder un hook local non versionné (dans `.git/hooks/`) pour se protéger d'une fuite accidentelle ; il ne fait pas partie du projet.

**Écarté — hooks versionnés activés par `git config core.hooksPath .githooks`.** Facultatifs, donc non contraignants pour qui ne les active pas.
**Écarté — husky.** Une dépendance de plus pour le même résultat, avec la même limite.

**Conséquence.** Un commit direct sur `main` est refusé par GitHub, pas par un script local. Les contrôles lourds tournent en CI ; chaque contributeur lance `npm run check` avant sa PR.
