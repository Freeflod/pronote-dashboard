# PD-003 · Pawnote et jsQR en `dependencies`

- **Statut** : Acceptée
- **Date** : 2026-11-06
- **Poids** : Mineur

**Retenu.** Ils sont embarqués dans `main.js` : ce sont les seules dépendances qui s'exécutent dans Obsidian. Les placer en `dependencies` permet à `npm audit --omit=dev` (CI) de les couvrir. Dependabot est actif (npm et actions GitHub), avec `main` comme cible.
