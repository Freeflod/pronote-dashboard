# PD-011 · Actualisation automatique espacée, une connexion par onglet, garde-fous

- **Statut** : Acceptée
- **Date** : 2026-11-09
- **Poids** : Structurant

**Contexte.** Depuis la refonte, chaque ouverture de l'écran relance les 4 blocs de chaque onglet (devoirs, emploi du temps, séances, discussions) : 4 connexions Pronote par onglet, sans pause et sans minuteur ; le réglage « Actualisation automatique » (`staleMinutes`) n'est plus lu. Le mainteneur craint de se faire bloquer par Pronote. Aucun seuil officiel n'est publié (recherche du 2026-11-09). Témoignages de la communauté Home Assistant : une IP bloquée après des régénérations répétées de QR code, des déconnexions attribuées à l'invalidation du jeton. L'intégration `delphiki/hass-pronote` actualise toutes les 15 minutes par défaut (`DEFAULT_REFRESH_INTERVAL = 15`), sans minimum ni reprise progressive dans `const.py`.

**Retenu.**
- Actualisation automatique toutes les **30 minutes** par défaut (réglage `staleMinutes` rebranché), choix : jamais, 15 min, 30 min, 1 h, 2 h ; plancher de **15 minutes** pour l'automatique.
- Une donnée en cache plus récente que cet intervalle n'est pas redemandée à l'ouverture.
- **Une seule connexion** par rafraîchissement d'onglet (devoirs, emploi du temps, séances, discussions ensemble), au lieu de 4 ; jamais deux comptes en parallèle.
- Bouton « Actualiser » : **2 minutes** minimum entre deux appuis, avec un libellé écrit pendant l'attente.
- Arrêt de l'automatique après **3 échecs de suite**, avec un message ; reprise par un rafraîchissement manuel réussi.
- Aucune actualisation en arrière-plan sur mobile ; l'automatique ne tourne que Obsidian ouvert.
- Notification **dans Obsidian** (réglable, active par défaut) quand une actualisation automatique trouve un nouveau message non lu ou un nouveau devoir. La lecture des discussions ne marque jamais « lu » (PD-010).

**Écarté — messages toutes les heures et le reste toutes les 4 h.** Jugé trop long par le mainteneur au regard de la pratique de Home Assistant (15 minutes).
**Écarté — notification push du système.** Pas de serveur dans le projet ; un plugin n'est actif que Obsidian ouvert.
**Écarté — rechargement à chaque ouverture de l'écran.** 4 connexions par onglet à chaque ouverture ; risque de perte de jeton.

**Conséquence.** Nouvelle logique pure testée (intervalle, plancher, attente du bouton, compteur d'échecs, détection du nouveau) ; dépôt de données avec fraîcheur et une session par onglet (dette #22) ; minuteur dans `main.ts` ; réglage et migration. **Non vérifié** : le seuil réel de blocage de Pronote ; le nombre de requêtes que `hass-pronote` envoie à chaque tour.
