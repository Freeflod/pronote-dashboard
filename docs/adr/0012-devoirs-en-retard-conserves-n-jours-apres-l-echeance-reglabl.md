# PD-012 · Devoirs en retard : conservés N jours après l'échéance, réglable

- **Statut** : Acceptée
- **Date** : 2026-11-12
- **Poids** : Moyen

**Contexte.** Un devoir échu et non fait reste affiché « en retard » tant qu'il est dans la fenêtre lue (semaines passées), sans limite propre. Le mainteneur veut qu'un devoir en retard disparaisse de l'écran après un délai réglable.

**Retenu.**
- Réglage `overdueDays`, par paliers **0, 1, 3, 7 jours** (curseur à quatre crans), **7 par défaut**.
- Un devoir non fait reste dans « en retard » tant que son échéance date de `overdueDays` jours ou moins (jour local) ; au-delà, il n'est plus affiché ; à 0, aucun retard n'est affiché. Un devoir fait n'apparaît jamais en retard (inchangé).
- Le compteur « dont n en retard » suit la même règle.

**Écarté — garder tous les retards sans limite.** Jugé encombrant par le mainteneur.
**Écarté — durée libre en jours.** Quatre paliers suffisent et se lisent sur un curseur.

**Conséquence.** `groupHomework` et le compteur reçoivent la durée ; réglage et migration (valeurs hors palier ramenées au plus proche). **Non vérifié** : le ressenti sur les vrais devoirs.
