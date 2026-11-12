# PD-010 · Écritures vers Pronote : « fait » et « lu »

- **Statut** : Acceptée
- **Date** : 2026-11-08
- **Poids** : Structurant

**Contexte.** L'écran Enfant doit permettre de cocher un devoir « fait » (`assignmentStatus`) et de lire un message, ce qui peut le marquer lu côté Pronote (`discussionMessages`, paramètre `markAsRead`). Ce sont les premières écritures du plugin vers Pronote, sur des comptes d'enfants mineurs.

**Retenu.**
- Case « fait » : basculable en mode Enfant seulement, lecture seule en mode Parent. En ligne, mise à jour immédiate avec retour arrière et message en cas d'échec ; hors ligne, case désactivée avec libellé. Pas de file d'attente.
- Messages : `markAsRead: false` partout, sauf à l'ouverture explicite d'un message par l'enfant.
- Ces deux écritures sont câblées par le développement et **jamais exécutées par un agent sur un compte réel d'enfant** : le mainteneur les teste. Essais des agents : serveur de démonstration seulement ; sans connexion à la démo, les blocs sont livrés marqués « non vérifié ».

**Écarté — file d'attente hors ligne.** Risque de divergence et de doublons sur deux appareils, pour un gain faible.
**Écarté — marquer lu à l'affichage de la liste.** Un enfant perdrait le signal « non lu » sans avoir lu.
**Écarté — écritures testées par un agent sur un compte réel.** Porte dure du projet.

**Conséquence.** Le client (`src/client.ts`) expose deux écritures isolées, testées avec des jeux fictifs pour la logique pure ; le reste se vérifie par le mainteneur. Valeur par défaut de `markAsRead` non vérifiée : on la passe toujours explicitement.
