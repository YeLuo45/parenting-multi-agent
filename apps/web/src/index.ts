/**
 * parenting Web Dashboard — index of pure helpers and entry points.
 */

export {
	DEFAULT_LOCALE,
	type I18nContextValue,
	I18nProvider,
	LanguageSwitcher,
	LOCALE_LABELS,
	LOCALES,
	type Locale,
	MESSAGES,
	type MessageKey,
	readStoredLocale,
	translate,
	useI18n,
	writeStoredLocale,
} from "./i18n.js";
export {
	appBodyGridStyle,
	appContainerInlineStyle,
	type BreakpointName,
	centeredContainerStyle,
	headerInlineStyle,
	LAYOUT,
	resolveBreakpoint,
	responsiveColumns,
} from "./layout.js";
export { IndexedDbMemoryLayer } from "./memory-indexeddb.js";
export { type MemoryLayerLike, WebMemoryLayer } from "./memory-web.js";
export type { WebOrchestrator } from "./orchestrator.js";
export {
	createWebOrchestrator,
	createWebOrchestratorWithPersistence,
} from "./orchestrator.js";
export {
	applyTheme,
	DEFAULT_THEME,
	nextTheme,
	readStoredTheme,
	THEME_NAMES,
	THEME_VARS,
	THEMES,
	type ThemeContextValue,
	type ThemeMeta,
	type ThemeName,
	ThemeProvider,
	ThemeSwitcher,
	useTheme,
	writeStoredTheme,
} from "./theme.js";
export { WEB_VERSION } from "./version.js";
export type { Action, AppState, ChatMessage, IRNode } from "./view.js";
export {
	buildSetConvergenceAction,
	createParentingApp,
	createParentingAppWithPersistence,
	defaultChild,
	dispatchAsk,
	initialState,
	listWebAgentIds,
	newMessageId,
	recordMessageFeedback,
	reducer,
	renderView,
	runAsk,
} from "./view.js";
export type {
	E2eMainPathReport,
	E2eMainPathStep,
	WebConvergenceSnapshot,
	WebLlmCompletion,
	WebLlmProvider,
	WebLlmRegistry,
} from "./web-convergence.js";
export {
	buildE2eMainPathReport,
	buildWebConvergenceSnapshot,
	createRuleFallbackProvider,
	createWebLlmProvider,
	registerWebLlmProviders,
} from "./web-convergence.js";
export type {
	IterationDirection,
	IterationDirectionId,
	IterationSuiteSnapshot,
	ParentingScenario,
	ProviderConfigSnapshot,
	ReleaseGatePlan,
	ReleaseGateStep,
} from "./web-iteration-suite.js";
export {
	buildAcceptanceEvidence,
	buildActionPlanGenerator,
	buildAgentCollaborationExplanation,
	buildAllDirectionsProductHub,
	buildBilingualKnowledgeBase,
	buildClosedLoopEvidenceLedger,
	buildDeliveryReportExport,
	buildE2eDrill,
	buildFamilyProfileCenter,
	buildFamilyTimelineFilters,
	buildFeedbackRepairLoop,
	buildIterationSuite,
	buildLlmProviderConfigForm,
	buildMedicalSafetyEscalation,
	buildMemoryTimeline,
	buildMultiChildContextSwitcher,
	buildOfflineSyncOperations,
	buildParentingClosedLoopPlan,
	buildParentingExecutionCenter,
	buildParentProgressDashboard,
	buildProviderConfigSnapshot,
	buildProviderModeOptions,
	buildReleaseGatePlan,
	buildRuntimeDashboardSnapshot,
	buildSafetyFirstMode,
	buildScenarioPack,
	buildScenarioTemplateLibrary,
	buildScenarioWorkflow,
	buildSyncConflictResolution,
	buildSyncQueueActions,
	buildSyncQueueOperationPlan,
} from "./web-iteration-suite.js";
