# PD-016 · ESLint reste en 9 tant que le linter officiel Obsidian n'accepte pas la 10

**Contexte.** `eslint-plugin-obsidianmd` tire une dépendance qui déclare `eslint@^9` ; avec ESLint 10, `npm ci` signale un conflit de pair et `npm run lint` échoue (PD-008).

**Retenu.**
- Dependabot ignore les montées **majeures** d'`eslint` (`.github/dependabot.yml`) ; les montées mineures et correctives de la 9 continuent d'arriver.
- La règle se lève par un nouvel ADR, quand `eslint-plugin-obsidianmd` et ses dépendances déclarent ESLint 10 et que `npm run check` passe avec lui.

**Écarté.** Passer à ESLint 10 en corrigeant la règle signalée : sortir de la plage validée du linter officiel pourrait cacher un contrôle non validé.
