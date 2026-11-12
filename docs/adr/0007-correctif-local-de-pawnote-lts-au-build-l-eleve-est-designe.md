# PD-007 · Correctif de Pawnote-LTS au build : l'élève est désigné pour un compte parent

**Contexte.** Pawnote-LTS 1.6.4 n'envoie pas `membre` (l'élève) dans la signature des demandes. Avec un compte parent, la première demande de données reçoit « accès refusé » et la session se ferme. Avec ce seul ajout, les données reviennent sans erreur.

**Retenu.**
- `scripts/pawnote-patch.ts` modifie au build le constructeur de requête du bundle ESM : pour un compte parent (espace 7), il ajoute `membre` si la demande vise un onglet.
- Le build échoue si le motif n'est pas trouvé exactement une fois : une montée de version qui change le code se voit par une CI rouge.
- Le correctif se retire quand l'amont le contient.

**Écarté.** `patch-package` et un fork Git : une dépendance ou une chaîne d'outils de plus pour un seul remplacement.

**Conséquence.** Le patch dépend de la version exacte de Pawnote-LTS.
