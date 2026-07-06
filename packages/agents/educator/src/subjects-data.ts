/**
 * Subject-stage guidance knowledge base (data only).
 *
 * Encoding: each entry is `"<subject>|<stage>": "<encoded>"` where
 *   - 6 groups (objectives, keySkills, challenges, activities, milestones, resources)
 *     are joined by `|`
 *   - items within a group are joined by `,`
 *   - an empty group (between two `|` with nothing inside) yields `[]`
 *
 * This file is data only — pure transformation lives in knowledge.ts so that
 * branch coverage can be measured against lookup helpers, not the dataset.
 */

export type SubjectStageEncoded = string;

export const SUBJECT_STAGE_DATA: Record<string, SubjectStageEncoded> = {
	// ─── chinese ───────────────────────────────────────────────
	"chinese|early_childhood": "亲子绘本||看图认知|亲子共读,听儿歌||",
	"chinese|preschool":
		"认字兴趣,表达|听说,讲故事||指读,看图说话|认读30字|看图说话绘本",
	"chinese|elementary":
		"认读1600字,写800字,背诵古诗,阅读理解|拼音,笔画,组词,标点|错别字,作文难,阅读弱|朗读,听写,看图写话,古诗背诵|识字1500,背诵10首古诗,写日记|部编版语文,古诗75首,新华字典",
	"chinese|middle_school":
		"现代文,文言文,作文50分|诗词鉴赏,名著阅读,议论文|文言文难,作文立意|名著阅读,周记,演讲|读完10本名著,作文50+|部编版语文,名著导读,满分作文",
	"chinese|high_school":
		"高考语文130,古诗文默写,议论文|文言文,现代文,应用文|作文立意,古文理解|真题训练,素材积累,时事评论|高考冲刺130分|五年高考,语文月刊,古文观止",
	"chinese|college":
		"专业写作,学术阅读,批判思维|文献综述,论文写作|学术规范|学术写作工作坊,论文研讨|毕业论文|MLA,知网,学术写作指南",
	// ─── math ──────────────────────────────────────────────────
	"math|early_childhood": "数感启蒙||数实物|数手指,玩积木||",
	"math|preschool":
		"数感,形状|数1-10,分类,排序||数实物,拼图|会数20以内|蒙台梭利教具",
	"math|elementary":
		"加减乘除,应用题,几何|心算,竖式,单位换算|计算粗心,应用题弱|口算练习,奥数入门,教具操作|口算达标,独立解题|人教版数学,数学绘本,口算题卡",
	"math|middle_school":
		"代数,几何证明,函数|方程,三角形,统计|几何弱,函数难|课本例题,错题本,思维导图|中考90+|人教版数学,五三,中考真题",
	"math|high_school":
		"高考130,函数,解析几何|导数,概率,立体几何|压轴题难|真题模拟,错题本|高考冲刺|五三,高考真题,王后雄",
	"math|college":
		"微积分,线性代数,概率|数学建模,证明|抽象概念|数学建模赛,论文研讨|完成必修|同济高数,Mathematica",
	// ─── english ───────────────────────────────────────────────
	"english|early_childhood": "磨耳朵||听儿歌|看动画,唱儿歌||",
	"english|preschool":
		"兴趣启蒙,语感|听,模仿||看动画,唱儿歌|唱10首英文儿歌|SSS儿歌,Peppa Pig",
	"english|elementary":
		"认读500词,简单对话,自然拼读|听力,口语,拼写|发音不准,单词记不住|分级阅读,单词卡,看动画|能读章节书|新概念1,RAZ,牛津树",
	"english|middle_school":
		"中考英语,阅读,写作|语法,听力,口语|语法难,写作弱|真题训练,背范文,听力训练|中考90+|人教版英语,新概念2,中考真题",
	"english|high_school":
		"高考英语140,完形,写作|语法,词汇,阅读|完形难|真题训练,背诵范文,词汇书|高考冲刺|五三,高考真题,词汇3500",
	"english|college":
		"四六级,学术英语,口语|写作,听力,口语|学术写作|英语演讲,学术写作|过六级|新概念3,学术英语,雅思托福",
	// ─── science ───────────────────────────────────────────────
	"science|early_childhood": "好奇心,感官探索||观察|玩水玩沙,看自然||",
	"science|preschool":
		"观察自然,好奇心|提问,观察||看自然,玩水玩沙|认识10种动物|自然纪录片,DK百科",
	"science|elementary":
		"科学探究,实验基础|观察,记录,分类|抽象概念|家庭实验,自然观察,科技馆|完成探究报告|教科版,科学实验盒,DK科学",
	"science|middle_school":
		"物理化学生物,实验技能|实验技能,科学方法|物理概念抽象|实验操作,科学竞赛|中考理化A|人教版理化,实验视频,科学探究",
	"science|high_school":
		"高考理综,学科竞赛|实验设计,数据分析|压轴题难|竞赛培训,实验项目|奥赛省一|五三理综,竞赛教程,大学先修",
	"science|college":
		"专业基础,科研方法|实验设计,论文|科研压力大|科研项目,实验室轮转|发表论文|专业教材,Nature,SCI论文",
	// ─── social_studies ────────────────────────────────────────
	"social_studies|early_childhood":
		"认识环境,基本礼仪||亲子观察|参观,角色扮演||",
	"social_studies|preschool":
		"认识环境,基本礼仪|记忆,表达||参观博物馆,角色扮演|认识中国地图|儿童历史绘本,中国地图",
	"social_studies|elementary":
		"历史故事,地理常识,道德法治|看地图,时间线|记忆弱|讲故事,看纪录片,参观博物馆|了解中国地理|部编版社会,儿童历史,中国地图",
	"social_studies|middle_school":
		"历史,地理,政治|朝代,地图,宪法|理解抽象|思维导图,真题,时事|中考道法A|人教版社会,五年中考,时事新闻",
	"social_studies|high_school":
		"高考文综,史地政|论述,分析|主观题难|真题模拟,热点专题|高考冲刺|五三文综,高考真题,时事点评",
	"social_studies|college":
		"社会学,政治学,经济|研究方法,写作|理论抽象|田野调查,读书会|完成课程|专业教材,学术期刊,经典著作",
	// ─── arts ──────────────────────────────────────────────────
	"arts|early_childhood": "涂鸦,色彩感知||抓握,想象|涂鸦,撕纸||",
	"arts|preschool":
		"涂鸦,色彩|握笔,想象||涂鸦,黏土,撕纸|独立完成一幅画|儿童美术盒,儿童美术馆",
	"arts|elementary":
		"绘画基础,手工,色彩|色彩,构图,线条|比例失调,立体感弱|临摹,手工制作,参观美术馆|独立作品|儿童美术教程,美术盒,画展",
	"arts|middle_school":
		"素描,色彩,创作|构图,透视,色彩|透视难|写生,创作,比赛|完成作品集|美术教材,画室,艺术展",
	"arts|high_school":
		"艺考,作品集|造型,设计,创意|艺考压力|集训,作品集,展览|通过艺考|艺考教材,画室集训,艺术院校",
	"arts|college":
		"专业方向,创作,展览|创作,批评|创作瓶颈|工作室,展览,驻留|独立艺术家|专业教材,画廊,艺术评论",
	// ─── music ─────────────────────────────────────────────────
	"music|early_childhood": "节奏感,听音||拍手,哼唱|唱歌,打击乐器||",
	"music|preschool":
		"节奏感,听音|拍手,哼唱||唱歌,打击乐,律动|会唱10首歌|奥尔夫音乐,儿童打击乐",
	"music|elementary":
		"乐器入门,乐理基础|识谱,节奏,音准|坚持难|乐器练习,合唱团,音乐游戏|能演奏3首曲目|儿童乐器,音乐启蒙,合唱团",
	"music|middle_school":
		"乐器进阶,乐理|演奏技巧,视奏|技术难度|乐团排练,考级,演出|通过考级5级|中央院考级,乐团谱,音乐教材",
	"music|high_school":
		"艺考音乐,演奏|演奏,乐理,视唱|艺考压力|集训,演出,比赛|通过艺考|艺考教材,集训,音乐学院",
	"music|college":
		"专业学习,演出|演奏,作曲,理论|职业选择|乐团,演出,创作|举办音乐会|专业教材,乐谱库,大师班",
	// ─── pe ────────────────────────────────────────────────────
	"pe|early_childhood": "大运动,协调||跑,跳,攀爬|跑跳,翻滚||",
	"pe|preschool":
		"大运动,协调|跑,跳,攀爬||跑步,球类,游泳|能连续跳绳|儿童运动馆,平衡车",
	"pe|elementary":
		"基础体能,球类,田径|协调,力量,速度|体能弱|体育课,课余训练,比赛|达标测试合格|体适能,球类训练,儿童运动",
	"pe|middle_school":
		"中考体育,专项|体能,技能|达标难|专项训练,体能训练|中考体育满分|中考体育,训练计划,体适能",
	"pe|high_school":
		"高考体育,专项|专项,体能|伤病风险|专业训练,比赛|体育高考|高考体育,专业教练,训练器材",
	"pe|college":
		"专业训练,健身,竞技|专项技能,训练|伤病管理|校队,健身,比赛|完成学业|专业训练,健身房,运动医学",
	// ─── coding ────────────────────────────────────────────────
	"coding|early_childhood": "顺序逻辑||指令理解|拼图,指令游戏||",
	"coding|preschool":
		"顺序逻辑,因果|指令,顺序||拼图,指令游戏,编程玩具|完成20关拼图|编程玩具,ScratchJr",
	"coding|elementary":
		"编程思维,Scratch|顺序,循环,条件|抽象概念|Scratch项目,编程游戏,机器人|独立完成1个项目|Scratch,编程猫,少儿编程",
	"coding|middle_school":
		"Python,算法基础|语法,算法,调试|语法错误,逻辑混乱|Python项目,算法题,编程比赛|通过CSP-J|人教版信息技术,Python教程,洛谷",
	"coding|high_school":
		"NOIP,NOI,数据结构|算法,数据结构,竞赛|难题卡壳|集训,刷题,比赛|NOI金牌|算法竞赛,数据结构,Codeforces",
	"coding|college":
		"专业开发,软件工程|开发,架构,协作|项目压力大|开源项目,实习,黑客松|独立项目上线|专业教材,GitHub,技术博客",
};

/** Decode an encoded subject-stage tuple into 6 string arrays. */
export function decodeSubjectStage(
	encoded: string,
): [string[], string[], string[], string[], string[], string[]] {
	return encoded.split("|").map((g) => (g ? g.split(",") : [])) as [
		string[],
		string[],
		string[],
		string[],
		string[],
		string[],
	];
}
