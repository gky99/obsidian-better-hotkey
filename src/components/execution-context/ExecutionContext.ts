/**
 * Execution Context Component
 * Responsibility: Wrapper exposing execution-related components as properties
 * Provides unified access to kill ring and workspace operations for commands
 * Based on Architecture.md § 3 - Execution Context
 */

import type { App } from "obsidian";
import { KillRing } from "./KillRing";
import { WorkspaceContext } from "./WorkspaceContext";

export class ExecutionContext {
	public readonly killRing: KillRing;
	public readonly workspaceContext: WorkspaceContext;

	/**
	 * Create execution context with app instance
	 * @param app - Obsidian App instance (required for WorkspaceContext)
	 */
	constructor(app: App) {
		this.killRing = new KillRing();
		this.workspaceContext = new WorkspaceContext(app);
	}
}
