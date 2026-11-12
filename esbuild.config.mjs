import esbuild from "esbuild";
import { readFile } from "node:fs/promises";
import { builtinModules } from "node:module";
import { PAWNOTE_FILTER, patchPawnote } from "./scripts/pawnote-patch.ts";

const production = process.argv[2] === "production";

/** Correctif local de Pawnote-LTS (PD-007). Le build échoue s'il n'a pas pu être appliqué. */
const pawnotePatch = {
	name: "pawnote-lts-membre",
	setup(build) {
		let applied = false;
		build.onLoad({ filter: PAWNOTE_FILTER }, async (args) => {
			const contents = patchPawnote(await readFile(args.path, "utf8"));
			applied = true;
			return { contents, loader: "js" };
		});
		build.onEnd((result) => {
			if (!applied && result.errors.length === 0) {
				throw new Error("Correctif Pawnote-LTS non appliqué : le fichier chargé par esbuild a changé. Voir PD-007.");
			}
		});
	},
};

await esbuild.build({
	entryPoints: ["main.ts"],
	bundle: true,
	external: [
		"obsidian",
		"electron",
		"@codemirror/autocomplete",
		"@codemirror/collab",
		"@codemirror/commands",
		"@codemirror/language",
		"@codemirror/lint",
		"@codemirror/search",
		"@codemirror/state",
		"@codemirror/view",
		"@lezer/common",
		"@lezer/highlight",
		"@lezer/lr",
		...builtinModules,
	],
	format: "cjs",
	target: "es2020",
	platform: "browser",
	logLevel: "info",
	sourcemap: production ? false : "inline",
	minify: production,
	treeShaking: true,
	outfile: "main.js",
	plugins: [pawnotePatch],
});
