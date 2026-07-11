/**
 * @parenting/agent-screen — developmental/behavioral screening agent.
 */

export {
	createScreenAgent,
	SCREEN_DISCLAIMER as SCREEN_DISCLAIMER_AGENT,
	ScreenAgent,
} from "./agent.js";

export {
	type AnswerValue,
	applicableItems,
	type Domain,
	detectRedFlags,
	formatScreenResult,
	itemsForScale,
	SCREEN_DISCLAIMER as SCREEN_DISCLAIMER_PUBLIC,
	SCREEN_ITEMS,
	type ScaleId,
	type ScreenItem,
	type ScreenResult,
	scoreScale,
} from "./knowledge.js";

export const SCREEN_VERSION = "0.1.0";
