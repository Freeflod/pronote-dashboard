# PD-004 · Chaque version publiée en GitHub Release, construite par la CI

- **Statut** : Acceptée
- **Date** : 2026-11-06
- **Poids** : Moyen

**Retenu.**
- Tag `X.Y.Z` sans `v` (convention Obsidian), poussé sur `main` avec l'accord du mainteneur.
- Le workflow `release.yml` vérifie que le tag correspond à `manifest.json`, `package.json` et `versions.json`, lance `npm run check`, puis publie `main.js`, `manifest.json` et `styles.css`.
- `main.js` n'est jamais committé.
- À chaque nouvelle version compilée, la publication est proposée au mainteneur.

**Écarté — Release construite et téléversée depuis un poste local.** Le build ne serait pas reproductible à partir du tag.
