// Nom de matière avec son repère de couleur : le point n'est jamais seul, le nom écrit l'accompagne.
// La couleur passe par une propriété CSS personnalisée (jamais de style en ligne).
export function renderSubject(parent: HTMLElement, subject: string, colors: Map<string, string>, cls = ""): HTMLElement {
	const el = parent.createSpan({ cls: `pronote-subject-name ${cls}`.trim() });
	const dot = el.createSpan({ cls: "pronote-dot", attr: { "aria-hidden": "true" } });
	const color = colors.get(subject);
	if (color) dot.setCssProps({ "--pronote-subject": color });
	el.createSpan({ cls: "pronote-subject-text", text: subject });
	return el;
}
