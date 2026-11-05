import {
	afterEach,
	beforeEach,
	describe,
	expect,
	mock,
	spyOn,
	test,
} from "bun:test";
import { handleConfigCommand, handleVersionAndHelp } from "../lib/cli.js";

class ExitCalled extends Error {
	constructor(readonly code: number | undefined) {
		super(`process.exit(${code})`);
	}
}

const stripAnsi = (value: string) =>
	value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g"), "");

const logSpy = spyOn(console, "log");
const errorSpy = spyOn(console, "error");
const exitSpy = spyOn(process, "exit");

const loggedLines = () =>
	logSpy.mock.calls.map((call) => stripAnsi(String(call[0])));

beforeEach(() => {
	logSpy.mockImplementation(() => {});
	errorSpy.mockImplementation(() => {});
	exitSpy.mockImplementation((code?: number | string | null) => {
		throw new ExitCalled(code === undefined ? undefined : Number(code));
	});
});

afterEach(() => {
	logSpy.mockReset();
	errorSpy.mockReset();
	exitSpy.mockReset();
});

const NoopEditor = () => null;

describe("handleVersionAndHelp", () => {
	test("prints help and exits with 0", () => {
		expect(() =>
			handleVersionAndHelp(null, "usage text", "tool", "1.0.0"),
		).toThrow(new ExitCalled(0));
		expect(loggedLines()).toEqual(["usage text"]);
	});

	test("prints version and exits with 0", () => {
		expect(() => handleVersionAndHelp("1.0.0", null, "tool", "1.2.3")).toThrow(
			new ExitCalled(0),
		);
		expect(loggedLines()).toEqual(["tool version: 1.2.3"]);
	});

	test("prefers help over version", () => {
		expect(() =>
			handleVersionAndHelp("1.0.0", "help", "tool", "1.0.0"),
		).toThrow(new ExitCalled(0));
		expect(loggedLines()).toEqual(["help"]);
	});

	test("does nothing when neither help nor version is requested", () => {
		handleVersionAndHelp(undefined, undefined, "tool", "1.0.0");
		expect(logSpy).not.toHaveBeenCalled();
		expect(exitSpy).not.toHaveBeenCalled();
	});
});

describe("handleConfigCommand", () => {
	test("show prints each value with its source", async () => {
		await handleConfigCommand("show", {
			getConfig: async () => ({
				config: { alpha: true, beta: "x", gamma: 3 },
				sources: { alpha: "local", beta: "global" },
			}),
			getGlobalConfigPath: () => "/tmp/config.json",
			resetGlobalConfig: async () => {},
			ConfigEditorComponent: NoopEditor,
		});

		expect(loggedLines()).toEqual([
			"Current configuration:",
			"  alpha: true (local)",
			"  beta: x (global)",
			"  gamma: 3 (default)",
		]);
	});

	test("reset calls resetGlobalConfig and reports the path", async () => {
		const reset = mock(async () => {});

		await handleConfigCommand("reset", {
			getConfig: async () => ({ config: {}, sources: {} }),
			getGlobalConfigPath: () => "/tmp/tool/config.json",
			resetGlobalConfig: reset,
			ConfigEditorComponent: NoopEditor,
		});

		expect(reset).toHaveBeenCalledTimes(1);
		expect(loggedLines()).toEqual([
			"Configuration reset to default: /tmp/tool/config.json",
		]);
	});

	test("unknown commands print usage and exit with 1", async () => {
		await expect(
			handleConfigCommand("bogus", {
				getConfig: async () => ({ config: {}, sources: {} }),
				getGlobalConfigPath: () => "/tmp/config.json",
				resetGlobalConfig: async () => {},
				ConfigEditorComponent: NoopEditor,
			}),
		).rejects.toThrow(new ExitCalled(1));

		expect(errorSpy).toHaveBeenCalledWith("Unknown config command: bogus");
		expect(loggedLines()).toEqual([
			"Available commands: show, edit, reset, set",
		]);
	});
});
