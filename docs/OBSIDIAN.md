# Règles propres aux plugins Obsidian

À suivre pour tout code du plugin. Le linter officiel (`npm run lint`) en contrôle une partie ; le reste se relit.

**Code**
- `this.app`, jamais `app` global. `const`/`let`, `async/await`.
- DOM : `createEl`, `createDiv`, `createSpan`, `el.empty()`. Jamais `innerHTML` avec une donnée externe.
- Styles : classes CSS préfixées par l'id du plugin et variables Obsidian ; jamais `el.style.x = …`.
- Réseau : `requestUrl`, pas `fetch` ni `axios`.
- Mobile : pas de `fs`, `path` ni `electron` ; `Platform` plutôt que `process.platform` ; pas de lookbehind dans les regex ; pas de cast de `Vault.adapter`.
- Fenêtres détachées : `activeDocument`, `activeWindow`, `window.setTimeout`.
- Chemins : `normalizePath()` sur tout chemin saisi ou construit ; `Vault.configDir` pour `.obsidian`.

**Coffre et données**
- Note active : API Editor. Note fermée : `Vault.process()`. Frontmatter : `FileManager.processFrontMatter()`. Pas de `Vault.modify`.
- Suppression : `FileManager.trashFile()`.
- Retrouver un fichier : `getFileByPath` et `getFolderByPath`, jamais un parcours complet.
- Réglages : `loadData()` et `saveData()`. Un cache reconstructible va dans IndexedDB, pas dans `data.json`. Le jeton y vit en clair, ce que dit le README.
- Ne jamais réécrire une note existante de l'utilisateur.

**Cycle de vie**
- `registerEvent`, `registerDomEvent`, `addCommand`, `registerView` : nettoyage automatique.
- Pas de référence gardée à une vue (`getLeavesOfType()`). Interface initialisée dans `workspace.onLayoutReady()`.
- `console` : erreurs seulement.

**Interface et clavier**
- Tout élément cliquable est un `button` ou un lien ; tout ce qui se fait à la souris se fait au clavier.
- Section repliable : bouton avec `aria-expanded` et `aria-controls`. Bouton-icône : `setIcon` et `aria-label`.
- `:focus-visible` conservé. Modale : garde le focus, se ferme à Échap, rend le focus.
- Changement d'état annoncé par une région `aria-live`. La couleur n'est jamais seule porteuse d'information.
- Actions principales en commandes (`addCommand`), aucun raccourci par défaut.
- `prefers-reduced-motion` respecté. Cibles tactiles agrandies par `.is-mobile`.
- Texte : casse de phrase ; pas le nom du plugin dans les noms de commandes ; pas le mot « Obsidian » dans le nom.
- États d'écran traités : chargement, vide, erreur, hors ligne.
- Nouveautés affichées une seule fois par version, aucune sollicitation dans l'écran principal.

**Publication**
- `main.js` jamais committé : seulement dans la Release avec `manifest.json` et `styles.css`. Tag = version du manifeste, sans `v`.
- README : divulguer réseau, compte requis, accès hors coffre, télémétrie, jeton en clair. Licence en place.
- Fichier de verrouillage commité ; peu de dépendances, chacune justifiée.
