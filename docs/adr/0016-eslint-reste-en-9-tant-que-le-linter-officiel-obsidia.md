# PD-016 · ESLint reste en 9 tant que le linter officiel Obsidian n'accepte pas la 10

- **Statut** : Acceptée
- **Date** : 2026-11-12
- **Poids** : Moyen

**Contexte.** Dependabot a proposé ESLint 10.14.0. Mesuré le 2026-11-12 : `npm ci` signale un conflit de pair (`eslint-plugin-obsidianmd` tire `@microsoft/eslint-plugin-sdl`, qui déclare `eslint@^9`), et `npm run lint` échoue avec ESLint 10 sur `src/screen.ts` (règle `no-useless-assignment`). Le linter officiel des plugins Obsidian (PD-008) n'est pas validé avec ESLint 10.

**Retenu.**
- Dependabot ignore les montées **majeures** d'`eslint` (`.github/dependabot.yml`). Les montées mineures et correctives d'ESLint 9 continuent d'arriver.
- La règle se lève par un nouvel ADR, quand `eslint-plugin-obsidianmd` et ses dépendances déclarent ESLint 10 et que `npm run check` passe avec lui.

**Écarté — passer à ESLint 10 en corrigeant la règle signalée.** Sortir de la plage de pairs du linter officiel : un résultat vert pourrait cacher un contrôle non validé.
**Écarté — laisser Dependabot reproposer.** Une PR rouge de plus à fermer à chaque cycle.

**Conséquence.** Le linter reste celui que valide Obsidian. À réexaminer à chaque publication d'`eslint-plugin-obsidianmd` (non vérifié : date du support d'ESLint 10).
