# Décisions d'architecture

Les décisions en vigueur qui expliquent **pourquoi** le plugin est fait ainsi, pour qu'un contributeur ne les défasse pas sans en connaître la raison. Les identifiants `PD-NNN` sont stables ; les numéros manquants sont des décisions abandonnées.

| Décision | Titre |
|---|---|
| [PD-003](0003-pawnote-et-jsqr-en-dependencies.md) | Pawnote et jsQR en `dependencies` |
| [PD-004](0004-chaque-version-publiee-en-github-release-construite-par-la-c.md) | Chaque version publiée en GitHub Release, construite par la CI |
| [PD-007](0007-correctif-local-de-pawnote-lts-au-build-l-eleve-est-designe.md) | Correctif de Pawnote-LTS au build : l'élève est désigné pour un compte parent |
| [PD-008](0008-conformite-totale-aux-regles-obsidian-typescript-6-linter-of.md) | Conformité aux règles Obsidian : TypeScript 6, linter officiel, Obsidian 1.13 minimum |
| [PD-009](0009-cache-indexeddb-par-appareil-et-architecture-depot-de-donnee.md) | Cache IndexedDB par appareil, dépôt de données et composants communs |
| [PD-010](0010-ecritures-vers-pronote-fait-et-lu.md) | Écritures vers Pronote : « fait » et « lu » |
| [PD-011](0011-actualisation-automatique-espacee-une-connexion-par-onglet-g.md) | Actualisation automatique espacée, une connexion par onglet, garde-fous |
| [PD-012](0012-devoirs-en-retard-conserves-n-jours-apres-l-echeance-reglabl.md) | Devoirs en retard : conservés N jours après l'échéance, réglable |
| [PD-013](0013-competences-niveau-global-estime-et-tendance-sans-comparaiso.md) | Compétences : niveau estimé et tendance, sans comparaison à la classe |
| [PD-014](0014-pas-de-hooks-versionnes-protection-de-main-cote-serveur.md) | Pas de hooks versionnés, protection de `main` côté serveur |
| [PD-015](0015-typescript-reste-en-6-tant-que-typescript-eslint-n-ac.md) | TypeScript reste en 6 tant que typescript-eslint n'accepte pas la 7 |
| [PD-016](0016-eslint-reste-en-9-tant-que-le-linter-officiel-obsidia.md) | ESLint reste en 9 tant que le linter officiel Obsidian n'accepte pas la 10 |
| [PD-017](0017-minimatch-11-par-overrides-pour-deux-outils-de-develo.md) | `minimatch` 11 par `overrides` pour deux outils de développement |
| [PD-018](0018-photo-de-l-eleve-lue-dans-la-reponse-des-parametres.md) | Photo de l'élève lue dans la réponse « paramètres de l'utilisateur » |
| [PD-019](0019-html-de-pronote-garde-dans-le-cache-pour-l-ecran.md) | HTML de Pronote gardé dans le cache pour l'écran, Markdown pour le coffre |

## Écrire un ADR

Pour un choix de produit, d'architecture, de stockage, de données, de sécurité ou de développement que quelqu'un pourrait annuler sans en connaître la raison, ou qui touche aux données des utilisateurs, à la compatibilité ou à la maintenance. Pas pour un correctif évident, un détail d'interface ou de texte, ni une décision déjà couverte.

- Identifiant `PD-NNN` (suivant le dernier, jamais réutilisé) ; fichier `NNNN-titre-court.md` dans ce dossier ; une ligne dans le tableau ci-dessus.
- Un ADR décrit une décision **en vigueur**. Remplacée ou abandonnée, on le supprime avec sa ligne (git garde l'historique) ; pour la changer, on le modifie ou on le remplace dans la même PR.
- Un test ou une règle qui change parce qu'une décision a changé le dit dans le message de commit.
- Aucune donnée réelle (nom d'élève ou d'établissement, URL de serveur Pronote, jeton).

Modèle :

```markdown
# PD-NNN · Titre court de la décision

**Contexte.** Le problème et les contraintes, en 3 lignes au plus.

**Retenu.**
- Ce qui est décidé, en phrases courtes.

**Écarté.** Seulement une alternative qui est un piège probable, en une ligne.

**Conséquence.** Ce que la décision impose ou rend plus difficile ; ce qui reste non vérifié.
```
