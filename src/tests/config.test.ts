import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	findLocalConfigPath,
	findUp,
	getGlobalConfigPath,
	loadConfig,
	loadLocalConfig,
	readConfigFile,
	resetGlobalConfig,
	writeConfig,
	writeGlobalConfig,
	writeLocalConfig,
} from "../lib/config.js";

describe("config", () => {
	let testDir: string;

	beforeEach(async () => {
		testDir = await fs.mkdtemp(join(tmpdir(), "config-test-"));
	});

	afterEach(async () => {
		await fs.rm(testDir, { recursive: true, force: true });
	});

	describe("findUp", () => {
		test("should find file in current directory", async () => {
			const testFile = "test-config.json";
			await fs.writeFile(join(testDir, testFile), "{}");

			const result = await findUp(testFile, testDir);
			expect(result).toBe(join(testDir, testFile));
		});

		test("should find file in parent directory", async () => {
			const testFile = "test-config.json";
			const subDir = join(testDir, "subdir");
			await fs.mkdir(subDir);
			await fs.writeFile(join(testDir, testFile), "{}");

			const result = await findUp(testFile, subDir);
			expect(result).toBe(join(testDir, testFile));
		});

		test("should return null when file is not found", async () => {
			const subDir = join(process.cwd(), "src", "tests");
			const result = await findUp(
				"nonexistent-file-that-should-not-exist.json",
				subDir,
			);
			expect(result).toBeNull();
		});

		test("should find file in nested parent directories", async () => {
			const testFile = "test-config.json";
			const deepDir = join(testDir, "a", "b", "c");
			await fs.mkdir(deepDir, { recursive: true });
			await fs.writeFile(join(testDir, testFile), "{}");

			const result = await findUp(testFile, deepDir);
			expect(result).toBe(join(testDir, testFile));
		});
	});

	describe("readConfigFile", () => {
		test("should read and parse valid JSON config file", async () => {
			const configPath = join(testDir, "config.json");
			const config = { key: "value", number: 42 };
			await fs.writeFile(configPath, JSON.stringify(config));

			const validate = (c: unknown) => c as { key: string; number: number };
			const result = await readConfigFile(configPath, validate);
			expect(result).toEqual(config);
		});

		test("should return null for non-existent file", async () => {
			const validate = (c: unknown) => c as Record<string, unknown>;
			const result = await readConfigFile(
				join(testDir, "nonexistent.json"),
				validate,
			);
			expect(result).toBeNull();
		});

		test("should throw error for invalid JSON", async () => {
			const configPath = join(testDir, "invalid.json");
			await fs.writeFile(configPath, "{ invalid json }");

			const validate = (c: unknown) => c as Record<string, unknown>;
			await expect(readConfigFile(configPath, validate)).rejects.toThrow();
		});
	});

	describe("writeConfig", () => {
		test("should write config to file", async () => {
			const configPath = join(testDir, "config.json");
			const config = { key: "value", nested: { prop: 123 } };

			await writeConfig(configPath, config);

			const content = await fs.readFile(configPath, "utf-8");
			expect(JSON.parse(content)).toEqual(config);
		});

		test("should create parent directories if they don't exist", async () => {
			const configPath = join(testDir, "nested", "deep", "config.json");
			const config = { key: "value" };

			await writeConfig(configPath, config);

			const content = await fs.readFile(configPath, "utf-8");
			expect(JSON.parse(content)).toEqual(config);
		});

		test("should format JSON with 2-space indentation", async () => {
			const configPath = join(testDir, "config.json");
			const config = { key: "value" };

			await writeConfig(configPath, config);

			const content = await fs.readFile(configPath, "utf-8");
			expect(content).toBe('{\n  "key": "value"\n}');
		});

		test("should throw error when write fails", async () => {
			const invalidPath = "/invalid/path/that/cannot/be/created/config.json";
			const config = { key: "value" };

			expect(writeConfig(invalidPath, config)).rejects.toThrow(
				"Failed to write config file",
			);
		});
	});

	describe("loadConfig", () => {
		test("should return default config when no config files exist", async () => {
			const defaultConfig = { option1: "default", option2: 42 };
			const validate = (c: unknown) => c as typeof defaultConfig;

			const cwdDir = join(process.cwd(), "src", "tests");
			const result = await loadConfig(
				{
					toolName: "test-tool-nonexistent",
					configFile: "config-nonexistent.json",
					localConfigFile: ".testrc-nonexistent",
					defaultConfig,
					validate,
				},
				cwdDir,
			);

			expect(result.config).toEqual(defaultConfig);
			expect(result.sources.option1).toBe("default");
			expect(result.sources.option2).toBe("default");
		});

		test("should merge local config over default", async () => {
			const defaultConfig = { option1: "default", option2: 42 };
			const localConfig = { option1: "local" };
			const validate = (c: unknown) => c as typeof defaultConfig;

			await fs.writeFile(join(testDir, ".testrc"), JSON.stringify(localConfig));

			const result = await loadConfig(
				{
					toolName: "test-tool",
					configFile: "config.json",
					localConfigFile: ".testrc",
					defaultConfig,
					validate,
				},
				testDir,
			);

			expect(result.config.option1).toBe("local");
			expect(result.config.option2).toBe(42);
			expect(result.sources.option1).toBe("local");
			expect(result.sources.option2).toBe("default");
		});

		test("should merge global config over default", async () => {
			const defaultConfig = { option1: "default", option2: 42 };
			const globalConfig = { option1: "global" };
			const validate = (c: unknown) => c as typeof defaultConfig;

			const globalConfigPath = getGlobalConfigPath(
				"test-tool-global",
				"config.json",
			);

			try {
				await writeGlobalConfig(
					globalConfig,
					"test-tool-global",
					"config.json",
				);

				const cwdDir = join(process.cwd(), "src", "tests");
				const result = await loadConfig(
					{
						toolName: "test-tool-global",
						configFile: "config.json",
						localConfigFile: ".testrc-nonexistent",
						defaultConfig,
						validate,
					},
					cwdDir,
				);

				expect(result.config.option1).toBe("global");
				expect(result.config.option2).toBe(42);
				expect(result.sources.option1).toBe("global");
				expect(result.sources.option2).toBe("default");
			} finally {
				fs.rm(globalConfigPath, { force: true });
				const dir = join(globalConfigPath, "..");
				fs.rm(dir, { force: true, recursive: true });
			}
		});
	});

	describe("getGlobalConfigPath", () => {
		test("should return correct global config path", () => {
			const path = getGlobalConfigPath("my-tool", "config.json");
			expect(path).toContain(".config");
			expect(path).toContain("my-tool");
			expect(path).toContain("config.json");
		});
	});

	describe("findLocalConfigPath", () => {
		test("should find local config file", async () => {
			await fs.writeFile(join(testDir, ".testrc"), "{}");
			const result = await findLocalConfigPath(".testrc", testDir);
			expect(result).toBe(join(testDir, ".testrc"));
		});

		test("should return null when local config doesn't exist", async () => {
			const cwdDir = join(process.cwd(), "src", "tests");
			const result = await findLocalConfigPath(".testrc-nonexistent", cwdDir);
			expect(result).toBeNull();
		});
	});

	describe("writeLocalConfig", () => {
		test("should write local config", async () => {
			const configPath = join(testDir, ".testrc");
			const config = { key: "value" };

			await writeLocalConfig(configPath, config);

			const content = await fs.readFile(configPath, "utf-8");
			expect(JSON.parse(content)).toEqual(config);
		});
	});

	describe("loadLocalConfig", () => {
		test("should load existing local config", async () => {
			const config = { key: "value" };
			const configPath = join(testDir, ".testrc");
			await fs.writeFile(configPath, JSON.stringify(config));

			const validate = (c: unknown) => c as typeof config;
			const result = await loadLocalConfig(".testrc", validate, testDir);

			expect(result.exists).toBe(true);
			expect(result.config).toEqual(config);
			expect(result.path).toBe(configPath);
		});

		test("should return null config when file doesn't exist", async () => {
			const validate = (c: unknown) => c as Record<string, unknown>;
			const cwdDir = join(process.cwd(), "src", "tests");
			const result = await loadLocalConfig(
				".testrc-nonexistent",
				validate,
				cwdDir,
			);

			expect(result.exists).toBe(false);
			expect(result.config).toBeNull();
			expect(result.path).toBe(join(cwdDir, ".testrc-nonexistent"));
		});
	});

	describe("writeGlobalConfig", () => {
		test("should write global config", async () => {
			const config = { key: "value" };
			const globalPath = getGlobalConfigPath("test-tool-temp", "config.json");

			try {
				await writeGlobalConfig(config, "test-tool-temp", "config.json");

				const content = await fs.readFile(globalPath, "utf-8");
				expect(JSON.parse(content)).toEqual(config);
			} finally {
				fs.rm(globalPath, { force: true });
				const dir = join(globalPath, "..");
				fs.rm(dir, { force: true, recursive: true });
			}
		});
	});

	describe("resetGlobalConfig", () => {
		test("should reset global config to defaults", async () => {
			const defaultConfig = { key: "default" };
			const globalPath = getGlobalConfigPath("test-tool-reset", "config.json");

			try {
				await writeGlobalConfig(
					{ key: "modified" },
					"test-tool-reset",
					"config.json",
				);
				await resetGlobalConfig(
					defaultConfig,
					"test-tool-reset",
					"config.json",
				);

				const content = await fs.readFile(globalPath, "utf-8");
				expect(JSON.parse(content)).toEqual(defaultConfig);
			} finally {
				fs.rm(globalPath, { force: true });
				const dir = join(globalPath, "..");
				fs.rm(dir, { force: true, recursive: true });
			}
		});
	});
});
