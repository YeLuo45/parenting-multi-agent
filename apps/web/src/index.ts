/**
 * parenting Web Dashboard — index of pure helpers and entry points.
 */
export { createParentingApp, dispatchAsk, runAsk, newMessageId, defaultChild, initialState, reducer, renderView, listWebAgentIds } from "./view.js";
export { createWebOrchestrator } from "./orchestrator.js";
export { WebMemoryLayer, type MemoryLayerLike } from "./memory-web.js";
export {
	ThemeProvider,
	ThemeSwitcher,
	useTheme,
	THEMES,
	THEME_NAMES,
	THEME_VARS,
	DEFAULT_THEME,
	applyTheme,
	readStoredTheme,
	writeStoredTheme,
	nextTheme,
	type ThemeName,
	type ThemeMeta,
	type ThemeContextValue,
} from "./theme.js";
export {
	I18nProvider,
	LanguageSwitcher,
	useI18n,
	LOCALES,
	LOCALE_LABELS,
	DEFAULT_LOCALE,
	MESSAGES,
	readStoredLocale,
	writeStoredLocale,
	translate,
	type Locale,
	type MessageKey,
	type I18nContextValue,
} from "./i18n.js";
export {
	LAYOUT,
	appBodyGridStyle,
	appContainerInlineStyle,
	centeredContainerStyle,
	headerInlineStyle,
	resolveBreakpoint,
	responsiveColumns,
	type BreakpointName,
} from "./layout.js";
export type { AppState, Action, ChatMessage, IRNode } from "./view.js";
export type { WebOrchestrator } from "./orchestrator.js";
export { WEB_VERSION } from "./main.js";