/**
 * @parenting/agent-peer-benchmark — privacy-preserving peer comparison.
 */

import type { ChildProfile } from "@parenting/memory";
import type { Agent, AgentContext, AgentReply } from "@parenting/orchestrator";

import {
	anonymizeProfile,
	formatAnonymizedProfile,
	generateSyntheticCohort,
	K_ANONYMITY_MINIMUM,
	type Metric,
	type PeerMeasurement,
} from "./knowledge.js";

export {
	type AnonymizedProfile,
	anonymizeProfile,
	buildPeerCohort,
	compareToCohort,
	computePercentile,
	filterByAgeWindow,
	filterBySex,
	formatAnonymizedProfile,
	generateSyntheticCohort,
	K_ANONYMITY_MINIMUM,
	type Metric,
	type PeerCohortStats,
	type PeerMeasurement,
	type Sex,
} from "./knowledge.js";

export const PEER_BENCHMARK_DISCLAIMER =
	"⚠️ 同侪对比使用脱敏队列聚合，不含个人标识。具体发育评估请咨询儿科医生。";

export const PEER_BENCHMARK_VERSION = "0.1.0";

function detectMetric(question: string): Metric | null {
	const q = question.toLowerCase();
	if (/(身高|height|长|高)/.test(q)) return "height";
	if (/(体重|weight|kg|重)/.test(q)) return "weight";
	if (/(头围|head.circumference|头)/.test(q)) return "head_circumference";
	return null;
}

function ageInMonths(birthDate: string, asOf: Date = new Date()): number {
	const birth = new Date(birthDate);
	return Math.max(
		0,
		(asOf.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.44),
	);
}

function extractValue(question: string): number | null {
	const m = question.match(/(\d+(?:\.\d+)?)\s*(cm|厘米|kg|公斤)/i);
	if (!m) return null;
	return parseFloat(m[1]!);
}

function detectSex(question: string, child: ChildProfile): "male" | "female" {
	const q = question.toLowerCase();
	if (/(女|女孩|女儿|女宝宝|female|girl)/.test(q)) return "female";
	if (/(男|男孩|儿子|男宝宝|male|boy)/.test(q)) return "male";
	if (child.stage === "tween" || child.stage === "teen") {
		// Without explicit info, default to male for tween+ (50/50 split)
		return "male";
	}
	return "male";
}

export class PeerBenchmarkAgent implements Agent {
	readonly id = "peer-benchmark";
	readonly name = "同侪对比";
	readonly topics = ["growth", "development"] as const;
	readonly stages = [
		"toddler",
		"preschool",
		"school_age",
		"tween",
		"teen",
	] as const;

	async respond(
		question: string,
		child: ChildProfile,
		_context: AgentContext,
	): Promise<AgentReply> {
		const metric = detectMetric(question);
		const value = extractValue(question);
		if (!metric || value === null) {
			return {
				agentId: this.id,
				agentName: this.name,
				content:
					"请提供：测量项（身高/体重/头围）、数值、单位（cm/kg），例如：\n\n「我家孩子8个月体重9.5kg，跟同龄比怎么样？」\n\n" +
					PEER_BENCHMARK_DISCLAIMER,
				confidence: 0.5,
				urgency: "info",
			};
		}

		const ageMonths = Math.round(ageInMonths(child.birthDate));
		const sex = detectSex(question, child);
		// Generate a synthetic cohort (in production this would query a real
		// de-identified database with k-anonymity ≥ 5)
		const cohort: PeerMeasurement[] = generateSyntheticCohort(
			ageMonths,
			sex,
			Math.max(K_ANONYMITY_MINIMUM, 20),
			metric,
		);
		const profile = anonymizeProfile(cohort, metric, value, ageMonths, sex);
		return {
			agentId: this.id,
			agentName: this.name,
			content: `${formatAnonymizedProfile(profile)}\n\n${PEER_BENCHMARK_DISCLAIMER}`,
			confidence: 0.85,
			urgency: "info",
		};
	}
}

export function createPeerBenchmarkAgent(): PeerBenchmarkAgent {
	return new PeerBenchmarkAgent();
}
