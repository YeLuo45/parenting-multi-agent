/**
 * SleepCoachAgent — sleep training, regressions, nap schedule, night-waking causes.
 */

import type { ChildProfile } from "@parenting/memory";
import type { Agent, AgentContext, AgentReply } from "@parenting/orchestrator";

import {
	BEDTIME_ROUTINE_STEPS,
	getNapSchedule,
	getNightWakingCauses,
	getSleepMethodsForAge,
	getSleepRegression,
	type NapSchedule,
	type NightWakingCause,
	type SleepRegression,
	type SleepTrainingMethod,
} from "./knowledge.js";

export const SLEEP_COACH_DISCLAIMER =
	"⚠️ 本回复仅供参考，不构成医疗建议。持续睡眠问题或疑似睡眠呼吸暂停请咨询儿科医生。";

function ageInMonths(birthDate: string, asOf: Date = new Date()): number {
	const birth = new Date(birthDate);
	return (asOf.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
}

function detectIntent(
	question: string,
):
	| "training"
	| "regression"
	| "schedule"
	| "night_waking"
	| "routine"
	| "general" {
	const q = question.toLowerCase();
	if (
		/(训练|睡眠训练|哭声|ferber|消退法|哄睡方法|训练方法|train|cry.it.out)/i.test(
			q,
		)
	)
		return "training";
	if (/(倒退|regression|睡眠倒退|突然不睡|夜醒频繁|夜惊)/i.test(q))
		return "regression";
	if (/(作息|schedule|小睡|nap|白天睡|几点睡|几时睡|晚间|睡觉时间)/i.test(q))
		return "schedule";
	if (
		/(夜醒|夜里哭|半夜醒|夜醒怎么办|夜醒原因|晚上哭|night.wak|频繁夜醒)/i.test(
			q,
		)
	)
		return "night_waking";
	if (/(睡前程序|routine|睡前流程|哄睡|怎么哄|bedtime)/i.test(q))
		return "routine";
	return "general";
}

function formatMethods(
	methods: SleepTrainingMethod[],
	ageMonths: number,
): string {
	if (methods.length === 0)
		return `${Math.floor(ageMonths)} 月龄暂不适合睡眠训练，建议先建立规律作息。`;
	const lines = [`😴 ${Math.floor(ageMonths)} 月龄可用的睡眠训练方法：`];
	for (const m of methods) {
		lines.push("", `【${m.name}】（${m.nameEn}，${m.minAgeMonths}+ 月龄）`);
		lines.push(`${m.description}`);
		lines.push(`优点：${m.pros.join("、")}`);
		lines.push(`缺点：${m.cons.join("、")}`);
		lines.push(`适合：${m.suitability}`);
		lines.push(`预计 ${m.daysToEffect} 天见效`);
	}
	return lines.join("\n");
}

function formatRegression(regression: SleepRegression): string {
	const lines = [
		`🌙 ${regression.name}（${regression.commonAgeRange}）`,
		"",
		`原因：${regression.cause}`,
		`持续：${regression.duration}`,
		"",
		"建议：",
		...regression.advice.map((a) => `- ${a}`),
	];
	return lines.join("\n");
}

function formatSchedule(schedule: NapSchedule, ageMonths: number): string {
	const lines = [
		`📅 ${Math.floor(ageMonths)} 月龄作息建议：${schedule.totalNaps} 次小睡`,
	];
	if (schedule.totalNaps === 0) {
		lines.push("无小睡");
	} else {
		schedule.napDurations.forEach((d, i) => {
			lines.push(`小睡 ${i + 1}：${d}`);
		});
	}
	lines.push("", `夜间睡眠：${schedule.nightSleep}`);
	if (schedule.notes) lines.push(`💡 ${schedule.notes}`);
	return lines.join("\n");
}

function formatNightWaking(
	causes: NightWakingCause[],
	ageMonths: number,
): string {
	const lines = [`🌙 ${Math.floor(ageMonths)} 月龄夜醒可能原因：`];
	for (const c of causes) {
		lines.push("", `【${c.cause}】`);
		lines.push(`建议：${c.advice}`);
	}
	return lines.join("\n");
}

function formatRoutine(): string {
	const lines = ["🌙 标准睡前程序（30-45 分钟）："];
	BEDTIME_ROUTINE_STEPS.forEach((s, i) => {
		lines.push(`${i + 1}. ${s}`);
	});
	return lines.join("\n");
}

export class SleepCoachAgent implements Agent {
	readonly id = "sleep-coach";
	readonly name = "睡眠顾问";
	readonly topics = ["sleep"] as const;
	readonly stages = [
		"newborn",
		"infant",
		"toddler",
		"preschool",
		"school_age",
		"tween",
		"teen",
		"young_adult",
	] as const;

	async respond(
		question: string,
		child: ChildProfile,
		_context: AgentContext,
	): Promise<AgentReply> {
		const months = ageInMonths(child.birthDate);
		const intent = detectIntent(question);

		switch (intent) {
			case "training": {
				const methods = getSleepMethodsForAge(months);
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${formatMethods(methods, months)}\n\n${SLEEP_COACH_DISCLAIMER}`,
					confidence: 0.85,
					urgency: "info",
				};
			}
			case "regression": {
				const regression = getSleepRegression(months);
				if (!regression) {
					return {
						agentId: this.id,
						agentName: this.name,
						content: `${Math.floor(months)} 月龄没有典型睡眠倒退期。如果是突发夜醒/不睡，请检查：出牙、大运动发展、白天活动、是否生病。\n\n${SLEEP_COACH_DISCLAIMER}`,
						confidence: 0.7,
						urgency: "info",
					};
				}
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${formatRegression(regression)}\n\n${SLEEP_COACH_DISCLAIMER}`,
					confidence: 0.85,
					urgency: "info",
				};
			}
			case "schedule": {
				const schedule = getNapSchedule(months);
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${formatSchedule(schedule, months)}\n\n${SLEEP_COACH_DISCLAIMER}`,
					confidence: 0.85,
					urgency: "info",
				};
			}
			case "night_waking": {
				const causes = getNightWakingCauses(months);
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${formatNightWaking(causes, months)}\n\n${SLEEP_COACH_DISCLAIMER}`,
					confidence: 0.85,
					urgency: "info",
				};
			}
			case "routine": {
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${formatRoutine()}\n\n${SLEEP_COACH_DISCLAIMER}`,
					confidence: 0.85,
					urgency: "info",
				};
			}
			default:
				return {
					agentId: this.id,
					agentName: this.name,
					content: `我是睡眠顾问，可以帮你：\n- 睡眠训练方法（4 月龄+）\n- 睡眠倒退期（4/8/12/18/24 月）\n- 作息安排（小睡/夜间）\n- 夜醒原因分析\n- 睡前程序\n\n请告诉我宝宝月龄和具体问题。\n\n${SLEEP_COACH_DISCLAIMER}`,
					confidence: 0.4,
					urgency: "info",
				};
		}
	}
}

export function createSleepCoachAgent(): SleepCoachAgent {
	return new SleepCoachAgent();
}

export {
	BEDTIME_ROUTINE_STEPS,
	getNapSchedule,
	getNightWakingCauses,
	getSleepMethod,
	getSleepMethodsForAge,
	getSleepRegression,
	type NapSchedule,
	type NightWakingCause,
	SLEEP_REGRESSIONS,
	type SleepMethod,
	type SleepRegression,
	type SleepTrainingMethod,
} from "./knowledge.js";
