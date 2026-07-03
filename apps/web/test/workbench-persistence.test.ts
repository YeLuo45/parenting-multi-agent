import { describe, expect, it } from "vitest";
import {
	createWorkbenchStorage,
	InMemoryWorkbenchStorage,
	LocalStorageWorkbenchStorage,
} from "../src/workbench-persistence.js";

describe("workbench persistence", () => {
	it("round-trips state through InMemoryWorkbenchStorage", () => {
		const storage = new InMemoryWorkbenchStorage();
		expect(storage.load()).toBeNull();
		storage.save({
			guidedIntake: {
				completedSteps: ["child", "scenario"],
				activeStepId: "urgency",
				scenarioId: "bedtime-delay",
				goal: "稳定作息",
			},
			actionBoard: {
				completedIds: ["today"],
				notes: { today: "有效" },
			},
		});
		const loaded = storage.load();
		expect(loaded?.guidedIntake.scenarioId).toBe("bedtime-delay");
		expect(loaded?.actionBoard.notes.today).toBe("有效");
		storage.clear();
		expect(storage.load()).toBeNull();
	});

	it("LocalStorageWorkbenchStorage falls back gracefully without window", () => {
		const storage = new LocalStorageWorkbenchStorage();
		storage.save({
			guidedIntake: {
				completedSteps: ["child"],
				activeStepId: "scenario",
				scenarioId: "homework-conflict",
				goal: "",
			},
			actionBoard: { completedIds: [], notes: {} },
		});
		storage.clear();
	});

	it("createWorkbenchStorage returns an InMemoryWorkbenchStorage when localStorage is unavailable", () => {
		const storage = createWorkbenchStorage();
		expect(storage).toBeDefined();
		storage.save({
			guidedIntake: {
				completedSteps: ["child", "scenario", "urgency"],
				activeStepId: "goal",
				scenarioId: "screen-time",
				goal: "建立规则",
			},
			actionBoard: { completedIds: [], notes: {} },
		});
		expect(storage.load()?.guidedIntake.scenarioId).toBe("screen-time");
	});
});
