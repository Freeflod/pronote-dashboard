# Pronote Dashboard

Le vocabulaire du plugin : un mot, un sens, partout (issues, README, code, interface). Un mot absent d'ici qu'on se met à utiliser s'ajoute ici avant d'entrer dans le code. Les noms du code qui diffèrent sont signalés ; ils ne sont renommés que par une tâche dédiée.


## Pronote : séances et ressources

**Matière**:
Une discipline (Mathématiques…). Le professeur la tient dans Pronote ; l'élève y range ses cours. Dans le code : `subject`.

**Séance**:
Un créneau de l'emploi du temps pour une matière (heure, professeurs), tenu par le professeur dans Pronote. Dans le code : `LessonDTO`.
_À éviter_ : cours, leçon

**Contenu de séance**:
Le texte que le professeur écrit pour une séance dans le cahier de texte (« Contenus et ressources » dans Pronote) : titre, catégorie, texte. Dans le code : `LessonContentDTO`.
_À éviter_ : contenu de cours, note

**Note de séance**:
Le fichier Markdown du coffre qui garde un contenu de séance. Elle n'est jamais supprimée ni réécrite par le plugin. Dans le code : `Séances/<matière>/…md`.
_À éviter_ : note de cours

**Ressource**:
Un fichier ou un lien joint à un contenu de séance (ou à un devoir). Dans le code : `AttachmentDTO`.
_À éviter_ : pièce jointe, fichier téléchargé

**Ressource sur le disque**:
Une ressource téléchargée dans le coffre. Dans le code : `fileIndex`.
_À éviter_ : en cache (ambigu)

**Ressource sur le web**:
Une ressource qui n'existe que sur Pronote : la note de séance porte un lien vers Pronote. Dans le code : `isFile`, `url`.
_À éviter_ : non téléchargée

**Période de cache**:
Les semaines autour d'aujourd'hui dont les ressources sont gardées sur le disque. Dans le code : `weeksBack`, `weeksAhead`.
_À éviter_ : fenêtre, horizon

**Prolongation**:
Durée pendant laquelle une ressource ouverte hors période de cache reste sur le disque : 2 semaines à partir de l'ouverture (validé par le mainteneur). Pas encore dans le code.

**Nettoyage**:
Suppression des ressources du disque sorties de la période de cache et de leur prolongation. Elles vont dans la corbeille d'Obsidian. Pas encore dans le code.
_À éviter_ : purge, vidage

**Consultation de l'année**:
La vue qui liste les contenus de séance de toutes les semaines sans rien télécharger. Pas encore dans le code.
_À éviter_ : historique

**Conservation définitive** (nom à trancher avec l'interface):
Déposer une note de séance dans son coffre, par glisser-déposer : elle est créée avec ses ressources, qui restent sur le disque pour toujours, hors nettoyage. Pour l'élève comme pour le parent. Pas encore dans le code.


## Ce que l'élève rédige

**Cours**:
Ce que l'élève rédige pour une matière. Ce n'est pas une séance. Pas encore dans le code.

**Exercice**:
Un exercice que l'élève rédige ou résout. Pas encore dans le code.

**Flashcard**:
Une carte question/réponse à réviser (format à choisir). Pas encore dans le code.


## Interface

**Onglet de consultation**:
Un onglet Obsidian pour l'usage courant : devoirs, contenus de séance et ressources, en tuiles, navigation par semaine.

**Tableau de bord**:
L'interface principale du plugin : une tuile par catégorie, déplaçables, la « tour de contrôle » du travail de l'élève. Ce n'est pas l'onglet de consultation.

**Tuile**:
Un bloc du tableau de bord ou de l'onglet de consultation (devoirs, séances, notes…).

**Raccourci**:
Un bouton en bas du tableau de bord qui crée un cours, un exercice ou une flashcard, rangé dans la bonne matière.


## Travail et résultats

**Devoir**:
Un travail à faire, avec une échéance. Dans le code : `HomeworkDTO`.

**Note**:
Un résultat chiffré. Dans le code : `GradeDTO`.

**Évaluation par compétences**:
Un résultat par niveau d'acquisition, sans chiffre (collège de l'élève). Ce n'est pas une note. Pas encore dans le code.


## Comptes et modes

**Compte**:
Une connexion Pronote (un QR code), propre à un établissement.

**Espace parent / espace élève**:
Les deux types de compte Pronote. Un compte parent n'a ici qu'un élève rattaché.

**Enfant**:
L'élève dont on lit les données.

**Mode Enfant / mode Parent**:
Réglage du plugin : un seul compte, ou un compte par enfant (établissements différents possibles).

**Clé stable**:
Identifiant d'un cours ou d'un devoir tiré de son contenu. Jamais l'identifiant Pronote, qui change à chaque connexion (`src/keys.ts`).


## Environnements

**Coffre**:
Un coffre Obsidian.

**Vrai coffre**:
Celui du mainteneur : jamais touché par un agent de développement.

**Banc**:
`.banc/coffre` : coffre de test où se vérifient les conditions réelles (PD-005).
