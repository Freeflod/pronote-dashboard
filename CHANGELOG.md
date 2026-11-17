# Journal des versions

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## 0.7.0 — 2026-11-17

### Ajouté
- L'avatar de l'enfant s'affiche dans son onglet et à côté du titre : la photo Pronote, gardée un an dans le cache local de l'appareil et renouvelée à la reconnexion du compte par QR code, ou à défaut l'initiale colorée.

- Une fenêtre des nouveautés s'ouvre une seule fois après une mise à jour ; la commande « Voir les nouveautés » et un bouton des réglages la rouvrent.
- Lien de soutien Ko-fi dans les réglages, le README et la fiche du plugin.

### Modifié
- Mode Parent : les enfants se choisissent tout en haut de l'écran, par de grands avatars ronds avec le prénom dessous (l'enfant choisi est souligné) ; le titre cite son prénom et l'avatar n'est plus répété à côté du titre.
- Contenus de séance : regroupés par jour ou par matière (bascule et filtre de matière, choix gardé par appareil), chaque séance repliée avec sa matière, son titre et sa date ; le texte de Pronote est rendu pour de vrai (gras, italique, souligné, listes, liens) avec ses couleurs ramenées à la palette d'Obsidian.

## 0.6.0 — 2026-11-16

### Ajouté
- Réglage « Contenus de séance » (par mode, désactivé par défaut) : bloc replié au-dessus des ressources, indépendant des devoirs.
- Bouton « Masquer les erreurs » après chaque texte rouge de l'écran, et case « Afficher les erreurs » par enfant dans les réglages pour les faire revenir.
- Le dossier de synchronisation se choisit dans tout le coffre, avec les suggestions de dossiers d'Obsidian.

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
