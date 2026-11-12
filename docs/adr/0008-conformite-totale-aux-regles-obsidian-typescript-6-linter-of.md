# PD-008 · Conformité totale aux règles Obsidian : TypeScript 6, linter officiel, Obsidian 1.13 minimum

- **Statut** : Acceptée
- **Date** : 2026-11-08
- **Poids** : Structurant

**Contexte.** Le mainteneur veut un plugin conforme à 100 % aux règles des plugins Obsidian. Le contrôle officiel est `eslint-plugin-obsidianmd` (0.5.1), qui exige `typescript-eslint` 8.x. Or typescript-eslint plafonne à TypeScript < 6.1 (mesuré le 2026-11-08, sur npm ; README du plugin : « Keep TypeScript 5 or 6 »). Le support de TypeScript 7.1 est en cours (typescript-eslint #10940, PR brouillon #12803). Mesuré sur le code existant en TS 6 : 54 constats, dont 2 avertissements qui exigent Obsidian 1.13.0 (`setDestructive`, `getSettingDefinitions()`).

**Retenu.**
- TypeScript 6.0, ESLint 9, typescript-eslint 8.72, eslint-plugin-obsidianmd 0.5.1 (quatre dépendances de développement). `npm run lint` entre dans `npm run check`.
- Aucune directive d'exclusion : les constats sont corrigés à la cause (0 erreur, 0 avertissement).
- `minAppVersion` passe de 1.4.0 à 1.13.0 : boutons `setDestructive` et réglages déclaratifs (`getSettingDefinitions()`, `getControlValue`/`setControlValue`). Obsidian 1.15.0 est celui du banc (version de l'application, pas celle du paquet dpkg).
- Retour à TypeScript 7 quand typescript-eslint le supporte : une veille hebdomadaire du cabinet le signale (sonde sur la plage de `typescript` de typescript-eslint et du plugin).

**Écarté — rester en TypeScript 7 sans linter.** Les règles Obsidian ne seraient plus contrôlées que par `check:any` et la relecture.
**Écarté — alias `@typescript/typescript6` à côté de TS 7.** Non testé, et deux compilateurs à maintenir.
**Écarté — garder `minAppVersion` 1.4.0 avec deux avertissements en dette.** Contraire à la conformité demandée.

**Conséquence.** Le plugin ne se charge plus sous Obsidian < 1.13.0. Le champ « Actualisation automatique » s'enregistre à la perte du focus (comportement du contrôle numérique d'Obsidian), et un YAML invalide dans les propriétés de note n'est plus enregistré (le contrôle refuse la valeur). Les tests de `node:test` s'écrivent `void test(…)` (la règle `no-floating-promises` s'applique aussi aux tests).
