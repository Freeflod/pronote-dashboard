# Décisions d'architecture

Les décisions qui expliquent **pourquoi** le plugin est fait ainsi. La règle de rédaction est dans [`POLICY.md`](POLICY.md), le modèle dans [`ADR-TEMPLATE.md`](ADR-TEMPLATE.md). Les identifiants `PD-NNN` sont stables : une décision remplacée n'est jamais supprimée.

| Décision | Titre | Statut | Date |
|---|---|---|---|
| [PD-001](0001-outillage-limite-a-la-norme-des-plugins-obsidian.md) | Outillage limité à la norme des plugins Obsidian | En partie remplacée par PD-008 (TypeScript 6 et linter officiel) | 2026-11-06 |
| [PD-002](0002-main-seule-branche-protegee-protection-locale-uniquement.md) | `main` seule branche protégée, protection locale uniquement | Remplacée par PD-014 | 2026-11-06 |
| [PD-003](0003-pawnote-et-jsqr-en-dependencies.md) | Pawnote et jsQR en `dependencies` | Acceptée | 2026-11-06 |
| [PD-004](0004-chaque-version-publiee-en-github-release-construite-par-la-c.md) | Chaque version publiée en GitHub Release, construite par la CI | Acceptée | 2026-11-06 |
| [PD-005](0005-banc-de-test-coffre-obsidian-dedie-dans-banc.md) | Banc de test : coffre Obsidian dédié dans `.banc/` | Acceptée | 2026-11-06 |
| [PD-006](0006-pawnote-lts-a-la-place-de-pawnote-plugin-sous-gpl-3-0.md) | Pawnote-LTS à la place de Pawnote, plugin sous GPL-3.0 | Acceptée | 2026-11-06 |
| [PD-007](0007-correctif-local-de-pawnote-lts-au-build-l-eleve-est-designe.md) | Correctif local de Pawnote-LTS au build : l'élève est désigné dans les demandes d'un compte parent | Acceptée | 2026-11-06 |
| [PD-008](0008-conformite-totale-aux-regles-obsidian-typescript-6-linter-of.md) | Conformité totale aux règles Obsidian : TypeScript 6, linter officiel, Obsidian 1.13 minimum | Acceptée | 2026-11-08 |
| [PD-009](0009-cache-indexeddb-par-appareil-et-architecture-depot-de-donnee.md) | Cache IndexedDB par appareil et architecture « dépôt de données + composants communs » | Acceptée | 2026-11-08 |
| [PD-010](0010-ecritures-vers-pronote-fait-et-lu.md) | Écritures vers Pronote : « fait » et « lu » | Acceptée | 2026-11-08 |
| [PD-011](0011-actualisation-automatique-espacee-une-connexion-par-onglet-g.md) | Actualisation automatique espacée, une connexion par onglet, garde-fous | Acceptée | 2026-11-09 |
| [PD-012](0012-devoirs-en-retard-conserves-n-jours-apres-l-echeance-reglabl.md) | Devoirs en retard : conservés N jours après l'échéance, réglable | Acceptée | 2026-11-12 |
| [PD-013](0013-competences-niveau-global-estime-et-tendance-sans-comparaiso.md) | Compétences : niveau global estimé et tendance, sans comparaison à la classe | Acceptée | 2026-11-12 |
| [PD-014](0014-pas-de-hooks-versionnes-protection-de-main-cote-serveur.md) | Pas de hooks versionnés, protection de `main` côté serveur | Acceptée | 2026-11-12 |
