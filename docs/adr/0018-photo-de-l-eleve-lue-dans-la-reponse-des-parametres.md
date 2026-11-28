# PD-018 · Photo de l'élève lue dans la réponse « paramètres de l'utilisateur »

**Contexte.** Pawnote-LTS expose `profilePicture`, une adresse de pièce jointe que Pronote 2026.2 refuse (404, mesuré sur le serveur de démonstration, compte élève et compte parent, avec ou sans cookies). Pronote joint en réalité la photo en base64 dans la partie non sécurisée de la réponse « paramètres de l'utilisateur », chaque élève désignant la sienne par son rang ; la bibliothèque ignore ces fichiers.

**Retenu.**
- `src/client.ts` lit cette réponse à chaque connexion, sans requête de plus, et en tire les photos.
- Attribution : par rang quand la partie sécurisée est lisible ; sinon (réponse chiffrée), le n-ième élève avec photo reçoit le n-ième fichier.
- La photo est rangée dans le magasin de fichiers IndexedDB ([PD-009](0009-cache-indexeddb-par-appareil-et-architecture-depot-de-donnee.md)), sous le plafond en Mo ; à 0 Mo : en mémoire pour la session seulement. Jamais dans `data.json`. Elle vit une année (365 jours) et ne change qu'à la reconnexion du compte par QR code, qui la remplace ou l'efface. « Vider le cache » et le retrait d'un compte l'effacent aussi ; elle revient à la connexion suivante.
- Repli sur l'initiale sans message d'erreur : un serveur plus ancien sans photo jointe n'a que l'initiale.

**Écarté.** Corriger l'adresse de `profilePicture` : aucune des variantes essayées ne répond.

**Conséquence.** Dépend d'un détail de réponse non documenté de Pronote : à retirer quand Pawnote-LTS expose la photo. Seule la dernière version de Pronote est visée. Non vérifié : l'ordre des fichiers d'un serveur réel dont la partie sécurisée est chiffrée.
