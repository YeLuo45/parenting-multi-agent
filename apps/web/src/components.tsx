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
import { type FormEvent, type ReactElement } from "react";
import type { AppState, ChatMessage, Action } from "./view.js";
import { ThemeSwitcher } from "./theme.js";
import { useI18n, LanguageSwitcher } from "./i18n.js";

/** Header: app title + agent count + theme switcher + language switcher. */
export function Header({ state }: { state: AppState }): ReactElement {
	const { t } = useI18n();
	return (
		<header
			className="app-header"
			data-testid="app-header"
			role="banner"
		>
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
	const list = state.children.length === 0 ? (
		<p data-testid="no-children">{t("children.empty")}</p>
	) : (
		<ul data-testid="children-list" role="list">
			{state.children.map((c) => {
				const isSelected = c.id === state.selectedChildId;
				return (
					<li
						key={c.id}
						data-testid={`child-${c.id}`}
						className={isSelected ? "child selected" : "child"}
						role="listitem"
						aria-selected={isSelected}
						onClick={() => dispatch({ type: "selectChild", childId: c.id })}
					>
						{c.name} ({c.stage})
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
export function MessageBubble({ message }: { message: ChatMessage }): ReactElement {
	const className = `message ${message.role === "user" ? "user-msg" : "agent-msg"}`;
	return (
		<div
			className={className}
			data-testid={`message-${message.id}`}
			data-role={message.role}
			role="article"
		>
			<strong>{message.author}:</strong>
			<p>{message.content}</p>
		</div>
	);
}

/** Messages: list of MessageBubbles, or empty-state placeholder. */
export function Messages({ state }: { state: AppState }): ReactElement {
	const { t } = useI18n();
	if (state.messages.length === 0) {
		return (
			<div
				className="messages"
				data-testid="messages"
				aria-live="polite"
			>
				<p>{t("chat.empty")}</p>
			</div>
		);
	}
	return (
		<div className="messages" data-testid="messages" aria-live="polite">
			{state.messages.map((m) => (
				<MessageBubble key={m.id} message={m} />
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
	const canAsk = !!state.selectedChildId && !state.pending && state.question.trim().length > 0;
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
				onChange={(e) => dispatch({ type: "setQuestion", question: e.target.value })}
				rows={3}
			/>
			<button
				type="submit"
				data-testid="ask-button"
				disabled={!canAsk}
			>
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
				<div
					className="error"
					data-testid="error-banner"
					role="alert"
				>
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
}: {
	state: AppState;
	dispatch: (a: Action) => void;
	onAsk: () => Promise<void> | void;
}): ReactElement {
	const { t } = useI18n();
	return (
		<section
			className="chat-panel"
			data-testid="chat-panel"
			aria-label="Chat"
		>
			<h2>{t("chat.title")}</h2>
			<Messages state={state} />
			<Composer state={state} dispatch={dispatch} onAsk={onAsk} />
		</section>
	);
}

/** AppBody: side-by-side children + chat. Wraps content in centered container. */
export function AppBody({
	state,
	dispatch,
	onAsk,
}: {
	state: AppState;
	dispatch: (a: Action) => void;
	onAsk: () => Promise<void> | void;
}): ReactElement {
	return (
		<div
			className="app-body"
			data-testid="app-body"
			data-layout="3-column"
			role="main"
		>
			<ChildrenPanel state={state} dispatch={dispatch} />
			<ChatPanel state={state} dispatch={dispatch} onAsk={onAsk} />
		</div>
	);
}
