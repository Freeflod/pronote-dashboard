# Journal des versions

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/). Les décisions de conception sont dans `docs/adr/`.

## 0.5.0 — 2026-11-12

### Ajouté
- Écran Pronote dans la fenêtre principale : un onglet par enfant en mode Parent, blocs devoirs, « pour demain », cartable, prochains contrôles, ressources, messages.
- Résultats scolaires : notes par matière (écart à la classe, repli des notes anciennes, commentaire à la demande) et compétences par matière puis par évaluation, avec niveau estimé et tendance (PD-013).
- Actualisation automatique espacée, une connexion par onglet, garde-fous (PD-011).
- Cache IndexedDB par appareil avec plafond réglable et bouton « Vider le cache » (PD-009).
- Devoirs en retard conservés N jours, réglable (PD-012).
- Case « fait » (mode Enfant) et message marqué lu à l'ouverture (PD-010).
- La date du haut ouvre l'emploi du temps du jour.
- `THIRD_PARTY_NOTICES.md` : licences des composants embarqués.

### Corrigé
- La période des notes et des compétences suit l'onglet Pronote (semestre au lycée).
- Ouvrir un message ne retrouve plus la discussion par un identifiant instable.
- Ouvrir une pièce jointe affiche un aperçu dans l'application, sans appel externe.
- Les liens des textes de Pronote sont cliquables.
- La déconnexion et le retrait d'un compte effacent son cache.
- Coefficient à la française, absence affichée « Abs », arrondi de l'écart à la classe identique dans les deux sens.

## 0.4.0 — 2026-11-08

### Modifié
- TypeScript 6, linter officiel `eslint-plugin-obsidianmd`, réglages déclaratifs ; Obsidian 1.13.0 minimum (PD-008).
- « Séance » remplace « cours » pour le créneau Pronote (`CONTEXT.md`).

### Corrigé
- Les notes de séance et les pièces jointes ne sont plus dupliquées à chaque synchronisation.

## 0.3.0 — 2026-11-06

- Connexion à PRONOTE 2026 par Pawnote-LTS, élève désigné pour les comptes parents (PD-006, PD-007).
- Licence GPL-3.0-or-later.
- Première version publiée par la CI (PD-004).
