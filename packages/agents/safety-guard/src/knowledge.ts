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
