## Changement

<!-- Quoi et pourquoi, en quelques lignes. `Closes #N` si une issue est corrigée. -->

## Vérifications

- [ ] `npm run check` est vert
- [ ] Bug corrigé : un test qui échoue d'abord (ligne d'échec ci-dessous)
- [ ] Vérifié dans Obsidian sur un coffre de test fictif (si l'interface ou la lecture Pronote change)
- [ ] Décision de conception : ADR ajouté ou renvoi vers l'ADR existant

## Données

- [ ] **Aucune donnée réelle** dans le diff, les tests, les captures et cette description : ni nom d'élève, de parent ou d'établissement, ni note, ni devoir, ni jeton, ni adresse de serveur Pronote
- [ ] Aucun `any`, `eslint-disable` ni `@ts-ignore` ajouté ; aucune API Node dans le plugin ; aucun `innerHTML` avec du HTML venu de Pronote
- [ ] Aucune nouvelle dépendance, ou elle est justifiée ici par un risque précis

## Test qui échoue d'abord

<!-- Colle la ligne d'échec avant le correctif (bug seulement). -->
