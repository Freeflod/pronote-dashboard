# PD-002 · `main` seule branche protégée, protection locale uniquement

- **Statut** : Remplacée par PD-014
- **Date** : 2026-11-06
- **Poids** : Moyen

**Retenu.** `main` est la branche de référence et correspond à ce qui est publié. Le travail passe par des branches `lot/…`, `fix/…`, `chore/…`, puis une PR. Les hooks `.githooks/` (pre-commit, pre-push) refusent commit et push directs sur `main` et lancent gitleaks et les contrôles.

**Écarté — branche `dev` d'intégration.** Projet solo, sans environnement intermédiaire.
**Écarté — hooks husky.** Une dépendance de plus pour le même résultat.

**Conséquence.** L'offre GitHub gratuite refuse protection de branche et rulesets sur un dépôt privé (HTTP 403, mesuré le 2026-11-06). Seuls les hooks locaux protègent `main` : la dette est soldée par PD-014.
