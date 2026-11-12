# PD-007 · Correctif local de Pawnote-LTS au build : l'élève est désigné dans les demandes d'un compte parent

- **Statut** : Acceptée
- **Date** : 2026-11-06
- **Poids** : Moyen

**Contexte.** Mesuré sur le banc avec un compte parent réel (1 élève rattaché) : la connexion par QR code et la reconnexion par jeton réussissent, mais la première demande de données reçoit « accès refusé » et la session est fermée (0 devoir, 3 erreurs). Pawnote-LTS 1.6.4 n'envoie jamais `membre` dans la signature des demandes, alors que pronotepy, maintenu, l'envoie pour un compte parent (`{ N: id de l'élève, G: 4 }`). Avec ce seul ajout, même compte, même session : 29 devoirs, 24 cours, aucune erreur.

**Retenu.**
- `scripts/pawnote-patch.ts` modifie au build le constructeur de requête du bundle ESM de Pawnote-LTS : pour un compte parent (espace 7), ajout de `membre` si la demande vise un onglet.
- Le build échoue si le motif n'est pas trouvé exactement une fois, ou si le correctif n'a pas été appliqué. Une montée de version (Dependabot) sera donc signalée par une CI rouge.
- Le correctif sera proposé en amont à Pawnote-LTS, puis retiré quand une version le contiendra.

**Écarté — dépendre d'un fork Git de Pawnote-LTS.** Il faudrait construire le fork à l'installation, donc embarquer toute sa chaîne d'outils.
**Écarté — patch-package.** Une dépendance de plus pour un seul remplacement.
