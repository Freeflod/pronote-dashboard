# PD-004 · Chaque version publiée en GitHub Release, construite par la CI

**Contexte.** Un build fait sur un poste local ne serait pas reproductible à partir du tag.

**Retenu.**
- Tag `X.Y.Z` sans `v` (convention Obsidian), poussé sur `main` avec l'accord du mainteneur.
- `release.yml` vérifie que le tag correspond à `manifest.json`, `package.json` et `versions.json`, lance `npm run check`, puis publie `main.js`, `manifest.json` et `styles.css`.
- `main.js` n'est jamais committé.

**Conséquence.** Pas de Release téléversée à la main.
