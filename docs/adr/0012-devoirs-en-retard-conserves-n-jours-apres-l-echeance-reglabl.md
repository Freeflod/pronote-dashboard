# PD-012 · Devoirs en retard : conservés N jours après l'échéance, réglable

**Contexte.** Sans limite, un devoir échu et non fait reste « en retard » tant qu'il est dans les semaines lues.

**Retenu.**
- Réglage `overdueDays`, par paliers 0, 1, 3, 7 jours (curseur à quatre crans), 7 par défaut.
- Un devoir non fait reste en retard tant que son échéance date de `overdueDays` jours ou moins (jour local) ; au-delà, il disparaît ; à 0, aucun retard. Un devoir fait n'est jamais en retard.
- Le compteur « dont n en retard » suit la même règle.

**Conséquence.** `groupHomework` et le compteur reçoivent la durée ; une valeur hors palier est ramenée au palier le plus proche (le plus grand en cas d'égalité).
