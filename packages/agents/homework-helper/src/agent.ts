/**
 * HomeworkHelperAgent — Socratic-style question coach.
 *
 * Phase 1: rule-based. No LLM call.
 */

import type { ChildProfile } from "@parenting/memory";
import type { Agent, AgentContext, AgentReply } from "@parenting/orchestrator";

import {
	buildSocraticSession,
	detectHomeworkSubject,
	formatHintChain,
	generateSocraticQuestion,
	getHintChain,
	HOMEWORK_SUBJECTS,
	type HomeworkSubject,
	type SocraticSession,
} from "./knowledge.js";

export const HOMEWORK_HELPER_DISCLAIMER =
	"⚠️ 引导式学习仅供参考。学科辅导请结合孩子学情和学校要求。";

function detectIntent(
	question: string,
): "problem" | "hint" | "probe" | "session" | "general" {
	const q = question.toLowerCase();
	if (/(追问|检查|扩展|进一步|extend|probe|再问)/i.test(q)) return "probe";
	if (/(第.*级|下一步|next|提示|再提示|再给点)/i.test(q)) return "hint";
	if (/(不会做|不.*会|难题|帮我做|怎么.*做|教我做|作业|homework)/i.test(q))
		return "problem";
	if (/(思路|引导|怎么想|启发|socratic|启发式|苏格拉底)/i.test(q))
		return "session";
	return "general";
}

function formatSession(session: SocraticSession): string {
	const lines: string[] = [
		`🎓 苏格拉底式辅导（${session.subject} / ${session.topic} / ${session.difficulty}）`,
		"",
		`【引导问题】${session.starterQuestion}`,
		"",
		formatHintChain(session.hintChain),
	];
	if (session.probes.length > 0) {
		lines.push("", "【追问】");
		for (const p of session.probes) {
			lines.push(`- [${p.purpose}] ${p.text}`);
		}
	}
	return lines.join("\n");
}

function formatHint(
	subject: HomeworkSubject,
	attempt: number,
	problemText: string,
): string {
	const session = buildSocraticSession(problemText);
	const idx = Math.min(attempt - 1, session.hintChain.length - 1);
	const step = session.hintChain[Math.max(0, idx)]!;
	return `💡 ${subject} · 第 ${step.level} 级提示：${step.hint}`;
}

export class HomeworkHelperAgent implements Agent {
	readonly id = "homework-helper";
	readonly name = "作业引导师";
	readonly topics = ["education"] as const;
	readonly stages = [
		"preschool",
		"school_age",
		"tween",
		"teen",
		"young_adult",
	] as const;

	async respond(
		question: string,
		_child: ChildProfile,
		_context: AgentContext,
	): Promise<AgentReply> {
		const intent = detectIntent(question);

		if (intent === "hint") {
			// Match first number as attempt count, default 1
			const m = question.match(/第\s*(\d+)\s*级/);
			const attempt = m?.[1] ? parseInt(m[1], 10) : 1;
			const subject = detectHomeworkSubject(question) ?? "math";
			const fallback = generateSocraticQuestion(subject);
			return {
				agentId: this.id,
				agentName: this.name,
				content: `${formatHint(subject, attempt, question)}\n\n（引导问题：${fallback}）\n\n${HOMEWORK_HELPER_DISCLAIMER}`,
				confidence: 0.8,
				urgency: "info",
			};
		}

		if (
			intent === "probe" ||
			intent === "problem" ||
			intent === "session"
		) {
			const session = buildSocraticSession(question);
			return {
				agentId: this.id,
				agentName: this.name,
				content: `${formatSession(session)}\n\n${HOMEWORK_HELPER_DISCLAIMER}`,
				confidence: 0.85,
				urgency: "info",
			};
		}

		return {
			agentId: this.id,
			agentName: this.name,
			content: `我是作业引导师，可以用苏格拉底式问答帮你理清思路。\n支持学科：${HOMEWORK_SUBJECTS.join(", ")}\n\n例如：\n- "数学题不会做：3+5×2=?"\n- "英语语法：He go to school yesterday"\n- "第2级提示"\n- "再来一个追问"\n\n${HOMEWORK_HELPER_DISCLAIMER}`,
			confidence: 0.5,
			urgency: "info",
		};
	}
}

export function createHomeworkHelperAgent(): HomeworkHelperAgent {
	return new HomeworkHelperAgent();
}

// Internal exports for testing
export { getHintChain as _getHintChain };
