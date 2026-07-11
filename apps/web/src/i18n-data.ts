/**
 * i18n — internationalization support for the parenting-multi-agent.
 *
 * Direction T: Multi-language extension (en-US + es-ES).
 *
 * Pure functions: lookup + format helpers. No LLM call.
 */

export type Locale = "zh-CN" | "en-US" | "es-ES";

export const SUPPORTED_LOCALES: Locale[] = ["zh-CN", "en-US", "es-ES"];

export const DEFAULT_LOCALE: Locale = "zh-CN";

export type TranslationKey =
	| "app.title"
	| "app.tagline"
	| "agent.educator"
	| "agent.psychologist"
	| "agent.pediatrician"
	| "agent.cry_decoder"
	| "agent.habit_builder"
	| "agent.growth_tracker"
	| "agent.homework_helper"
	| "agent.knowledge_rag"
	| "agent.screen"
	| "agent.peer_benchmark"
	| "agent.safety_guard"
	| "action.ask"
	| "action.add_child"
	| "action.children"
	| "action.history"
	| "action.use"
	| "action.quit"
	| "ui.welcome"
	| "ui.placeholder"
	| "ui.loading"
	| "ui.error"
	| "ui.disclaimer"
	| "status.good"
	| "status.warn"
	| "status.alert"
	| "status.neutral"
	| "dashboard.title"
	| "dashboard.streak"
	| "dashboard.vaccine"
	| "dashboard.screen"
	| "dashboard.growth"
	| "dashboard.peer"
	| "persona.gentle"
	| "persona.strict"
	| "persona.scientific";

export const TRANSLATIONS: Record<Locale, Record<TranslationKey, string>> = {
	"zh-CN": {
		"app.title": "家长多智能体",
		"app.tagline": "每位家长的 AI 育儿伙伴",
		"agent.educator": "教育顾问",
		"agent.psychologist": "心理咨询",
		"agent.pediatrician": "儿科医生",
		"agent.cry_decoder": "哭闹解码",
		"agent.habit_builder": "习惯教练",
		"agent.growth_tracker": "成长追踪",
		"agent.homework_helper": "作业助手",
		"agent.knowledge_rag": "知识库",
		"agent.screen": "发育筛查",
		"agent.peer_benchmark": "同侪对比",
		"agent.safety_guard": "安全守护",
		"action.ask": "提问",
		"action.add_child": "添加孩子",
		"action.children": "孩子列表",
		"action.history": "历史记录",
		"action.use": "切换孩子",
		"action.quit": "退出",
		"ui.welcome": "欢迎",
		"ui.placeholder": "请输入您的问题",
		"ui.loading": "加载中...",
		"ui.error": "出错了，请重试",
		"ui.disclaimer": "本建议仅供参考",
		"status.good": "良好",
		"status.warn": "需关注",
		"status.alert": "需立即处理",
		"status.neutral": "暂无数据",
		"dashboard.title": "家庭健康仪表盘",
		"dashboard.streak": "习惯连续打卡",
		"dashboard.vaccine": "疫苗接种",
		"dashboard.screen": "发育筛查",
		"dashboard.growth": "生长曲线",
		"dashboard.peer": "同侪对比",
		"persona.gentle": "温柔陪伴",
		"persona.strict": "严格要求",
		"persona.scientific": "循证科学",
	},
	"en-US": {
		"app.title": "Parenting Multi-Agent",
		"app.tagline": "Your AI parenting companion for every question",
		"agent.educator": "Educator",
		"agent.psychologist": "Psychologist",
		"agent.pediatrician": "Pediatrician",
		"agent.cry_decoder": "Cry Decoder",
		"agent.habit_builder": "Habit Coach",
		"agent.growth_tracker": "Growth Tracker",
		"agent.homework_helper": "Homework Helper",
		"agent.knowledge_rag": "Knowledge Base",
		"agent.screen": "Development Screen",
		"agent.peer_benchmark": "Peer Benchmark",
		"agent.safety_guard": "Safety Guard",
		"action.ask": "Ask",
		"action.add_child": "Add Child",
		"action.children": "Children",
		"action.history": "History",
		"action.use": "Switch Child",
		"action.quit": "Quit",
		"ui.welcome": "Welcome",
		"ui.placeholder": "Type your question",
		"ui.loading": "Loading...",
		"ui.error": "Something went wrong, please retry",
		"ui.disclaimer": "Suggestions are for reference only",
		"status.good": "Good",
		"status.warn": "Attention Needed",
		"status.alert": "Immediate Action",
		"status.neutral": "No Data",
		"dashboard.title": "Family Health Dashboard",
		"dashboard.streak": "Habit Streak",
		"dashboard.vaccine": "Vaccines",
		"dashboard.screen": "Development Screen",
		"dashboard.growth": "Growth Chart",
		"dashboard.peer": "Peer Benchmark",
		"persona.gentle": "Gentle Companion",
		"persona.strict": "Strict Coach",
		"persona.scientific": "Evidence-Based",
	},
	"es-ES": {
		"app.title": "Agente Parental",
		"app.tagline": "Tu compañero de IA para cada pregunta de crianza",
		"agent.educator": "Educador",
		"agent.psychologist": "Psicólogo",
		"agent.pediatrician": "Pediatra",
		"agent.cry_decoder": "Decodificador de Llanto",
		"agent.habit_builder": "Entrenador de Hábitos",
		"agent.growth_tracker": "Rastreador de Crecimiento",
		"agent.homework_helper": "Ayudante de Tareas",
		"agent.knowledge_rag": "Base de Conocimientos",
		"agent.screen": "Cribado del Desarrollo",
		"agent.peer_benchmark": "Comparación con Pares",
		"agent.safety_guard": "Protección de Seguridad",
		"action.ask": "Preguntar",
		"action.add_child": "Añadir Niño",
		"action.children": "Niños",
		"action.history": "Historial",
		"action.use": "Cambiar Niño",
		"action.quit": "Salir",
		"ui.welcome": "Bienvenido",
		"ui.placeholder": "Escribe tu pregunta",
		"ui.loading": "Cargando...",
		"ui.error": "Algo salió mal, inténtalo de nuevo",
		"ui.disclaimer": "Las sugerencias son solo de referencia",
		"status.good": "Bueno",
		"status.warn": "Necesita Atención",
		"status.alert": "Acción Inmediata",
		"status.neutral": "Sin Datos",
		"dashboard.title": "Panel de Salud Familiar",
		"dashboard.streak": "Racha de Hábitos",
		"dashboard.vaccine": "Vacunas",
		"dashboard.screen": "Cribado del Desarrollo",
		"dashboard.growth": "Curva de Crecimiento",
		"dashboard.peer": "Comparación con Pares",
		"persona.gentle": "Compañero Amable",
		"persona.strict": "Entrenador Estricto",
		"persona.scientific": "Basado en Evidencia",
	},
};

/** Get the localized string for a key + locale. Falls back to default. */
export function getLocalizedString(
	key: TranslationKey,
	locale: Locale,
): string {
	const translations = TRANSLATIONS[locale];
	if (translations?.[key]) return translations[key];
	const fallback = TRANSLATIONS[DEFAULT_LOCALE][key];
	return fallback ?? key;
}

/** Validate that a string is a supported locale. */
export function isSupportedLocale(value: string): value is Locale {
	return (SUPPORTED_LOCALES as string[]).includes(value);
}

/** Detect locale from a query (simple keyword detection). */
export function detectLocaleFromQuery(query: string): Locale | null {
	const q = query.toLowerCase();
	if (/(你好|宝宝|孩子|我|什么)/.test(q)) return "zh-CN";
	if (/(hello|hi |thanks|please|child|child|baby)/.test(q)) return "en-US";
	if (/(hola|gracias|por favor|niño|bebé)/.test(q)) return "es-ES";
	return null;
}

/** Locale-aware number formatter. */
export function formatNumber(
	value: number,
	locale: Locale,
	options?: Intl.NumberFormatOptions,
): string {
	try {
		// Map "zh-CN" → "zh-Hans-CN", etc., for ICU support
		const intlLocale =
			locale === "zh-CN"
				? "zh-Hans-CN"
				: locale === "es-ES"
					? "es-ES"
					: "en-US";
		return new Intl.NumberFormat(intlLocale, options).format(value);
	} catch {
		return String(value);
	}
}

/** Locale-aware date formatter. */
export function formatDate(
	date: Date | number,
	locale: Locale,
	options?: Intl.DateTimeFormatOptions,
): string {
	try {
		const intlLocale =
			locale === "zh-CN"
				? "zh-Hans-CN"
				: locale === "es-ES"
					? "es-ES"
					: "en-US";
		const d = typeof date === "number" ? new Date(date) : date;
		return new Intl.DateTimeFormat(intlLocale, options).format(d);
	} catch {
		return typeof date === "number"
			? new Date(date).toISOString()
			: date.toISOString();
	}
}

/** Compute translation coverage for a given locale. */
export function getTranslationCoverage(locale: Locale): number {
	const total = Object.keys(TRANSLATIONS[DEFAULT_LOCALE]).length;
	if (locale === DEFAULT_LOCALE) return 1;
	const translated = Object.keys(TRANSLATIONS[locale] || {}).length;
	return total === 0 ? 0 : translated / total;
}

/** Get list of missing translation keys for a locale. */
export function getMissingTranslations(locale: Locale): TranslationKey[] {
	const allKeys = Object.keys(
		TRANSLATIONS[DEFAULT_LOCALE],
	) as TranslationKey[];
	if (locale === DEFAULT_LOCALE) return [];
	const translations = TRANSLATIONS[locale] || {};
	return allKeys.filter((k) => !translations[k]);
}

export const I18N_DISCLAIMER =
	"⚠️ Translations are machine-assisted. Always verify critical info with local sources.";
