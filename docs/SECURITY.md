# Sécurité

## Ce que le plugin fait de tes données

- **Compte requis** : un compte Pronote, élève ou parent, connecté par QR code.
- **Réseau** : uniquement le serveur Pronote de ton établissement, par la bibliothèque non officielle Pawnote-LTS embarquée. Aucun autre service, aucun serveur du projet, aucune télémétrie.
- **Jeton de connexion** : conservé **en clair** dans `.obsidian/plugins/pronote-dashboard/data.json`. Quiconque lit ce fichier peut se connecter au compte. Ne le partage pas, ne le versionne pas, n'envoie pas ton coffre vers un service public ou partagé sans exclure `.obsidian/plugins/pronote-dashboard/`.
- **Données d'enfants** (noms, notes, devoirs) : sur ton appareil et dans ton coffre seulement. Cache dans IndexedDB, par appareil, effaçable depuis les réglages.
- **Écritures vers Pronote** : cocher « fait » un devoir (mode Enfant) et ouvrir un message, qui le marque lu.
- **Accès hors du coffre** : aucun.

## Signaler une faille

N'ouvre pas d'issue publique. Utilise le signalement privé de GitHub : onglet **Security** du dépôt, puis **Report a vulnerability** (<https://github.com/Freeflod/pronote-dashboard/security/advisories/new>).

Indique la version du plugin, ce que tu as constaté et comment le reproduire, **sans donnée réelle** (ni jeton, ni nom, ni adresse de serveur Pronote). On répond en quelques jours ; les failles qui exposent des données d'enfants ou des jetons passent en premier.

## Si un jeton ou une donnée réelle a fuité

Un secret rencontré dans un dépôt, une issue ou une PR est considéré compromis : le signaler par son emplacement, jamais en le recopiant. Se reconnecter à Pronote avec un nouveau QR code fait tourner le jeton et invalide l'ancien.

## Dépendances

Le plugin embarque Pawnote-LTS (GPL-3.0) et jsQR (Apache-2.0) dans `main.js` ; licences complètes dans `THIRD_PARTY_NOTICES.md`. Les alertes Dependabot et le contrôle gitleaks de la CI surveillent le dépôt.
