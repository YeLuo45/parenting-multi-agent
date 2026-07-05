/**
 * KnowledgeRAG knowledge base — evidence-based parenting FAQ + scientific references.
 *
 * Phase 2 batch 2: deterministic in-memory retrieval (keyword/topic match + scoring).
 * No LLM call, no vector store. Designed to be replaceable by a real RAG backend later.
 */

export type EvidenceLevel =
	| "systematic_review"
	| "rct"
	| "cohort"
	| "expert_opinion"
	| "anecdotal";

export type SourceOrg =
	| "AAP"
	| "WHO"
	| "CDC"
	| "NHS"
	| "APA"
	| "UNICEF"
	| "ACOG"
	| "中华医学会"
	| "中国营养学会";

export interface Reference {
	org: SourceOrg;
	title: string;
	year: number;
	url?: string;
}

export interface KnowledgeEntry {
	id: string;
	topic: string; // matches AgentTopic "knowledge" primarily
	tags: string[]; // keyword tags for matching
	stage: (
		| "newborn"
		| "infant"
		| "toddler"
		| "preschool"
		| "school_age"
		| "tween"
		| "teen"
		| "young_adult"
		| "any"
	)[];
	question: string;
	answer: string;
	evidence: EvidenceLevel;
	references: Reference[];
}

/** Stop words to filter out from query keywords.
 *  Rule of thumb: keep ONLY grammar-only particles (的/了/是/在/有/和/就
 *  /不/也/都/这/那/么/啊/吧/呢/吗/哦/嗯) that don't carry meaning. AVOID
 *  common Han characters with semantic content like 你/好/我/他 — including
 *  them breaks the token "你好" (would strip to []) and triggers false
 *  prefix matches (e.g. "好" prefix-matching "好处"). */
const STOP_WORDS = new Set([
	"a",
	"an",
	"the",
	"is",
	"are",
	"what",
	"how",
	"why",
	"when",
	"where",
	"who",
	"的",
	"了",
	"是",
	"在",
	"有",
	"和",
	"就",
	"不",
	"也",
	"都",
	"这",
	"那",
	"么",
	"啊",
	"吧",
	"呢",
	"吗",
	"哦",
	"嗯",
]);

export function tokenize(text: string): string[] {
	const cleaned = text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ");
	// Split on whitespace first (handles English words)
	const parts = cleaned.split(/\s+/).filter(Boolean);
	const tokens: string[] = [];
	const HAN_OR_LATIN_RE = /[\p{Script=Han}]|[\p{L}\p{N}]+/gu;
	for (const part of parts) {
		// Split Han characters individually (each Chinese char = one token)
		// Keep non-Han sequences together (English words, numbers)
		// After replace, every part has at least one Han or Latin char, so match() always succeeds
		const matches = part.match(HAN_OR_LATIN_RE);
		if (matches) tokens.push(...matches);
	}
	return tokens.filter((w) => w.length >= 1 && !STOP_WORDS.has(w));
}

/** Score how well a query matches an entry. Higher = better match. */
export function scoreEntry(query: string, entry: KnowledgeEntry): number {
	const qTokens = new Set(tokenize(query));
	if (qTokens.size === 0) return 0;

	const entryTokens = new Set([
		...tokenize(entry.question),
		...entry.tags.flatMap((t) => tokenize(t)),
		...tokenize(entry.topic),
	]);

	let hits = 0;
	for (const qt of qTokens) {
		if (entryTokens.has(qt)) hits++;
		// also: any entry token starts with query token or vice versa
		for (const et of entryTokens) {
			if (
				et !== qt &&
				(et.startsWith(qt) || qt.startsWith(et)) &&
				Math.min(et.length, qt.length) >= 2
			) {
				hits += 0.5;
			}
		}
	}
	return hits / Math.max(qTokens.size, 1);
}

/** Top N matching entries for a query, sorted by score desc. */
export function searchKnowledge(
	query: string,
	entries: KnowledgeEntry[],
	topN = 3,
): KnowledgeEntry[] {
	const scored = entries
		.map((e) => ({ e, s: scoreEntry(query, e) }))
		.filter((x) => x.s > 0);
	scored.sort((a, b) => b.s - a.s);
	return scored.slice(0, topN).map((x) => x.e);
}

/** Filter entries by child stage. */
export function byStage(
	entries: KnowledgeEntry[],
	stage: string | undefined,
): KnowledgeEntry[] {
	if (!stage) return entries;
	return entries.filter(
		(e) =>
			e.stage.includes("any") ||
			e.stage.includes(stage as KnowledgeEntry["stage"][number]),
	);
}

/** Knowledge base — curated parenting facts across stages. */
export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
	{
		id: "kb-breastfeeding-duration",
		topic: "nutrition",
		tags: [
			"母乳",
			"喂养",
			"breastfeed",
			"nursing",
			"duration",
			"多久",
			"几个月",
		],
		stage: ["newborn", "infant", "toddler", "any"],
		question: "母乳喂养应该持续多久？",
		answer: "世界卫生组织 (WHO) 和美国儿科学会 (AAP) 推荐：纯母乳喂养至 6 月龄，然后引入辅食并继续母乳喂养至 2 岁或以上，由母婴双方决定。",
		evidence: "systematic_review",
		references: [
			{ org: "WHO", title: "Infant and young child feeding", year: 2023 },
			{
				org: "AAP",
				title: "Breastfeeding and the Use of Human Milk",
				year: 2022,
			},
		],
	},
	{
		id: "kb-screen-time-aap",
		topic: "habits",
		tags: [
			"屏幕",
			"screen",
			"时间",
			"time",
			"手机",
			"电视",
			"ipad",
			"tablet",
			"看",
		],
		stage: [
			"infant",
			"toddler",
			"preschool",
			"school_age",
			"tween",
			"teen",
			"any",
		],
		question: "孩子每天看屏幕多长时间合适？",
		answer: "AAP 建议：18 月龄以下避免屏幕时间（视频通话除外）；2-5 岁每天不超过 1 小时高质量节目；6 岁以上设定一致限制，确保不影响睡眠、运动和学习。",
		evidence: "systematic_review",
		references: [
			{ org: "AAP", title: "Media and Children", year: 2024 },
			{
				org: "WHO",
				title: "Guidelines on physical activity, sedentary behaviour and sleep for children under 5",
				year: 2019,
			},
		],
	},
	{
		id: "kb-sleep-hours-preschool",
		topic: "sleep",
		tags: [
			"睡眠",
			"sleep",
			"小时",
			"hours",
			"学龄前",
			"preschool",
			"每天",
			"per day",
		],
		stage: ["preschool", "school_age"],
		question: "学龄前儿童每天需要多少睡眠？",
		answer: "AAP 推荐：3-5 岁儿童每天 10-13 小时睡眠（含小睡）；6-12 岁 9-12 小时；13-18 岁 8-10 小时。固定作息有助于入睡。",
		evidence: "systematic_review",
		references: [
			{
				org: "AAP",
				title: "Sleep Recommendations for Children",
				year: 2023,
			},
		],
	},
	{
		id: "kb-fever-temperature",
		topic: "health",
		tags: ["发烧", "fever", "温度", "temperature", "多少度", "定义"],
		stage: [
			"newborn",
			"infant",
			"toddler",
			"preschool",
			"school_age",
			"any",
		],
		question: "多少度算发烧？",
		answer: "直肠温度 ≥38.0°C (100.4°F) 定义为发烧。腋下温度 ≥37.5°C，耳温 ≥38.0°C。3 月龄以下宝宝发烧需立即就医，不应自行处理。",
		evidence: "expert_opinion",
		references: [
			{
				org: "AAP",
				title: "Fever Without a Source in Infants 3-36 months",
				year: 2021,
			},
		],
	},
	{
		id: "kb-tantrum-normal",
		topic: "behavior",
		tags: ["发脾气", "tantrum", "正常", "normal", "幼儿", "toddler"],
		stage: ["toddler", "preschool"],
		question: "幼儿发脾气是正常的吗？",
		answer: "幼儿 (1-3 岁) 因语言和情绪调节能力尚未发育，发脾气是正常且常见的。每次发脾气持续 5-15 分钟，平均每天 1-3 次。保持冷静、设定界限、事后复盘是最有效的应对方式。",
		evidence: "cohort",
		references: [
			{ org: "APA", title: "Temper Tantrums in Children", year: 2022 },
		],
	},
	{
		id: "kb-vitamin-d-supplement",
		topic: "nutrition",
		tags: ["维生素d", "vitamin d", "补充", "supplement", "vd", "d3"],
		stage: ["newborn", "infant", "toddler"],
		question: "宝宝需要补充维生素 D 吗？",
		answer: "AAP 推荐：母乳喂养的婴儿从出生几天起每日补充 400 IU 维生素 D，直至每天饮用 ≥1L 强化配方奶或牛奶。配方奶喂养的婴儿若摄入不足也需要补充。",
		evidence: "rct",
		references: [
			{
				org: "AAP",
				title: "Vitamin D Supplementation for Infants",
				year: 2022,
			},
		],
	},
	{
		id: "kb-vaccine-schedule",
		topic: "vaccine",
		tags: ["疫苗", "vaccine", "接种", "schedule", "时间表", "计划"],
		stage: [
			"newborn",
			"infant",
			"toddler",
			"preschool",
			"school_age",
			"any",
		],
		question: "国家免疫规划疫苗时间表？",
		answer: "中国国家免疫规划：出生时卡介苗+乙肝第1剂；1月乙肝第2剂；2月脊灰第1剂；3月脊灰第2剂+百白破第1剂；4月脊灰第3剂+百白破第2剂；5月百白破第3剂；6月乙肝第3剂+A群流脑第1剂；8月麻腮风+乙脑减毒；具体以当地疾控为准。",
		evidence: "expert_opinion",
		references: [
			{
				org: "中华医学会",
				title: "国家免疫规划疫苗儿童免疫程序说明",
				year: 2024,
			},
		],
	},
	{
		id: "kb-reading-aloud",
		topic: "education",
		tags: ["阅读", "reading", "绘本", "book", "大声读", "朗读", "亲子"],
		stage: ["infant", "toddler", "preschool", "school_age", "any"],
		question: "亲子阅读有什么好处？",
		answer: "研究表明，从出生起每天亲子阅读 15 分钟可显著提升语言能力、词汇量、注意力和亲子依恋。AAP 推荐从 6 月龄开始每日朗读，0-5 岁是黄金期。",
		evidence: "rct",
		references: [
			{
				org: "AAP",
				title: "Literacy Promotion: An Essential Component of Primary Care Pediatric Practice",
				year: 2022,
			},
		],
	},
	{
		id: "kb-picky-eating-duration",
		topic: "nutrition",
		tags: ["挑食", "picky", "eating", "fussy", "持续", "多久"],
		stage: ["toddler", "preschool"],
		question: "挑食会持续多久？",
		answer: "挑食在 2-6 岁常见，通常 5-7 岁自行缓解。研究显示 50% 的挑食儿童到 7-8 岁恢复正常饮食。家长应继续提供多样化食物但不强迫进食。",
		evidence: "cohort",
		references: [
			{
				org: "APA",
				title: "Picky eating in children: development and treatment",
				year: 2020,
			},
		],
	},
	{
		id: "kb-sibling-rivalry",
		topic: "family",
		tags: [
			"同胞",
			"sibling",
			"竞争",
			"rivalry",
			"打架",
			"吵架",
			"兄弟姐妹",
		],
		stage: ["toddler", "preschool", "school_age"],
		question: "同胞竞争怎么办？",
		answer: "同胞竞争在 2-7 岁常见，是正常的发育过程。建议：①不比较；②给每个孩子单独时间；③避免让大孩子做'小家长'；④设立共同规则并一致执行。",
		evidence: "expert_opinion",
		references: [
			{ org: "APA", title: "Sibling Relationships", year: 2021 },
		],
	},
	{
		id: "kb-second-hand-smoke",
		topic: "safety",
		tags: ["二手烟", "smoke", "smoking", "passive", "危害"],
		stage: [
			"newborn",
			"infant",
			"toddler",
			"preschool",
			"school_age",
			"tween",
			"teen",
			"any",
		],
		question: "二手烟对孩子的危害？",
		answer: "二手烟暴露增加儿童哮喘、中耳炎、肺炎、婴儿猝死综合征 (SIDS) 风险，并影响认知发育。家中应完全禁烟，无法避免时让孩子远离吸烟区域。",
		evidence: "systematic_review",
		references: [
			{ org: "AAP", title: "Secondhand Smoke and Children", year: 2023 },
		],
	},
	{
		id: "kb-anxiety-prevalence",
		topic: "emotion",
		tags: [
			"焦虑",
			"anxiety",
			"数据",
			"prevalence",
			"青少年",
			"青少年",
			"teen",
		],
		stage: ["school_age", "tween", "teen"],
		question: "青少年焦虑的普遍率？",
		answer: "全球约 7% 的青少年 (12-17 岁) 经历焦虑障碍，COVID-19 后这一比例上升至 20%+。识别早期信号（如回避、睡眠问题、躯体不适）有助于及时干预。",
		evidence: "systematic_review",
		references: [
			{ org: "WHO", title: "Mental health of adolescents", year: 2024 },
		],
	},
	{
		id: "kb-babywearing-tradition",
		topic: "family",
		tags: [
			"背带",
			"babywearing",
			"传统",
			"tradition",
			"亲密",
			"attachment",
		],
		stage: ["newborn", "infant", "any"],
		question: "宝宝背带有什么好处？",
		answer: "许多文化使用背带/包裹背宝宝，这种做法可促进亲子依恋、便于哺乳、解放父母双手。具体时长和姿势因文化而异。",
		evidence: "anecdotal",
		references: [
			{
				org: "UNICEF",
				title: "Baby-wearing and attachment: cross-cultural perspectives",
				year: 2020,
			},
		],
	},
	// ─── Nutrition: solids, allergies, picky eating ─────────────────
	{
		id: "kb-solids-introduction-age",
		topic: "nutrition",
		tags: [
			"辅食",
			"添加",
			"时间",
			"几个月",
			"solid",
			"introduction",
			"complementary",
		],
		stage: ["infant"],
		question: "宝宝几个月开始添加辅食？",
		answer: "WHO 和 AAP 推荐纯母乳或配方奶至 6 月龄左右，6 个月左右引入辅食，过早（<4 个月）增加过敏和窒息风险，过晚（>7 个月）可能错过味觉敏感期。",
		evidence: "systematic_review",
		references: [
			{ org: "WHO", title: "Complementary feeding", year: 2023 },
			{ org: "AAP", title: "Starting Solid Foods", year: 2022 },
		],
	},
	{
		id: "kb-allergens-early-introduction",
		topic: "nutrition",
		tags: [
			"过敏",
			"过敏原",
			"花",
			"鸡",
			"egg",
			"peanut",
			"allergy",
			"early",
			"早期",
		],
		stage: ["infant", "toddler"],
		question: "宝宝什么时候可以尝试易过敏食物（花生、鸡蛋）？",
		answer: "LEAP 研究（2015）等多项证据显示，4-6 月龄起在医生指导下早期引入花生和鸡蛋可显著降低食物过敏风险。无需刻意推迟。",
		evidence: "rct",
		references: [
			{
				org: "AAP",
				title: "Randomized Trial of Peanut Consumption in Infants at Risk",
				year: 2015,
			},
		],
	},
	{
		id: "kb-milk-after-one-year",
		topic: "nutrition",
		tags: ["牛奶", "whole", "milk", "1岁", "toddler", "全脂"],
		stage: ["toddler"],
		question: "宝宝 1 岁后该喝什么奶？",
		answer: "1 岁后可以喝全脂牛奶（每日不超过 720ml），同时保持均衡饮食。2 岁后根据饮食和体重可考虑低脂奶。",
		evidence: "expert_opinion",
		references: [
			{ org: "AAP", title: "Cow's Milk for Toddlers", year: 2022 },
		],
	},
	{
		id: "kb-juice-recommendation",
		topic: "nutrition",
		tags: ["果汁", "juice", "糖", "sugar", "饮料"],
		stage: ["toddler", "preschool", "school_age"],
		question: "宝宝可以喝果汁吗？",
		answer: "AAP 建议 1 岁以下不喝任何果汁，1-3 岁每天不超过 120ml，4-6 岁不超过 180ml。直接吃水果更优，果汁含糖高且缺少纤维。",
		evidence: "expert_opinion",
		references: [
			{
				org: "AAP",
				title: "Fruit Juice in Infants, Children, and Adolescents",
				year: 2023,
			},
		],
	},
	{
		id: "kb-picky-eater-strategies",
		topic: "nutrition",
		tags: ["挑食", "picky", "策略", "strategy", "食物多样化", "variety"],
		stage: ["toddler", "preschool"],
		question: "孩子挑食怎么办？",
		answer: '挑食在 2-5 岁常见。研究支持"反复暴露"（同一食物出现 10-15 次）+ "角色榜样"（家长一起吃）+ "健康压力"（一餐固定时间，30 分钟）三策略。避免强迫或贿赂。',
		evidence: "cohort",
		references: [
			{
				org: "AAP",
				title: "Practical approaches to picky eating",
				year: 2021,
			},
		],
	},
	{
		id: "kb-iron-deficiency-toddler",
		topic: "nutrition",
		tags: ["铁", "iron", "缺乏", "deficiency", "幼儿", "toddler", "贫血"],
		stage: ["infant", "toddler"],
		question: "幼儿缺铁性贫血怎么办？",
		answer: "6-24 月龄是缺铁高发期。建议：① 4-6 月起高铁辅食（强化铁米粉、红肉泥）；② 维生素 C 助铁吸收；③ 1 岁后筛查血红蛋白；④ 必要时补充铁剂。",
		evidence: "systematic_review",
		references: [
			{
				org: "AAP",
				title: "Iron Deficiency in Early Childhood",
				year: 2022,
			},
		],
	},
	// ─── Sleep: night wakings, training, naps ──────────────────────
	{
		id: "kb-night-waking-12-months",
		topic: "sleep",
		tags: ["夜醒", "night", "waking", "频繁", "12个月", "1岁", "infant"],
		stage: ["infant", "toddler"],
		question: "宝宝 1 岁后夜醒频繁正常吗？",
		answer: "1 岁后夜醒 1-2 次仍属正常（睡眠周期转换时易醒）。建议：① 固定睡前流程；② 自我安抚（不依赖喂奶/抱）；③ 检查环境（温度、湿度、噪音）；④ 持续 2 周以上且影响发育需就医。",
		evidence: "expert_opinion",
		references: [
			{ org: "AAP", title: "Sleep Challenges in Toddlers", year: 2022 },
		],
	},
	{
		id: "kb-sleep-training-age",
		topic: "sleep",
		tags: ["睡眠训练", "cry", "it", "out", "ferber", "训练", "几个月"],
		stage: ["infant", "toddler"],
		question: "什么时候可以开始睡眠训练？",
		answer: "4-6 月龄后可以开始渐进式睡眠训练（如 Ferber 法、椅子法）。研究显示渐进式哭泣时间（5-30 分钟）不会对亲子依恋或压力水平造成长期影响。",
		evidence: "rct",
		references: [
			{
				org: "AAP",
				title: "Behavioral Interventions for Infant Sleep Problems",
				year: 2020,
			},
		],
	},
	{
		id: "kb-nap-transition-ages",
		topic: "sleep",
		tags: ["小睡", "nap", "过渡", "transition", "几次", "几岁"],
		stage: ["infant", "toddler", "preschool"],
		question: "孩子白天要睡几次？",
		answer: "推荐：4-12 月龄 2-3 次小睡；12-18 月龄过渡到 2 次；18 月-3 岁 1 次；3-5 岁部分孩子可以完全不需要。睡眠总时长 0-3 岁建议 11-14 小时/天（含夜睡+小睡）。",
		evidence: "expert_opinion",
		references: [
			{
				org: "AAP",
				title: "Recommended Sleep Duration by Age",
				year: 2023,
			},
		],
	},
	{
		id: "kb-co-sleeping-safety",
		topic: "sleep",
		tags: ["同床", "co-sleep", "床", "安全", "safety", "SIDS", "婴儿猝死"],
		stage: ["newborn", "infant"],
		question: "可以和宝宝同床睡吗？",
		answer: "AAP 建议 1 岁前同房不同床。同床睡增加婴儿猝死综合征 (SIDS)、窒息、跌落风险。如选择同床须排除：父母吸烟/饮酒/服药、软床垫、过多被褥、早产或低体重儿。",
		evidence: "systematic_review",
		references: [
			{ org: "AAP", title: "Safe Sleep Guidelines", year: 2022 },
		],
	},
	{
		id: "kb-nightmares-vs-night-terrors",
		topic: "sleep",
		tags: [
			"噩梦",
			"nightmare",
			"夜惊",
			"night",
			"terror",
			"区别",
			"preschool",
		],
		stage: ["toddler", "preschool", "school_age"],
		question: "孩子做噩梦和夜惊有什么区别？",
		answer: "噩梦发生在 REM 睡眠期（后半夜），孩子会醒来并记得内容，需要安慰。夜惊发生在 NREM 深睡期（上半夜），孩子看起来惊恐但实际未醒，次日无记忆，强行唤醒会延长发作。",
		evidence: "expert_opinion",
		references: [
			{ org: "AAP", title: "Nightmares and Night Terrors", year: 2021 },
		],
	},
	// ─── Health: fever, medication, illness ─────────────────────────
	{
		id: "kb-fever-medication-age",
		topic: "health",
		tags: [
			"退烧药",
			"布洛",
			"ibuprofen",
			"acetaminophen",
			"泰诺",
			"布洛芬",
		],
		stage: ["infant", "toddler", "preschool"],
		question: "宝宝发烧该用哪种退烧药？",
		answer: "3 月龄以上可用对乙酰氨基酚（泰诺林），6 月龄以上可用布洛芬（美林）。按体重给药，不按年龄。每 4-6 小时一次，24 小时不超过 4 次。3 月龄以下发烧立即就医。",
		evidence: "expert_opinion",
		references: [
			{ org: "AAP", title: "Fever and Pain Management", year: 2023 },
		],
	},
	{
		id: "kb-fever-watch-wait",
		topic: "health",
		tags: ["发烧", "fever", "观察", "watch", "wait", "几天"],
		stage: ["infant", "toddler", "preschool"],
		question: "宝宝发烧多久需要看医生？",
		answer: "3 月龄以下任何发烧立即就医；3-36 月龄发烧 ≥38°C 持续 24 小时以上或精神差需就医；任何年龄 ≥40°C、惊厥、呼吸困难、皮疹、拒绝喝水立即就医。",
		evidence: "expert_opinion",
		references: [
			{ org: "AAP", title: "When to Call the Pediatrician", year: 2023 },
		],
	},
	{
		id: "kb-cough-medicine-age",
		topic: "health",
		tags: ["咳嗽", "感冒", "cough", "medicine", "sweet", "蜂蜜", "honey"],
		stage: ["toddler", "preschool", "school_age"],
		question: "孩子咳嗽可以吃止咳药吗？",
		answer: "4 岁以下不推荐任何非处方止咳药或感冒药（副作用大于收益）。1 岁以上可以喝蜂蜜（半勺-1 勺）缓解夜咳，效果相当于右美沙芬。4-6 岁需医生指导。",
		evidence: "rct",
		references: [
			{
				org: "AAP",
				title: "Cough and Cold Medicine in Children",
				year: 2022,
			},
		],
	},
	{
		id: "kb-diarrhea-ors",
		topic: "health",
		tags: ["腹泻", "diarrhea", "补液", "ORS", "口服", "电解质"],
		stage: ["infant", "toddler", "preschool"],
		question: "孩子腹泻怎么办？",
		answer: "补液是关键！口服补液盐 (ORS) III 优于白水、果汁或运动饮料。每次稀便后补充：<2 岁 50-100ml，2-10 岁 100-200ml。持续 24 小时以上、精神差、尿少或血便立即就医。",
		evidence: "systematic_review",
		references: [
			{ org: "WHO", title: "Oral Rehydration Salts", year: 2022 },
		],
	},
	{
		id: "kb-antibiotics-resistance",
		topic: "health",
		tags: ["抗生素", "antibiotic", "耐药", "resistance", "滥用"],
		stage: ["any"],
		question: "感冒需要吃抗生素吗？",
		answer: "普通感冒、流感、绝大多数咽喉炎是病毒引起，抗生素无效。滥用抗生素导致耐药菌增加、肠道菌群紊乱、过敏风险上升。医生判断为细菌感染（链球菌、肺炎等）时才用。",
		evidence: "systematic_review",
		references: [
			{ org: "WHO", title: "Antibiotic Resistance", year: 2023 },
		],
	},
	{
		id: "kb-eczema-skincare",
		topic: "health",
		tags: ["湿疹", "eczema", "保湿", "moisturizer", "护肤", "皮肤"],
		stage: ["infant", "toddler"],
		question: "宝宝湿疹怎么护理？",
		answer: "湿疹核心是皮肤屏障缺陷：① 每日 1-2 次厚涂保湿霜（凡士林/丝塔芙/艾维诺）；② 温水短浴（<10 分钟）；③ 避免羊毛/化纤直接接触；④ 中重度需要弱效激素（地奈德）短期使用；⑤ 排查食物过敏（与皮肤科/过敏科）。",
		evidence: "systematic_review",
		references: [
			{ org: "AAP", title: "Atopic Dermatitis in Children", year: 2022 },
		],
	},
	{
		id: "kb-vaccine-side-effects",
		topic: "vaccine",
		tags: ["疫苗", "副作用", "side", "effect", "发烧", "fever"],
		stage: ["newborn", "infant", "toddler"],
		question: "宝宝打疫苗后发烧怎么办？",
		answer: "疫苗后 24 小时内低热（<38.5°C）常见，是免疫反应。处理：多喝水、物理降温、必要时按体重给对乙酰氨基酚。持续高热 >48 小时或精神差需就医排除偶合感染。",
		evidence: "expert_opinion",
		references: [{ org: "CDC", title: "Vaccine Side Effects", year: 2023 }],
	},
	{
		id: "kb-flu-vaccine-annual",
		topic: "vaccine",
		tags: ["流感", "flu", "疫苗", "年度", "annual", "6月龄"],
		stage: ["infant", "toddler", "preschool", "school_age", "any"],
		question: "宝宝需要每年打流感疫苗吗？",
		answer: "6 月龄以上推荐每年接种流感疫苗（9 岁以下首次接种需 2 剂，间隔 4 周）。最佳时间为 10 月底前。孕妇接种可保护 <6 月龄不能接种的婴儿。",
		evidence: "systematic_review",
		references: [
			{ org: "CDC", title: "Influenza Vaccination", year: 2023 },
		],
	},
	// ─── Behavior & Emotion ────────────────────────────────────────
	{
		id: "kb-tantrum-duration-normal",
		topic: "behavior",
		tags: ["发脾气", "tantrum", "持续", "duration", "几分钟", "正常"],
		stage: ["toddler", "preschool"],
		question: "孩子发脾气持续多久是正常的？",
		answer: "1-3 岁发脾气持续 5-15 分钟常见（极端情况 30 分钟）。多数儿童 4 岁后逐渐减少。如果 >30 分钟、每天多次、5 岁后仍频繁且无法安抚，建议看发育行为儿科。",
		evidence: "cohort",
		references: [{ org: "AAP", title: "Temper Tantrums", year: 2022 }],
	},
	{
		id: "kb-separation-anxiety-age",
		topic: "emotion",
		tags: ["分离焦虑", "separation", "anxiety", "几个月", "stages"],
		stage: ["infant", "toddler"],
		question: "宝宝什么时候会有分离焦虑？",
		answer: '8-18 月龄是分离焦虑高峰期，是健康依恋的表现。处理：① 短暂离开前明确告知"妈妈去 XX 会回来"；② 告别仪式简短（避免偷偷溜走）；③ 留下安抚物；④ 接受者（祖父母/老师）多陪伴。',
		evidence: "expert_opinion",
		references: [{ org: "AAP", title: "Separation Anxiety", year: 2021 }],
	},
	{
		id: "kb-biting-preschool",
		topic: "behavior",
		tags: ["咬人", "biting", "打人", "hit", "幼儿园", "preschool"],
		stage: ["infant", "toddler", "preschool"],
		question: "孩子在幼儿园咬人怎么办？",
		answer: '1-3 岁咬人是表达挫折的语言前阶段行为。处理：① 立即平静制止并说"不可以咬人会痛"；② 关注被咬孩子；③ 不打骂、不嘲笑；④ 识别触发场景（争抢玩具、过度刺激、表达需求）；⑤ 持续 3 个月以上或 4 岁仍咬人需评估。',
		evidence: "expert_opinion",
		references: [
			{ org: "AAP", title: "Biting in Young Children", year: 2021 },
		],
	},
	{
		id: "kb-screen-time-toddler",
		topic: "habits",
		tags: ["屏幕", "screen", "time", "时间", "幼儿", "toddler", "2岁"],
		stage: ["infant", "toddler"],
		question: "宝宝可以看屏幕吗？多少时间合适？",
		answer: "WHO 和 AAP：18 月龄以下避免任何屏幕（视频通话除外）；18-24 月龄家长陪伴看高质量节目 <1 小时；2-5 岁每天屏幕 <1 小时；5 岁以上每天 <2 小时并保持 1 小时户外活动。",
		evidence: "systematic_review",
		references: [
			{
				org: "WHO",
				title: "Guidelines on Physical Activity, Sedentary Behaviour and Sleep for Children Under 5 Years of Age",
				year: 2019,
			},
		],
	},
	{
		id: "kb-bedtime-routine-importance",
		topic: "habits",
		tags: ["睡前流程", "bedtime", "routine", "步骤", "步骤", "consistent"],
		stage: ["infant", "toddler", "preschool"],
		question: "为什么要建立固定的睡前流程？",
		answer: "30-60 分钟固定睡前流程（洗澡→换睡衣→刷牙→讲故事→关灯）可：① 提升睡眠质量 30%+；② 减少夜醒；③ 改善白天情绪和行为；④ 让孩子形成可预测的安全感。",
		evidence: "cohort",
		references: [
			{
				org: "AAP",
				title: "Bedtime Routines for Young Children",
				year: 2022,
			},
		],
	},
	// ─── Development milestones ────────────────────────────────────
	{
		id: "kb-walking-milestone",
		topic: "development",
		tags: ["走路", "walk", "里程碑", "milestone", "几个月", "1岁", "晚"],
		stage: ["infant", "toddler"],
		question: "宝宝什么时候学会走路？",
		answer: "独立行走 9-18 月龄（平均 12 月龄）。如果 18 月龄仍不能独走、2 岁仍步态异常（如明显跛行或足尖步态持续 3 月+），需看发育儿科或儿童骨科排查。",
		evidence: "cohort",
		references: [
			{
				org: "AAP",
				title: "Developmental Milestones: Walking",
				year: 2023,
			},
		],
	},
	{
		id: "kb-language-delay-red-flags",
		topic: "development",
		tags: ["语言", "speech", "delay", "延迟", "几个词", "stages"],
		stage: ["infant", "toddler", "preschool"],
		question: "宝宝说话晚需要看医生吗？",
		answer: "预警信号：12 月龄不会用手指物/挥手再见；18 月龄不会说 6 个词或听不懂简单指令；2 岁词汇 <50 个或不会 2 词短语；3 岁听不懂故事、陌生人听不懂。任一情况需要听力筛查 + 言语评估。",
		evidence: "expert_opinion",
		references: [
			{ org: "AAP", title: "Speech and Language Milestones", year: 2023 },
		],
	},
	{
		id: "kb-fine-motor-12-months",
		topic: "development",
		tags: ["精细运动", "fine", "motor", "抓", "pincer", "12月", "toddler"],
		stage: ["infant", "toddler"],
		question: "宝宝什么时候能用拇指食指捏东西？",
		answer: '9-12 月龄学会拇指-食指对捏（"钳形抓握"）。早期练习机会：① 小米花/溶豆（注意窒息风险需软化）；② 串大珠子；③ 按形状分类。如果 12 月龄仍不会用钳形抓握，建议看康复科。',
		evidence: "expert_opinion",
		references: [
			{ org: "AAP", title: "Fine Motor Development", year: 2022 },
		],
	},
	{
		id: "kb-toilet-training-readiness",
		topic: "development",
		tags: ["如厕", "训练", "toilet", "potty", "ready", "几岁"],
		stage: ["toddler"],
		question: "孩子什么时候可以进行如厕训练？",
		answer: "平均 22-36 月龄。准备信号：① 尿布湿了会示意；② 能听懂简单指令；③ 自己拉下裤子；④ 想模仿大人；⑤ 尿布干燥 2 小时以上。强制训练易导致便秘和对如厕的抗拒。",
		evidence: "cohort",
		references: [{ org: "AAP", title: "Toilet Training", year: 2022 }],
	},
	// ─── Education & Learning ─────────────────────────────────────
	{
		id: "kb-reading-age-start",
		topic: "education",
		tags: ["阅读", "reading", "几个月", "开始", "aloud", "亲子"],
		stage: ["infant", "toddler", "preschool"],
		question: "什么时候开始给孩子读书？",
		answer: '出生后就可以开始"亲子共读"。0-3 岁重点是词汇输入和亲子互动，不是理解。研究显示：5 岁前共读 1000+ 本书的孩子，语言和读写能力显著高于未共读者。',
		evidence: "cohort",
		references: [
			{ org: "AAP", title: "Read Aloud from Birth", year: 2021 },
		],
	},
	{
		id: "kb-preschool-readiness-3-year",
		topic: "education",
		tags: ["幼儿园", "preschool", "准备", "几岁", "3岁", "分离"],
		stage: ["toddler", "preschool"],
		question: "孩子几岁可以上幼儿园？",
		answer: "2.5-3 岁可考虑日托或幼儿园小班。准备清单：① 基础自理（自己吃饭、上厕所）；② 简单指令理解；③ 短时分离不焦虑；④ 疫苗接种完成；⑤ 表达基本需求（饿了、困了、想上厕所）。",
		evidence: "expert_opinion",
		references: [{ org: "AAP", title: "Starting Preschool", year: 2022 }],
	},
	{
		id: "kb-play-based-learning",
		topic: "education",
		tags: ["游戏", "play", "学习", "learning", "toddler", "preschool"],
		stage: ["toddler", "preschool"],
		question: '孩子应该几岁开始"正式学习"？',
		answer: '3-6 岁阶段推荐"游戏式学习"：自由游戏、角色扮演、户外探索、积木、绘画。读写算术等"正式学习"在 6-7 岁大脑准备好后更有效。早期填鸭可能适得其反。',
		evidence: "systematic_review",
		references: [{ org: "AAP", title: "The Power of Play", year: 2023 }],
	},
	// ─── Safety ─────────────────────────────────────────────────────
	{
		id: "kb-car-seat-age",
		topic: "safety",
		tags: [
			"安全座椅",
			"car",
			"seat",
			"年龄",
			"backward",
			"forward",
			"booster",
		],
		stage: ["infant", "toddler", "preschool", "school_age"],
		question: "宝宝要坐到几岁才能不用安全座椅？",
		answer: "美国儿科学会：① 0-2 岁反向安装（rear-facing）；② 2 岁后或超出座椅上限改正向安装（forward-facing）；③ 身高体重达上限后用 booster；④ 12 岁前或身高 145cm 前不能直接用成人安全带。",
		evidence: "expert_opinion",
		references: [
			{
				org: "AAP",
				title: "Car Seats: Information for Families",
				year: 2023,
			},
		],
	},
	{
		id: "kb-choking-hazards-food",
		topic: "safety",
		tags: ["窒息", "choking", "食物", "高风险", "窒息风险", "4岁以下"],
		stage: ["infant", "toddler"],
		question: "哪些食物容易让宝宝窒息？",
		answer: "4 岁以下高风险食物：整粒坚果、葡萄（应纵切）、爆米花、热狗（应纵切）、硬糖、生胡萝卜（应煮软或切丝）、花生酱（厚涂）。急救法：5 次拍背 + 5 次胸推（<1 岁）或海姆立克（>1 岁）。",
		evidence: "expert_opinion",
		references: [{ org: "AAP", title: "Choking Prevention", year: 2023 }],
	},
	{
		id: "kb-water-safety-toddler",
		topic: "safety",
		tags: ["溺水", "water", "safety", "游泳池", "toddler", "看护"],
		stage: ["infant", "toddler", "preschool"],
		question: "宝宝多大可以学游泳？",
		answer: "AAP 不建议 1 岁前任何游泳课（无证据降低溺水风险）。1-4 岁可参加有安全保障的水中适应课程，但绝不替代看护。家中：① 卫生间门常关；② 浴缸/水桶用完立即排空；③ 泳池 4 面围栏 + 门自锁。",
		evidence: "expert_opinion",
		references: [
			{ org: "AAP", title: "Swim Lessons & Water Safety", year: 2023 },
		],
	},
	{
		id: "kb-poison-control-number",
		topic: "safety",
		tags: ["中毒", "误食", "poison", "急救", "电话", "hotline"],
		stage: ["any"],
		question: "孩子误食药物或化学品怎么办？",
		answer: "立即拨打 120（中国）/ 1-800-222-1222（美国 Poison Control）。不要催吐（强酸强碱会二次损伤），不要喝水或牛奶（影响医院判断），带上原包装去医院。如已昏迷或抽搐立即 120。",
		evidence: "expert_opinion",
		references: [{ org: "AAP", title: "Poison Prevention", year: 2023 }],
	},
	{
		id: "kb-sun-protection-baby",
		topic: "safety",
		tags: ["防晒", "sun", "保护", "6个月", "婴儿", "防晒霜"],
		stage: ["infant", "toddler", "preschool"],
		question: "宝宝可以用防晒霜吗？",
		answer: "6 月龄以下避免阳光直射，靠物理遮挡（帽子、衣物、推车遮阳棚）。6 月龄以上可使用氧化锌/二氧化钛的物理防晒霜，SPF ≥30。阴天也要防晒。婴儿晒伤 1 次未来皮肤癌风险翻倍。",
		evidence: "systematic_review",
		references: [{ org: "AAP", title: "Sun Safety", year: 2023 }],
	},
	// ─── Family dynamics ──────────────────────────────────────────
	{
		id: "kb-favoritism-siblings",
		topic: "family",
		tags: ["偏爱", "favoritism", "sibling", "公平", "比较", "preschool"],
		stage: ["toddler", "preschool", "school_age"],
		question: "如何避免孩子觉得父母偏心？",
		answer: '研究显示父母常感觉偏心但孩子未必感受相同。减少冲突：① 不公开比较；② 各自找每个孩子的"独特时间"（15 分钟一对一）；③ 承认每个孩子性格不同；④ 关注努力而非表现。',
		evidence: "cohort",
		references: [{ org: "APA", title: "Sibling Favoritism", year: 2021 }],
	},
	{
		id: "kb-grandparent-boundaries",
		topic: "family",
		tags: ["祖父母", "隔代", "grandparent", "边界", "边界", "分歧"],
		stage: ["any"],
		question: "和祖父母育儿观念不一致怎么办？",
		answer: '建议：① 父母先达成一致再沟通（避免当面分歧）；② 区分"原则问题"（安全、健康）和"风格问题"（穿衣、哄睡方式）；③ 选 1-2 个最重要的"红线"（如睡眠姿势、安全座椅）坚持，其他可让步；④ 定期单独沟通，避免在孩子面前争吵。',
		evidence: "expert_opinion",
		references: [
			{
				org: "APA",
				title: "Grandparents Raising Grandchildren",
				year: 2022,
			},
		],
	},
	{
		id: "kb-divorce-impact-preschool",
		topic: "family",
		tags: [
			"离婚",
			"divorce",
			"影响",
			"impact",
			"幼儿",
			"preschool",
			"适应",
		],
		stage: ["preschool", "school_age", "tween"],
		question: "离婚对学龄前孩子有什么影响？",
		answer: "研究显示 5 岁前经历父母离婚的孩子，5-10 年后行为问题风险增加 30-50%，但影响因素复杂（冲突水平、经济、共同抚养质量最关键）。建议：① 不在孩子面前争吵；② 保持日常一致性（上学、吃饭、睡觉）；③ 双方都说对方好话；④ 必要时寻求儿童心理咨询。",
		evidence: "cohort",
		references: [{ org: "APA", title: "Children and Divorce", year: 2021 }],
	},
	// ─── School readiness & teen issues ───────────────────────────
	{
		id: "kb-kindergarten-readiness-checklist",
		topic: "school_age",
		tags: ["入学", "准备", "kindergarten", "幼小衔接", "6岁", "小学"],
		stage: ["preschool"],
		question: "孩子上小学前需要哪些准备？",
		answer: "5-6 岁入学准备清单：① 自理（穿衣、上厕所、洗手、吃饭）；② 基础社交（轮流、分享、解决冲突）；③ 注意力（能专注 15-20 分钟听故事）；④ 基础认知（数 0-10、认自己名字、听懂 2-3 步指令）；⑤ 情绪调节（能离开父母、面对挫败）。",
		evidence: "expert_opinion",
		references: [
			{ org: "AAP", title: "Kindergarten Readiness", year: 2022 },
		],
	},
	{
		id: "kb-homework-start-grade",
		topic: "education",
		tags: ["作业", "homework", "开始", "几岁", "几年级", "低年级"],
		stage: ["school_age"],
		question: "孩子几年级开始有作业？",
		answer: "研究表明 1-3 年级（6-8 岁）作业对学业成绩几乎无影响。推荐：① 1-3 年级每天 <20 分钟；② 4-5 年级 20-40 分钟；③ 6 年级以上 60-90 分钟。关键：固定作业时间 + 安静的固定场所 + 不在孩子做作业时纠错。",
		evidence: "systematic_review",
		references: [
			{
				org: "AAP",
				title: "The Case Against Homework",
				year: 2021,
			},
		],
	},
	{
		id: "kb-teen-sleep-deficit",
		topic: "school_age",
		tags: ["青少年", "teen", "睡眠", "deficit", "手机", "blue", "light"],
		stage: ["tween", "teen"],
		question: "青少年睡眠不足怎么办？",
		answer: "13-18 岁推荐 8-10 小时/天，但 80%+ 青少年睡眠不足。原因：① 生理时钟后移（昼夜节律延迟）；② 屏幕蓝光抑制褪黑素；③ 学业压力。处理：固定作息、晚 9 点后无屏幕、卧室不放电子设备、必要时晨光疗法。",
		evidence: "cohort",
		references: [{ org: "AAP", title: "Sleep in Adolescents", year: 2023 }],
	},
	{
		id: "kb-teen-anxiety-help",
		topic: "emotion",
		tags: ["青少年", "teen", "焦虑", "anxiety", "干预", "识别"],
		stage: ["tween", "teen"],
		question: "青少年焦虑怎么识别和帮助？",
		answer: "识别信号：回避社交/学校、睡眠问题、躯体不适（头痛/胃痛）、易怒、成绩突然下降。干预阶梯：① 学校心理咨询；② 家庭医生筛查；③ 儿童青少年精神科评估；④ 认知行为治疗 (CBT) 是首选（一线证据：response rate 60%+）；⑤ 严重时联合用药（SSRI）。",
		evidence: "systematic_review",
		references: [{ org: "AAP", title: "Anxiety in Teens", year: 2023 }],
	},
	{
		id: "kb-depression-teen-screen",
		topic: "emotion",
		tags: ["青少年", "teen", "抑郁", "depression", "识别", "干预"],
		stage: ["tween", "teen"],
		question: "青少年抑郁的早期信号？",
		answer: '2 周以上持续：① 情绪低落、易怒、哭泣；② 兴趣丧失（包括曾喜欢的活动）；③ 睡眠/食欲明显变化；④ 自我评价低、无价值感；⑤ 学业/社交退缩。任一情况应：① 不忽视"只是青春期的说法"；② 立即联系儿童精神科；③ 筛查自杀想法（直接问不会增加风险，反而降低）。',
		evidence: "expert_opinion",
		references: [
			{ org: "AAP", title: "Depression in Adolescents", year: 2023 },
		],
	},
	{
		id: "kb-friendship-pressure-school",
		topic: "social",
		tags: ["友谊", "friendship", "压力", "压力", "同伴", "school", "年龄"],
		stage: ["school_age", "tween"],
		question: "孩子在学校没有朋友怎么办？",
		answer: "建议：① 先听孩子描述，不轻视；② 邀请 1 个同学到家里玩（人数少易建立连接）；③ 培养共同兴趣（运动、音乐、编程）；④ 角色扮演社交场景；⑤ 关注是否被欺凌（不只是没朋友）；⑥ 6 个月持续孤立 + 情绪低落，建议学校心理咨询或儿童精神科。",
		evidence: "expert_opinion",
		references: [
			{
				org: "AAP",
				title: "Friendship in School-Age Children",
				year: 2022,
			},
		],
	},
];
/** Get summary stats for the knowledge base. */
export function knowledgeStats(): {
	total: number;
	byEvidence: Record<string, number>;
	byStage: Record<string, number>;
} {
	const byEvidence: Record<string, number> = {};
	const byStage: Record<string, number> = {};
	for (const e of KNOWLEDGE_BASE) {
		byEvidence[e.evidence] = (byEvidence[e.evidence] || 0) + 1;
		for (const s of e.stage) {
			byStage[s] = (byStage[s] || 0) + 1;
		}
	}
	return { total: KNOWLEDGE_BASE.length, byEvidence, byStage };
}

/** Format references list. Exported for testing and reuse. */
export function formatReferences(refs: Reference[]): string {
	if (refs.length === 0) return "（无引用）";
	return refs.map((r) => `- ${r.org} (${r.year}): ${r.title}`).join("\n");
}

/** Inverted index over Han/Latin tokens. Faster than linear scan for large
 *  knowledge bases and exposes per-token stats for tests. */
export interface HanTokenIndex {
	/** Map<token, Map<entryId, frequency>> — sparse posting list. */
	postings: Map<string, Map<string, number>>;
	/** Map<entryId, totalTermFreq> — total token count per doc. */
	docLengths: Map<string, number>;
	/** Map<entryId, docTitle> — entry question used for ranking fallback. */
	docTitles: Map<string, string>;
}

/** Build an inverted index for the given entries. */
export function buildIndex(entries: KnowledgeEntry[]): HanTokenIndex {
	const postings = new Map<string, Map<string, number>>();
	const docLengths = new Map<string, number>();
	const docTitles = new Map<string, string>();
	for (const e of entries) {
		docTitles.set(e.id, e.question);
		const all = [
			...tokenize(e.question),
			...e.tags.flatMap((t) => tokenize(t)),
			...tokenize(e.topic),
		];
		docLengths.set(e.id, all.length);
		for (const tok of all) {
			if (!postings.has(tok)) postings.set(tok, new Map());
			const posting = postings.get(tok)!;
			posting.set(e.id, (posting.get(e.id) ?? 0) + 1);
		}
	}
	return { postings, docLengths, docTitles };
}

/** Query an index. Returns ids ranked by token-match score (sum of
 *  per-token contribution / total query tokens). */
export function queryIndex(
	index: HanTokenIndex,
	query: string,
	topN = 3,
): Array<{ id: string; score: number }> {
	const qTokens = tokenize(query);
	if (qTokens.length === 0) return [];
	const docScores = new Map<string, number>();
	for (const qt of qTokens) {
		const posting = index.postings.get(qt);
		if (posting) {
			for (const [docId, freq] of posting.entries()) {
				docScores.set(docId, (docScores.get(docId) ?? 0) + freq);
			}
		}
		// Han single-character prefix contribution: only when both sides >= 2.
		for (const [token, posting] of index.postings.entries()) {
			if (token === qt) continue;
			if (qt.length < 2 || token.length < 2) continue;
			if (token.startsWith(qt) || qt.startsWith(token)) {
				for (const docId of posting.keys()) {
					docScores.set(docId, (docScores.get(docId) ?? 0) + 0.5);
				}
			}
		}
	}
	const ranked = Array.from(docScores.entries()).map(([id, raw]) => ({
		id,
		score: raw / qTokens.length,
	}));
	ranked.sort((a, b) => b.score - a.score);
	return ranked.slice(0, topN);
}

/** Convenience: index + search in one call. */
export function searchKnowledgeIndex(
	entries: KnowledgeEntry[],
	query: string,
	topN = 3,
): KnowledgeEntry[] {
	const index = buildIndex(entries);
	const ranked = queryIndex(index, query, topN);
	const lookup = new Map(entries.map((e) => [e.id, e]));
	return ranked
		.map((r) => lookup.get(r.id))
		.filter((e): e is KnowledgeEntry => e !== undefined);
}
