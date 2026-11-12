# PD-017 · `minimatch` 11 par `overrides` pour deux outils de développement

- **Statut** : Acceptée
- **Date** : 2026-11-12
- **Poids** : Mineur

**Contexte.** L'alerte GHSA-g3hv-75wg-m249 (déni de service par amplification de motifs, `minimatch` de 7.0.0 à 11.0.0, corrigée en 11.0.1) touchait deux outils de développement : `@typescript-eslint/typescript-estree` (avec `minimatch` 10.2.6) et `eslint-plugin-n` (avec `minimatch` 9.0.9), dont les parents n'acceptent pas la version 11. Dependabot ne pouvait donc pas la proposer. Le plugin n'était pas concerné : `npm audit --omit=dev` donnait 0 et `minimatch` n'est pas dans `main.js`.

**Retenu.**
- `overrides` dans `package.json`, limité à ces deux paquets : `minimatch` `^11.0.1` (résolu en 11.0.8).
- Mesuré avant fusion : `npm audit` donne 0 vulnérabilité ; `npm run check` est vert (150 tests, lint compris) avec cette résolution.
- Les autres usages de `minimatch` (3.1.5, hors plage vulnérable) ne changent pas.

**Écarté — attendre les parents.** L'alerte restait ouverte sans date de résolution.
**Écarté — ignorer l'alerte.** Une dette acceptée sans nécessité alors qu'un correctif vérifiable existait.

**Conséquence.** Retirer l'`overrides` quand `typescript-eslint` et `eslint-plugin-n` acceptent `minimatch` 11 par eux-mêmes. Le lien ne se vérifie qu'à travers le lint : si un parent casse avec `minimatch` 11, `npm run check` échoue.
