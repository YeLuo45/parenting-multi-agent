/**
 * HomeworkHelper knowledge base — Socratic question coach.
 *
 * Design: rule-based, no LLM call. Each subject has:
 * - 4+ "starter questions" (引导性问题)
 * - 3-step hint chains (渐进提示)
 * - topic detection patterns (主题检测)
 * - grading heuristics (反馈分级)
 */

export type HomeworkSubject =
	| "math"
	| "chinese"
	| "english"
	| "science"
	| "social_studies";

export const HOMEWORK_SUBJECTS: HomeworkSubject[] = [
	"math",
	"chinese",
	"english",
	"science",
	"social_studies",
];

export type HomeworkDifficulty = "easy" | "medium" | "hard";

export type ProblemTopic =
	| "arithmetic"
	| "algebra"
	| "geometry"
	| "word_problem"
	| "reading_comprehension"
	| "writing"
	| "vocabulary"
	| "grammar"
	| "science_concept"
	| "history_event"
	| "geography"
	| "general"
	| "translation";

export interface SocraticStep {
	level: 1 | 2 | 3;
	hint: string;
}

export interface SocraticSession {
	subject: HomeworkSubject;
	topic: ProblemTopic;
	difficulty: HomeworkDifficulty;
	starterQuestion: string;
	hintChain: SocraticStep[];
	probes: ProbeQuestion[];
}

export interface ProbeQuestion {
	text: string;
	purpose: "clarify" | "decompose" | "check" | "extend";
}

interface SubjectTopicBank {
	subject: HomeworkSubject;
	topics: Array<{
		topic: ProblemTopic;
		patterns: RegExp[];
		starterQuestions: string[];
		hints: string[];
		probes: ProbeQuestion[];
	}>;
}

const TOPIC_BANKS: SubjectTopicBank[] = [
	{
		subject: "math",
		topics: [
			{
				topic: "arithmetic",
				patterns: [/(加减乘除|口算|计算|算术|\d+\s*[+\-×x÷*/]\s*\d+)/i],
				starterQuestions: [
					"你能告诉我题目要求算什么吗？",
					"先用手指或者画图表示出题目里的数字，好吗？",
					"先算哪一部分？为什么？",
				],
				hints: [
					"试试把数字摆出来，看看一共有多少。",
					"可以用凑十法、平十法或者画圈来帮忙。",
					"如果是乘法，先背九九表里有没有这一对。",
				],
				probes: [
					{ text: "你算出来的是多少？", purpose: "check" },
					{ text: "你能验算一下吗？", purpose: "check" },
				],
			},
			{
				topic: "word_problem",
				patterns: [
					/(应用题|解决问题|小明|小红|一共|还剩|比.*多|比.*少)/i,
				],
				starterQuestions: [
					"题目里告诉你了哪些信息？",
					"题目最后问的是什么？",
					"你能用画图把题目画出来吗？",
				],
				hints: [
					"找出关键数字和关键词（多/少/一共/还剩）。",
					"画线段图或者示意图来表达关系。",
					"列算式前先说一说思路。",
				],
				probes: [
					{ text: "哪个信息最重要？", purpose: "clarify" },
					{
						text: "如果画成图，会是什么样子？",
						purpose: "decompose",
					},
					{ text: "做完之后，能反过来检查吗？", purpose: "check" },
				],
			},
			{
				topic: "geometry",
				patterns: [
					/(几何|图形|三角形|正方形|长方形|圆|面积|周长|体积)/i,
				],
				starterQuestions: [
					"这是什么图形？你能描述它的特征吗？",
					"你知道求什么需要哪些信息？",
					"用公式之前，你能解释公式是怎么来的吗？",
				],
				hints: [
					"先画一个标准图形，标出已知条件。",
					"公式可以从分解图形推导。",
					"如果是组合图形，可以拆成几个基本图形。",
				],
				probes: [
					{ text: "可以用哪种单位来量？", purpose: "clarify" },
					{
						text: "如果只给一条边，你能想到其他边吗？",
						purpose: "extend",
					},
				],
			},
			{
				topic: "algebra",
				patterns: [/(方程|未知数|x\b|代数|因式|解方程)/i],
				starterQuestions: [
					"题目里的未知数代表什么？",
					"等式两边各代表什么含义？",
					"如果把这个未知数当作已知数处理，会怎样？",
				],
				hints: [
					"先把含未知数的项移到等号一边。",
					"两边同加减同乘除要同步进行。",
					"代入原方程检验。",
				],
				probes: [
					{
						text: "等式两边减去同一个数，等式还成立吗？",
						purpose: "decompose",
					},
					{ text: "你能用语言描述这个等式吗？", purpose: "clarify" },
				],
			},
		],
	},
	{
		subject: "chinese",
		topics: [
			{
				topic: "reading_comprehension",
				patterns: [/(阅读|短文|课文|段落|中心思想|主要内容)/i],
				starterQuestions: [
					"这篇文章讲了一件什么事？",
					"你能不能用一两句话概括？",
					"作者想表达什么情感？",
				],
				hints: [
					"先找出时间、地点、人物、事件。",
					"把每段的关键词连起来，就是主要内容。",
					"中心思想往往在开头或结尾点题。",
				],
				probes: [
					{ text: "哪个细节让你印象最深？", purpose: "clarify" },
					{ text: "如果是自己，你会怎么做？", purpose: "extend" },
				],
			},
			{
				topic: "writing",
				patterns: [/(作文|写话|日记|看图写话|习作)/i],
				starterQuestions: [
					"这篇作文想表达什么？",
					"开头、中间、结尾你想分别写什么？",
					"哪些细节能让读者感同身受？",
				],
				hints: [
					"多用动词和具体的描写，少用'很''非常'。",
					"加入对话、心理活动、动作描写。",
					"写完后大声读一遍，看通不通顺。",
				],
				probes: [
					{ text: "读者读完会想到什么画面？", purpose: "extend" },
					{ text: "开头足够吸引人吗？", purpose: "check" },
				],
			},
			{
				topic: "vocabulary",
				patterns: [/(生字|识字|组词|近义词|反义词|词语)/i],
				starterQuestions: [
					"这个字/词是什么意思？",
					"你能用它说一句话吗？",
					"它和哪个字/词意思接近？",
				],
				hints: [
					"拆字记忆：把字拆成几个部分。",
					"组词造句：在生活中用起来。",
					"近义词反义词成对记。",
				],
				probes: [
					{ text: "你生活中见过这个字吗？", purpose: "clarify" },
					{ text: "换个场景能用吗？", purpose: "extend" },
				],
			},
		],
	},
	{
		subject: "english",
		topics: [
			{
				topic: "vocabulary",
				patterns: [/(单词|vocab|word|背单词|默写)/i],
				starterQuestions: [
					"What does this word mean?",
					"Can you use it in a sentence?",
					"What part of speech is it?",
				],
				hints: [
					"Break it into syllables to read.",
					"联想一个相似的中文谐音或画面。",
					"Use it in your own example.",
				],
				probes: [
					{
						text: "Is it a noun, verb, or adjective?",
						purpose: "clarify",
					},
					{
						text: "Can you describe a scene with it?",
						purpose: "extend",
					},
				],
			},
			{
				topic: "grammar",
				patterns: [/(语法|时态|grammar|tense|从句|被动语态)/i],
				starterQuestions: [
					"What tense does this sentence use?",
					"What is the subject and the verb?",
					"Can you transform it into another tense?",
				],
				hints: [
					"Identify the time signal (yesterday, now, tomorrow).",
					"Subject-verb agreement: he/she/it → -s.",
					"Check irregular verbs list.",
				],
				probes: [
					{
						text: "What time does this describe?",
						purpose: "clarify",
					},
					{ text: "Can you make a negative?", purpose: "extend" },
				],
			},
			{
				topic: "translation",
				patterns: [/(翻译|translate|中英对照|英译中)/i],
				starterQuestions: ["这句话的中文意思是什么？"],
				hints: ["先找关键词。", "按主谓宾拆分。", "整句连贯后再润色。"],
				probes: [],
			},
			{
				topic: "reading_comprehension",
				patterns: [/(阅读理解|reading|short.passage|comprehension)/i],
				starterQuestions: [
					"What is the main idea of this passage?",
					"Who are the characters and what happens?",
					"What detail supports your answer?",
				],
				hints: [
					"Read the first and last sentence of each paragraph.",
					"Highlight who/what/when/where.",
					"Re-read the question before answering.",
				],
				probes: [
					{
						text: "Which sentence gives the clue?",
						purpose: "clarify",
					},
					{
						text: "Can you summarize in one sentence?",
						purpose: "extend",
					},
				],
			},
		],
	},
	{
		subject: "science",
		topics: [
			{
				topic: "science_concept",
				patterns: [
					/(科学|实验|观察|物理|化学|生物|光|电|水|空气|植物|动物)/i,
				],
				starterQuestions: [
					"你观察到了什么现象？",
					"你能提出一个解释吗？",
					"如果再做一次，结果会一样吗？",
				],
				hints: [
					"区分'观察到的事实'和'你的猜测'。",
					"想想生活中有没有类似的现象。",
					"用'因为...所以...'说清楚因果。",
				],
				probes: [
					{ text: "你能画一张图表示你的想法吗？", purpose: "extend" },
					{
						text: "这个现象背后的原因是什么？",
						purpose: "decompose",
					},
				],
			},
		],
	},
	{
		subject: "social_studies",
		topics: [
			{
				topic: "history_event",
				patterns: [/(历史|朝代|战争|改革|革命)/i],
				starterQuestions: [
					"这件事发生在什么时候？",
					"涉及哪些人物？",
					"它为什么重要？",
				],
				hints: [
					"把事件放进时间轴。",
					"想原因（why）和影响（so what）。",
					"和今天有什么联系。",
				],
				probes: [
					{
						text: "如果是当时的普通人，会怎么想？",
						purpose: "extend",
					},
					{ text: "这件事和后来的什么事有关？", purpose: "clarify" },
				],
			},
			{
				topic: "geography",
				patterns: [/(地理|地图|气候|河流|山脉|国家|城市)/i],
				starterQuestions: [
					"这个地方在哪里？",
					"它的地形、气候有什么特点？",
					"人们在那里怎么生活？",
				],
				hints: [
					"先看经纬度位置。",
					"结合气候类型和地形分析。",
					"了解当地的物产和交通。",
				],
				probes: [
					{ text: "你能画一张简易地图吗？", purpose: "extend" },
					{ text: "它和周围地区有什么不同？", purpose: "clarify" },
				],
			},
		],
	},
];

const SUBJECT_PATTERNS: Array<{
	subject: HomeworkSubject;
	patterns: RegExp[];
}> = [
	{
		subject: "math",
		patterns: [
			/(数学|算术|math|应用题|计算|方程|几何|代数|\d+\s*[+\-×x÷*/]\s*\d+)/i,
		],
	},
	{
		subject: "chinese",
		patterns: [/(语文|中文|拼音|汉字|古诗|作文|chinese|阅读|短文|课文)/i],
	},
	{
		subject: "english",
		patterns: [/(英语|英文|english|单词|grammar|语法)/i],
	},
	{
		subject: "science",
		patterns: [/(科学|物理|化学|生物|science|实验|观察)/i],
	},
	{
		subject: "social_studies",
		patterns: [/(社会|历史|地理|政治|道德|道法|social|history|geography)/i],
	},
];

const DIFFICULTY_KEYWORDS: Record<HomeworkDifficulty, RegExp[]> = {
	easy: [/(简单|入门|基础|easy|基础题|一步)/i],
	medium: [/(中等|普通|一般|medium|两步)/i],
	hard: [/(难|hard|困难|压轴|奥数|竞赛)/i],
};

export function detectHomeworkSubject(text: string): HomeworkSubject | null {
	for (const { subject, patterns } of SUBJECT_PATTERNS) {
		for (const re of patterns) {
			if (re.test(text)) return subject;
		}
	}
	return null;
}

export function detectProblemTopic(
	text: string,
	subject: HomeworkSubject,
): ProblemTopic {
	const bank = TOPIC_BANKS.find((b) => b.subject === subject);
	if (!bank) return "general";
	for (const t of bank.topics) {
		for (const re of t.patterns) {
			if (re.test(text)) return t.topic;
		}
	}
	return "general";
}

export function detectDifficulty(text: string): HomeworkDifficulty {
	for (const [level, patterns] of Object.entries(
		DIFFICULTY_KEYWORDS,
	) as Array<[HomeworkDifficulty, RegExp[]]>) {
		for (const re of patterns) {
			if (re.test(text)) return level;
		}
	}
	return "medium";
}

function getTopicBank(
	subject: HomeworkSubject,
	topic: ProblemTopic,
): SubjectTopicBank["topics"][number] | null {
	const bank = TOPIC_BANKS.find((b) => b.subject === subject);
	if (!bank) return null;
	return bank.topics.find((t) => t.topic === topic) ?? null;
}

export function generateSocraticQuestion(
	subject: HomeworkSubject,
	topic: ProblemTopic = "general",
): string {
	const tb = getTopicBank(subject, topic);
	if (!tb || tb.starterQuestions.length === 0) {
		return `🤔 你能再读一遍题目，告诉我它问的是什么吗？`;
	}
	// Deterministic pick by hash of (subject, topic)
	const idx = (subject.length + topic.length) % tb.starterQuestions.length;
	return tb.starterQuestions[idx]!;
}

export function generateProbeQuestion(
	subject: HomeworkSubject,
	topic: ProblemTopic,
	purpose: ProbeQuestion["purpose"] = "check",
): ProbeQuestion | null {
	const tb = getTopicBank(subject, topic);
	if (!tb) return null;
	for (const p of tb.probes) {
		if (p.purpose === purpose) return p;
	}
	return tb.probes[0] ?? null;
}

export function getHintChain(
	subject: HomeworkSubject,
	topic: ProblemTopic,
): SocraticStep[] {
	const tb = getTopicBank(subject, topic);
	if (!tb || tb.hints.length === 0) {
		return [
			{ level: 1, hint: "再仔细读一遍题目。" },
			{ level: 2, hint: "把已知条件列出来。" },
			{ level: 3, hint: "试试从最基本的步骤开始。" },
		];
	}
	const hints = tb.hints;
	return [
		{ level: 1, hint: hints[0]! },
		{ level: 2, hint: hints[Math.min(1, hints.length - 1)]! },
		{ level: 3, hint: hints[Math.min(2, hints.length - 1)]! },
	];
}

export function formatHintChain(chain: readonly SocraticStep[]): string {
	if (chain.length === 0) return "（暂无提示）";
	const lines: string[] = ["💡 提示链："];
	for (const s of chain) {
		lines.push(`第 ${s.level} 级：${s.hint}`);
	}
	return lines.join("\n");
}

export interface GradeResult {
	level: "correct" | "partial" | "incorrect" | "unclear";
	score: number; // 0..1
	feedback: string;
	nextProbe: ProbeQuestion | null;
}

/**
 * Grade a student's answer heuristically based on length and signal words.
 * - Has clear conclusion words + reasonable length → correct/partial
 * - "?" only → unclear
 * - Empty → incorrect
 */
export function gradeStudentAnswer(
	answer: string,
	subject: HomeworkSubject,
	topic: ProblemTopic,
): GradeResult {
	const trimmed = answer.trim();
	if (trimmed.length === 0) {
		return {
			level: "incorrect",
			score: 0,
			feedback: "你还没有写下任何想法。再试着说说看？",
			nextProbe: generateProbeQuestion(subject, topic, "clarify"),
		};
	}
	if (/^\s*\?\s*$/.test(trimmed) || /不知道|不会/i.test(trimmed)) {
		return {
			level: "unclear",
			score: 0.1,
			feedback: "没关系，先说说你现在卡在哪里？",
			nextProbe: generateProbeQuestion(subject, topic, "decompose"),
		};
	}
	const conclusionWords =
		/(所以|因为|答案是|得|等于|is|therefore|so|equals)/i;
	const hasConclusion = conclusionWords.test(trimmed);
	// Count CJK characters + Latin words so Chinese-only answers count properly.
	const cjkChars = (trimmed.match(/[\u4e00-\u9fff]/g) || []).length;
	const latinWords = trimmed
		.replace(/[\u4e00-\u9fff]/g, " ")
		.split(/\s+/)
		.filter(Boolean).length;
	const totalLength = cjkChars + latinWords;
	let level: GradeResult["level"];
	let score: number;
	if (hasConclusion && totalLength >= 3) {
		level = "correct";
		score = 0.9;
	} else if (totalLength >= 2) {
		level = "partial";
		score = 0.6;
	} else {
		level = "partial";
		score = 0.4;
	}
	const feedbackByLevel: Record<GradeResult["level"], string> = {
		correct: "很棒！能再多说一点你的思路吗？",
		partial: "不错的尝试。再展开一些呢？",
		incorrect: "没关系，我们换个角度。",
		unclear: "慢慢来，先告诉我你看到了什么。",
	};
	return {
		level,
		score,
		feedback: feedbackByLevel[level],
		nextProbe: generateProbeQuestion(subject, topic, "check"),
	};
}

export function buildSocraticSession(problemText: string): SocraticSession {
	const subject = detectHomeworkSubject(problemText) ?? "math";
	const topic = detectProblemTopic(problemText, subject);
	const difficulty = detectDifficulty(problemText);
	const starterQuestion = generateSocraticQuestion(subject, topic);
	const hintChain = getHintChain(subject, topic);
	const probes: ProbeQuestion[] = [];
	const tb = getTopicBank(subject, topic);
	if (tb) {
		for (const p of tb.probes) probes.push(p);
	}
	return {
		subject,
		topic,
		difficulty,
		starterQuestion,
		hintChain,
		probes,
	};
}

export function getHomeworkSubjects(): HomeworkSubject[] {
	return [...HOMEWORK_SUBJECTS];
}
