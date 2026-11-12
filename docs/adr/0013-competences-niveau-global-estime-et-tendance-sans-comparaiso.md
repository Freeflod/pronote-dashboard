# PD-013 · Compétences : niveau global estimé et tendance, sans comparaison à la classe

- **Statut** : Acceptée
- **Date** : 2026-11-12
- **Poids** : Moyen

**Contexte.** Le mainteneur voudrait voir, pour les compétences, un niveau global comparé à la classe avec une hausse ou une baisse. Mesuré dans les types de Pawnote-LTS (2026-11-12) : seules les notes ont une moyenne de classe (`GradesOverview`, bulletin) ; `Evaluation` et `Skill` n'en portent aucune. Le calcul du niveau global de Pronote n'est pas exposé.

**Retenu.**
- **Pas de comparaison à la classe** pour les compétences : la donnée n'existe pas dans la bibliothèque.
- **Niveau estimé** par matière et pour l'ensemble : moyenne des niveaux de l'élève (A+ = 4, A = 3, C = 2, E = 1 ; Abs et Ne ignorés), ramenée au niveau le plus proche, écrit « estimé » dans l'interface.
- **Tendance** par matière : moyenne des 3 évaluations les plus récentes comparée à celle des précédentes ; écart d'au moins 0,25 : « en hausse » ou « en baisse » (texte + flèche, jamais la couleur seule) ; sinon « stable » ; moins de 4 évaluations dans la matière : pas de tendance.

**Écarté — imiter le calcul de Pronote.** Non documenté : un faux calcul présenté comme officiel est pire qu'une estimation annoncée.
**Écarté — comparaison à la classe déduite des notes.** Sans rapport avec les compétences.

**Conséquence.** Logique pure testée dans `src/blocks.ts`. **Non vérifié** : la correspondance avec le niveau global affiché par Pronote ; seuil 0,25 et fenêtre de 3 évaluations choisis sans mesure (à ajuster sur les vraies données).
