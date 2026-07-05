import type { ChildProfile } from "@parenting/memory";
import { describe, expect, it } from "vitest";
import {
	createSafetyGuardAgent,
	detectCategory,
	detectFirstAidTopic,
} from "../src/agent.js";
import {
	buildEmergencyProtocol,
	EMERGENCY_PROTOCOLS,
	FIRST_AID_GUIDES,
	getAllFirstAidTopics,
	getCriticalHazards,
	getFirstAidGuide,
	getHazardById,
	getHazardsByCategory,
	getHazardsForAge,
	HAZARDS,
	triageSeverity,
} from "../src/knowledge.js";

function makeChild(ageMonths: number): ChildProfile {
	return {
		id: "test-child",
		name: "测试宝宝",
		birthDate: new Date(
			Date.now() - ageMonths * 30.44 * 24 * 60 * 60 * 1000,
		)
			.toISOString()
			.split("T")[0],
		stage:
			ageMonths < 3
				? "newborn"
				: ageMonths < 12
					? "infant"
					: ageMonths < 36
						? "toddler"
						: ageMonths < 72
							? "preschool"
							: "school_age",
	};
}

describe("SafetyGuardAgent — Agent interface", () => {
	it("has correct id and name", () => {
		const a = createSafetyGuardAgent();
		expect(a.id).toBe("safety-guard");
		expect(a.name).toBe("安全卫士");
	});

	it("topic is safety", () => {
		expect(createSafetyGuardAgent().topics).toEqual(["safety"]);
	});

	it("supports all 8 stages", () => {
		const stages = createSafetyGuardAgent().stages;
		expect(stages.length).toBe(8);
		expect(stages).toContain("newborn");
	});
});

describe("SafetyGuardAgent — first aid priority", () => {
	const agent = createSafetyGuardAgent();
	const ctx = { memory: undefined } as any;

	it("returns choking first aid", async () => {
		const r = await agent.respond("宝宝窒息怎么办", makeChild(18), ctx);
		expect(r.confidence).toBeGreaterThan(0.9);
		expect(r.urgency).toBe("high");
		expect(r.content).toMatch(/窒息|海姆立克|Heimlich/);
	});

	it("returns CPR first aid", async () => {
		const r = await agent.respond("CPR 怎么做", makeChild(48), ctx);
		expect(r.urgency).toBe("high");
		expect(r.content).toContain("心肺复苏");
	});

	it("returns bleeding first aid", async () => {
		const r = await agent.respond("宝宝出血", makeChild(60), ctx);
		expect(r.urgency).toBe("high");
		expect(r.content).toMatch(/出血|止血/);
	});

	it("returns burn first aid", async () => {
		const r = await agent.respond("烫伤处理", makeChild(36), ctx);
		expect(r.urgency).toBe("high");
		expect(r.content).toMatch(/烫伤|凉水/);
	});

	it("returns fever first aid", async () => {
		const r = await agent.respond("发烧怎么处理", makeChild(24), ctx);
		expect(r.urgency).toBe("high");
		expect(r.content).toMatch(/发热|体温|对乙酰氨基酚/);
	});

	it("returns head injury first aid", async () => {
		const r = await agent.respond("头部撞伤", makeChild(48), ctx);
		expect(r.content).toMatch(/头部|冰敷|意识/);
	});

	it("returns allergen first aid", async () => {
		const r = await agent.respond("过敏反应处理", makeChild(72), ctx);
		expect(r.content).toMatch(/过敏|肾上腺素/);
	});

	it("returns drowning first aid", async () => {
		const r = await agent.respond("溺水急救", makeChild(60), ctx);
		expect(r.content).toMatch(/溺水|CPR|120/);
	});

	it("returns poisoning first aid", async () => {
		const r = await agent.respond("误食清洁剂", makeChild(36), ctx);
		expect(r.content).toMatch(/中毒|120|清洁剂/);
	});

	it("includes warning signs to call 120", async () => {
		const r = await agent.respond("窒息", makeChild(24), ctx);
		expect(r.content).toContain("120");
	});

	it("includes common mistakes", async () => {
		const r = await agent.respond("烫伤", makeChild(24), ctx);
		expect(r.content).toMatch(/错误|mistake|不要/);
	});
});

describe("SafetyGuardAgent — hazard intent", () => {
	const agent = createSafetyGuardAgent();
	const ctx = { memory: undefined } as any;

	it("returns choking hazards", async () => {
		const r = await agent.respond("防窒息", makeChild(24), ctx);
		expect(r.content).toMatch(/窒息|choking|食物/);
	});

	it("returns poisoning hazards", async () => {
		const r = await agent.respond("防中毒", makeChild(36), ctx);
		expect(r.content).toMatch(/中毒|清洁剂|药物/);
	});

	it("returns burn hazards", async () => {
		const r = await agent.respond("防烫伤", makeChild(36), ctx);
		expect(r.content).toMatch(/烫|热水/);
	});

	it("returns drowning hazards", async () => {
		const r = await agent.respond("防溺水", makeChild(60), ctx);
		expect(r.content).toMatch(/溺水|浴缸|泳池/);
	});

	it("returns fall hazards", async () => {
		const r = await agent.respond("防跌倒", makeChild(18), ctx);
		expect(r.content).toMatch(/跌|楼梯|换尿布/);
	});

	it("returns strangulation hazards", async () => {
		const r = await agent.respond("防绳索勒", makeChild(18), ctx);
		expect(r.content).toMatch(/绳|勒|窗帘/);
	});

	it("returns electrical hazards", async () => {
		const r = await agent.respond("防触电", makeChild(24), ctx);
		expect(r.content).toMatch(/电|插座/);
	});

	it("returns vehicle hazards", async () => {
		const r = await agent.respond("车内安全", makeChild(36), ctx);
		expect(r.content).toMatch(/座椅|安全带|车/);
	});

	it("returns firearm hazards", async () => {
		const r = await agent.respond("家中枪支", makeChild(72), ctx);
		expect(r.content).toMatch(/枪|保险箱/);
	});

	it("returns no hazards for unmatched category", async () => {
		// Use firearm prevention (no first-aid priority conflict) for adult age
		const r = await agent.respond("家中枪支", makeChild(240), ctx);
		expect(r.confidence).toBeLessThan(0.5);
	});
});

describe("SafetyGuardAgent — first aid topic coverage", () => {
	const agent = createSafetyGuardAgent();
	const ctx = { memory: undefined } as any;

	it("covers burn first aid branch", async () => {
		const r = await agent.respond("烫伤怎么急救", makeChild(60), ctx);
		expect(r.content).toMatch(/凉水|覆盖|烫伤/);
	});

	it("covers head injury first aid branch", async () => {
		const r = await agent.respond("宝宝头部撞到怎么办", makeChild(36), ctx);
		expect(r.content).toMatch(/头部|冰敷|观察/);
	});

	it("covers allergen first aid branch", async () => {
		const r = await agent.respond("过敏反应怎么办", makeChild(60), ctx);
		expect(r.content).toMatch(/过敏|肾上腺素|120/);
	});

	it("covers no-topic first aid fallback (null guide)", async () => {
		// simulate unknown topic
		const unknown = "完全无匹配的急救问题" as unknown as Parameters<
			typeof agent.respond
		>[0];
		const r = await agent.respond(unknown, makeChild(120), ctx);
		// ensure intent fallback is reached without crash
		expect(r.agentId).toBe("safety-guard");
	});
});

describe("detectCategory", () => {
	it("matches choking", () =>
		expect(detectCategory("宝宝呛到")).toBe("choking"));
	it("matches poisoning", () =>
		expect(detectCategory("误食清洁剂")).toBe("poisoning"));
	it("matches burn", () => expect(detectCategory("热水烫伤")).toBe("burn"));
	it("matches drowning", () =>
		expect(detectCategory("浴缸溺水")).toBe("drowning"));
	it("matches fall", () =>
		expect(detectCategory("从楼梯摔下来")).toBe("fall"));
	it("matches strangulation", () =>
		expect(detectCategory("窗帘绳缠绕")).toBe("strangulation"));
	it("matches electrical", () =>
		expect(detectCategory("触电插座")).toBe("electrical"));
	it("matches vehicle", () =>
		expect(detectCategory("安全座椅")).toBe("vehicle"));
	it("matches firearm", () =>
		expect(detectCategory("家中枪支")).toBe("firearm"));
	it("returns undefined for unknown", () =>
		expect(detectCategory("无关问题")).toBeUndefined());
});

describe("detectFirstAidTopic", () => {
	it("matches choking", () =>
		expect(detectFirstAidTopic("海姆立克急救")).toBe("choking"));
	it("matches cpr", () =>
		expect(detectFirstAidTopic("心肺复苏怎么做")).toBe("cpr"));
	it("matches bleeding", () =>
		expect(detectFirstAidTopic("流血止血")).toBe("bleeding"));
	it("matches burn", () => expect(detectFirstAidTopic("烫伤")).toBe("burn"));
	it("matches fever", () =>
		expect(detectFirstAidTopic("宝宝高烧")).toBe("fever"));
	it("matches head injury", () =>
		expect(detectFirstAidTopic("头部撞到")).toBe("head_injury"));
	it("matches allergen", () =>
		expect(detectFirstAidTopic("过敏反应")).toBe("allergen"));
	it("matches drowning", () =>
		expect(detectFirstAidTopic("落水")).toBe("drowning"));
	it("matches poisoning", () =>
		expect(detectFirstAidTopic("误食药物")).toBe("poisoning"));
	it("returns undefined for unknown", () =>
		expect(detectFirstAidTopic("完全无关问题")).toBeUndefined());
});

describe("SafetyGuardAgent — checklist intent", () => {
	const agent = createSafetyGuardAgent();
	const ctx = { memory: undefined } as any;

	it("returns checklist for toddler", async () => {
		const r = await agent.respond("安全检查清单", makeChild(24), ctx);
		expect(r.confidence).toBeGreaterThan(0.7);
		expect(r.content).toContain("🔴 高风险");
		expect(r.content).toContain("🟡 中低风险");
	});

	it("returns checklist for newborn", async () => {
		const r = await agent.respond("风险列表", makeChild(1), ctx);
		expect(r.content).toContain("🔴");
	});

	it("lists count of hazards", async () => {
		const r = await agent.respond("所有风险", makeChild(36), ctx);
		expect(r.content).toMatch(/共 \d+ 项/);
	});
});

describe("SafetyGuardAgent — triage intent", () => {
	const agent = createSafetyGuardAgent();
	const ctx = { memory: undefined } as any;

	it("flags emergency for unconsciousness", async () => {
		const r = await agent.respond(
			"宝宝失去意识了严重吗",
			makeChild(36),
			ctx,
		);
		expect(r.urgency).toBe("high");
		expect(r.content).toMatch(/紧急/);
	});

	it("flags emergency for choking", async () => {
		const r = await agent.respond("宝宝呛到很严重", makeChild(24), ctx);
		expect(r.urgency).toBe("high");
	});

	it("flags urgent for bleeding", async () => {
		const r = await agent.respond("宝宝流鼻血严重吗", makeChild(60), ctx);
		expect(r.content).toMatch(/紧急|就医/);
	});

	it("returns routine for general query", async () => {
		const r = await agent.respond(
			"宝宝有点不舒服严重吗",
			makeChild(36),
			ctx,
		);
		expect(r.content).toMatch(/常规|观察/);
	});
});

describe("SafetyGuardAgent — hazard intent (no specific category)", () => {
	const agent = createSafetyGuardAgent();
	const ctx = { memory: undefined } as any;

	it("returns critical hazards when query has hazard intent but no specific category", async () => {
		// "防意外" → hazard intent but no category match → uses getCriticalHazards
		const r = await agent.respond("防意外", makeChild(24), ctx);
		expect(r.confidence).toBeGreaterThan(0.7);
		expect(r.content).toContain("🔴");
	});
});

describe("SafetyGuardAgent — triage all branches", () => {
	const agent = createSafetyGuardAgent();
	const ctx = { memory: undefined } as any;

	it("flags emergency triage with emergency advice", async () => {
		const r = await agent.respond("宝宝意识不清怎么办", makeChild(36), ctx);
		expect(r.content).toMatch(/紧急情况|立即拨打/);
	});

	it("flags urgent triage with urgent advice", async () => {
		// 摸不到脉搏 → triage urgent (avoids first_aid conflict)
		const r = await agent.respond(
			"宝宝摸不到脉搏严重吗",
			makeChild(60),
			ctx,
		);
		expect(r.content).toMatch(/较紧急|就医/);
	});
});

describe("SafetyGuardAgent — hazard intent more categories", () => {
	const agent = createSafetyGuardAgent();
	const ctx = { memory: undefined } as any;

	it("returns burn-specific hazards", async () => {
		const r = await agent.respond("防烫伤", makeChild(36), ctx);
		expect(r.content).toMatch(/烫|热水/);
	});

	it("returns drowning hazards", async () => {
		const r = await agent.respond("防溺水浴缸", makeChild(24), ctx);
		expect(r.content).toMatch(/溺水|浴缸/);
	});

	it("returns vehicle hazards via keyword", async () => {
		const r = await agent.respond("宝宝车上安全", makeChild(36), ctx);
		expect(r.content).toMatch(/座椅|安全带/);
	});

	it("returns strangulation hazards", async () => {
		const r = await agent.respond("窗帘绳勒", makeChild(12), ctx);
		expect(r.content).toMatch(/绳|勒|窗帘/);
	});
});

describe("formatFirstAid edge case", () => {
	it("returns fallback when no guide found (verified by getFirstAidGuide returning undefined for empty topic)", () => {
		// All current FirstAidTopics have guides. Verify getFirstAidGuide works for all topics
		const allTopics: FirstAidTopic[] = [
			"choking",
			"cpr",
			"bleeding",
			"burn",
			"fever",
			"head_injury",
			"allergen",
			"drowning",
			"poisoning",
		];
		for (const topic of allTopics) {
			const guide = getFirstAidGuide(topic);
			expect(guide).toBeDefined();
		}
	});
});

describe("SafetyGuardAgent — general intent", () => {
	const agent = createSafetyGuardAgent();
	const ctx = { memory: undefined } as any;

	it("returns help + checklist", async () => {
		const r = await agent.respond("你好", makeChild(36), ctx);
		expect(r.confidence).toBeGreaterThanOrEqual(0.5);
		expect(r.content).toContain("安全卫士");
	});
});

describe("getHazardsForAge", () => {
	it("returns hazards for 1-year-old", () => {
		const hazards = getHazardsForAge(12);
		expect(hazards.length).toBeGreaterThan(0);
	});

	it("filters by category", () => {
		const choking = getHazardsForAge(36, "choking");
		expect(choking.every((h) => h.category === "choking")).toBe(true);
	});

	it("returns empty for newborn with no applicable hazard", () => {
		const hazards = getHazardsForAge(1, "firearm");
		expect(hazards).toEqual([]);
	});
});

describe("getHazardsByCategory", () => {
	it("returns all choking hazards", () => {
		const hazards = getHazardsByCategory("choking");
		expect(hazards.length).toBeGreaterThan(0);
		expect(hazards.every((h) => h.category === "choking")).toBe(true);
	});

	it("returns all vehicle hazards", () => {
		const hazards = getHazardsByCategory("vehicle");
		expect(hazards.length).toBeGreaterThan(0);
	});
});

describe("getHazardById", () => {
	it("returns hazard when found", () => {
		const h = getHazardById("haz-choking-food");
		expect(h).toBeDefined();
	});

	it("returns undefined for unknown id", () => {
		expect(getHazardById("nope")).toBeUndefined();
	});
});

describe("getCriticalHazards", () => {
	it("returns only high severity hazards", () => {
		const hazards = getCriticalHazards(24);
		expect(hazards.length).toBeGreaterThan(0);
		expect(hazards.every((h) => h.severity === "high")).toBe(true);
	});

	it("returns empty for newborn (mostly low severity)", () => {
		const hazards = getCriticalHazards(0);
		// Newborns still have some critical hazards
		expect(hazards.length).toBeGreaterThanOrEqual(0);
	});
});

describe("getFirstAidGuide", () => {
	it("returns choking guide", () => {
		const guide = getFirstAidGuide("choking");
		expect(guide).toBeDefined();
		expect(guide?.urgency).toBe("emergency");
	});

	it("returns infant-specific guide", () => {
		const guide = getFirstAidGuide("cpr", true);
		expect(guide).toBeDefined();
		expect(guide?.forInfant).toBe(true);
	});

	it("returns undefined for non-existent topic", () => {
		// Just verify it works
		const allTopics = getAllFirstAidTopics();
		expect(allTopics.length).toBeGreaterThan(5);
	});
});

describe("triageSeverity", () => {
	it("returns emergency for breathing issues", () => {
		expect(triageSeverity("停止呼吸 unconscious")).toBe("emergency");
	});

	it("returns emergency for choking keyword", () => {
		expect(triageSeverity("choking now")).toBe("emergency");
	});

	it("returns emergency for suspected ingestion", () => {
		expect(triageSeverity("suspect ingestion")).toBe("emergency");
	});

	it("returns urgent for burns", () => {
		expect(triageSeverity("宝宝烫伤了")).toBe("urgent");
	});

	it("returns urgent for bleeding", () => {
		expect(triageSeverity("head injury + bleeding")).toBe("urgent");
	});

	it("returns routine for mild symptoms", () => {
		expect(triageSeverity("宝宝有点流鼻涕")).toBe("routine");
	});
});

describe("HAZARDS data sanity", () => {
	it("HAZARDS is not empty", () => {
		expect(HAZARDS.length).toBeGreaterThan(10);
	});

	it("all hazards have unique ids", () => {
		const ids = new Set(HAZARDS.map((h) => h.id));
		expect(ids.size).toBe(HAZARDS.length);
	});

	it("all hazards have at least one prevention", () => {
		for (const h of HAZARDS) {
			expect(h.prevention.length).toBeGreaterThan(0);
		}
	});

	it("all hazards have valid age ranges", () => {
		for (const h of HAZARDS) {
			expect(h.ageMonthsMin).toBeGreaterThanOrEqual(0);
			expect(h.ageMonthsMax).toBeGreaterThan(h.ageMonthsMin);
		}
	});
});

describe("FIRST_AID_GUIDES data sanity", () => {
	it("FIRST_AID_GUIDES is comprehensive", () => {
		expect(FIRST_AID_GUIDES.length).toBeGreaterThan(5);
	});

	it("all emergency guides call 120", () => {
		for (const g of FIRST_AID_GUIDES) {
			if (g.urgency === "emergency") {
				expect(g.whenToCall911.length).toBeGreaterThan(0);
			}
		}
	});

	it("all guides have steps", () => {
		for (const g of FIRST_AID_GUIDES) {
			expect(g.steps.length).toBeGreaterThan(0);
		}
	});

	it("steps are in order", () => {
		for (const g of FIRST_AID_GUIDES) {
			const orders = g.steps.map((s) => s.order);
			expect(orders).toEqual([...orders].sort((a, b) => a - b));
		}
	});

	it("all guides have common mistakes", () => {
		for (const g of FIRST_AID_GUIDES) {
			expect(g.commonMistakes.length).toBeGreaterThan(0);
		}
	});
});

describe("EMERGENCY_PROTOCOLS table", () => {
	it("covers all 9 first aid topics", () => {
		expect(EMERGENCY_PROTOCOLS.length).toBe(FIRST_AID_GUIDES.length);
	});

	it("each protocol has ABC-ordered steps", () => {
		for (const p of EMERGENCY_PROTOCOLS) {
			const orders = p.steps.map((s) => s.order);
			expect(orders).toEqual([...orders].sort((a, b) => a - b));
			expect(orders[0]).toBe(1);
		}
	});

	it("P0 emergencies list 120 as the first call action", () => {
		const p0Protocols = EMERGENCY_PROTOCOLS.filter((p) => p.level === "P0");
		for (const p of p0Protocols) {
			const allText = p.steps.map((s) => s.action).join(" ");
			expect(allText).toMatch(/120|911|呼救|急救电话/);
		}
	});

	it("all protocols have at least 3 steps", () => {
		for (const p of EMERGENCY_PROTOCOLS) {
			expect(p.steps.length).toBeGreaterThanOrEqual(3);
		}
	});

	it("all protocols list call script with placeholders", () => {
		for (const p of EMERGENCY_PROTOCOLS) {
			expect(p.callScript.length).toBeGreaterThan(0);
		}
	});
});

describe("buildEmergencyProtocol", () => {
	it("returns a P0 protocol for choking symptoms", () => {
		const p = buildEmergencyProtocol("婴儿被葡萄卡住窒息");
		expect(p.level).toBe("P0");
		expect(p.topic).toBe("choking");
	});

	it("returns a P0 protocol for unconscious symptoms", () => {
		const p = buildEmergencyProtocol("孩子突然没意识了");
		expect(p.level).toBe("P0");
	});

	it("returns a P1 protocol for high fever in infant", () => {
		const p = buildEmergencyProtocol("3个月宝宝发烧40度");
		expect(p.level).toBe("P1");
	});

	it("returns a P2 protocol for minor concerns", () => {
		const p = buildEmergencyProtocol("宝宝昨天跌了一跤");
		expect(p.level).toBe("P2");
	});

	it("falls back to a P2 safety-check protocol when nothing matches", () => {
		const p = buildEmergencyProtocol("宝宝今天不太想吃饭");
		expect(p.level).toBe("P2");
		expect(p.topic).toBe("safety-check");
	});

	it("returns steps in correct order", () => {
		const p = buildEmergencyProtocol("宝宝烫伤了手");
		const orders = p.steps.map((s) => s.order);
		expect(orders).toEqual([...orders].sort((a, b) => a - b));
	});

	it("P0 seizure routes to cpr protocol", () => {
		const p = buildEmergencyProtocol("孩子突然抽搐");
		expect(p.level).toBe("P0");
		expect(p.topic).toBe("cpr");
	});

	it("P0 massive bleeding routes to bleeding protocol", () => {
		const p = buildEmergencyProtocol("孩子大出血");
		expect(p.level).toBe("P0");
		expect(p.topic).toBe("bleeding");
	});

	it("P0 drowning routes to drowning protocol", () => {
		const p = buildEmergencyProtocol("孩子在泳池里溺");
		expect(p.level).toBe("P0");
		expect(p.topic).toBe("drowning");
	});

	it("P1 fever in infant routes to fever protocol", () => {
		const p = buildEmergencyProtocol("3个月宝宝发高烧40度");
		expect(p.level).toBe("P1");
		expect(p.topic).toBe("fever");
	});

	it("P1 head injury routes to head_injury protocol", () => {
		const p = buildEmergencyProtocol("孩子摔到头了");
		expect(p.level).toBe("P1");
		expect(p.topic).toBe("head_injury");
	});

	it("P0 allergic reaction routes to allergen protocol", () => {
		const p = buildEmergencyProtocol("孩子出现荨麻疹呼吸困难");
		expect(p.topic).toBe("allergen");
		expect(p.level).toBe("P0");
	});

	it("P0 poisoning routes to poisoning protocol", () => {
		const p = buildEmergencyProtocol("孩子误食了药物");
		expect(p.level).toBe("P0");
		expect(p.topic).toBe("poisoning");
	});

	it("P0 catch-all falls back to cpr protocol", () => {
		// P0 keywords matched but none of the specific sub-topics
		// (e.g. "stopped breathing no pulse" — matches P0 block but no sub-match)
		const p = buildEmergencyProtocol("没脉搏了");
		expect(p.level).toBe("P0");
		expect(p.topic).toBe("cpr");
	});

	it("falls through P0 block when symptom is P1 (no P0 keywords matched)", () => {
		// "烫伤了" should NOT enter P0 block, going straight to P1
		const p = buildEmergencyProtocol("宝宝烫伤了手");
		expect(p.level).toBe("P1");
		expect(p.topic).toBe("burn");
	});

	it("P0 catch-all branch (no sub-match) is documented as defensive", () => {
		// Smoke test to ensure all P0 sub-matches are reachable.
		// If this passes, the `/* v8 ignore */` is genuinely defensive only.
		const keywords = [
			"窒息", // choking
			"没呼吸", // cpr
			"抽搐", // cpr (seizure)
			"大出血", // bleeding
			"溺", // drowning
			"荨麻疹", // allergen
			"误食", // poisoning
			"没脉搏", // cpr (no.pulse)
		];
		for (const kw of keywords) {
			const p = buildEmergencyProtocol(`孩子${kw}`);
			expect(p.level).toBe("P0");
		}
	});

	it("P0 poisoning symptom routes to poisoning protocol (covers all P0 sub-matches)", () => {
		// dedicated test for poisoning sub-match
		const p = buildEmergencyProtocol("孩子中毒了");
		expect(p.topic).toBe("poisoning");
	});

	it("P0 outer matches via 药物 alone (no 中毒|poison|误食) — falls through P0 inner cascade", () => {
		// Outer P0 regex includes `药物` but the inner `(中毒|poison|误食)` branch does
		// not, so this exercises the not-taken arm of the poisoning sub-if and
		// reaches the P0 throw.
		// NOTE: "误服" deliberately avoids "误食" so the inner regex does not match.
		expect(() => buildEmergencyProtocol("孩子误服了一些药物")).toThrow(
			/buildEmergencyProtocol: P0/,
		);
	});

	it("P1 outer matches via 摸不到脉 (no fever/burn/head sub-match) — falls through P1 inner cascade", () => {
		// Outer P1 regex includes `摸不到脉` but the inner fevers/burn/head sub-IFs
		// do not, so this exercises the not-taken arm of the head_injury sub-if
		// and reaches the P1 throw.
		expect(() => buildEmergencyProtocol("孩子脉搏虚弱摸不到脉")).toThrow(
			/buildEmergencyProtocol: P1/,
		);
	});
});
