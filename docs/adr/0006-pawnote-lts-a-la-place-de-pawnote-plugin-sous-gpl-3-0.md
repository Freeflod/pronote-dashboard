# PD-006 · Pawnote-LTS à la place de Pawnote, plugin sous GPL-3.0

- **Statut** : Acceptée
- **Date** : 2026-11-06
- **Poids** : Structurant

**Contexte.** Pawnote 1.6.2 ne se connecte plus à PRONOTE 2026.2.x (« requested page does not exist »). Il n'a plus de version depuis septembre 2025 et son dépôt n'existe plus. Il est sous GPL-3.0-or-later, alors que le plugin, qui l'embarque, se déclarait MIT. Le MIT venait des sources reçues et n'avait pas été confronté aux licences des bibliothèques embarquées.

**Retenu.**
- `@blockshub/pawnote-lts` (fork de Pawnote maintenu pour les correctifs, sources TypeScript, mêmes dépendances, même API). Sa version 1.6.4 corrige la lecture de la page de session pour PRONOTE 2026.
- Le plugin passe sous **GPL-3.0-or-later** : le mainteneur ne vend pas le plugin et souhaite qu'il reste libre.
- Les correctifs que nous trouverons sont proposés au fork (contribution en retour).

**Écarté — client Pronote écrit par nous à partir de pronotepy (MIT).** Plus long, et inutile dès lors qu'un fork maintenu existe.
**Écarté — corriger le dist minifié de Pawnote 1.6.2.** Code sans sources, et dépendance à un projet abandonné.
**Écarté — « pronote » (successeur alpha de Pawnote) et Blocksnote.** Le premier est sans licence, le second sans connexion par QR code ni par jeton.
