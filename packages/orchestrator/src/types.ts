/**
 * Core types for OrchestratorCore.
 */

import type { ChildProfile, ChildStage } from "@parenting/memory";

/** Topics an agent can handle. Used for routing. */
export type AgentTopic =
	| "health"
	| "vaccine"
	| "illness"
	| "nutrition"
	| "sleep"
	| "behavior"
	| "emotion"
	| "development"
	| "education"
	| "school"
	| "family"
	| "finance"
	| "legal"
	| "parent_support";

export type UrgencyLevel = "info" | "low" | "medium" | "high" | "emergency";

export interface RedFlag {
	severity: UrgencyLevel;
	ruleId: string;
	description: string;
	action: string;
}

export interface AgentReply {
	agentId: string;
	agentName: string;
	content: string;
	confidence: number; // 0-1
	urgency?: UrgencyLevel;
	redFlag?: RedFlag;
	suggestions?: string[];
}

/** Public Agent contract. Concrete agents implement this. */
export interface Agent {
	id: string;
	name: string;
	topics: AgentTopic[];
	stages: ChildStage[];
	respond(question: string, child: ChildProfile, context: AgentContext): Promise<AgentReply>;
}

export interface AgentContext {
	sessionId?: string;
	memory: import("@parenting/memory").MemoryLayer;
	recentEpisodes?: number; // how many recent episodes to include
}

/** Events that flow on the MessageBus. */
export type OrchestratorEvent =
	| { type: "ask_started"; question: string; childId: string; at: number }
	| { type: "l0_escalation"; childId: string; redFlag: RedFlag; at: number }
	| { type: "routing"; childId: string; matchedAgentIds: string[]; at: number }
	| { type: "agent_reply"; childId: string; reply: AgentReply; at: number }
	| { type: "ask_completed"; childId: string; replies: AgentReply[]; at: number };

export interface OrchestratorResult {
	question: string;
	childId: string;
	replies: AgentReply[];
	redFlag?: RedFlag;
	emergencyEscalation: boolean;
	startedAt: number;
	completedAt: number;
}

export interface OrchestratorConfig {
	/** Max agents to invoke per ask (default 2) */
	maxAgentsPerAsk?: number;
	/** Min confidence to include reply (default 0.3) */
	minConfidence?: number;
	/** Always invoke these agents regardless of routing (e.g. pediatrician for medical) */
	alwaysInvoke?: string[];
	/** Memory layer instance to use for L2 facts / L3 episodes */
	memory: import("@parenting/memory").MemoryLayer;
}

/**
 * Detect topic keywords in a parent question.
 * Returns matched topic IDs.
 */
export function detectTopics(question: string): AgentTopic[] {
	const q = question.toLowerCase();
	const topicMap: Array<[AgentTopic, RegExp]> = [
		["health", /(健康|health|不舒服|不太舒服|难受|生病|ill|sick|unwell)/i],
		["vaccine", /(疫苗|打针|vaccine|immuniz)/i],
		["illness", /(发烧|fever|咳嗽|cough|感冒|flu|腹泻|diarrhea|皮疹|rash|发烧|infection)/i],
		["nutrition", /(吃|食物|辅食|营养|食|nutrition|feed|吃奶|配方奶|formula|食谱|recipe|挑食|过敏|allergy)/i],
		["sleep", /(睡|sleep|夜醒|夜啼|哄睡|nap|insomnia|困)/i],
		["behavior", /(行为|behavior|发脾气|tantrum|打|咬|hit|咬人|不听话|disobey)/i],
		["emotion", /(情绪|害怕|怕|哭|伤心|生气|emotion|afraid|scared|cry|sad|angry|焦虑|anxiety|抑郁|depress)/i],
		["development", /(发育|发展|里程碑|成长|milestone|development|长牙|teeth|走路|walk|说话|speak|talk)/i],
		["education", /(教育|学习|读书|看书|绘本|education|learn|read|book|学什么|学龄|课程|学科|成绩|考试|作业|编程|stem|机器人|乐高|积木|画画|钢琴|乐器|舞蹈|游泳|课外|兴趣班|数学|语文|英语|英文|物理|化学|数学题|怎么学|学不会|不爱学习)/i],
		["school", /(学校|幼儿园|小学|中学|大学|school|kindergarten|college|university|升学|入学|上学|不肯上学|不想上学|逃学|休学|转学)/i],
		["family", /(家庭|夫妻|婆媳|祖辈|离婚|family|grandparent|divorce|吵架|闹矛盾|分居|单亲)/i],
		["emotion", /(情绪|害怕|怕|哭|伤心|生气|emotion|afraid|scared|cry|sad|angry|焦虑|抑郁|depress|紧张|panick)/i],
		["behavior", /(行为|behavior|发脾气|tantrum|打|咬|hit|咬人|不听话|disobey|不肯|拒绝|叛逆|闹|打人|欺负)/i],
		["parent_support", /(累|疲惫|压力|抑郁|无助|exhausted|stress|overwhelm|burnout|burned.out)/i],
	];
	const found: AgentTopic[] = [];
	for (const [topic, re] of topicMap) {
		if (re.test(q) && !found.includes(topic)) found.push(topic);
	}
	return found;
}
