# PD-014 · Pas de hooks versionnés, protection de `main` côté serveur

**Contexte.** Un hook Git ne s'applique qu'à qui l'active : un fork ou un contributeur occasionnel l'ignore. Sur un dépôt public, la protection de branche de GitHub est la vraie barrière.

**Retenu.**
- Aucun hook versionné dans le dépôt.
- `main` est protégée côté GitHub : PR obligatoire, contrôles requis « Quality checks » (`npm run check`) et « Contrôle des secrets » (gitleaks), pas de push direct ni forcé, pas de suppression.
- Chacun lance `npm run check` avant sa PR.

**Écarté.** Hooks versionnés activés par `core.hooksPath`, ou husky : facultatifs, donc non contraignants.

**Conséquence.** Un commit direct sur `main` est refusé par GitHub, pas par un script local.
