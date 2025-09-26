import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export type Config = Record<string, unknown>;

export const findUp = async (
	name: string,
	startDir: string,
): Promise<string | null> => {
	let dir = resolve(startDir);
	const stopDir = resolve(homedir(), "..");

	while (dir !== stopDir) {
		const filePath = join(dir, name);
		try {
			await fs.access(filePath);
			return filePath;
		} catch {
			dir = dirname(dir);
		}
	}
	return null;
};

export const readConfigFile = async <T extends Config>(
	filePath: string,
	validate: (config: unknown) => T,
): Promise<T | null> => {
	try {
		const content = await fs.readFile(filePath, "utf-8");
		return validate(JSON.parse(content));
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT") {
			return null;
		}
		throw new Error(
			`Error reading or parsing config file at ${filePath}: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}
};

export const writeConfig = async <T extends Config>(
	filePath: string,
	config: T,
): Promise<void> => {
	try {
		await fs.mkdir(dirname(filePath), { recursive: true });
		await fs.writeFile(filePath, JSON.stringify(config, null, 2), "utf-8");
	} catch (error) {
		throw new Error(
			`Failed to write config file: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}
};

export interface ConfigResult<T extends Config> {
	config: T;
	sources: Partial<Record<keyof T, "default" | "global" | "local">>;
}

export const loadConfig = async <T extends Config>(
	options: {
		toolName: string;
		configFile: string;
		localConfigFile: string;
		defaultConfig: T;
		validate: (config: unknown) => T;
	},
	cwd: string = process.cwd(),
): Promise<ConfigResult<T>> => {
	const { toolName, configFile, localConfigFile, defaultConfig, validate } =
		options;
	const globalConfigPath = join(homedir(), ".config", toolName, configFile);

	const globalConfig = await readConfigFile(globalConfigPath, validate);
	const localConfigPath = await findUp(localConfigFile, cwd);
	const localConfig = localConfigPath
		? await readConfigFile(localConfigPath, validate)
		: null;

	const config = {
		...defaultConfig,
		...(globalConfig || {}),
		...(localConfig || {}),
	} as T;

	const sources: ConfigResult<T>["sources"] = {};
	for (const key in config) {
		if (Object.hasOwn(config, key)) {
			const k = key as keyof T;
			if (localConfig && Object.hasOwn(localConfig, k)) {
				sources[k] = "local";
			} else if (globalConfig && Object.hasOwn(globalConfig, k)) {
				sources[k] = "global";
			} else if (Object.hasOwn(defaultConfig, k)) {
				sources[k] = "default";
			}
		}
	}

	return {
		config,
		sources,
	};
};

export const getGlobalConfigPath = (
	toolName: string,
	configFile: string,
): string => {
	return join(homedir(), ".config", toolName, configFile);
};

export const findLocalConfigPath = async (
	localConfigFile: string,
	cwd: string = process.cwd(),
): Promise<string | null> => {
	return findUp(localConfigFile, cwd);
};

export const writeLocalConfig = async <T extends Config>(
	localConfigPath: string,
	config: T,
): Promise<void> => {
	await writeConfig(localConfigPath, config);
};

export const loadLocalConfig = async <T extends Config>(
	localConfigFile: string,
	validate: (config: unknown) => T,
	cwd: string = process.cwd(),
): Promise<{ path: string; config: T | null; exists: boolean }> => {
	const existingPath = await findLocalConfigPath(localConfigFile, cwd);
	if (existingPath) {
		return {
			path: existingPath,
			config: await readConfigFile(existingPath, validate),
			exists: true,
		};
	}
	return {
		path: join(cwd, localConfigFile),
		config: null,
		exists: false,
	};
};

export const writeGlobalConfig = async <T extends Config>(
	config: T,
	toolName: string,
	configFile: string,
): Promise<void> => {
	const globalConfigPath = getGlobalConfigPath(toolName, configFile);
	await writeConfig(globalConfigPath, config);
};

export const resetGlobalConfig = async <T extends Config>(
	defaultConfig: T,
	toolName: string,
	configFile: string,
): Promise<void> => {
	await writeGlobalConfig(defaultConfig, toolName, configFile);
};
