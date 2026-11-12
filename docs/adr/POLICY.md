# Politique des décisions d'architecture

Une décision (ADR) garde **pourquoi** le plugin est fait ainsi. La documentation dit comment il fonctionne ; l'ADR évite qu'un contributeur renverse un choix sans en connaître la raison.

## Quand écrire un ADR

- Un choix de produit, d'architecture, de stockage, de données, de sécurité ou de convention de développement.
- Un choix qu'on pourrait être tenté d'annuler sans connaître sa raison.
- Un arbitrage entre plusieurs approches raisonnables.
- Une décision qui touche aux données des utilisateurs, à la compatibilité ou à la maintenance.

## Quand ne pas en écrire

Un correctif dont le comportement attendu est évident, un détail d'interface ou de texte, une expérience sans suite, une décision déjà couverte par un ADR (on y renvoie).

## Règles

- Identifiant `PD-NNN`, numéro suivant le dernier ; fichier `NNNN-titre-court.md` dans `docs/adr/`. Un ADR ajouté s'ajoute aussi à l'index (`README.md`).
- Modèle : `ADR-TEMPLATE.md`. Toujours une alternative écartée et une conséquence.
- Statuts : **Proposée** (en discussion), **Acceptée** (politique en vigueur), **Remplacée par PD-NNN** (on ne supprime jamais un ADR, on le remplace et on garde le texte).
- Un ADR accepté ne se réécrit pas : on écrit un nouvel ADR qui le remplace.
- Un test ou une règle qui change parce qu'une décision a changé cite l'ADR dans le message de commit.
- Un ADR ne contient aucune donnée réelle (nom d'élève, d'établissement, URL de serveur Pronote, jeton).
