/**
 * L0 Rules — hardcoded safety guardrails (generic-agent L0 pattern)
 *
 * These rules are checked BEFORE any agent reply. If a parent's question
 * matches an L0 rule, the system escalates regardless of agent response.
 */

export type L0RuleSeverity = "info" | "warn" | "emergency";

export interface L0Rule {
	id: string;
	pattern: RegExp;
	severity: L0RuleSeverity;
	description: string;
	action: string;
}

export const L0_RULES: L0Rule[] = [
	{
		id: "R001_infant_fever",
		pattern: new RegExp(
			"(3\\s*个?月(?!以上)|\\b0-3\\s*个?月\\b|\\bunder\\s*3\\s*months?\\b|\\b(?:[0-9]|0-1)\\s*months?\\s*(?:old\\b)?).*?(?:发烧|fever|38|39|40|41|42)",
			"i",
		),
		severity: "emergency",
		description: "Fever in infant under 3 months is a medical emergency",
		action: "Recommend immediate ER visit; do not wait for pediatrician office hours",
	},
	{
		id: "R002_infant_high_fever",
		pattern: /(婴儿|infant|baby).*(40|41|42)\s*度|high.fever.*infant/i,
		severity: "emergency",
		description: "High fever in infant (40°C+) requires urgent evaluation",
		action: "Recommend immediate medical attention",
	},
	{
		id: "R003_breathing_difficulty",
		pattern: /(呼吸困难|breathing.{0,20}difficulty|嘴唇发紫|lips.{0,10}blue|无法呼吸|can't.breathe)/i,
		severity: "emergency",
		description: "Breathing difficulty is always a medical emergency in children",
		action: "Recommend calling emergency services immediately",
	},
	{
		id: "R004_unconscious",
		pattern: /(昏迷|unconscious|无意识|意识丧失|loss.of.consciousness)/i,
		severity: "emergency",
		description: "Loss of consciousness requires immediate medical evaluation",
		action: "Recommend calling emergency services immediately",
	},
	{
		id: "R005_seizure",
		pattern: /(抽搐|seizure|惊厥|convulsion|癫痫发作)/i,
		severity: "emergency",
		description: "Seizure in a child requires immediate medical evaluation",
		action: "Recommend calling emergency services",
	},
	{
		id: "R010_self_harm",
		pattern: /(自残|suicide|自杀|self.harm|想死|想消失|不想活)/i,
		severity: "emergency",
		description: "Self-harm or suicidal ideation is a mental health crisis",
		action: "Recommend crisis hotline (988 in US, 400-161-9995 in China) and immediate professional help",
	},
	{
		id: "R011_psychosis",
		pattern: /(幻听|听到.{0,10}声音|看到.{0,10}不存在|幻觉|hallucination|psychosis)/i,
		severity: "emergency",
		description: "Psychotic symptoms in children require urgent psychiatric evaluation",
		action: "Recommend immediate psychiatric evaluation",
	},
	{
		id: "R020_head_injury",
		pattern: /(摔到头|撞到头|head.injury|头部受伤|concussion)/i,
		severity: "warn",
		description: "Head injury with concerning symptoms requires evaluation",
		action: "Watch for vomiting, confusion, loss of consciousness; seek care if any present",
	},
	{
		id: "R021_ingestion",
		pattern: /(误食|吞了|吃了.{0,10}药|ingestion|poison)/i,
		severity: "warn",
		description: "Possible poisoning/ingestion requires poison control consultation",
		action: "Call poison control hotline immediately",
	},
];

/**
 * Match a parent question against all L0 rules.
 * Returns the highest-severity matching rule, or null if none match.
 */
export function matchL0Rule(text: string): L0Rule | null {
	let best: L0Rule | null = null;
	const severityOrder: Record<L0RuleSeverity, number> = { info: 0, warn: 1, emergency: 2 };

	for (const rule of L0_RULES) {
		if (rule.pattern.test(text)) {
			if (!best || severityOrder[rule.severity] > severityOrder[best.severity]) {
				best = rule;
			}
		}
	}

	return best;
}
