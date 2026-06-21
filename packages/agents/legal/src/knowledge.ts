/**
 * Legal knowledge base — custody, child support, adoption, immigration,
 * school law for parenting. Rule-based + keyword matching. No LLM call.
 */

export type LegalTopic =
	| "custody"
	| "support"
	| "adoption"
	| "immigration"
	| "school_law"
	| "wills"
	| "rights";

export interface LegalTip {
	topic: LegalTopic;
	stage: string[];
	summary: string;
	advice: string[];
	jurisdiction: string;
	ageRange: string;
}

export const LEGAL_TIPS: LegalTip[] = [
	{
		topic: "custody",
		stage: ["infant", "toddler", "preschool", "school_age", "tween", "teen"],
		summary: "监护权与抚养权",
		advice: [
			"中国：离婚后子女抚养以有利于子女成长为原则",
			"美国：custody 分 legal（法律决策权）和 physical（居住权）",
			"2岁以下通常判给母亲，除非有特殊情况",
			"共同抚养需详细协议：居住时间表、教育决策、医疗签字",
			"发生纠纷建议咨询当地家事律师",
		],
		jurisdiction: "中国 / 美国",
		ageRange: "0-18岁",
	},
	{
		topic: "support",
		stage: ["infant", "toddler", "preschool", "school_age", "tween", "teen"],
		summary: "子女抚养费",
		advice: [
			"中国：根据子女实际需要 + 父母负担能力确定",
			"美国：各州有 child support guidelines，按收入比例计算",
			"包括：生活费、教育费、医疗费、保险",
			"离婚协议中明确金额、支付周期、调整机制",
			"对方拒付可申请法院强制执行",
		],
		jurisdiction: "中国 / 美国",
		ageRange: "0-18岁",
	},
	{
		topic: "adoption",
		stage: ["infant", "toddler", "preschool"],
		summary: "收养与领养",
		advice: [
			"中国：办理收养登记，需满足法定条件",
			"美国：通过家庭法院程序（domestic）或 USCIS（international）",
			"跨国收养需走 Hague Convention 流程",
			"出生证、户籍、护照均需更新",
			"建议委托专业收养律师全程协助",
		],
		jurisdiction: "中国 / 美国 / 跨国",
		ageRange: "0-6岁",
	},
	{
		topic: "immigration",
		stage: ["infant", "toddler", "preschool", "school_age", "tween", "teen", "young_adult"],
		summary: "子女移民与签证",
		advice: [
			"美国：CR1/IR1 配偶签证带子女；F2A 子女团聚签证",
			"中国：依亲团聚、技术移民、家庭团聚类签证",
			"未满 21 岁未婚子女可作为附属申请人",
			"出生在美国的宝宝自动获得美国公民身份",
			"建议咨询专业移民律师准备材料",
		],
		jurisdiction: "全球",
		ageRange: "0-21岁",
	},
	{
		topic: "school_law",
		stage: ["preschool", "school_age", "tween", "teen"],
		summary: "学校与教育法律",
		advice: [
			"美国 IDEA 法：特殊教育需求学生有法律保障",
			"504 计划：学习障碍学生的便利安排",
			"中国：义务教育阶段不得开除学籍",
			"校园欺凌可向教育局投诉 / 提起诉讼",
			"休学、退学、转学需办理正规手续",
		],
		jurisdiction: "中国 / 美国",
		ageRange: "3-18岁",
	},
	{
		topic: "wills",
		stage: ["infant", "toddler", "preschool", "school_age", "tween", "teen", "young_adult"],
		summary: "遗嘱与监护规划",
		advice: [
			"指定未成年子女的监护人是父母必做事项",
			"美国：通过 will + durable power of attorney",
			"中国：遗嘱公证确保有效性",
			"考虑指定候补监护人，防止第一监护人无法履职",
			"定期更新遗嘱（离婚、再婚、新生子女等）",
		],
		jurisdiction: "中国 / 美国",
		ageRange: "0-21岁",
	},
	{
		topic: "rights",
		stage: ["infant", "toddler", "preschool", "school_age", "tween", "teen", "young_adult"],
		summary: "儿童基本权利",
		advice: [
			"联合国儿童权利公约：生存、发展、受保护、参与",
			"受虐儿童可拨打 12345（中国）或 911（美国）",
			"中国未成年人保护法：家庭、学校、社会、网络、政府、司法保护",
			"受教育权、健康权、姓名权、肖像权均受法律保护",
			"父母不能以任何理由虐待、遗弃未成年子女",
		],
		jurisdiction: "全球",
		ageRange: "0-18岁",
	},
];

export function getTipsForStage(stage: string | undefined, topic?: LegalTopic): LegalTip[] {
	return LEGAL_TIPS.filter(
		(t) =>
			(stage === undefined || t.stage.includes("any") || t.stage.includes(stage)) &&
			(topic === undefined || t.topic === topic),
	);
}

export function matchTopic(text: string): LegalTopic | null {
	const q = text.toLowerCase();
	if (/(监护|custody|离婚|分居|抚养权)/i.test(q)) return "custody";
	if (/(抚养费|child.support|alimony|赡养费)/i.test(q)) return "support";
	if (/(收养|领养|adoption|收养登记)/i.test(q)) return "adoption";
	if (/(移民|visa|签证|护照|immigration|绿卡|citizenship|国籍)/i.test(q)) return "immigration";
	if (/(学校|education.law|学校法|休学|转学|开除学籍|school.law)/i.test(q)) return "school_law";
	if (/(遗嘱|will|estate|监护人|遗产)/i.test(q)) return "wills";
	if (/(权利|受虐|儿童权利|right|abuse|虐待)/i.test(q)) return "rights";
	return null;
}