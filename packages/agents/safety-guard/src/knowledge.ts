/**
 * SafetyGuard knowledge base — hazard checklists + first aid cheat-sheet.
 *
 * Phase 2 batch 2: deterministic rule-based engine. No LLM call.
 * Source: AAP, NHS, Red Cross baby & child first aid guidelines.
 */

export type HazardCategory =
	| "choking"
	| "poisoning"
	| "burn"
	| "drowning"
	| "fall"
	| "strangulation"
	| "electrical"
	| "vehicle"
	| "firearm";

export type HazardSeverity = "high" | "medium" | "low";

export interface Hazard {
	id: string;
	category: HazardCategory;
	title: string;
	description: string;
	prevention: string[];
	ageMonthsMin: number;
	ageMonthsMax: number;
	severity: HazardSeverity;
}

export const HAZARDS: Hazard[] = [
	// Choking
	{
		id: "haz-choking-food",
		category: "choking",
		title: "食物窒息",
		description:
			"圆粒/硬块食物（整颗坚果、葡萄、爆米花、果冻等）是幼儿窒息高危因素",
		prevention: [
			"4 岁前不喂整颗坚果、爆米花",
			"葡萄/樱桃/番茄切对半或四分之一",
			"香肠/胡萝卜纵向切条再切丁",
			"果冻、布丁、棉花糖避免给幼儿",
			"进食时坐好、不跑不笑不哭",
		],
		ageMonthsMin: 6,
		ageMonthsMax: 48,
		severity: "high",
	},
	{
		id: "haz-choking-toys",
		category: "choking",
		title: "小物件窒息",
		description: "硬币、纽扣电池、磁铁、玻璃球、气球碎片等可卡喉",
		prevention: [
			"玩具需符合年龄（避免 3 岁以下有小零件）",
			"硬币/纽扣电池放在孩子够不到处",
			"破损的气球立即丢弃",
			"定期检查玩具是否松动",
		],
		ageMonthsMin: 6,
		ageMonthsMax: 60,
		severity: "high",
	},
	// Poisoning
	{
		id: "haz-poison-cleaner",
		category: "poisoning",
		title: "清洁剂中毒",
		description: "家用清洁剂、漂白剂、洗涤剂色彩鲜艳易吸引幼儿",
		prevention: [
			"清洁剂放高处或加锁柜",
			"保留原包装（标签有急救电话）",
			"不用饮料瓶分装",
			"使用后立即归位",
		],
		ageMonthsMin: 6,
		ageMonthsMax: 72,
		severity: "high",
	},
	{
		id: "haz-poison-medication",
		category: "poisoning",
		title: "药物中毒",
		description: "成人药物（降压药、糖尿病药、维生素铁剂）对幼儿致命",
		prevention: [
			"药物放高处+锁",
			"服完药立即收起",
			"不在孩子面前吃药",
			"包装使用儿童安全盖",
		],
		ageMonthsMin: 0,
		ageMonthsMax: 72,
		severity: "high",
	},
	{
		id: "haz-poison-battery",
		category: "poisoning",
		title: "纽扣电池",
		description: "纽扣电池（锂）卡食道 2 小时可造成严重烧伤甚至死亡",
		prevention: [
			"遥控器、玩具里的电池仓螺丝固定",
			"备用电池放高处",
			"吞入立即急诊（X 光定位 + 取出）",
		],
		ageMonthsMin: 6,
		ageMonthsMax: 60,
		severity: "high",
	},
	// Burn
	{
		id: "haz-burn-hot-liquid",
		category: "burn",
		title: "烫伤（热液）",
		description: "热汤、热水壶、洗澡水是幼儿烫伤主因",
		prevention: [
			"热水壶/咖啡杯放桌子内侧",
			"洗澡水先冷后热，<49°C",
			"不抱着孩子端热饮",
			"桌布不要垂到孩子够得着",
		],
		ageMonthsMin: 6,
		ageMonthsMax: 48,
		severity: "high",
	},
	{
		id: "haz-burn-cooktop",
		category: "burn",
		title: "炉灶烫伤",
		description: "幼儿可能拉锅柄、打翻锅具",
		prevention: [
			"锅柄朝内",
			"使用后排灶",
			"炉灶加防护栏",
			"做饭时不让孩子在厨房独自活动",
		],
		ageMonthsMin: 12,
		ageMonthsMax: 60,
		severity: "medium",
	},
	{
		id: "haz-burn-sun",
		category: "burn",
		title: "晒伤",
		description: "6 月龄以下避免直射阳光；幼儿皮肤敏感易晒伤",
		prevention: [
			"6 月龄以下使用遮阳棚/婴儿车遮阳",
			"6 月龄以上涂 SPF30+ 防晒霜",
			"戴宽檐帽、UV 太阳镜",
			"上午 10 点至下午 4 点避免暴晒",
		],
		ageMonthsMin: 0,
		ageMonthsMax: 216,
		severity: "medium",
	},
	// Drowning
	{
		id: "haz-drowning-bath",
		category: "drowning",
		title: "浴缸溺水",
		description: "2.5 cm 深的水即可使婴儿溺水",
		prevention: [
			"洗澡时一手始终扶住孩子",
			"绝不将幼儿单独留在浴缸（即使 1 分钟）",
			"水桶/水盆用完立即倒掉",
			"马桶盖上加锁",
		],
		ageMonthsMin: 0,
		ageMonthsMax: 48,
		severity: "high",
	},
	{
		id: "haz-drowning-pool",
		category: "drowning",
		title: "泳池/水域溺水",
		description: "溺水是 1-4 岁儿童意外死亡的首要原因",
		prevention: [
			"泳池四周加 1.2m 以上围栏",
			"水中活动时大人保持 touch supervision（一臂距离内）",
			"儿童学游泳但不能替代监护",
			"穿戴合规救生衣（不用充气臂圈）",
		],
		ageMonthsMin: 12,
		ageMonthsMax: 144,
		severity: "high",
	},
	// Fall
	{
		id: "haz-fall-changing-table",
		category: "fall",
		title: "换尿布台跌落",
		prevention: [
			"换尿布时始终一手扶住",
			"使用安全带",
			"不在高处放置孩子",
			"地面铺软垫",
		],
		description: "换尿布台跌落可致严重头部外伤",
		ageMonthsMin: 0,
		ageMonthsMax: 24,
		severity: "high",
	},
	{
		id: "haz-fall-stairs",
		category: "fall",
		title: "楼梯跌落",
		prevention: [
			"楼梯口加防护门",
			"楼梯上下铺防滑垫",
			"教孩子正确上下楼梯",
		],
		description: "刚学会爬/走的幼儿易从楼梯跌落",
		ageMonthsMin: 6,
		ageMonthsMax: 36,
		severity: "medium",
	},
	{
		id: "haz-fall-bunk-bed",
		category: "fall",
		title: "高低床跌落",
		prevention: ["6 岁前不睡上铺", "床栏高 ≥ 16cm", "床边铺地毯"],
		description: "上铺跌落可致严重骨折",
		ageMonthsMin: 72,
		ageMonthsMax: 216,
		severity: "medium",
	},
	// Strangulation
	{
		id: "haz-strang-cord",
		category: "strangulation",
		title: "绳索/窗帘绳缠绕",
		prevention: [
			"窗帘/百叶窗使用无绳款",
			"婴儿床上不放绳带、围兜带",
			"玩具拉绳 < 22cm",
		],
		description: "绳索可造成幼儿颈部缠绕",
		ageMonthsMin: 0,
		ageMonthsMax: 36,
		severity: "high",
	},
	// Electrical
	{
		id: "haz-electrical-outlet",
		category: "electrical",
		title: "触电（插座）",
		prevention: ["所有低位插座安装保护盖", "电线藏于家具后"],
		description: "幼儿好奇会用手指/金属戳插座",
		ageMonthsMin: 6,
		ageMonthsMax: 48,
		severity: "medium",
	},
	// Vehicle
	{
		id: "haz-vehicle-seat",
		category: "vehicle",
		title: "未使用安全座椅",
		prevention: [
			"0-12 月龄或 <9kg：后向式座椅",
			"1-4 岁：前向式带五点式安全带",
			"8-12 岁或 >1.45m：成人安全带",
			"后排中间位置最安全",
		],
		description: "车辆事故是儿童主要死因，安全座椅可降低 71% 死亡率",
		ageMonthsMin: 0,
		ageMonthsMax: 144,
		severity: "high",
	},
	{
		id: "haz-vehicle-hot-car",
		category: "vehicle",
		title: "车内中暑",
		prevention: [
			"绝不将孩子单独留在车内",
			"养成下车检查后座的习惯",
			"车内放置显眼提醒物",
		],
		description: "密闭车厢 10 分钟可升温 20°C，每年有多起致死事故",
		ageMonthsMin: 0,
		ageMonthsMax: 60,
		severity: "high",
	},
	// Firearm (US context)
	{
		id: "haz-firearm-storage",
		category: "firearm",
		title: "枪支保管不当",
		prevention: [
			"枪支存放在上锁的保险箱",
			"子弹分开存放",
			"不在孩子面前讨论/展示枪支",
		],
		description: "美国每年有数百名儿童因家中未锁枪支意外中弹",
		ageMonthsMin: 36,
		ageMonthsMax: 216,
		severity: "high",
	},
];

/** Get hazards for a specific age. */
export function getHazardsForAge(
	ageMonths: number,
	category?: HazardCategory,
): Hazard[] {
	return HAZARDS.filter(
		(h) =>
			ageMonths >= h.ageMonthsMin &&
			ageMonths <= h.ageMonthsMax &&
			(!category || h.category === category),
	);
}

export function getHazardsByCategory(category: HazardCategory): Hazard[] {
	return HAZARDS.filter((h) => h.category === category);
}

export function getHazardById(id: string): Hazard | undefined {
	return HAZARDS.find((h) => h.id === id);
}

/** Get all high-severity hazards for age. */
export function getCriticalHazards(ageMonths: number): Hazard[] {
	return getHazardsForAge(ageMonths).filter((h) => h.severity === "high");
}

// ==================== First Aid ====================

export type FirstAidTopic =
	| "choking"
	| "cpr"
	| "bleeding"
	| "burn"
	| "fever"
	| "head_injury"
	| "allergen"
	| "drowning"
	| "poisoning";

export interface FirstAidStep {
	order: number;
	action: string;
	durationSeconds?: number;
	warning?: string;
}

export interface FirstAidGuide {
	topic: FirstAidTopic;
	title: string;
	urgency: "emergency" | "urgent" | "soon";
	forInfant: boolean; // <12 months
	forChild: boolean; // >=12 months
	steps: FirstAidStep[];
	whenToCall911: string[];
	commonMistakes: string[];
}

export const FIRST_AID_GUIDES: FirstAidGuide[] = [
	{
		topic: "choking",
		title: "窒息急救（婴儿/儿童）",
		urgency: "emergency",
		forInfant: true,
		forChild: true,
		steps: [
			{
				order: 1,
				action: "判断：能咳嗽/发声 → 鼓励咳嗽，不要拍背",
				warning: "咳嗽有效时不干预",
			},
			{
				order: 2,
				action: "无法咳嗽/无声：婴儿 (<1岁) 用 5 次背部拍击 + 5 次胸部冲击",
				durationSeconds: 60,
			},
			{
				order: 3,
				action: "儿童 (≥1岁) 用 Heimlich 海姆立克法（5 次腹部冲击）",
				durationSeconds: 30,
			},
			{
				order: 4,
				action: "反复交替直到异物排出或失去意识",
				durationSeconds: 120,
			},
			{ order: 5, action: "若失去意识：开始 CPR 并立即拨打 120" },
		],
		whenToCall911: [
			"任何无法自主咳嗽/呼吸的情况",
			"意识丧失",
			"皮肤发绀（青紫）",
		],
		commonMistakes: [
			"盲目用手指掏（可能将异物推入更深）",
			"对还能咳嗽的孩子拍背",
			"延误拨打 120",
		],
	},
	{
		topic: "cpr",
		title: "心肺复苏（CPR）",
		urgency: "emergency",
		forInfant: true,
		forChild: true,
		steps: [
			{ order: 1, action: "确认环境安全，检查反应：拍肩呼喊" },
			{ order: 2, action: "无反应：呼喊求助，拨打 120" },
			{
				order: 3,
				action: "检查呼吸：5-10 秒看胸廓起伏",
				durationSeconds: 10,
			},
			{
				order: 4,
				action: "无呼吸：开始 30 次胸外按压（深度 1/3 胸廓，频率 100-120/分钟）",
			},
			{ order: 5, action: "婴儿用 2 指；儿童用单手或双手" },
			{
				order: 6,
				action: "30 次按压后 2 次人工呼吸，重复 30:2 直到救援到达",
			},
		],
		whenToCall911: ["任何意识丧失", "无呼吸或仅喘息", "严重外伤后无反应"],
		commonMistakes: [
			"按压深度不足（应 1/3 胸廓）",
			"按压频率过慢（应 100-120/分钟）",
			"忘记呼叫帮助",
		],
	},
	{
		topic: "bleeding",
		title: "出血止血",
		urgency: "urgent",
		forInfant: true,
		forChild: true,
		steps: [
			{ order: 1, action: "戴手套或用塑料袋套手（避免接触血液）" },
			{
				order: 2,
				action: "用干净纱布/布直接按压伤口",
				durationSeconds: 60,
			},
			{ order: 3, action: "持续按压 ≥ 10 分钟不间断" },
			{
				order: 4,
				action: "若血液浸透，加层纱布继续按压（不要移除原层）",
			},
			{ order: 5, action: "抬高受伤部位（怀疑骨折除外）" },
			{ order: 6, action: "止血后用绷带包扎" },
		],
		whenToCall911: [
			"按压 10 分钟仍出血不止",
			"伤口深 > 1cm 或长 > 5cm",
			"动脉出血（喷射状）",
			"嵌入异物（不要拔出）",
		],
		commonMistakes: ["频繁掀开检查伤口", "使用止血带（仅截肢风险时用）"],
	},
	{
		topic: "burn",
		title: "烧烫伤处理",
		urgency: "urgent",
		forInfant: true,
		forChild: true,
		steps: [
			{
				order: 1,
				action: "冲：流动凉水 (15-25°C) 冲洗 20 分钟",
				durationSeconds: 1200,
				warning: "不要冰水",
			},
			{ order: 2, action: "脱：小心移除衣物（粘连皮肤不强行）" },
			{
				order: 3,
				action: "泡：继续在凉水中浸泡 10 分钟",
				durationSeconds: 600,
			},
			{ order: 4, action: "盖：用干净纱布/保鲜膜覆盖" },
			{ order: 5, action: "送：II度以上烧伤送医" },
		],
		whenToCall911: [
			"婴儿任何烧伤",
			"面部/手/脚/生殖器烧伤",
			"面积 > 5% (小儿手掌=1%)",
			"深度烧伤（皮肤苍白/焦黑）",
		],
		commonMistakes: [
			"涂抹牙膏、酱油、香油等",
			"用冰块直接接触",
			"挑破水泡",
		],
	},
	{
		topic: "fever",
		title: "发热处理",
		urgency: "soon",
		forInfant: true,
		forChild: true,
		steps: [
			{
				order: 1,
				action: "测量体温：腋温 ≥ 37.5°C 或耳温 ≥ 38°C 即为发热",
			},
			{ order: 2, action: "< 3 月龄：任何发热立即就医" },
			{
				order: 3,
				action: "3-36 月龄：体温 ≥ 38°C 持续 24h 或伴不适 → 就医",
			},
			{
				order: 4,
				action: "对乙酰氨基酚 (≥3 月龄) 或布洛芬 (≥6 月龄) 按剂量服用",
			},
			{ order: 5, action: "物理降温：温水擦拭腋下/腹股沟；不要酒精擦浴" },
			{ order: 6, action: "补充水分，少量多次" },
		],
		whenToCall911: [
			"<3 月龄体温 ≥ 38°C",
			"持续抽搐",
			"意识不清/不回应",
			"呼吸困难/嘴唇发紫",
		],
		commonMistakes: [
			"给 < 18 岁儿童服用阿司匹林 (Reye 综合征风险)",
			"用酒精擦浴",
			"捂汗",
		],
	},
	{
		topic: "head_injury",
		title: "头部外伤",
		urgency: "urgent",
		forInfant: true,
		forChild: true,
		steps: [
			{ order: 1, action: "保持冷静，安抚孩子" },
			{
				order: 2,
				action: "冰敷肿胀处 15-20 分钟（用毛巾隔开皮肤）",
				durationSeconds: 1200,
			},
			{ order: 3, action: "观察 24-48 小时：意识、呕吐、行为变化" },
			{ order: 4, action: "可正常进食但避免剧烈活动" },
		],
		whenToCall911: [
			"失去意识（任何时长）",
			"反复呕吐 ≥ 2 次",
			"抽搐发作",
			"两侧瞳孔大小不等",
			"鼻/耳流出血液或透明液体",
			"婴儿囟门膨出",
		],
		commonMistakes: ["忽视症状直接入睡", "未及时复查"],
	},
	{
		topic: "allergen",
		title: "过敏反应",
		urgency: "urgent",
		forInfant: true,
		forChild: true,
		steps: [
			{
				order: 1,
				action: "轻度（皮疹/瘙痒）：口服抗组胺药（如西替利嗪），观察",
			},
			{
				order: 2,
				action: "中度（面部肿胀/呕吐）：肾上腺素自动注射器（如有），立即就医",
			},
			{
				order: 3,
				action: "重度（呼吸困难/休克）：肾上腺素 + 立即拨打 120",
			},
			{ order: 4, action: "侧卧位防止误吸，记录过敏源和时间" },
		],
		whenToCall911: [
			"任何呼吸困难",
			"面部/喉咙肿胀",
			"意识改变",
			"反复呕吐",
		],
		commonMistakes: ["等待症状自行缓解", "未携带肾上腺素注射器"],
	},
	{
		topic: "drowning",
		title: "溺水急救",
		urgency: "emergency",
		forInfant: true,
		forChild: true,
		steps: [
			{ order: 1, action: "立即救上岸，呼叫 120" },
			{ order: 2, action: "检查反应和呼吸" },
			{
				order: 3,
				action: "无呼吸：开始 CPR（5 次初始人工呼吸 + 30:2 循环）",
			},
			{ order: 4, action: "如有意识：脱湿衣、保暖、侧卧位" },
			{ order: 5, action: "所有溺水者必须送医观察（继发性溺水风险）" },
		],
		whenToCall911: ["任何溺水事件，无论状态"],
		commonMistakes: ["倒挂控水（无效且危险）", "未持续观察继发症状"],
	},
	{
		topic: "poisoning",
		title: "中毒急救",
		urgency: "emergency",
		forInfant: true,
		forChild: true,
		steps: [
			{
				order: 1,
				action: "立即拨打 120 或中毒急救中心 010-83132345（中国）",
			},
			{ order: 2, action: "保留毒物原包装/照片供医生参考" },
			{
				order: 3,
				action: "若皮肤/眼睛接触：用流动水冲洗 ≥ 15 分钟",
				durationSeconds: 900,
			},
			{ order: 4, action: "若吸入：立即到通风处" },
			{ order: 5, action: "切勿自行催吐（腐蚀性物质会二次损伤）" },
		],
		whenToCall911: ["任何中毒怀疑", "意识改变", "呼吸困难", "皮肤灼伤"],
		commonMistakes: ["盲目催吐", "给孩子喝水/牛奶稀释（除非医生指导）"],
	},
];

export function getFirstAidGuide(
	topic: FirstAidTopic,
	forInfant = false,
): FirstAidGuide | undefined {
	return FIRST_AID_GUIDES.find(
		(g) => g.topic === topic && (forInfant ? g.forInfant : g.forChild),
	);
}

export function getAllFirstAidTopics(): FirstAidTopic[] {
	return FIRST_AID_GUIDES.map((g) => g.topic);
}

/** Triage severity for a given symptom description. */
export function triageSeverity(
	symptom: string,
): "emergency" | "urgent" | "routine" {
	const s = symptom.toLowerCase();
	const emergencyKeywords =
		/(停止呼吸|no.breath|unconscious|意识不清|报警|猝死|晕厥|抽搐|大出血|爆炸|酸碱|中毒|suspect.*ingestion|choking)/i;
	const urgentKeywords =
		/(烫伤|烧烫伤|burn|发烧|发热|高烧|摸不到|pulseless|伤口|出血|头部外伤|head.*injur|bleeding)/i;
	if (emergencyKeywords.test(s)) return "emergency";
	if (urgentKeywords.test(s)) return "urgent";
	return "routine";
}

// ─── Emergency Protocols (P0/P1/P2) ──────────────────────────────────
//
// Each protocol is a structured response for a first-aid scenario. Steps
// are ordered 1..N, and the call-script is a copy-ready line for the
// 120 (CN) or 911 (US) dispatcher.

export type EmergencyLevel = "P0" | "P1" | "P2";

export interface EmergencyStep {
	order: number;
	action: string;
	durationSeconds?: number;
	warning?: string;
}

export interface EmergencyProtocol {
	topic: FirstAidTopic | "safety-check";
	level: EmergencyLevel;
	summary: string;
	steps: EmergencyStep[];
	callScript: string;
	hospitalAdvice: string;
}

export const EMERGENCY_PROTOCOLS: EmergencyProtocol[] = [
	{
		topic: "choking",
		level: "P0",
		summary: "气道异物窒息 — 黄金 4 分钟",
		steps: [
			{
				order: 1,
				action: "立即拨打 120（中国）或 911（美国），开启免提",
				durationSeconds: 30,
			},
			{
				order: 2,
				action: "1 岁以下：5 次拍背（肩胛骨之间）+ 5 次胸推（胸骨下半段），交替",
				durationSeconds: 60,
				warning: "不要盲目用手指抠，可能把异物推更深",
			},
			{
				order: 3,
				action: "1 岁以上：海姆立克急救法（环抱腹部向上冲击）",
				durationSeconds: 60,
			},
			{
				order: 4,
				action: "若失去意识：开始心肺复苏 (CPR)，30 次胸按 + 2 次人工呼吸",
			},
			{
				order: 5,
				action: "即使症状缓解，仍需急诊评估",
			},
		],
		callScript:
			"我家孩子 [年龄] 出现气道异物窒息，我已实施 [拍背/海姆立克] 急救，目前 [意识清醒/失去意识]。请尽快派救护车到 [地址]。",
		hospitalAdvice: "立即前往最近的三级综合医院急诊或儿童专科医院",
	},
	{
		topic: "cpr",
		level: "P0",
		summary: "心肺骤停 — 黄金 4 分钟",
		steps: [
			{ order: 1, action: "立即拨打 120 并大声呼救" },
			{
				order: 2,
				action: "确认环境安全，孩子仰卧在硬平面上",
				durationSeconds: 5,
			},
			{
				order: 3,
				action: "检查呼吸和脉搏（< 10 秒）",
				durationSeconds: 10,
			},
			{
				order: 4,
				action: "无呼吸/无脉搏：开始 CPR。30 次胸按（深度 1/3 胸廓）+ 2 次人工呼吸",
			},
			{
				order: 5,
				action: "持续直到专业救援到达或孩子恢复意识",
			},
		],
		callScript:
			"我家 [年龄] 孩子失去意识，没有呼吸。我已开始 CPR。请立即派救护车到 [地址]，并电话指导我继续操作。",
		hospitalAdvice: "由救护车送至最近三级医院，途中持续 CPR",
	},
	{
		topic: "bleeding",
		level: "P0",
		summary: "大出血",
		steps: [
			{ order: 1, action: "立即拨打 120" },
			{
				order: 2,
				action: "用干净纱布/衣物直接按压出血点 5-10 分钟",
				durationSeconds: 600,
				warning: "不要反复松开查看",
			},
			{
				order: 3,
				action: "如果血渗透覆盖物，加盖后再按压",
			},
			{
				order: 4,
				action: "抬高出血部位高于心脏",
			},
			{
				order: 5,
				action: "出现失血性休克（苍白、冷汗、嗜睡）保持平卧、盖被保温",
			},
		],
		callScript:
			"我家 [年龄] 孩子出现大出血，部位在 [位置]，我已直接按压 [X] 分钟。请立即派救护车。",
		hospitalAdvice: "救护车送至三级医院急诊",
	},
	{
		topic: "burn",
		level: "P1",
		summary: "烫伤/烧伤",
		steps: [
			{
				order: 1,
				action: "立即脱离热源，剪开/脱去非粘连衣物",
				durationSeconds: 30,
			},
			{
				order: 2,
				action: "凉水冲洗 15-20 分钟（不是冰水！）",
				durationSeconds: 1200,
				warning: "不要涂牙膏、酱油、紫药水等",
			},
			{
				order: 3,
				action: "用干净纱布覆盖，不要包扎过紧",
			},
			{
				order: 4,
				action: "评估烧伤面积：手掌法（孩子手掌=1% 体表）",
			},
			{
				order: 5,
				action: "面积 >5% 或面/颈/会阴/关节 → 立即急诊",
			},
		],
		callScript:
			"我家 [年龄] 孩子被 [热液/火焰] 烫伤，面积约 [X]%，部位 [位置]，已凉水冲洗。请判断是否需要救护车。",
		hospitalAdvice: "中重度烫伤送烧伤专科或三级医院",
	},
	{
		topic: "fever",
		level: "P1",
		summary: "高热",
		steps: [
			{
				order: 1,
				action: "测体温：腋温 ≥38.5°C 为高热",
				durationSeconds: 60,
			},
			{
				order: 2,
				action: "3 月龄以下任何发烧立即急诊，不喂退烧药",
			},
			{
				order: 3,
				action: "3 月龄以上：按体重给对乙酰氨基酚（泰诺林）或布洛芬（美林）",
			},
			{
				order: 4,
				action: "物理降温：温水擦浴（不是酒精/冰水）",
			},
			{
				order: 5,
				action: "精神差、抽搐、皮疹、呼吸困难立即急诊",
			},
		],
		callScript:
			"我家 [年龄] 孩子发烧 [X]°C，[月龄] 个月，已用 [退烧药]。目前精神 [好/差]，是否需要立即就诊？",
		hospitalAdvice: "高热持续 24h+ 或 3 月龄以下 → 立即儿科急诊",
	},
	{
		topic: "head_injury",
		level: "P1",
		summary: "头部外伤",
		steps: [
			{
				order: 1,
				action: "立即冰敷伤处 15-20 分钟（用布包冰块）",
				durationSeconds: 1200,
			},
			{
				order: 2,
				action: "观察 24-48 小时：呕吐、嗜睡、抽搐、瞳孔不等大立即急诊",
			},
			{
				order: 3,
				action: "不要自行给孩子服止痛药（可能掩盖症状）",
			},
			{
				order: 4,
				action: "伤后 2 小时内不要进食（可能要麻醉）",
			},
		],
		callScript:
			"我家 [年龄] 孩子从 [高度] 摔到头，[撞击位置]，目前 [清醒/嗜睡/呕吐]。是否需要立即送医？",
		hospitalAdvice: "任何意识变化或反复呕吐 → 三级医院急诊 + 头颅 CT",
	},
	{
		topic: "allergen",
		level: "P0",
		summary: "严重过敏反应 (过敏性休克)",
		steps: [
			{ order: 1, action: "立即拨打 120" },
			{
				order: 2,
				action: "如已知严重过敏，使用肾上腺素自动注射器 (EpiPen)",
				durationSeconds: 30,
			},
			{
				order: 3,
				action: "平卧，抬高双腿（改善回心血量）",
				warning: "如有呼吸困难可半坐位",
			},
			{
				order: 4,
				action: "如果呕吐，把头侧偏防窒息",
			},
			{
				order: 5,
				action: "即使症状缓解，救护车送至急诊观察 ≥6 小时（可能双相反应）",
			},
		],
		callScript:
			"我家 [年龄] 孩子接触 [过敏原] 后出现 [荨麻疹/呼吸困难/肿胀]，已使用 EpiPen。请立即派救护车。",
		hospitalAdvice: "三级医院急诊，住院观察 ≥ 6 小时",
	},
	{
		topic: "drowning",
		level: "P0",
		summary: "溺水",
		steps: [
			{ order: 1, action: "立即拨打 120" },
			{
				order: 2,
				action: "把孩子从水中救出（救者注意自身安全）",
				durationSeconds: 30,
			},
			{
				order: 3,
				action: "检查呼吸，擦干身体，无呼吸立即 CPR",
				durationSeconds: 10,
			},
			{
				order: 4,
				action: "保暖：脱去湿衣，用干毯子包裹",
			},
			{
				order: 5,
				action: "即使恢复意识，必须送医评估（可能二次溺水）",
			},
		],
		callScript:
			"我家 [年龄] 孩子在 [浴缸/泳池] 溺水，被救起 [X] 分钟。我已 [拍背/控水/CPR]。请立即派救护车。",
		hospitalAdvice: "三级医院急诊 + 住院观察 ≥ 24 小时（防二次溺水）",
	},
	{
		topic: "poisoning",
		level: "P0",
		summary: "中毒/误食",
		steps: [
			{
				order: 1,
				action: "立即拨打 120（中国）/ 1-800-222-1222（美国 Poison Control）",
			},
			{
				order: 2,
				action: "不要催吐（强酸强碱/石油制品会二次损伤）",
				warning: "除非毒物控制中心明确指示",
			},
			{
				order: 3,
				action: "不要喂水/喂奶/喂食物（影响医院判断）",
			},
			{
				order: 4,
				action: "保留原包装/呕吐物带去医院",
			},
			{
				order: 5,
				action: "昏迷或抽搐 → 侧卧位防窒息，立即 CPR 准备",
			},
		],
		callScript:
			"我家 [年龄] 孩子误食 [药品名/化学品名]，约 [X] 分钟前，目前 [清醒/嗜睡/抽搐]。我已 [处理]。",
		hospitalAdvice: "三级医院急诊，需带原包装",
	},
];

/**
 * Build an emergency protocol for a free-form symptom description. Returns
 * the highest-priority matching protocol (P0 > P1 > P2), or a generic
 * safety-check protocol when nothing matches.
 */
export function buildEmergencyProtocol(symptom: string): EmergencyProtocol {
	const s = symptom.toLowerCase();
	// Helper to look up a protocol by topic
	const lookup = (topic: EmergencyProtocol["topic"]): EmergencyProtocol => {
		const found = EMERGENCY_PROTOCOLS.find((p) => p.topic === topic);
		/* v8 ignore next 2 */
		if (!found)
			throw new Error(
				`buildEmergencyProtocol: topic ${topic} not in table`,
			);
		return found;
	};
	// P0 keywords — life-threatening
	if (
		/(窒息|choking|卡住|没呼吸|no.breath|停止呼吸|unconscious|没意识|昏迷|抽搐|seizure|大出血|溺|nearly.drown|过敏|allergen|荨麻疹|中毒|poison|误食|药物|没脉搏|no.pulse)/i.test(
			s,
		)
	) {
		if (/(窒息|choking|卡住)/i.test(s)) return lookup("choking");
		if (
			/(没意识|昏迷|unconscious|no.breath|没呼吸|停止呼吸|没脉搏|no.pulse)/i.test(
				s,
			)
		)
			return lookup("cpr");
		if (/(抽搐|seizure)/i.test(s)) return lookup("cpr");
		if (/(大出血)/i.test(s)) return lookup("bleeding");
		if (/(溺|nearly.drown)/i.test(s)) return lookup("drowning");
		if (/(过敏|allergen|荨麻疹)/i.test(s)) return lookup("allergen");
		if (/(中毒|poison|误食)/i.test(s)) return lookup("poisoning");
		// Unreachable in practice — the P0 keyword regex above is exhaustive.
		/* v8 ignore next 2 */
		throw new Error(
			"buildEmergencyProtocol: P0 keyword branch fell through",
		);
	}
	// P1 keywords — urgent care within hours
	if (
		/(烫伤|burn|发高烧|高烧|40度|41度|42度|摸不到脉|head.*injur|头部外伤|摔到头)/i.test(
			s,
		)
	) {
		// Check fever BEFORE burn so "发高烧" doesn't match "烧"
		if (/(发高烧|高烧|40度|41度|42度|发烧.*月龄|3.*月.*烧)/i.test(s))
			return lookup("fever");
		if (/(烫伤|烫|烧伤|burn)/i.test(s)) return lookup("burn");
		if (/(摔到头|head.*injur|头部外伤|撞到头)/i.test(s))
			return lookup("head_injury");
		// Unreachable in practice — the P1 keyword regex above is exhaustive.
		/* v8 ignore next 2 */
		throw new Error(
			"buildEmergencyProtocol: P1 keyword branch fell through",
		);
	}
	// P2 — non-urgent, schedule a clinic visit
	return {
		topic: "safety-check",
		level: "P2",
		summary: "非紧急情况 — 24 小时内儿科门诊评估",
		steps: [
			{
				order: 1,
				action: "观察孩子精神状态、食欲、尿量",
				durationSeconds: 3600,
			},
			{ order: 2, action: "如有恶化立即重新评估" },
			{ order: 3, action: "记录症状起始时间、持续时长、伴随症状" },
			{ order: 4, action: "24 小时内预约儿科门诊或电话咨询家庭医生" },
		],
		callScript:
			"我家 [年龄] 孩子出现 [症状]，已 [X] 小时。目前精神 [好/差]，食欲 [正常/下降]。想咨询是否需要面诊。",
		hospitalAdvice: "儿科门诊或社区卫生服务中心",
	};
}
