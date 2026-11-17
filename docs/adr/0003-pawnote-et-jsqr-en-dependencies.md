# PD-003 · Pawnote et jsQR en `dependencies`

**Contexte.** Ce sont les seules bibliothèques embarquées dans `main.js`, donc les seules qui s'exécutent dans Obsidian.

**Retenu.** Les placer en `dependencies`, pour que `npm audit --omit=dev` (CI) les couvre. Tout le reste va en `devDependencies`.
