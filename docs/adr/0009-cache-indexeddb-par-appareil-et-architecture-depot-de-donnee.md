# PD-009 · Cache IndexedDB par appareil, dépôt de données et composants communs

**Contexte.** L'écran doit se consulter hors ligne et afficher un état (chargement, vide, erreur, hors ligne) par bloc. `data.json` porte déjà les jetons et se synchronise entre appareils.

**Retenu.**
- Un dépôt de données (`src/data/` : récupération par bloc, normalisation, cache avec durée de vie) et des composants communs (`src/ui/`). L'écran lit le cache puis se rafraîchit ; la logique pure se teste sans Obsidian.
- Cache dans **IndexedDB**, par appareil, jamais dans `data.json`, sans jeton. Sa perte est tolérée : il se reconstruit.
- Réglages : durée de conservation du texte (30 jours par défaut), plafond des fichiers par paliers de 50 Mo (0 à 200, défaut 50, 0 = aucun fichier), bouton « Vider le cache ». Au plafond, les fichiers les plus anciens sont évincés.

**Écarté.** Un instantané par compte dans `data.json` : pas d'états par bloc, pas de durées différentes pour le texte et les fichiers.

**Conséquence.** Non vérifié : quota et éviction d'IndexedDB sur mobile.
