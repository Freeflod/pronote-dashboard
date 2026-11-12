# PD-011 · Actualisation automatique espacée, une connexion par onglet, garde-fous

**Contexte.** Pronote ne publie aucun seuil de blocage, et le jeton tourne à chaque connexion. Relancer tous les blocs à chaque ouverture de l'écran risque un blocage ou une perte de jeton.

**Retenu.**
- Actualisation automatique : jamais, 15 min, 30 min (défaut), 1 h ou 2 h ; plancher de 15 minutes. Une donnée en cache plus récente que l'intervalle n'est pas redemandée à l'ouverture.
- **Une seule connexion** par rafraîchissement d'onglet (devoirs, emploi du temps, séances, discussions ensemble) ; jamais deux comptes en parallèle.
- Bouton « Actualiser » : 2 minutes minimum entre deux appuis, avec un libellé pendant l'attente.
- Arrêt de l'automatique après 3 échecs de suite, avec un message ; reprise par un rafraîchissement manuel réussi.
- Aucune actualisation en arrière-plan sur mobile : l'automatique ne tourne que Obsidian ouvert.
- Notification dans Obsidian (réglable, active par défaut) pour un nouveau devoir ou message. Lire la liste des discussions ne marque jamais « lu » (PD-010).

**Écarté.** Notification push du système : pas de serveur dans le projet.

**Conséquence.** Logique pure testée dans `src/refresh.ts` ; minuteur dans `main.ts`. Non vérifié : le seuil réel de blocage de Pronote.
