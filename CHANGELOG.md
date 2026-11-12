# Journal des versions

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## 0.5.0 — 2026-11-12

### Ajouté
- Écran Pronote : un onglet par enfant en mode Parent, blocs devoirs, « pour demain », cartable, prochains contrôles, ressources, messages.
- Résultats : notes par matière (écart à la classe) et compétences par matière puis par évaluation, avec niveau estimé et tendance.
- Actualisation automatique espacée, une connexion par onglet, garde-fous.
- Cache IndexedDB par appareil, plafond réglable, bouton « Vider le cache ».
- Devoirs en retard conservés N jours (réglable).
- Case « fait » (mode Enfant) ; un message est marqué lu à son ouverture.
- La date du haut ouvre l'emploi du temps du jour.
- `THIRD_PARTY_NOTICES.md` : licences des composants embarqués.

### Corrigé
- La période des notes et des compétences suit l'onglet Pronote.
- Ouvrir un message ne retrouve plus la discussion par un identifiant instable.
- Une pièce jointe s'ouvre en aperçu dans l'application, sans appel externe.
- Les liens des textes de Pronote sont cliquables.
- La déconnexion et le retrait d'un compte effacent son cache.
- Coefficient à la française, absence affichée « Abs », arrondi de l'écart à la classe identique dans les deux sens.

## 0.4.0 — 2026-11-08

### Modifié
- TypeScript 6, linter officiel `eslint-plugin-obsidianmd`, réglages déclaratifs ; Obsidian 1.13.0 minimum.
- « Séance » remplace « cours » pour le créneau Pronote.

### Corrigé
- Les notes de séance et les pièces jointes ne sont plus dupliquées à chaque synchronisation.

## 0.3.0 — 2026-11-06

- Connexion à Pronote 2026 par Pawnote-LTS, élève désigné pour les comptes parents.
- Licence GPL-3.0-or-later.
- Première version publiée par la CI.
