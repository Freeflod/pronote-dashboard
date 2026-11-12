# Contexte du projet

## En une page

- **Quoi** : plugin Obsidian pour un usage familial, qui lit Pronote (compte élève ou parent, connexion par QR code) et affiche devoirs, emploi du temps, cahier de texte, ressources, messages, notes et compétences ; il peut écrire les séances en notes Markdown.
- **Comment** : TypeScript 6 compilé par esbuild en un seul `main.js` (PD-008). Embarqués : `@blockshub/pawnote-lts` (GPL-3.0) et `jsqr` (Apache-2.0). Aucun serveur, aucun hébergement, aucune télémétrie.
- **Pour qui** : un élève, ou un parent avec un compte par enfant (mode Enfant / mode Parent, voir `CONTEXT.md`).
- **Contraintes** : mobile compris (`isDesktopOnly: false`), Obsidian 1.13.0 minimum, lecture de Pronote seule sauf deux écritures (case « fait », message lu : PD-010).

## Où trouver quoi

| Besoin | Fichier |
|---|---|
| Usage et divulgations | `README.md` |
| Sens des mots | `CONTEXT.md` |
| Pourquoi un choix a été fait | `docs/adr/` (identifiants `PD-NNN`) |
| Structure du code, build, publication | `CONTRIBUTING.md` |
| Règles pour les agents | `AGENTS.md` |
| Workflow d'un changement | `.agents/skills/changement-pronote-dashboard/SKILL.md` |
| Branches, issues, étiquettes | `docs/agents/` |
| Sécurité | `docs/SECURITY.md` |
| Licences des composants embarqués | `THIRD_PARTY_NOTICES.md` |

## Décisions à connaître avant de toucher au code

- PD-006 : Pawnote-LTS remplace Pawnote ; le plugin est sous GPL-3.0-or-later.
- PD-007 : correctif de Pawnote-LTS au build (élève désigné pour un compte parent).
- PD-009 : cache IndexedDB par appareil, jamais dans `data.json`.
- PD-011 : actualisation espacée, une connexion par onglet (le jeton Pronote tourne à chaque connexion).
- PD-014 : pas de hook versionné, `main` protégée côté serveur.

## Vérifier dans Obsidian

Pour un changement d'interface ou de lecture Pronote : compiler, copier `main.js`, `manifest.json` et `styles.css` dans `<coffre de test>/.obsidian/plugins/pronote-dashboard/` et recharger. Coffre de test fictif seulement ; connexion au serveur de démonstration Pronote, jamais à un compte réel d'enfant.
