/**
 * Native open / reveal for photo-pick (OS default app / file manager).
 * @module dsh-photo-pick-local/native-open
 */
import { type NativeCommandRunner } from '@deepseek-ai/dsh-native-command';
/**
 * Reveal a path in the platform file manager (select file when supported).
 * @param path - absolute filesystem path.
 * @param signal - cancellation.
 * @param run - injectable runner (tests).
 */
export declare function revealPhotoPickPath(path: string, signal: AbortSignal, run?: NativeCommandRunner): Promise<void>;
/**
 * Whether a failed explorer.exe spawn is the known benign exit-code-1 case.
 * @param error - runner rejection.
 */
export declare function isWindowsExplorerBogusFailure(error: unknown): boolean;
/**
 * Open a path with the OS default application.
 * @param path - absolute filesystem path.
 * @param signal - cancellation.
 * @param run - injectable runner (tests).
 */
export declare function openPhotoPickPath(path: string, signal: AbortSignal, run?: NativeCommandRunner): Promise<void>;
//# sourceMappingURL=native-open.d.ts.map