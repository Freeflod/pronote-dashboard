# PD-019 · HTML de Pronote gardé dans le cache pour l'écran, Markdown pour le coffre

**Contexte.** Le texte d'un contenu de séance arrive de Pronote en HTML (gras, listes, couleurs). `htmlToMarkdown` le convertit en Markdown simple pour les notes de séance du coffre ; affiché tel quel à l'écran, ce Markdown montrait ses marques (`**`) et perdait les couleurs.

**Retenu.**
- `LessonContentDTO` porte les deux formes : `text` (Markdown, inchangé, seul lu par la synchronisation du coffre) et `html` (HTML tel que reçu), rangées ensemble dans le cache IndexedDB ([PD-009](0009-cache-indexeddb-par-appareil-et-architecture-depot-de-donnee.md)). Jamais dans `data.json`, jamais dans une note.
- L'écran rend `html` par `renderRichHtml` : analyse hors de la page (`DOMParser`), puis reconstruction par `createEl` depuis une liste blanche de balises (`src/rich-color.ts`). Aucun attribut n'est recopié ; seuls passent le `href` d'un lien http ou https et des classes de couleur. Jamais `innerHTML`.
- Les couleurs du professeur sont ramenées aux huit couleurs d'Obsidian (la plus proche par teinte) : elles suivent le thème. Gris, noir et blanc ne colorent rien.
- `html` n'est gardé que jusqu'à 30 000 caractères ; au-delà, seul `text` s'affiche. Le choix d'affichage des séances est gardé par appareil sous une clé hachée, sans nom d'élève.
- Une entrée de cache sans `html` (écrite par une version précédente) s'affiche par `text` jusqu'à sa prochaine lecture sur Pronote : aucune migration du cache.

**Écarté.** Rendre à l'écran le Markdown de `text` : les couleurs y sont déjà perdues, et l'enrichir changerait les notes du coffre.

**Conséquence.** Le texte des séances est gardé sous deux formes : il pèse plus lourd dans le cache (non mesuré). Toute nouvelle balise ou tout nouvel attribut à rendre s'ajoute à la liste blanche, avec son test. Les devoirs, les ressources et les messages passent encore par `renderRichParagraph`. Non vérifié : contraste des couleurs dans les thèmes de la communauté.
