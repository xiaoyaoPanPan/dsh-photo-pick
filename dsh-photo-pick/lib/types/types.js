/**
 * Photo-pick shared types and errors.
 * @module dsh-photo-pick/types
 */
/** Structured photo-pick failure. */
export class PhotoPickError extends Error {
    code;
    /**
     * @param message - human-readable detail.
     * @param code - stable machine code.
     */
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'PhotoPickError';
    }
}
//# sourceMappingURL=types.js.map