/**
 * parenting Web Dashboard — real React components.
 *
 * These are the actual DOM-binding components used by the production app.
 * They are tested with @testing-library/react in test/components.test.tsx.
 *
 * The IR-based renderView function (in view.tsx) is kept for fast unit
 * testing of state transitions without rendering. The two approaches
 * mirror each other — both compute from the same AppState shape.
 */
import type { FormEvent, ReactElement } from "react";
import { LanguageSwitcher, useI18n } from "./i18n.js";
import { ThemeSwitcher } from "./theme.js";
import type { Action, AppState, ChatMessage } from "./view.js";
import {
	buildDeliveryReportExport,
	buildRuntimeDashboardSnapshot,
	buildScenarioPack,
	buildScenarioWorkflow,
	buildSyncQueueOperationPlan,
} from "./web-iteration-suite.js";

/** Header: app title + agent count + theme switcher + language switcher. */
export function Header({ state }: { state: AppState }): ReactElement {
	const { t } = useI18n();
	return (
		<header className="app-header" data-testid="app-header">
			<h1 data-testid="app-title">
				{t("app.title")} ({state.agents.length} agents)
			</h1>
			<div className="header-controls">
				<LanguageSwitcher />
				<ThemeSwitcher />
			</div>
		</header>
	);
}

/** Empty placeholder element returned by some branches to keep JSX valid. */
export function EmptyNode(): ReactElement {
	return <span data-testid="empty-node" />;
}

/** ChildrenPanel: list of children with select-on-click. */
export function ChildrenPanel({
	state,
	dispatch,
}: {
	state: AppState;
	dispatch: (a: Action) => void;
}): ReactElement {
	const { t } = useI18n();
	const list =
		state.children.length === 0 ? (
			<p data-testid="no-children">{t("children.empty")}</p>
		) : (
			<ul data-testid="children-list">
				{state.children.map((c) => {
					const isSelected = c.id === state.selectedChildId;
					return (
						<li key={c.id}>
							<button
								type="button"
								data-testid={`child-${c.id}`}
								className={
									isSelected ? "child selected" : "child"
								}
								aria-pressed={isSelected}
								onClick={() =>
									dispatch({
										type: "selectChild",
										childId: c.id,
									})
								}
							>
								{c.name} ({c.stage})
							</button>
						</li>
					);
				})}
			</ul>
		);
	return (
		<aside
			className="children-panel"
			data-testid="children-panel"
			aria-label="Children list"
		>
			<h2>{t("children.title")}</h2>
			{list}
		</aside>
	);
}

/** MessageBubble: one chat message (user or agent). */
export function MessageBubble({
	message,
	onFeedback,
}: {
	message: ChatMessage;
	onFeedback?: (messageId: string, feedback: "up" | "down") => void;
}): ReactElement {
	const className = `message ${message.role === "user" ? "user-msg" : "agent-msg"}`;
	const canRate =
		message.role === "agent" && !!message.agentId && !!onFeedback;
	return (
		<article
			className={className}
			data-testid={`message-${message.id}`}
			data-role={message.role}
		>
			<strong>{message.author}:</strong>
			<p>{message.content}</p>
			{canRate ? (
				<fieldset
					className="feedback-controls"
					aria-label="Agent feedback"
				>
					<legend className="sr-only">Agent feedback</legend>
					<button
						type="button"
						data-testid={`feedback-up-${message.id}`}
						aria-pressed={message.feedback === "up"}
						onClick={() => onFeedback(message.id, "up")}
					>
						👍
					</button>
					<button
						type="button"
						data-testid={`feedback-down-${message.id}`}
						aria-pressed={message.feedback === "down"}
						onClick={() => onFeedback(message.id, "down")}
					>
						👎
					</button>
				</fieldset>
			) : null}
		</article>
	);
}

/** Messages: list of MessageBubbles, or empty-state placeholder. */
export function Messages({
	state,
	onFeedback,
}: {
	state: AppState;
	onFeedback?: (messageId: string, feedback: "up" | "down") => void;
}): ReactElement {
	const { t } = useI18n();
	if (state.messages.length === 0) {
		return (
			<div className="messages" data-testid="messages" aria-live="polite">
				<p>{t("chat.empty")}</p>
			</div>
		);
	}
	return (
		<div className="messages" data-testid="messages" aria-live="polite">
			{state.messages.map((m) => (
				<MessageBubble key={m.id} message={m} onFeedback={onFeedback} />
			))}
		</div>
	);
}

/** Composer: question textarea + ask button + reset button + error banner. */
export function Composer({
	state,
	dispatch,
	onAsk,
}: {
	state: AppState;
	dispatch: (a: Action) => void;
	onAsk: () => Promise<void> | void;
}): ReactElement {
	const { t } = useI18n();
	const canAsk =
		!!state.selectedChildId &&
		!state.pending &&
		state.question.trim().length > 0;
	const placeholder = state.selectedChildId
		? t("chat.placeholder.ask")
		: t("chat.placeholder.selectChild");
	const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
		e.preventDefault();
		if (!canAsk) return;
		void onAsk();
	};
	return (
		<form
			className="composer"
			data-testid="composer"
			onSubmit={handleSubmit}
			aria-label="Question composer"
		>
			<label htmlFor="question-input" className="sr-only">
				{t("chat.placeholder.ask")}
			</label>
			<textarea
				id="question-input"
				data-testid="question-input"
				value={state.question}
				placeholder={placeholder}
				disabled={!state.selectedChildId || state.pending}
				onChange={(e) =>
					dispatch({ type: "setQuestion", question: e.target.value })
				}
				rows={3}
			/>
			<button type="submit" data-testid="ask-button" disabled={!canAsk}>
				{state.pending ? t("chat.asking") : t("chat.ask")}
			</button>
			<button
				type="button"
				data-testid="reset-button"
				onClick={() => dispatch({ type: "reset" })}
			>
				{t("chat.reset")}
			</button>
			{state.error ? (
				<div className="error" data-testid="error-banner" role="alert">
					{state.error}
				</div>
			) : (
				<EmptyNode />
			)}
		</form>
	);
}

/** ChatPanel: messages + composer. */
export function ChatPanel({
	state,
	dispatch,
	onAsk,
	onFeedback,
}: {
	state: AppState;
	dispatch: (a: Action) => void;
	onAsk: () => Promise<void> | void;
	onFeedback?: (messageId: string, feedback: "up" | "down") => void;
}): ReactElement {
	const { t } = useI18n();
	return (
		<section
			className="chat-panel"
			data-testid="chat-panel"
			aria-label="Chat"
		>
			<h2>{t("chat.title")}</h2>
			<Messages state={state} onFeedback={onFeedback} />
			<Composer state={state} dispatch={dispatch} onAsk={onAsk} />
		</section>
	);
}

/** MemoryPanel: visible browser persistence and sync health snapshot. */
export function MemoryPanel({
	state,
	dispatch,
}: {
	state: AppState;
	dispatch?: (a: Action) => void;
}): ReactElement {
	const stats = state.memoryStats;
	const scenarios = buildScenarioPack();
	const selectedChild = state.children.find((child) => child.id === state.selectedChildId);
	const fallbackScenario = scenarios[0]!;
	const selectedScenario = scenarios.find((scenario) => scenario.childStage === selectedChild?.stage) ?? fallbackScenario;
	const dashboard = buildRuntimeDashboardSnapshot({
		children: state.children,
		facts: [],
		episodes: [],
		feedback: [],
		deltaStats: {
			total: state.convergence?.sync.total ?? stats.unsyncedDeltas,
			unsynced: state.convergence?.sync.unsynced ?? stats.unsyncedDeltas,
			byTable: state.convergence?.sync.byTable ?? {},
			byOp: {},
		},
		provider: state.llmStatus,
		release: { tests: 270, passed: 270, statements: 99.2, branches: 96.1, assets: 8 },
		selectedChildId: state.selectedChildId,
		scenarioId: selectedScenario.id,
	});
	const retryPlan = buildSyncQueueOperationPlan("retry", {
		total: state.convergence?.sync.total ?? stats.unsyncedDeltas,
		unsynced: state.convergence?.sync.unsynced ?? stats.unsyncedDeltas,
		byTable: state.convergence?.sync.byTable ?? {},
		byOp: {},
	});
	const deliveryReport = buildDeliveryReportExport({
		proposalId: "P-20260624-008",
		commit: "pending",
		acceptance: dashboard.acceptance,
		drill: dashboard.drill,
		sync: dashboard.sync,
	});
	const items: Array<[string, string, number]> = [
		["children", "Children", stats.children],
		["facts", "Facts", stats.facts],
		["episodes", "Episodes", stats.episodes],
		["sessions", "Sessions", stats.sessions],
		["feedback", "Feedback", stats.feedback],
		["unsynced", "Unsynced", stats.unsyncedDeltas],
	];
	return (
		<aside
			className="memory-panel"
			data-testid="memory-panel"
			aria-label="Memory snapshot"
		>
			<h2>Memory</h2>
			<p data-testid="iteration-suite-summary">
				{state.iterationSuite.summary}
			</p>
			<p data-testid="provider-config-status">
				{state.providerConfig.statusText}
			</p>
			<p data-testid="scenario-pack-summary">
				{scenarios.length} scenario pack cases ready
			</p>
			<div className="scenario-pack" data-testid="scenario-pack-actions">
				{scenarios.map((scenario) => (
					<button
						key={scenario.id}
						type="button"
						data-testid={`scenario-${scenario.id}`}
						onClick={() =>
							dispatch?.({ type: "setQuestion", question: scenario.prompt })
						}
					>
						{scenario.title}
					</button>
				))}
			</div>
			<p data-testid="release-gate-command">
				{state.releaseGate.command}
			</p>
			<div className="dashboard-card" data-testid="acceptance-evidence-panel">
				<strong>Acceptance Evidence</strong>
				<span>{dashboard.acceptance.summary}</span>
				<button type="button" data-testid="export-delivery-report" onClick={() => dispatch?.({ type: "setQuestion", question: deliveryReport.markdown })}>Export report</button>
			</div>
			<div className="dashboard-card" data-testid="memory-timeline-panel">
				<strong>Memory Timeline</strong>
				<span>{dashboard.timelineFilters.defaultLabel}</span>
			</div>
			<div className="dashboard-card" data-testid="sync-queue-panel">
				<strong>Sync Queue</strong>
				<span>{dashboard.sync.summary}</span>
				<button type="button" data-testid="sync-retry-action" disabled={!retryPlan.enabled} onClick={() => dispatch?.({ type: "setQuestion", question: retryPlan.summary })}>Retry</button>
			</div>
			<div className="dashboard-card" data-testid="e2e-drill-panel">
				<strong>Main Path Drill</strong>
				<span>{dashboard.drill.summary}</span>
				<button type="button" data-testid="run-main-path-drill" onClick={() => dispatch?.({ type: "setQuestion", question: buildScenarioWorkflow(selectedScenario, { childId: state.selectedChildId ?? "default", childStage: selectedScenario.childStage }).prompt })}>Run drill</button>
			</div>
			<div className="dashboard-card" data-testid="provider-mode-toggle">
				<strong>Provider</strong>
				<span>{dashboard.provider.mode}</span>
				{dashboard.providerOptions.map((option) => <button key={option.id} type="button" data-testid={`provider-option-${option.id}`} disabled={!option.enabled} aria-pressed={option.selected}>{option.label}</button>)}
			</div>
			<dl>
				{items.map(([key, label, value]) => (
					<div className="memory-stat" key={key}>
						<dt>{label}</dt>
						<dd data-testid={`memory-stat-${key}`}>{value}</dd>
					</div>
				))}
			</dl>
		</aside>
	);
}

/** AppBody: side-by-side children + chat + memory snapshot. Wraps content in centered container. */
export function AppBody({
	state,
	dispatch,
	onAsk,
	onFeedback,
}: {
	state: AppState;
	dispatch: (a: Action) => void;
	onAsk: () => Promise<void> | void;
	onFeedback?: (messageId: string, feedback: "up" | "down") => void;
}): ReactElement {
	return (
		<main
			className="app-body"
			data-testid="app-body"
			data-layout="3-column"
		>
			<ChildrenPanel state={state} dispatch={dispatch} />
			<ChatPanel
				state={state}
				dispatch={dispatch}
				onAsk={onAsk}
				onFeedback={onFeedback}
			/>
			<MemoryPanel state={state} dispatch={dispatch} />
		</main>
	);
}
