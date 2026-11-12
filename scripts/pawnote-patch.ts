/**
 * Correctif local de Pawnote-LTS 1.6.4 appliqué au build (décision PD-007, issue #7).
 *
 * Depuis PRONOTE 2026, un compte parent doit désigner l'élève (« membre ») dans la signature de
 * chaque demande, sinon le serveur répond « accès refusé » puis ferme la session. pronotepy le fait
 * (ParentClient.post : membre = { N: id de l'élève, G: 4 }) ; Pawnote-LTS ne le fait pas.
 *
 * Le correctif modifie le constructeur de la classe de requête du bundle ESM de Pawnote-LTS. Si le
 * motif n'est pas trouvé exactement une fois (nouvelle version), le build échoue : il faut alors
 * vérifier si la version amont corrige le problème et retirer ce correctif.
 */

const FIND = "ae=class{constructor(e,s,t){this.session=e,this.name=s,this.data=t}";

export const REPLACE =
	"ae=class{constructor(e,s,t){this.session=e,this.name=s,this.data=t;" +
	"const k=ne(e).signature,sg=t&&t[k];" +
	"7===e.information.accountKind&&e.userResource&&sg&&void 0!==sg.onglet&&!sg.membre&&" +
	"(sg.membre={N:e.userResource.id,G:4})}";

/** Fichier de Pawnote-LTS que esbuild charge (bundle ESM). */
export const PAWNOTE_FILTER = /[\\/]@blockshub[\\/]pawnote-lts[\\/]dist[\\/]index\.m?js$/;

export function patchPawnote(source: string): string {
	const parts = source.split(FIND);
	if (parts.length !== 2) {
		throw new Error(
			"Correctif Pawnote-LTS : motif attendu introuvable ou multiple (version changée ?). Voir PD-007.",
		);
	}
	return parts.join(REPLACE);
}
