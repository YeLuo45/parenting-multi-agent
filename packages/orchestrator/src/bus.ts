/**
 * MessageBus — pub/sub event bus for multi-agent coordination (nanobot pattern).
 *
 * Agents subscribe to events they care about; the orchestrator publishes events.
 * Synchronous delivery (no queue/async) — orchestrator controls the flow.
 */

import type { OrchestratorEvent } from "./types.js";

export type EventHandler = (event: OrchestratorEvent) => void;
export type Unsubscribe = () => void;

export class MessageBus {
	private handlers = new Set<EventHandler>();
	private history: OrchestratorEvent[] = [];
	private historyLimit: number;

	constructor(historyLimit: number = 100) {
		this.historyLimit = historyLimit;
	}

	/** Subscribe to all events. Returns unsubscribe function. */
	subscribe(handler: EventHandler): Unsubscribe {
		this.handlers.add(handler);
		return () => this.handlers.delete(handler);
	}

	/** Publish an event to all subscribers + append to history. */
	publish(event: OrchestratorEvent): void {
		this.history.push(event);
		if (this.history.length > this.historyLimit) {
			this.history.shift();
		}
		for (const handler of this.handlers) {
			try {
				handler(event);
			} catch (err) {
				// Don't let one bad handler break the bus
				console.error("MessageBus handler error:", err);
			}
		}
	}

	/** Filter history by event type. */
	getHistory(eventType?: OrchestratorEvent["type"]): OrchestratorEvent[] {
		if (!eventType) return [...this.history];
		return this.history.filter((e) => e.type === eventType);
	}

	/** Clear history. */
	clearHistory(): void {
		this.history = [];
	}

	/** Number of active subscribers. */
	get subscriberCount(): number {
		return this.handlers.size;
	}
}
