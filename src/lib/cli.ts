import chalk from "chalk";
import { render } from "ink";
import { type ComponentType, createElement } from "react";
import type { Config, ConfigResult } from "./config.js";

export const handleVersionAndHelp = (
	version: string | null | undefined,
	help: string | null | undefined,
	packageName: string,
	packageVersion: string,
) => {
	if (help) {
		console.log(help);
		process.exit(0);
	}
	if (version) {
		console.log(`${packageName} version: ${packageVersion}`);
		process.exit(0);
	}
};

type ConfigCommands<T extends Config> = {
	getConfig: () => Promise<ConfigResult<T>>;
	getGlobalConfigPath: () => string;
	resetGlobalConfig: () => Promise<void>;
	ConfigEditorComponent: ComponentType;
};

export const handleConfigCommand = async <T extends Config>(
	command: string,
	commands: ConfigCommands<T>,
) => {
	const {
		getConfig,
		getGlobalConfigPath,
		resetGlobalConfig,
		ConfigEditorComponent,
	} = commands;

	switch (command) {
		case "show": {
			const { config, sources } = await getConfig();
			console.log("Current configuration:");
			const sourceColors = {
				default: chalk.gray,
				global: chalk.blue,
				local: chalk.green,
			};
			for (const key in config) {
				const k = key as keyof T;
				const source = sources[k] || "default";
				const color = sourceColors[source] ?? chalk.white;
				console.log(
					`  ${chalk.cyan(k as string)}: ${chalk.yellow(
						String(config[k]),
					)} ${color(`(${source})`)}`,
				);
			}
			break;
		}
		case "edit": {
			// biome-ignore lint/complexity/useLiteralKeys: ProcessEnv requires bracket access
			const editor = process.env["EDITOR"] || "vim";
			const { spawn } = await import("node:child_process");
			const child = spawn(editor, [getGlobalConfigPath()], {
				stdio: "inherit",
				env: process.env,
			});
			child.on("exit", (code) => {
				process.exit(code ?? 0);
			});
			return;
		}
		case "reset": {
			await resetGlobalConfig();
			console.log(`Configuration reset to default: ${getGlobalConfigPath()}`);
			break;
		}
		case "set": {
			render(createElement(ConfigEditorComponent));
			return;
		}
		default:
			console.error(`Unknown config command: ${command}`);
			console.log("Available commands: show, edit, reset, set");
			process.exit(1);
	}
};
