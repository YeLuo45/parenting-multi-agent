/**
 * OrchestratorCore — multi-agent coordination for parenting questions.
 *
 * Architecture (chatdev Puppeteer + nanobot MessageBus):
 * 1. L0 rule check: emergency → bypass agents, return escalation
 * 2. Route: detect topics + match child stage, score agents
 * 3. Invoke: top N agents in parallel, each with child profile + memory context
 * 4. Coordinate: collect replies, filter by confidence, format result
 * 5. Log: write episode to memory + publish events on bus
 */

import {
	type ChildProfile,
	computeStage,
	type Episode,
	matchL0Rule,
} from "@parenting/memory";

import { MessageBus } from "./bus.js";
import {
	type Agent,
	type AgentContext,
	type AgentReply,
	type AgentStats,
	type AgentTopic,
	detectTopics,
	type AgentWeightHints,
	type Feedback,
	type FeedbackRating,
	type MemoryLayerLike,
	type OrchestratorConfig,
	type OrchestratorEvent,
	type OrchestratorResult,
	type RedFlag,
	type UrgencyLevel,
} from "./types.js";

// ─── Helper functions (exposed for direct testing) ─────────────────

export function applyTopicMatch(
	agents: Map<string, Agent>,
	scores: Map<string, number>,
	topics: AgentTopic[],
): Set<string> {
	const topicMatched = new Set<string>();
	for (const agent of agents.values()) {
		let score = 0;
		for (const topic of topics) {
			if (agent.topics.includes(topic)) score += 10;
		}
		if (score > 0) {
			const existing = scores.get(agent.id);
			scores.set(agent.id, (existing ?? 0) + score);
			topicMatched.add(agent.id);
		}
	}
	return topicMatched;
}

export function applyStageBonus(
	agents: Map<string, Agent>,
	scores: Map<string, number>,
	topicMatched: Set<string>,
	alwaysInvoke: string[],
	child: ChildProfile,
): void {
	for (const agent of agents.values()) {
		const eligible =
			topicMatched.has(agent.id) || alwaysInvoke.includes(agent.id);
		if (eligible && agent.stages.includes(child.stage)) {
			const existing = scores.get(agent.id);
			scores.set(agent.id, (existing ?? 0) + 5);
		}
	}
}

/** Boost scores using per-agent feedback. Maps avgRating (0-5) → boost (0-5).
 *  Pure function so feedback lookup can be injected for testing. */
export function applyFeedbackBoost(
	scores: Map<string, number>,
	getAvg: (agentId: string) => number,
): void {
	for (const [agentId, score] of scores.entries()) {
		const boost = getAvg(agentId);
		if (boost > 0) scores.set(agentId, score + boost);
	}
}

/**
 * Apply workbench-derived per-agent weight hints. Each hint's fractional
 * boost is scaled by `WORKBENCH_HINT_MULTIPLIER` (default 10) so that a
 * 0.3 boost is equivalent to one stage bonus. Negative hints can demote
 * an agent, and the floor is clamped to 0 (we never let routing scores
 * go negative). Agents that are not already in the score map are
 * ignored — hints are nudges, not new candidates.
 */
export const WORKBENCH_HINT_MULTIPLIER = 10;

export function applyWorkbenchHints(
	scores: Map<string, number>,
	hints: AgentWeightHints,
): void {
	for (const hint of hints.boosts) {
		if (hint.boost === 0) continue;
		const current = scores.get(hint.agentId);
		if (current === undefined) continue;
		const delta = Math.round(hint.boost * WORKBENCH_HINT_MULTIPLIER);
		const next = Math.max(0, current + delta);
		scores.set(hint.agentId, next);
	}
}

export function mapL0Severity(
	severity: NonNullable<ReturnType<typeof matchL0Rule>>["severity"],
): UrgencyLevel {
	return severity === "warn" ? "high" : severity;
}

export class OrchestratorCore {
	private agents = new Map<string, Agent>();
	private bus: MessageBus;
	private config: Required<Omit<OrchestratorConfig, "alwaysInvoke">> & {
		alwaysInvoke: string[];
	};

	constructor(config: OrchestratorConfig) {
		this.bus = new MessageBus();
		this.config = {
			maxAgentsPerAsk: config.maxAgentsPerAsk ?? 2,
			minConfidence: config.minConfidence ?? 0.3,
			alwaysInvoke: config.alwaysInvoke ?? [],
			memory: config.memory,
		};
	}

	// ─── Registration ─────────────────────────────────────────────────────

	registerAgent(agent: Agent): void {
		this.agents.set(agent.id, agent);
	}

	unregisterAgent(agentId: string): boolean {
		return this.agents.delete(agentId);
	}

	listAgents(): Agent[] {
		return Array.from(this.agents.values());
	}

	getAgent(agentId: string): Agent | undefined {
		return this.agents.get(agentId);
	}

	// ─── Feedback & self-evolution ────────────────────────────────────────

	/**
	 * Record user feedback for an agent reply. Persists via memory when
	 * memory implements addFeedback. Returns the stored feedback or null.
	 */
	recordFeedback(
		childId: string,
		episodeId: string,
		agentId: string,
		rating: FeedbackRating,
		comment?: string,
	): Feedback | null {
		if (!this.config.memory.addFeedback) return null;
		return this.config.memory.addFeedback({
			childId,
			episodeId,
			agentId,
			rating,
			comment,
		});
	}

	/**
	 * Compute aggregate stats for one agent from its feedback history.
	 * Returns zeros if no feedback exists or memory doesn't support it.
	 */
	getAgentStats(agentId: string, limit = 20): AgentStats {
		const empty: AgentStats = {
			agentId,
			count: 0,
			avgRating: 0,
			positiveCount: 0,
		};
		if (!this.config.memory.getFeedback) return empty;
		const items = this.config.memory.getFeedback(agentId, limit);
		if (items.length === 0) return empty;
		let total = 0;
		let positive = 0;
		for (const fb of items) {
			total += fb.rating;
			if (fb.rating >= 4) positive++;
		}
		return {
			agentId,
			count: items.length,
			avgRating: total / items.length,
			positiveCount: positive,
		};
	}

	// ─── Workbench agent hints ───────────────────────────────────────

	/** Store workbench-derived per-child agent weight hints. */
	setAgentHints(childId: string, hints: AgentWeightHints): void {
		if (this.config.memory.setAgentHints) {
			this.config.memory.setAgentHints(childId, hints);
		}
	}

	/** Read workbench-derived per-child agent weight hints, or null. */
	getAgentHints(childId: string): AgentWeightHints | null {
		if (!this.config.memory.getAgentHints) return null;
		return this.config.memory.getAgentHints(childId);
	}

	/**
	 * Routing boost for an agent based on historical feedback.
	 * Maps avgRating (0-5) to a boost of 0-5 extra points added to the
	 * routing score. Returns 0 when no feedback is available.
	 */
	feedbackBoost(agentId: string): number {
		const stats = this.getAgentStats(agentId);
		if (stats.count === 0) return 0;
		return stats.avgRating;
	}

	// ─── Bus ──────────────────────────────────────────────────────────────

	getBus(): MessageBus {
		return this.bus;
	}

	subscribe(handler: (event: OrchestratorEvent) => void): () => void {
		return this.bus.subscribe(handler);
	}

	// ─── Core: ask ────────────────────────────────────────────────────────

	async ask(
		question: string,
		child: ChildProfile,
	): Promise<OrchestratorResult> {
		return this.runAsk(question, child, undefined);
	}

	/**
	 * Continue a prior L4 session: pull the session from memory, refresh it,
	 * and route the new question with the same sessionId so events and episodes
	 * stay grouped. The session is auto-created on first ask.
	 */
	async askFollowup(
		sessionId: string,
		question: string,
		child: ChildProfile,
	): Promise<OrchestratorResult> {
		// Validate the session exists; refuse to silently fork.
		const existing = this.config.memory.getSession(sessionId);
		if (!existing) {
			throw new Error(`Session ${sessionId} not found`);
		}
		// Bump lastActive so callers can detect recent sessions.
		try {
			this.config.memory.updateSession(sessionId, existing.context);
		} catch {
			// best-effort: session may not support update
		}
		return this.runAsk(question, child, sessionId);
	}

	private async runAsk(
		question: string,
		child: ChildProfile,
		sessionId: string | undefined,
	): Promise<OrchestratorResult> {
		const startedAt = Date.now();
		const childWithStage: ChildProfile = {
			...child,
			stage: child.stage ?? computeStage(child.birthDate),
		};
		const activeSessionId =
			sessionId ?? this.openSession(childWithStage.id);

		this.bus.publish({
			type: "ask_started",
			question,
			childId: childWithStage.id,
			sessionId: activeSessionId,
			at: startedAt,
		});

		// 1. L0 escalation check (memory layer provides the rules)
		const l0Rule = matchL0Rule(question);
		if (l0Rule) {
			const redFlag: RedFlag = {
				severity: mapL0Severity(l0Rule.severity),
				ruleId: l0Rule.id,
				description: l0Rule.description,
				action: l0Rule.action,
			};
			this.bus.publish({
				type: "l0_escalation",
				childId: childWithStage.id,
				redFlag,
				sessionId: activeSessionId,
				at: Date.now(),
			});
			const completedAt = Date.now();
			// log episode
			this.logEpisode(childWithStage.id, "qa", {
				question,
				redFlag: true,
				ruleId: l0Rule.id,
				severity: l0Rule.severity,
				sessionId: activeSessionId,
			});
			return {
				question,
				childId: childWithStage.id,
				replies: [],
				redFlag,
				emergencyEscalation: true,
				startedAt,
				completedAt,
				sessionId: activeSessionId,
			};
		}

		// 2. Route: pick agents to invoke
		const matchedAgentIds = this.route(question, childWithStage);
		this.bus.publish({
			type: "routing",
			childId: childWithStage.id,
			matchedAgentIds,
			sessionId: activeSessionId,
			at: Date.now(),
		});

		// 3. Invoke matched agents in parallel
		const context: AgentContext = {
			memory: this.config.memory,
			sessionId: activeSessionId,
		};
		const replyPromises = matchedAgentIds.map((agentId) => {
			const agent = this.agents.get(agentId);
			if (!agent) return null;
			return agent.respond(question, childWithStage, context);
		});
		const settled = await Promise.allSettled(
			replyPromises.filter((p): p is Promise<AgentReply> => p !== null),
		);
		const replies: AgentReply[] = settled
			.filter(
				(r): r is PromiseFulfilledResult<AgentReply> =>
					r.status === "fulfilled",
			)
			.map((r) => r.value)
			.filter((r) => r.confidence >= this.config.minConfidence);

		// 4. Publish each reply
		for (const reply of replies) {
			this.bus.publish({
				type: "agent_reply",
				childId: childWithStage.id,
				reply,
				sessionId: activeSessionId,
				at: Date.now(),
			});
		}

		const completedAt = Date.now();
		this.bus.publish({
			type: "ask_completed",
			childId: childWithStage.id,
			replies,
			sessionId: activeSessionId,
			at: completedAt,
		});

		// 5. Log episode
		this.logEpisode(childWithStage.id, "qa", {
			question,
			agents: replies.map((r) => r.agentId),
			redFlag: false,
			sessionId: activeSessionId,
		});

		return {
			question,
			childId: childWithStage.id,
			replies,
			emergencyEscalation: false,
			startedAt,
			completedAt,
			sessionId: activeSessionId,
		};
	}

	// ─── Routing (Puppeteer pattern) ──────────────────────────────────────

	private route(question: string, child: ChildProfile): string[] {
		const topics = detectTopics(question);
		const scores = new Map<string, number>();

		// Always-invoke agents (bypass topic filter)
		for (const agentId of this.config.alwaysInvoke) {
			if (this.agents.has(agentId)) {
				scores.set(agentId, 1000);
			}
		}

		// Topic match + stage bonus
		const topicMatched = applyTopicMatch(this.agents, scores, topics);
		applyStageBonus(
			this.agents,
			scores,
			topicMatched,
			this.config.alwaysInvoke,
			child,
		);
		applyFeedbackBoost(scores, (agentId) => this.feedbackBoost(agentId));
		// Workbench hints nudge the final order based on completion + sentiment
		const hints = this.getAgentHints(child.id);
		if (hints) {
			applyWorkbenchHints(scores, hints);
		}

		// Sort by score desc, take top N
		const sorted = Array.from(scores.entries())
			.filter(([, score]) => score > 0)
			.sort((a, b) => b[1] - a[1]);

		return sorted.slice(0, this.config.maxAgentsPerAsk).map(([id]) => id);
	}

	// ─── Helper functions (exposed for direct testing) ─────────────────

	private logEpisode(
		childId: string,
		type: Episode["type"],
		content: Record<string, unknown>,
	): void {
		try {
			this.config.memory.addEpisode(childId, type, content);
		} catch (err) {
			console.error("Failed to log episode:", err);
		}
	}

	/**
	 * Open a new L4 working-memory session for the child. Falls back to
	 * a synthetic in-memory id when memory doesn't implement startSession.
	 */
	private openSession(childId: string): string {
		try {
			const session = this.config.memory.startSession(childId, {});
			return session.id;
		} catch {
			// Memory doesn't support L4; return a synthetic id so downstream
			// code can still pass a stable handle. Prefixed "memless-" so it
			// is obviously not a real session.
			return `memless-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		}
	}

	/** Test-only: count of synthetic fallback sessions opened in this process. */
	__syntheticSessionCount = 0;

	/**
	 * Build the AgentContext for a given ask, including sessionId and
	 * last N episodes from this child's history. Exposed for tests.
	 */
	buildContext(
		childId: string,
		sessionId: string,
		recentEpisodes = 3,
	): AgentContext {
		const episodes = this.config.memory.getEpisodes(
			childId,
			"qa",
			recentEpisodes,
		);
		return {
			memory: this.config.memory,
			sessionId,
			recentEpisodes: episodes.length,
		};
	}
}
