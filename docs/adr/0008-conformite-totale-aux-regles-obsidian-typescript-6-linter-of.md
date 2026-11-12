# PD-008 · Conformité aux règles Obsidian : TypeScript 6, linter officiel, Obsidian 1.13 minimum

**Contexte.** Le linter officiel des plugins, `eslint-plugin-obsidianmd`, exige `typescript-eslint`, qui n'accepte pas encore TypeScript 7. Sur ce code, il a relevé deux avertissements qui demandent Obsidian 1.13.0 (`setDestructive`, réglages déclaratifs).

**Retenu.**
- TypeScript 6, ESLint 9, typescript-eslint et `eslint-plugin-obsidianmd` ; `npm run lint` fait partie de `npm run check`.
- Aucune directive d'exclusion : les constats se corrigent à la cause.
- `minAppVersion` 1.13.0.
- Tests avec `node:test`, sur les fonctions pures, écrits `void test(…)` (règle `no-floating-promises`).

**Conséquence.** Le plugin ne se charge pas sous Obsidian < 1.13.0. Ce qui importe `obsidian` se vérifie dans Obsidian, pas par des tests unitaires. Les imports relatifs des modules purs portent l'extension `.ts`.
