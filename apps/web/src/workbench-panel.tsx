/**
 * Workbench UI panel — extracted to its own module so JSX dead-branch
 * coverage is contained to one file and easy to test in isolation.
 *
 * The panel is mounted inside the existing MemoryPanel and re-uses the
 * pure workbench builders from web-iteration-suite.ts.
 */
import type { ReactElement } from "react";
import {
	buildActionPlanBoard,
	buildAgentCollaborationDag,
	buildAgentNodeActions,
	buildAgentWeightHints,
	buildDagAgentShortcut,
	buildGuidedIntakeWizard,
	buildSelectedAgentHint,
	buildWebInteractionWorkbench,
	type AgentDagNodeKind,
} from "./web-iteration-suite.js";
import type { Action, AppState } from "./view.js";

export interface WorkbenchPanelProps {
	state: AppState;
	dispatch: (a: Action) => void;
}

const NODE_KIND_LABEL: Record<AgentDagNodeKind, string> = {
	primary: "主 Agent",
	consult: "咨询",
	guardrail: "安全兜底",
};

export function WorkbenchPanel({
	state,
	dispatch,
}: WorkbenchPanelProps): ReactElement {
	const workbench = buildWebInteractionWorkbench({
		question: state.question,
		children: state.children,
		selectedChildId: state.selectedChildId ?? undefined,
		memory: state.memoryStats,
		provider: state.llmStatus,
		lastFeedbackRating:
			state.memoryStats.feedback > 0 ? -1 : undefined,
	});
	const guidedIntake = buildGuidedIntakeWizard({
		children: state.children,
		selectedChildId: state.selectedChildId ?? undefined,
		completedSteps: state.guidedIntake.completedSteps,
		activeStepId: state.guidedIntake.activeStepId,
		scenarioId: state.guidedIntake.scenarioId ?? "default",
		goal: state.guidedIntake.goal || "default",
	});
	const agentDag = buildAgentCollaborationDag({
		primaryAgentId: workbench.collaboration.primaryAgentId,
		consultedAgentIds: workbench.collaboration.steps
			.filter((step) => step.kind === "consult")
			.map((step) => step.label.replace(/^Consult\s+/, ""))
			.flatMap((label) => label.split(/,\s+/))
			.filter(Boolean),
		safetyGuardrail: workbench.safety.mode !== "normal-loop",
	});
	const actionBoard = buildActionPlanBoard({
		actionCards: workbench.actionCards,
		completedIds: state.actionBoard.completedIds,
		notes: state.actionBoard.notes,
	});
	const agentNodeActions = buildAgentNodeActions(agentDag).map((node, idx) => ({
		...node,
		kind: agentDag.nodes[idx]?.kind ?? ("primary" as AgentDagNodeKind),
	}));
	const selectedHintModel = buildSelectedAgentHint(
		state.agentHints,
		state.selectedAgentId,
	);
	const selectedHintText = selectedHintModel
		? selectedHintModel.hint
		: state.agentHints.signalSummary;
	const dagShortcut = buildDagAgentShortcut({
		agentId: state.selectedAgentId ?? "",
		messages: state.messages.map((m) => ({
			id: m.id,
			role: m.role,
			content: m.content,
			ts: m.ts,
		})),
	});
	const dagShortcutContent = dagShortcut.lastReply
		? dagShortcut.lastReply.content
		: "no agent reply yet";
	const hintBoosts = buildAgentWeightHints({
		primaryAgentId: workbench.collaboration.primaryAgentId,
		completedIds: state.actionBoard.completedIds,
		notes: state.actionBoard.notes,
	});

	return (
		<div
			className="dashboard-card"
			data-testid="workbench-panel"
		>
			<strong>Workbench</strong>
			<span data-testid="workbench-summary">{workbench.summary}</span>
			<div
				className="scenario-pack"
				data-testid="workbench-directions"
			>
				{workbench.directions.map((direction) => (
					<button
						key={direction.id}
						type="button"
						data-testid={`workbench-direction-${direction.id}`}
						onClick={() =>
							dispatch({
								type: "setQuestion",
								question: direction.title,
							})
						}
					>
						{direction.title}
					</button>
				))}
			</div>
			<p data-testid="workbench-family-summary">
				{`家庭协作：${workbench.collaboration.primaryAgentId} 主导`}
			</p>
			<p data-testid="workbench-personalization">
				{`个性化推荐：${hintBoosts.signalSummary}`}
			</p>
			<div
				className="scenario-pack"
				data-testid="workbench-guided-intake"
			>
				{guidedIntake.steps.map((step) => (
					<button
						key={step.id}
						type="button"
						data-testid={`workbench-guided-${step.id}`}
						aria-pressed={step.complete}
						onClick={() =>
							dispatch({
								type: "advanceIntake",
								stepId: step.id,
								scenarioId: state.guidedIntake.scenarioId ?? "default",
								goal: state.guidedIntake.goal || "default",
							})
						}
					>
						{step.label}
					</button>
				))}
			</div>
			<p data-testid="workbench-guided-progress">
				{Math.round(guidedIntake.progressRatio * 100)}%
			</p>
			<div
				className="scenario-pack"
				data-testid="workbench-dag-buttons"
			>
				{agentNodeActions.map((node) => {
					const isPrimary = node.kind === "primary";
					return (
						<button
							key={node.agentId}
							type="button"
							data-testid={`workbench-dag-btn-${node.agentId}`}
							data-node-kind={node.kind}
							aria-pressed={state.selectedAgentId === node.agentId}
							onClick={() =>
								dispatch({
									type: "selectAgent",
									agentId: node.agentId,
								})
							}
						>
							{NODE_KIND_LABEL[node.kind]}: {node.label}
							{isPrimary ? " *" : ""}
						</button>
					);
				})}
			</div>
			<p data-testid="workbench-dag-summary">
				{`DAG ${agentDag.nodes.length} nodes / ${agentDag.edges.length} edges`}
			</p>
			<p data-testid="workbench-selected-hint">
				{selectedHintText}
			</p>
			<p data-testid="workbench-dag-shortcut">
				{dagShortcutContent}
			</p>
			<p data-testid="workbench-dag-shortcut-count">
				{dagShortcut.lastReply ? "1 reply" : "0 replies"}
			</p>
			<button
				type="button"
				data-testid="workbench-dag-clear"
				onClick={() => {
					dispatch({ type: "selectAgent", agentId: null });
				}}
			>
				clear
			</button>
			<div
				className="scenario-pack"
				data-testid="workbench-action-board"
			>
				{actionBoard.cards.map((card) => {
					const done = state.actionBoard.completedIds.includes(card.horizon);
					return (
						<span
							key={card.horizon}
							data-testid={`workbench-action-card-${card.horizon}`}
						>
							<button
								type="button"
								data-testid={`workbench-action-toggle-${card.horizon}`}
								aria-pressed={done}
								onClick={() =>
									dispatch({
										type: "toggleActionCard",
										horizon: card.horizon,
									})
								}
							>
								{card.title}
							</button>
							<input
								type="text"
								data-testid={`workbench-action-note-${card.horizon}`}
								placeholder="备注"
								value={state.actionBoard.notes[card.horizon] ?? ""}
								onChange={(event) =>
									dispatch({
										type: "annotateActionCard",
										horizon: card.horizon,
										note: event.target.value,
									})
								}
							/>
						</span>
					);
				})}
			</div>
			<p data-testid="workbench-action-completion">
				{Math.round(actionBoard.completionRatio * 100)}%
			</p>
			<p data-testid="workbench-hint-boosts">
				{hintBoosts.boosts.length} agent boosts
			</p>
		</div>
	);
}
