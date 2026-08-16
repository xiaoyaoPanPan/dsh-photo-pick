import { Service } from "@deepseek-ai/cordis";
//#region src/types.ts
/** Structured photo-pick failure. */
var PhotoPickError = class extends Error {
	code;
	/**
	* @param message - human-readable detail.
	* @param code - stable machine code.
	*/
	constructor(message, code) {
		super(message);
		this.code = code;
		this.name = "PhotoPickError";
	}
};
//#endregion
//#region src/index.ts
/**
* Service Definition for the photo-pick capability seam (`ctx.photoPick`).
* Concrete backends such as `dsh-photo-pick-local` extend this class and
* populate `ctx.photoPick` when loaded as a Cordis plugin.
* @module dsh-photo-pick
*/
/**
* Abstract photo ranker over one mounted workspace root at a time.
* Callers pass the session cwd as `root`; the backend canonicalizes and
* confines every candidate path under that root.
*/
var PhotoPick = class extends Service {
	/**
	* @param ctx - Cordis context that receives `ctx.photoPick`.
	*/
	constructor(ctx) {
		super(ctx, "photoPick");
	}
};
//#endregion
export { PhotoPick, PhotoPickError };
