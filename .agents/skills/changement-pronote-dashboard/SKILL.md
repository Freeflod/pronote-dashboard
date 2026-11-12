---
name: changement-pronote-dashboard
description: Workflow pour modifier le plugin Pronote Dashboard (cadrer, test d'abord, implémenter, contrôler, relire, PR) et règles propres aux plugins Obsidian. À lire avant d'écrire du code dans ce dépôt.
---

# Changer Pronote Dashboard

## Workflow

1. **Cadrer.** Relire `CONTEXT.md` (les mots) et l'ADR concerné. Une décision nouvelle ou qui en change une autre s'écrit en ADR (`docs/adr/POLICY.md`) avant le code. Une demande floue se précise par une question ciblée.
2. **Brancher** depuis `origin/main` (`docs/agents/branch-naming.md`).
3. **Test d'abord.** Pour un bug : un test qui reproduit le bug et échoue, dont la ligne d'échec va dans la PR. Pour une logique pure : le test avant la fonction. Un bug non testable unitairement reçoit un scénario vérifié dans Obsidian, en échec avant et réussi après.
4. **Implémenter** le plus simple. Logique pure dans un module pur (testé), accès à Obsidian dans les modules qui en dépendent (`AGENTS.md`, « Couches »).
5. **Contrôler** : `npm run check` doit être vert. Aucun contrôle n'est affaibli pour passer.
6. **Utiliser pour de vrai** : une fonctionnalité est terminée quand elle a tourné dans Obsidian sur un coffre de test fictif (clavier seul, thème clair et sombre, panneau étroit, mobile en émulation).
7. **Relecture indépendante** selon la grille de `AGENTS.md`.
8. **PR** (`.github/PULL_REQUEST_TEMPLATE.md`), ouverte dès que le travail est committé.

## Règles Obsidian

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
- Réglages : `loadData()` et `saveData()`. Un cache reconstructible va dans IndexedDB, pas dans `data.json` (PD-009). Le jeton y vit en clair : c'est dit dans le README.
- Ne jamais réécrire une note existante de l'utilisateur sans décision tracée.

**Cycle de vie**
- `registerEvent`, `registerDomEvent`, `addCommand`, `registerView` : le nettoyage est automatique.
- Pas de référence gardée à une vue (`getLeavesOfType()`). Interface initialisée dans `workspace.onLayoutReady()`.
- `console` : erreurs seulement.

**Interface et clavier**
- Tout élément cliquable est un `button` ou un lien. Tout ce qui se fait à la souris se fait au clavier.
- Section repliable : bouton avec `aria-expanded` et `aria-controls`. Bouton-icône : `setIcon` et `aria-label`.
- `:focus-visible` conservé. Modale : garde le focus, se ferme à Échap, rend le focus.
- Changement d'état annoncé par une région `aria-live`. La couleur n'est jamais seule porteuse d'information.
- Actions principales en commandes (`addCommand`), aucun raccourci par défaut.
- `prefers-reduced-motion` respecté. Cibles tactiles agrandies par `.is-mobile`, pas par une règle fixe sur ordinateur.
- Texte : casse de phrase ; pas le nom du plugin dans les noms de commandes ; pas le mot « Obsidian » dans le nom.
- États d'écran traités : chargement, vide, erreur, hors ligne.

**Publication**
- `main.js` jamais committé : seulement dans la Release avec `manifest.json` et `styles.css`. Tag = version du manifeste, sans `v`.
- README : divulguer réseau, compte requis, accès hors coffre, télémétrie, jeton en clair. Licence en place.
- Fichier de verrouillage commité ; peu de dépendances, chacune justifiée.
