# Politique des décisions d'architecture

Un ADR garde **pourquoi** une règle en vigueur existe, pour qu'un contributeur ne la défasse pas sans la connaître.

## Quand écrire un ADR

Un choix de produit, d'architecture, de stockage, de données, de sécurité ou de développement que quelqu'un pourrait être tenté d'annuler sans en connaître la raison, ou qui touche aux données des utilisateurs, à la compatibilité ou à la maintenance. Pas pour un correctif évident, un détail d'interface ou de texte, ni une décision déjà couverte par un ADR.

## Règles

- Identifiant `PD-NNN` (numéro suivant le dernier, jamais réutilisé ni renuméroté) ; fichier `NNNN-titre-court.md` dans `docs/adr/`, ajouté à l'index `README.md`.
- Modèle : `ADR-TEMPLATE.md`.
- Un ADR décrit une décision **en vigueur**. Remplacée ou abandonnée, on le supprime (et sa ligne de l'index) : git garde l'historique. Pour changer une décision, on modifie ou on remplace l'ADR dans la même PR.
- Un test ou une règle qui change parce qu'une décision a changé le dit dans le message de commit.
- Aucune donnée réelle dans un ADR (nom d'élève, d'établissement, URL de serveur Pronote, jeton).
