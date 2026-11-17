# PD-010 · Écritures vers Pronote : « fait » et « lu »

**Contexte.** Ce sont les seules écritures du plugin vers Pronote, sur des comptes d'enfants mineurs.

**Retenu.**
- Case « fait » : basculable en mode Enfant seulement, lecture seule en mode Parent. En ligne, mise à jour immédiate avec retour arrière et message en cas d'échec ; hors ligne, case désactivée avec libellé. Pas de file d'attente (risque de doublons entre appareils).
- Messages : `markAsRead: false` partout, sauf à l'ouverture explicite d'un message. La valeur par défaut de Pronote n'est pas vérifiée : on la passe toujours.
- Ces écritures ne s'essaient jamais sur un compte réel d'enfant, seulement sur le serveur de démonstration Pronote.

**Conséquence.** Le client (`src/client.ts`) expose ces deux écritures isolées ; la logique pure se teste avec des jeux fictifs.
