# Pronote Dashboard : vocabulaire

Un mot, un sens, partout (issues, README, code, interface). Un mot nouveau qu'on se met à utiliser s'ajoute ici avant d'entrer dans le code.

## Séances et ressources

**Matière** : une discipline (Mathématiques…). Dans le code : `subject`.

**Séance** : un créneau de l'emploi du temps pour une matière (heure, professeurs). Dans le code : `LessonDTO`. À éviter : cours, leçon.

**Contenu de séance** : le texte que le professeur écrit pour une séance dans le cahier de texte : titre, catégorie, texte. Dans le code : `LessonContentDTO`. À éviter : contenu de cours.

**Note de séance** : le fichier Markdown du coffre qui garde un contenu de séance, sous `Séances/<matière>/`. Le plugin ne la supprime ni ne la réécrit jamais. À éviter : note de cours.

**Ressource** : un fichier ou un lien joint à un contenu de séance ou à un devoir. Dans le code : `AttachmentDTO`. À éviter : pièce jointe.

**Ressource sur le disque** : une ressource téléchargée dans le coffre. Dans le code : `fileIndex`.

**Ressource sur le web** : une ressource qui n'existe que sur Pronote ; la note de séance porte un lien vers Pronote. Dans le code : `isFile`, `url`.

**Période de cache** : les semaines autour d'aujourd'hui lues et gardées (`weeksBack`, `weeksAhead`). À éviter : fenêtre, horizon.

## Travail et résultats

**Devoir** : un travail à faire, avec une échéance. Dans le code : `HomeworkDTO`.

**Note** : un résultat chiffré. Dans le code : `GradeDTO`.

**Évaluation par compétences** : un résultat par niveau d'acquisition (A+, A, C, E), sans chiffre. Ce n'est pas une note.

**Niveau estimé** : niveau global calculé par le plugin à partir des compétences, indicatif, différent de celui de Pronote.

## Comptes et modes

**Compte** : une connexion Pronote (un QR code), propre à un établissement.

**Espace parent / espace élève** : les deux types de compte Pronote. Un compte parent peut donner accès à plusieurs élèves.

**Enfant** : l'élève dont on lit les données.

**Mode Enfant / mode Parent** : réglage du plugin, un seul compte ou un compte par enfant (établissements différents possibles).

**Clé stable** : identifiant d'une séance ou d'un devoir tiré de son contenu, jamais l'identifiant Pronote qui change à chaque connexion (`src/keys.ts`).

## Interface

**Écran** : l'interface du plugin, ouverte dans un onglet ou dans la barre latérale, avec un onglet par enfant en mode Parent.

**Bloc** : une partie de l'écran (devoirs, cartable, ressources, messages, résultats…), avec ses états chargement, vide, erreur, hors ligne.
