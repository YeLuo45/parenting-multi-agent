/**
 * Workbench state persistence shim.
 *
 * MVP: store serialized JSON in `localStorage`. The interface mirrors what
 * an IndexedDB-backed implementation would look like, so swapping in
 * IndexedDbMemoryLayer later is purely an implementation change.
 */

import {
	deserializeWorkbenchState,
	serializeWorkbenchState,
	type WorkbenchPersistedState,
} from "./web-iteration-suite.js";

const STORAGE_KEY = "parenting.workbench.v1";

export interface WorkbenchStorage {
	load(): WorkbenchPersistedState | null;
	save(state: WorkbenchPersistedState): void;
	clear(): void;
}

export class LocalStorageWorkbenchStorage implements WorkbenchStorage {
	constructor(private readonly key: string = STORAGE_KEY) {}

	load(): WorkbenchPersistedState | null {
		try {
			if (typeof localStorage === "undefined") return null;
			const raw = localStorage.getItem(this.key);
			if (!raw) return null;
			return deserializeWorkbenchState(raw);
		} catch {
			return null;
		}
	}

	save(state: WorkbenchPersistedState): void {
		try {
			if (typeof localStorage === "undefined") return;
			localStorage.setItem(this.key, serializeWorkbenchState(state));
		} catch {
			// swallow quota errors so the UI never blocks on persistence
		}
	}

	clear(): void {
		try {
			if (typeof localStorage === "undefined") return;
			localStorage.removeItem(this.key);
		} catch {
			// ignore
		}
	}
}

export class InMemoryWorkbenchStorage implements WorkbenchStorage {
	private value: WorkbenchPersistedState | null = null;

	load(): WorkbenchPersistedState | null {
		return this.value ? { ...this.value } : null;
	}

	save(state: WorkbenchPersistedState): void {
		this.value = {
			guidedIntake: { ...state.guidedIntake },
			actionBoard: { ...state.actionBoard, notes: { ...state.actionBoard.notes } },
		};
	}

	clear(): void {
		this.value = null;
	}
}

export function createWorkbenchStorage(): WorkbenchStorage {
	if (typeof localStorage === "undefined") {
		return new InMemoryWorkbenchStorage();
	}
	return new LocalStorageWorkbenchStorage();
}
