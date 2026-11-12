# PD-005 · Banc de test : coffre Obsidian dédié dans `.banc/`

- **Statut** : Acceptée
- **Date** : 2026-11-06
- **Poids** : Moyen

**Contexte.** Le mainteneur peut fournir les connexions de deux enfants pour les tests en conditions réelles. Pronote renouvelle le jeton à chaque connexion (`src/client.ts`, `run` puis `remember`). Partager un jeton avec le coffre réel déconnecterait donc l'un des deux.

**Retenu.**
- Un coffre de test `.banc/coffre`, ignoré par git.
- Chaque enfant y a **sa propre connexion** : un nouveau QR code saisi par le mainteneur dans l'écran de réglages du plugin, qui sert d'interface d'enregistrement.
- Le jeton reste dans le `data.json` de ce coffre et se renouvelle tout seul.
- Les agents et les contributeurs ne lisent jamais ce fichier.
- Les rapports ne donnent que des comptes.
- Le serveur de démonstration Pronote est utilisé en priorité.

**Écarté — jetons dans un `.env` avec un script de saisie.** Code de plus à maintenir pour le même résultat, et un second endroit où vivent les secrets.
