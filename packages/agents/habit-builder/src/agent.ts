/**
 * HabitBuilderAgent — habit formation, routine builder, screen time/bedtime schedules.
 *
 * Phase 2 batch 2: deterministic rule-based engine. No LLM call.
 */

import type { ChildProfile } from "@parenting/memory";
import type { Agent, AgentContext, AgentReply } from "@parenting/orchestrator";

import {
	estimateFormationDays,
	getHabitsForAge,
	HABIT_FORMATION_AVG_DAYS,
	HABITS,
	type Habit,
	habitLoop,
	habitTotalDuration,
	screenTimeForAge,
	sleepHoursForAge,
	streakLevel,
} from "./knowledge.js";

export const HABIT_DISCLAIMER =
	"⚠️ 习惯养成需要时间，每个孩子节奏不同。遇到阻力请保持耐心，必要时咨询儿科医生或儿童心理专家。";

function ageInMonths(birthDate: string, asOf: Date = new Date()): number {
	const birth = new Date(birthDate);
	return Math.max(
		0,
		(asOf.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.44),
	);
}

function detectIntent(
	question: string,
): "habit" | "screen" | "sleep" | "streak" | "list" | "general" {
	const q = question.toLowerCase();
	// List intent takes priority when query contains list keywords
	if (/(列表|有什么|全部|所有|browse)/i.test(q)) return "list";
	if (/(屏幕|screen.time|看电视|看手机|ipad|tablet|看视频)/i.test(q))
		return "screen";
	// Specific habit title check BEFORE generic sleep — to avoid "睡前例行程序" being routed to sleep
	const specificHabit = HABITS.find((h) => question.includes(h.title));
	if (specificHabit) return "habit";
	if (/(睡眠|sleep|睡觉|哄睡|夜醒|nap|bedtime|入睡)/i.test(q)) return "sleep";
	if (/(习惯|habit|作息|routine|刷牙|洗澡|固定|培养|形成)/i.test(q))
		return "habit";
	if (/(坚持|连续|streak|多少天|几天|days?)/i.test(q)) return "streak";
	return "general";
}

function formatHabit(h: Habit): string {
	const lines = [`📌 ${h.title}（${h.domain}）`, h.description, ""];
	lines.push(
		`形成周期: ${estimateFormationDays(h)} 天 | 难度: ${h.difficulty} | 每日 ${h.frequencyPerDay} 次`,
	);
	lines.push(
		`\n步骤 (${h.steps.length} 步, 总时长 ${habitTotalDuration(h)} 分钟):`,
	);
	for (const step of h.steps) {
		const cuePart = step.cue ? ` [${step.cue}]` : "";
		const rewardPart = step.reward ? ` → 🎁 ${step.reward}` : "";
		lines.push(
			`  ${step.order}.${cuePart} ${step.action} (${step.durationMinutes}分钟)${rewardPart}`,
		);
	}
	return lines.join("\n");
}

function formatHabitLoop(h: Habit): string {
	const loop = habitLoop(h);
	const lines = [
		`🔁 ${h.title} 的习惯循环:`,
		"",
		`触发 (Cue): ${loop.cue}`,
		"",
		"流程 (Routine):",
	];
	if (loop.routine.length === 0) {
		lines.push("  （无中间步骤）");
	} else {
		for (let i = 0; i < loop.routine.length; i++) {
			lines.push(`  ${i + 1}. ${loop.routine[i]}`);
		}
	}
	lines.push("", `奖励 (Reward): ${loop.reward}`);
	return lines.join("\n");
}

function formatScreenTime(childAge: number): string {
	const guide = screenTimeForAge(childAge);
	if (!guide) return "暂无该年龄段屏幕时间建议。";
	return `📱 ${childAge} 月龄屏幕时间建议：\n\n每天 ≤ ${guide.dailyLimitMinutes} 分钟\n${guide.notes}\n\n推荐做法：\n- 共看 (co-view) 而非独自看\n- 餐桌上、睡前一小时无屏幕\n- 选择高质量、无广告内容`;
}

function formatSleepHours(childAge: number): string {
	const guide = sleepHoursForAge(childAge);
	if (!guide) return "暂无该年龄段睡眠时间建议。";
	const napPart = guide.includesNap ? "含日间小睡" : "不含日间小睡";
	return `😴 ${childAge} 月龄睡眠需求：\n\n每天 ${guide.hoursPerDay} 小时 (${napPart})\n\n建议固定作息：\n- 每天同时上床、起床\n- 早晨接触自然光 15 分钟\n- 睡前避免屏幕、剧烈运动`;
}

function formatStreak(days: number): string {
	const level = streakLevel(days);
	const levelLabel = {
		new: "新手期",
		building: "养成期",
		established: "稳定期",
		automatic: "自动化",
	}[level];
	const advice =
		level === "new"
			? "刚开始很正常，继续保持每天执行"
			: level === "building"
				? "进展不错，注意别中断超过 1 天"
				: level === "established"
					? "已建立基础习惯，注意生活变化时的坚持"
					: "已自动化，偶尔中断也不会丢失";
	return `📈 连续坚持 ${days} 天 → ${levelLabel}\n${advice}\n\n参考：习惯平均需要 ${HABIT_FORMATION_AVG_DAYS} 天形成 (Lally et al., 2009)`;
}

export class HabitBuilderAgent implements Agent {
	readonly id = "habit-builder";
	readonly name = "习惯养成";
	readonly topics = ["habits"] as const;
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
		const ageMonths = ageInMonths(child.birthDate);
		const intent = detectIntent(question);

		if (intent === "screen") {
			return {
				agentId: this.id,
				agentName: this.name,
				content: `${formatScreenTime(ageMonths)}\n\n${HABIT_DISCLAIMER}`,
				confidence: 0.9,
				urgency: "info",
			};
		}

		if (intent === "sleep") {
			return {
				agentId: this.id,
				agentName: this.name,
				content: `${formatSleepHours(ageMonths)}\n\n${HABIT_DISCLAIMER}`,
				confidence: 0.85,
				urgency: "info",
			};
		}

		if (intent === "streak") {
			// Try to extract days from question
			const numMatch = question.match(/(\d+)\s*(?:天|days?)/i);
			const days = numMatch ? parseInt(numMatch[1], 10) : 0;
			if (days === 0) {
				return {
					agentId: this.id,
					agentName: this.name,
					content: `请告诉我连续坚持了多少天，例如：\n- "已经坚持 7 天了"\n- "30 天连续"\n\n${HABIT_DISCLAIMER}`,
					confidence: 0.3,
					urgency: "info",
				};
			}
			return {
				agentId: this.id,
				agentName: this.name,
				content: `${formatStreak(days)}\n\n${HABIT_DISCLAIMER}`,
				confidence: 0.85,
				urgency: "info",
			};
		}

		if (intent === "list") {
			const habits = getHabitsForAge(ageMonths);
			const lines = [
				`📚 ${Math.floor(ageMonths)} 月龄推荐习惯 (${habits.length} 个)：`,
			];
			for (const h of habits) {
				lines.push(`- ${h.title} [${h.domain}] - ${h.steps.length} 步`);
			}
			return {
				agentId: this.id,
				agentName: this.name,
				content: `${lines.join("\n")}\n\n输入习惯名查看详情，例如："刷牙习惯"\n\n${HABIT_DISCLAIMER}`,
				confidence: 0.7,
				urgency: "info",
			};
		}

		if (intent === "habit") {
			// Try to find a specific habit mentioned
			const habit = HABITS.find((h) => question.includes(h.title));
			if (habit) {
				const loopPart = question.includes("循环")
					? `\n\n${formatHabitLoop(habit)}`
					: "";
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${formatHabit(habit)}${loopPart}\n\n${HABIT_DISCLAIMER}`,
					confidence: 0.85,
					urgency: "info",
				};
			}
			// No specific habit → list all habits for age
			const habits = getHabitsForAge(ageMonths);
			if (habits.length === 0) {
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${Math.floor(ageMonths)} 月龄暂无对应的习惯模板。\n\n${HABIT_DISCLAIMER}`,
					confidence: 0.5,
					urgency: "info",
				};
			}
			const lines = [
				`💡 ${Math.floor(ageMonths)} 月龄适合培养的习惯：\n`,
			];
			for (const h of habits) {
				lines.push(
					`- **${h.title}** (${h.domain}, ${h.formationDays}天形成周期)`,
				);
			}
			lines.push(`\n输入习惯名查看详细步骤，例如："刷牙习惯"`);
			return {
				agentId: this.id,
				agentName: this.name,
				content: `${lines.join("\n")}\n\n${HABIT_DISCLAIMER}`,
				confidence: 0.75,
				urgency: "info",
			};
		}

		return {
			agentId: this.id,
			agentName: this.name,
			content: `我是习惯养成助手，可以帮你：\n- 推荐该月龄习惯（输入"习惯"或"作息"）\n- 屏幕时间建议（输入"屏幕"或"看电视"）\n- 睡眠时长建议（输入"睡眠"）\n- 查看坚持天数（输入"已经坚持 X 天"）\n- 列出所有习惯（输入"列表"）\n\n${HABIT_DISCLAIMER}`,
			confidence: 0.5,
			urgency: "info",
		};
	}
}

export function createHabitBuilderAgent(): HabitBuilderAgent {
	return new HabitBuilderAgent();
}

export {
	getHabitById,
	getHabitsByDomain,
	getHabitsForAge,
	HABIT_FORMATION_AVG_DAYS,
	HABITS,
	type Habit,
	type HabitCue,
	type HabitDomain,
	type HabitStep,
	habitLoop,
	habitStepCount,
	habitTotalDuration,
	SCREEN_TIME_GUIDELINES,
	type ScreenTimeGuideline,
	SLEEP_HOURS_GUIDELINES,
	type SleepHoursGuideline,
	screenTimeForAge,
	sleepHoursForAge,
	streakLevel,
} from "./knowledge.js";
