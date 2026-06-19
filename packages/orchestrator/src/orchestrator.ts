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

import { computeStage, matchL0Rule, type ChildProfile, type MemoryLayer, type Episode } from "@parenting/memory";

import { MessageBus } from "./bus.js";
import {
	type Agent,
	type AgentContext,
	type AgentReply,
	type AgentTopic,
	type OrchestratorConfig,
	type OrchestratorEvent,
	type OrchestratorResult,
	type RedFlag,
	detectTopics,
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
		const eligible = topicMatched.has(agent.id) || alwaysInvoke.includes(agent.id);
		if (eligible && agent.stages.includes(child.stage)) {
			const existing = scores.get(agent.id);
			scores.set(agent.id, (existing ?? 0) + 5);
		}
	}
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

	// ─── Bus ──────────────────────────────────────────────────────────────

	getBus(): MessageBus {
		return this.bus;
	}

	subscribe(handler: (event: OrchestratorEvent) => void): () => void {
		return this.bus.subscribe(handler);
	}

	// ─── Core: ask ────────────────────────────────────────────────────────

	async ask(question: string, child: ChildProfile): Promise<OrchestratorResult> {
		const startedAt = Date.now();
		const childWithStage: ChildProfile = { ...child, stage: child.stage ?? computeStage(child.birthDate) };

		this.bus.publish({
			type: "ask_started",
			question,
			childId: childWithStage.id,
			at: startedAt,
		});

		// 1. L0 escalation check (memory layer provides the rules)
		const l0Rule = matchL0Rule(question);
		if (l0Rule) {
			const redFlag: RedFlag = {
				severity: l0Rule.severity,
				ruleId: l0Rule.id,
				description: l0Rule.description,
				action: l0Rule.action,
			};
			this.bus.publish({
				type: "l0_escalation",
				childId: childWithStage.id,
				redFlag,
				at: Date.now(),
			});
			const completedAt = Date.now();
			// log episode
			this.logEpisode(childWithStage.id, "qa", {
				question,
				redFlag: true,
				ruleId: l0Rule.id,
				severity: l0Rule.severity,
			});
			return {
				question,
				childId: childWithStage.id,
				replies: [],
				redFlag,
				emergencyEscalation: true,
				startedAt,
				completedAt,
			};
		}

		// 2. Route: pick agents to invoke
		const matchedAgentIds = this.route(question, childWithStage);
		this.bus.publish({
			type: "routing",
			childId: childWithStage.id,
			matchedAgentIds,
			at: Date.now(),
		});

		// 3. Invoke matched agents in parallel
		const context: AgentContext = {
			memory: this.config.memory,
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
			.filter((r): r is PromiseFulfilledResult<AgentReply> => r.status === "fulfilled")
			.map((r) => r.value)
			.filter((r) => r.confidence >= this.config.minConfidence);

		// 4. Publish each reply
		for (const reply of replies) {
			this.bus.publish({
				type: "agent_reply",
				childId: childWithStage.id,
				reply,
				at: Date.now(),
			});
		}

		const completedAt = Date.now();
		this.bus.publish({
			type: "ask_completed",
			childId: childWithStage.id,
			replies,
			at: completedAt,
		});

		// 5. Log episode
		this.logEpisode(childWithStage.id, "qa", {
			question,
			agents: replies.map((r) => r.agentId),
			redFlag: false,
		});

		return {
			question,
			childId: childWithStage.id,
			replies,
			emergencyEscalation: false,
			startedAt,
			completedAt,
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
		applyStageBonus(this.agents, scores, topicMatched, this.config.alwaysInvoke, child);

		// Sort by score desc, take top N
		const sorted = Array.from(scores.entries())
			.filter(([, score]) => score > 0)
			.sort((a, b) => b[1] - a[1]);

		return sorted.slice(0, this.config.maxAgentsPerAsk).map(([id]) => id);
	}

	// ─── Helper functions (exposed for direct testing) ─────────────────

	private logEpisode(childId: string, type: Episode["type"], content: Record<string, unknown>): void {
		try {
			this.config.memory.addEpisode(childId, type, content);
		} catch (err) {
			console.error("Failed to log episode:", err);
		}
	}
}
