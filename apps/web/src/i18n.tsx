/**
 * i18n infrastructure for the parenting web dashboard.
 *
 * Lightweight: no i18next dependency. Two locales (zh-CN, en) with a
 * message dictionary and a hook for translation. Persistent locale via
 * localStorage. Designed to be tree-shakable and extendable.
 */
import {
	createContext,
	type ReactElement,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

export type Locale = "zh-CN" | "en";

export const LOCALES: Locale[] = ["zh-CN", "en"];

export const DEFAULT_LOCALE: Locale = "zh-CN";

export const LOCALE_LABELS: Record<Locale, string> = {
	"zh-CN": "简体中文",
	en: "English",
};

/** Flat message keys for type-safe access. */
export type MessageKey =
	| "app.title"
	| "header.theme"
	| "header.language"
	| "children.title"
	| "children.empty"
	| "chat.title"
	| "chat.empty"
	| "chat.placeholder.selectChild"
	| "chat.placeholder.ask"
	| "chat.ask"
	| "chat.asking"
	| "chat.reset"
	| "composer.error.emptyQuestion"
	| "composer.error.selectChild"
	| "message.user"
	| "message.agent";

export const MESSAGES: Record<Locale, Record<MessageKey, string>> = {
	"zh-CN": {
		"app.title": "parenting-multi-agent",
		"header.theme": "主题",
		"header.language": "语言",
		"children.title": "孩子档案",
		"children.empty": "暂无孩子，请添加",
		"chat.title": "对话",
		"chat.empty": "问一个育儿问题开始吧",
		"chat.placeholder.selectChild": "请先选择孩子",
		"chat.placeholder.ask": "请输入问题…",
		"chat.ask": "提问",
		"chat.asking": "提交中…",
		"chat.reset": "重置",
		"composer.error.emptyQuestion": "问题不能为空",
		"composer.error.selectChild": "请先选择孩子",
		"message.user": "我",
		"message.agent": "顾问",
	},
	en: {
		"app.title": "parenting-multi-agent",
		"header.theme": "Theme",
		"header.language": "Language",
		"children.title": "Children",
		"children.empty": "No children yet.",
		"chat.title": "Chat",
		"chat.empty": "Ask a parenting question to get started.",
		"chat.placeholder.selectChild": "Select a child first",
		"chat.placeholder.ask": "Ask anything…",
		"chat.ask": "Ask",
		"chat.asking": "Asking…",
		"chat.reset": "Reset",
		"composer.error.emptyQuestion": "Question cannot be empty",
		"composer.error.selectChild": "Please select a child first",
		"message.user": "Me",
		"message.agent": "Advisor",
	},
};

/** Pure helper: read locale from storage. Returns DEFAULT_LOCALE on miss/error. */
export function readStoredLocale(
	storage: { getItem: (k: string) => string | null } | null,
): Locale {
	if (!storage) return DEFAULT_LOCALE;
	try {
		const raw = storage.getItem(STORAGE_KEY);
		if (raw && (LOCALES as readonly string[]).includes(raw))
			return raw as Locale;
	} catch {
		// ignore
	}
	return DEFAULT_LOCALE;
}

/** Pure helper: write locale to storage. Returns true on success. */
export function writeStoredLocale(
	storage: { setItem: (k: string, v: string) => void } | null,
	locale: Locale,
): boolean {
	if (!storage) return false;
	try {
		storage.setItem(STORAGE_KEY, locale);
		return true;
	} catch {
		return false;
	}
}

/** Pure helper: translate a message key. Returns key itself if missing. */
export function translate(locale: Locale, key: MessageKey): string {
	return MESSAGES[locale][key] ?? key;
}

const STORAGE_KEY = "parenting:locale";

export interface I18nContextValue {
	locale: Locale;
	setLocale: (next: Locale) => void;
	t: (key: MessageKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/** Hook to access i18n context. Falls back to defaults if used outside provider. */
export function useI18n(): I18nContextValue {
	const ctx = useContext(I18nContext);
	const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
	const setLocale = useCallback((next: Locale) => {
		setLocaleState(next);
	}, []);
	const t = useCallback(
		(key: MessageKey) => translate(locale, key),
		[locale],
	);
	const fallback = useMemo(
		() => ({ locale, setLocale, t }),
		[locale, setLocale, t],
	);
	return ctx ?? fallback;
}

/** Provider that wires locale state + localStorage persistence. */
export function I18nProvider({
	children,
	initialLocale,
}: {
	children: ReactNode;
	initialLocale?: Locale;
}): ReactElement {
	const [locale, setLocaleState] = useState<Locale>(() => {
		if (initialLocale) return initialLocale;
		return readStoredLocale(
			typeof window !== "undefined" ? window.localStorage : null,
		);
	});

	const setLocale = useCallback((next: Locale) => {
		setLocaleState(next);
	}, []);

	const t = useCallback(
		(key: MessageKey) => translate(locale, key),
		[locale],
	);

	useEffect(() => {
		writeStoredLocale(
			typeof window !== "undefined" ? window.localStorage : null,
			locale,
		);
		if (typeof document !== "undefined") {
			document.documentElement.lang = locale;
		}
	}, [locale]);

	const value = useMemo(
		() => ({ locale, setLocale, t }),
		[locale, setLocale, t],
	);
	return (
		<I18nContext.Provider value={value}>{children}</I18nContext.Provider>
	);
}

/** LanguageSwitcher: a dropdown exposing all locales. */
export function LanguageSwitcher(): ReactElement {
	const { locale, setLocale } = useI18n();
	return (
		<fieldset
			className="language-switcher"
			data-testid="language-switcher"
			aria-label="Language"
		>
			<legend className="sr-only">Language</legend>
			<label htmlFor="locale-select" className="sr-only">
				Language
			</label>
			<select
				id="locale-select"
				data-testid="locale-select"
				value={locale}
				onChange={(e) => setLocale(e.target.value as Locale)}
			>
				{LOCALES.map((loc) => (
					<option key={loc} value={loc}>
						{LOCALE_LABELS[loc]}
					</option>
				))}
			</select>
		</fieldset>
	);
}
