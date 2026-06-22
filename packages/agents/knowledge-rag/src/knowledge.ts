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
