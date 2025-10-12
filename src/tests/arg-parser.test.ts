import { describe, expect, test } from "bun:test";
import { ArgParser } from "../lib/arg-parser.js";

describe("ArgParser", () => {
	const schema = {
		verbose: { type: "boolean" as const, shortFlag: "v" },
		output: { type: "string" as const, shortFlag: "o" },
		force: { type: "boolean" as const },
		configFile: { type: "string" as const },
	};

	describe("help and version flags", () => {
		test("should return help message when -h is passed", () => {
			const parser = new ArgParser({
				schema,
				helpMessage: "Test help message",
				version: "1.0.0",
			});
			const result = parser.parse(["-h"]);
			expect(result.help).toBe("Test help message");
		});

		test("should return help message when --help is passed", () => {
			const parser = new ArgParser({
				schema,
				helpMessage: "Test help message",
				version: "1.0.0",
			});
			const result = parser.parse(["--help"]);
			expect(result.help).toBe("Test help message");
		});

		test("should return version when -v is passed (not short flag conflict)", () => {
			const schemaWithoutVerbose = {
				output: { type: "string" as const, shortFlag: "o" },
			};
			const parser = new ArgParser({
				schema: schemaWithoutVerbose,
				helpMessage: "Test help",
				version: "1.0.0",
			});
			const result = parser.parse(["-v"]);
			expect(result.version).toBe("1.0.0");
		});

		test("should return version when --version is passed", () => {
			const parser = new ArgParser({
				schema,
				helpMessage: "Test help",
				version: "1.0.0",
			});
			const result = parser.parse(["--version"]);
			expect(result.version).toBe("1.0.0");
		});
	});

	describe("boolean flags", () => {
		test("should parse long boolean flags", () => {
			const parser = new ArgParser({
				schema,
				helpMessage: "",
				version: "",
			});
			const result = parser.parse(["--verbose", "--force"]);
			expect(result.flags.verbose).toBe(true);
			expect(result.flags.force).toBe(true);
		});

		test("should parse short boolean flags", () => {
			const schemaWithDifferentShortFlag = {
				...schema,
				verbose: { type: "boolean" as const, shortFlag: "V" },
			};
			const parser = new ArgParser({
				schema: schemaWithDifferentShortFlag,
				helpMessage: "",
				version: "",
			});
			const result = parser.parse(["-V"]);
			expect(result.flags.verbose).toBe(true);
		});

		test("should handle camelCase to kebab-case conversion", () => {
			const parser = new ArgParser({
				schema: { myLongFlag: { type: "boolean" as const } },
				helpMessage: "",
				version: "",
			});
			const result = parser.parse(["--my-long-flag"]);
			expect(result.flags.myLongFlag).toBe(true);
		});

		test("should leave undefined flags as undefined", () => {
			const parser = new ArgParser({
				schema,
				helpMessage: "",
				version: "",
			});
			const result = parser.parse([]);
			expect(result.flags.verbose).toBeUndefined();
			expect(result.flags.force).toBeUndefined();
		});
	});

	describe("string flags", () => {
		test("should parse long string flags with space", () => {
			const parser = new ArgParser({
				schema,
				helpMessage: "",
				version: "",
			});
			const result = parser.parse(["--output", "file.txt"]);
			expect(result.flags.output).toBe("file.txt");
		});

		test("should parse long string flags with equals", () => {
			const parser = new ArgParser({
				schema,
				helpMessage: "",
				version: "",
			});
			const result = parser.parse(["--output=file.txt"]);
			expect(result.flags.output).toBe("file.txt");
		});

		test("should parse short string flags", () => {
			const parser = new ArgParser({
				schema,
				helpMessage: "",
				version: "",
			});
			const result = parser.parse(["-o", "file.txt"]);
			expect(result.flags.output).toBe("file.txt");
		});

		test("should parse short string flags with equals", () => {
			const parser = new ArgParser({
				schema,
				helpMessage: "",
				version: "",
			});
			const result = parser.parse(["-o=file.txt"]);
			expect(result.flags.output).toBe("file.txt");
		});

		test("should handle camelCase to kebab-case for string flags", () => {
			const parser = new ArgParser({
				schema,
				helpMessage: "",
				version: "",
			});
			const result = parser.parse(["--config-file", "config.json"]);
			expect(result.flags.configFile).toBe("config.json");
		});

		test("should throw error when string flag has no value", () => {
			const parser = new ArgParser({
				schema,
				helpMessage: "",
				version: "",
			});
			expect(() => parser.parse(["--output"])).toThrow();
		});
	});

	describe("input arguments", () => {
		test("should collect non-flag arguments as input", () => {
			const parser = new ArgParser({
				schema,
				helpMessage: "",
				version: "",
			});
			const result = parser.parse(["arg1", "arg2", "arg3"]);
			expect(result.input).toEqual(["arg1", "arg2", "arg3"]);
		});

		test("should collect input after flags", () => {
			const parser = new ArgParser({
				schema,
				helpMessage: "",
				version: "",
			});
			const result = parser.parse(["--verbose", "arg1", "arg2"]);
			expect(result.flags.verbose).toBe(true);
			expect(result.input).toEqual(["arg1", "arg2"]);
		});

		test("should handle -- separator", () => {
			const parser = new ArgParser({
				schema,
				helpMessage: "",
				version: "",
			});
			const result = parser.parse(["--verbose", "--", "--output", "file.txt"]);
			expect(result.flags.verbose).toBe(true);
			expect(result.flags.output).toBeUndefined();
			expect(result.input).toEqual(["--output", "file.txt"]);
		});

		test("should collect everything after -- as input", () => {
			const schemaWithoutConflicts = {
				force: { type: "boolean" as const },
			};
			const parser = new ArgParser({
				schema: schemaWithoutConflicts,
				helpMessage: "",
				version: "",
			});
			const result = parser.parse(["--", "--force"]);
			expect(result.input).toEqual(["--force"]);
		});
	});

	describe("mixed arguments", () => {
		test("should parse mixed flags and input", () => {
			const parser = new ArgParser({
				schema,
				helpMessage: "",
				version: "",
			});
			const result = parser.parse([
				"--verbose",
				"--output",
				"file.txt",
				"input1",
				"--force",
				"input2",
			]);
			expect(result.flags.verbose).toBe(true);
			expect(result.flags.output).toBe("file.txt");
			expect(result.flags.force).toBe(true);
			expect(result.input).toEqual(["input1", "input2"]);
		});

		test("should handle multiple flags with equals syntax", () => {
			const parser = new ArgParser({
				schema,
				helpMessage: "",
				version: "",
			});
			const result = parser.parse([
				"--verbose",
				"--output=out.txt",
				"--config-file=config.json",
			]);
			expect(result.flags.verbose).toBe(true);
			expect(result.flags.output).toBe("out.txt");
			expect(result.flags.configFile).toBe("config.json");
		});
	});

	describe("error handling", () => {
		test("should throw error for unknown long flags", () => {
			const parser = new ArgParser({
				schema,
				helpMessage: "",
				version: "",
			});
			expect(() => parser.parse(["--unknown"])).toThrow(
				"Unknown option: --unknown",
			);
		});

		test("should throw error for unknown short flags", () => {
			const parser = new ArgParser({
				schema,
				helpMessage: "",
				version: "",
			});
			expect(() => parser.parse(["-x"])).toThrow("Unknown option: -x");
		});

		test("should throw error when string flag requires value", () => {
			const parser = new ArgParser({
				schema,
				helpMessage: "",
				version: "",
			});
			expect(() => parser.parse(["--output"])).toThrow(
				"Flag --output requires a value",
			);
		});
	});

	describe("edge cases", () => {
		test("should handle empty args array", () => {
			const parser = new ArgParser({
				schema,
				helpMessage: "",
				version: "",
			});
			const result = parser.parse([]);
			expect(result.input).toEqual([]);
			expect(result.flags.verbose).toBeUndefined();
		});

		test("should handle flags with empty string values", () => {
			const parser = new ArgParser({
				schema,
				helpMessage: "",
				version: "",
			});
			const result = parser.parse(["--output="]);
			expect(result.flags.output).toBe("");
		});

		test("should handle multiple occurrences of same flag (last wins)", () => {
			const parser = new ArgParser({
				schema,
				helpMessage: "",
				version: "",
			});
			const result = parser.parse([
				"--output",
				"first.txt",
				"--output",
				"second.txt",
			]);
			expect(result.flags.output).toBe("second.txt");
		});
	});
});
