import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadPackageJson } from "../lib/package.js";

describe("loadPackageJson", () => {
	let testDir: string;
	let testScriptPath: string;

	beforeEach(() => {
		testDir = join(tmpdir(), `package-test-${Date.now()}`);
		const scriptDir = join(testDir, "lib");
		Bun.spawnSync(["mkdir", "-p", scriptDir]);

		testScriptPath = join(scriptDir, "test-script.js");
	});

	afterEach(() => {
		Bun.spawnSync(["rm", "-rf", testDir]);
	});

	test("should load and parse package.json", () => {
		const packageJson = {
			name: "test-package",
			version: "1.0.0",
			description: "Test package",
		};

		writeFileSync(join(testDir, "package.json"), JSON.stringify(packageJson));
		writeFileSync(testScriptPath, "");

		const scriptUrl = `file://${testScriptPath}`;
		const result = loadPackageJson(scriptUrl);

		expect(result.name).toBe("test-package");
		expect(result.version).toBe("1.0.0");
		// biome-ignore lint/complexity/useLiteralKeys: ignore
		expect(result["description"]).toBe("Test package");
	});

	test("should handle package.json with additional properties", () => {
		const packageJson = {
			name: "test-package",
			version: "2.0.0",
			author: "Test Author",
			license: "MIT",
			dependencies: {
				"some-package": "^1.0.0",
			},
		};

		writeFileSync(join(testDir, "package.json"), JSON.stringify(packageJson));
		writeFileSync(testScriptPath, "");

		const scriptUrl = `file://${testScriptPath}`;
		const result = loadPackageJson(scriptUrl);

		expect(result.name).toBe("test-package");
		expect(result.version).toBe("2.0.0");
		// biome-ignore lint/complexity/useLiteralKeys: ignore
		expect(result["author"]).toBe("Test Author");
		// biome-ignore lint/complexity/useLiteralKeys: ignore
		expect(result["license"]).toBe("MIT");
	});

	test("should throw error when package.json doesn't exist", () => {
		writeFileSync(testScriptPath, "");
		const scriptUrl = `file://${testScriptPath}`;

		expect(() => loadPackageJson(scriptUrl)).toThrow();
	});

	test("should throw error for invalid JSON in package.json", () => {
		writeFileSync(join(testDir, "package.json"), "{ invalid json }");
		writeFileSync(testScriptPath, "");

		const scriptUrl = `file://${testScriptPath}`;

		expect(() => loadPackageJson(scriptUrl)).toThrow();
	});

	test("should handle package.json with minimal required fields", () => {
		const packageJson = {
			name: "minimal-package",
			version: "0.0.1",
		};

		writeFileSync(join(testDir, "package.json"), JSON.stringify(packageJson));
		writeFileSync(testScriptPath, "");

		const scriptUrl = `file://${testScriptPath}`;
		const result = loadPackageJson(scriptUrl);

		expect(result.name).toBe("minimal-package");
		expect(result.version).toBe("0.0.1");
	});
});
