# PD-015 · TypeScript reste en 6 tant que typescript-eslint n'accepte pas la 7

**Contexte.** `typescript-eslint` refuse TypeScript 7 : `npm ci` échoue (`ERESOLVE`) sur la montée proposée par Dependabot (PD-008).

**Retenu.**
- Dependabot ignore les montées **majeures** de `typescript` (`.github/dependabot.yml`) ; les montées mineures et correctives de la 6 continuent d'arriver.
- La règle se lève par un nouvel ADR, quand la plage de `typescript-eslint` admet TypeScript 7 et que `npm run check` passe avec lui.

**Écarté.** Épingler la version exacte : les correctifs de la branche 6 ne seraient plus proposés.
