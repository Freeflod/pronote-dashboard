# PD-001 · Outillage limité à la norme des plugins Obsidian

- **Statut** : En partie remplacée par PD-008 (TypeScript 6 et linter officiel)
- **Date** : 2026-11-06
- **Poids** : Structurant

**Contexte.** Le plugin arrive en v0.3.0 avec TypeScript 7, esbuild, Pawnote et jsQR (69 paquets dans le lock), sans test ni linter. Un gabarit d'outillage complet (Vitest, happy-dom, ESLint, typescript-eslint, eslint-plugin-obsidianmd), portait le lock à 370 paquets. Or ce programme n'a ni serveur ni base : le risque réel est ce qui part dans `main.js` (accès au coffre et au réseau) et ce qui s'exécute sur le poste de développement.

**Retenu.**
- Rester sur la norme Obsidian, TypeScript 7 conservé, sans dépendance de développement ajoutée.
- Tests avec `node:test`, intégré à Node 22, sur les fonctions pures.
- Contrôle anti-`any` par `grep` (`npm run check:any`).
- Vérification en conditions réelles dans Obsidian (PD-005).

**Écarté — gabarit d'outillage complet.** Il multiplie le lock par cinq sans couvrir de risque propre à ce plugin.
**Écarté — ESLint.** typescript-eslint exige TypeScript < 6.1 (mesuré le 2026-11-06), car TS 7 n'expose plus l'API JavaScript. Il aurait donc fallu redescendre en TS 6.

**Conséquence.** `htmlToMarkdown` (DOMParser) et tout ce qui importe `obsidian` se vérifient dans le banc, pas par des tests unitaires. Les imports relatifs des modules purs portent l'extension `.ts` (`allowImportingTsExtensions`).
