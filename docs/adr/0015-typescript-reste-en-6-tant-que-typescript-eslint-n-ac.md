# PD-015 · TypeScript reste en 6 tant que typescript-eslint n'accepte pas la 7

- **Statut** : Acceptée
- **Date** : 2026-11-12
- **Poids** : Moyen

**Contexte.** PD-008 fixe TypeScript 6 parce que le linter officiel des plugins Obsidian (`eslint-plugin-obsidianmd`) dépend de `typescript-eslint`, qui ne déclare pas encore TypeScript 7. Dependabot a proposé la montée vers TypeScript 7.0.2 dès la création du dépôt public. Mesuré le 2026-11-12 : sa CI échoue à `npm ci` (`ERESOLVE`, `typescript-eslint@8.72.2` refuse `typescript@7.0.2`). Rien n'empêchait une fusion par erreur si la CI avait été verte.

**Retenu.**
- Dependabot ignore les montées **majeures** de `typescript` (`.github/dependabot.yml`). Les montées mineures et correctives de TypeScript 6 continuent d'arriver.
- La règle se lève par un nouvel ADR, quand la plage de pairs de `typescript-eslint` admet TypeScript 7 et que `npm run check` passe avec lui.

**Écarté — laisser Dependabot proposer la version 7.** Une PR rouge de plus à fermer à chaque cycle, et un risque de fusion lorsque la CI deviendra verte sans que le linter officiel ait été confronté.
**Écarté — épingler la version exacte de TypeScript.** Les correctifs de la branche 6 ne seraient plus proposés.

**Conséquence.** Le dépôt reste compatible avec le linter officiel Obsidian. À réexaminer quand `typescript-eslint` publie le support de TypeScript 7 (non vérifié : date).
