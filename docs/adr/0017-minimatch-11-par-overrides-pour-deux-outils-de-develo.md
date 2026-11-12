# PD-017 · `minimatch` 11 par `overrides` pour deux outils de développement

**Contexte.** L'alerte GHSA-g3hv-75wg-m249 (déni de service, `minimatch` jusqu'à 11.0.0, corrigée en 11.0.1) touche `@typescript-eslint/typescript-estree` et `eslint-plugin-n`, dont les parents n'acceptent pas la version 11 : Dependabot ne peut pas la proposer. Le plugin n'est pas concerné : `minimatch` n'est pas dans `main.js`.

**Retenu.** `overrides` dans `package.json`, limité à ces deux paquets : `minimatch` `^11.0.1`.

**Conséquence.** Retirer l'`overrides` quand ces deux outils acceptent `minimatch` 11 d'eux-mêmes. Si un parent casse avec la 11, `npm run check` échoue.
