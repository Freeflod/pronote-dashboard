# PD-009 · Cache IndexedDB par appareil et architecture « dépôt de données + composants communs »

- **Statut** : Acceptée
- **Date** : 2026-11-08
- **Poids** : Structurant

**Contexte.** La refonte de l'interface remplace `src/view.ts`. L'écran doit se consulter hors ligne, afficher un état (chargement, vide, erreur, hors ligne) par bloc, et garder le texte environ un mois et les fichiers selon les semaines réglées. Le cache actuel (`account.cache`, un instantané par compte dans `data.json`) ne le permet pas et `data.json` porte déjà les jetons.

**Retenu.**
- Architecture A : un dépôt de données (récupération par bloc, normalisation, cache avec durée de vie) et une bibliothèque de composants communs `src/ui/`. L'écran lit le cache puis se rafraîchit ; la logique pure se teste sans Obsidian.
- Cache dans **IndexedDB**, par appareil et non synchronisé, base nommée avec l'id du plugin et l'id du coffre. Clé : `account.id` + élève. Il ne contient aucun jeton. Sa perte est tolérée : il se reconstruit.
- Réglages enregistrés dans `data.json` (`migrate.ts` v4) : durée de conservation du texte (défaut 30 jours), plafond du cache de fichiers en Mo, **curseur par paliers de 50** (0, 50, 100, 150, 200 ; défaut 50 ; 0 = aucun fichier en cache), rappels par matière. Bouton « Vider le cache ». Au plafond, les fichiers les plus anciens sont évincés ; un fichier plus gros que le plafond n'est pas mis en cache.
- Maximum de 200 Mo : quatre fois le défaut, très au-dessus du besoin mesuré (12 pièces jointes, 3,6 Mo, maximum 1,54 Mo) et prudent tant que le quota mobile n'est pas vérifié.

**Écarté — un instantané par compte (approche B).** Ni états par bloc, ni durées de vie différentes entre texte et fichiers.
**Écarté — `data.json`.** Il gonflerait, serait synchronisé entre appareils et côtoierait les jetons.
**Écarté — dossier du plugin via l'API Adapter.** La doc demande de préférer l'API Vault ; l'Adapter est à éviter hors cas obligé.

**Conséquence.** Nouveaux `src/ui/` et couche de données ; `view.ts` et son CSS remplacés ; `Snapshot` et `collect` restent tant que `sync.ts` les utilise ; `account.cache` n'est supprimé que s'il n'est lu que par l'ancienne vue. Non vérifié : quota et éviction d'IndexedDB sur mobile.
