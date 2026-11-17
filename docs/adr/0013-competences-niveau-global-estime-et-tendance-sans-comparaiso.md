# PD-013 · Compétences : niveau estimé et tendance, sans comparaison à la classe

**Contexte.** Dans les types de Pawnote-LTS, seules les notes ont une moyenne de classe ; les compétences n'en portent aucune. Le calcul du niveau global de Pronote n'est pas exposé.

**Retenu.**
- **Pas de comparaison à la classe** pour les compétences : la donnée n'existe pas.
- **Niveau estimé**, par matière et au total : moyenne des niveaux (A+ = 4, A = 3, C = 2, E = 1 ; Abs et Ne ignorés), ramenée au niveau le plus proche et annoncée « estimé » dans l'interface.
- **Tendance** par matière : moyenne des 3 évaluations les plus récentes comparée aux précédentes ; écart d'au moins 0,25 : hausse ou baisse (texte et flèche, jamais la couleur seule) ; sinon stable ; moins de 4 évaluations : pas de tendance.

**Écarté.** Imiter le calcul de Pronote : non documenté, un faux calcul présenté comme officiel est pire qu'une estimation annoncée.

**Conséquence.** Logique pure testée dans `src/blocks.ts`. Non vérifié : correspondance avec le niveau de Pronote ; seuil 0,25 et fenêtre de 3 choisis sans mesure.
