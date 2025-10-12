import { Box, Text, useApp, useInput } from "ink";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import { useEffect, useMemo, useState } from "react";
import { formatConfigValue } from "../lib/format.js";
import { isDeepEqual } from "../lib/isDeepEqual.js";
import { BooleanItem, Item } from "./ConfigEditorItem.js";

export type ConfigItem<T> =
	| {
			key: keyof T;
			type: "string" | "number" | "boolean" | "array";
			options?: never;
	  }
	| {
			key: keyof T;
			type: "select";
			options?: string[];
			description?: string;
	  };

type ConfigEditorProps<T extends Record<string, unknown>> = {
	toolName: string;
	configItems: ConfigItem<T>[];
	defaultConfig: T;
	loadConfig: () => Promise<T>;
	writeConfig: (config: T) => Promise<void>;
};

type Status =
	| "loading"
	| "selecting"
	| "editing"
	| "confirm_quit"
	| "saving"
	| "done";

export const ConfigEditor = <T extends Record<string, unknown>>({
	toolName,
	configItems,
	defaultConfig,
	loadConfig,
	writeConfig,
}: ConfigEditorProps<T>) => {
	const { exit } = useApp();
	const [config, setConfig] = useState<T | null>(null);
	const [initialConfig, setInitialConfig] = useState<T | null>(null);
	const [status, setStatus] = useState<Status>("loading");
	const [editingItem, setEditingItem] = useState<ConfigItem<T> | null>(null);
	const [inputBuffer, setInputBuffer] = useState("");
	const [inputError, setInputError] = useState<string | null>(null);

	const isDirty = useMemo(
		() =>
			config && initialConfig ? !isDeepEqual(config, initialConfig) : false,
		[config, initialConfig],
	);

	useEffect(() => {
		(async () => {
			const loadedConfig = await loadConfig();
			const fullConfig = { ...defaultConfig, ...loadedConfig };
			setConfig(fullConfig);
			setInitialConfig(JSON.parse(JSON.stringify(fullConfig)) as T);
			setStatus("selecting");
		})();
	}, [loadConfig, defaultConfig]);

	const handleSave = async () => {
		if (config) {
			setStatus("saving");
			await writeConfig(config);
			setStatus("done");
			exit();
		}
	};

	useInput(
		(input) => {
			if (status !== "selecting") {
				return;
			}
			if (input.toLowerCase() === "q") {
				if (isDirty) {
					setStatus("confirm_quit");
				} else {
					exit();
				}
				return;
			}
			if (input.toLowerCase() === "s") {
				handleSave();
			}
		},
		{ isActive: status === "selecting" },
	);

	const items = config
		? configItems.map((item) => ({
				label: `${String(item.key)}: ${formatConfigValue(config[item.key])}`,
				value: item.key,
			}))
		: [];

	const handleSelect = (selected: { value: keyof T }) => {
		const item = configItems.find((i) => i.key === selected.value);
		if (!(config && item)) {
			return;
		}
		setEditingItem(item);
		setStatus("editing");

		const value = config[item.key];
		switch (item.type) {
			case "string":
			case "number":
				setInputBuffer(value !== undefined ? String(value) : "");
				break;
			case "array":
				setInputBuffer(
					Array.isArray(value) && value.length > 0 ? value.join(", ") : "",
				);
				break;
		}
		setInputError(null);
	};

	const cancelEditing = () => {
		setEditingItem(null);
		setInputBuffer("");
		setInputError(null);
		setStatus("selecting");
	};

	const commitEditing = () => {
		if (!(config && editingItem)) {
			return;
		}

		const { key, type } = editingItem;
		let nextValue: unknown;

		switch (type) {
			case "string": {
				const trimmed = inputBuffer.trim();
				nextValue = trimmed.length > 0 ? trimmed : undefined;
				break;
			}
			case "number": {
				const valueText = inputBuffer.trim();
				if (valueText.length === 0) {
					nextValue = undefined;
				} else {
					const parsed = Number.parseInt(valueText, 10);
					if (Number.isNaN(parsed) || parsed < 0) {
						setInputError("Please enter an integer >= 0");
						return;
					}
					nextValue = parsed;
				}
				break;
			}
			case "array":
				nextValue = inputBuffer
					.split(",")
					.map((part) => part.trim())
					.filter((part) => part.length > 0);
				break;
			default:
				cancelEditing();
				return;
		}

		setConfig({ ...config, [key]: nextValue });
		cancelEditing();
	};

	useInput(
		(input, key) => {
			if (status !== "editing" || !editingItem) {
				return;
			}

			if (key.escape) {
				cancelEditing();
				return;
			}
			if (
				editingItem.type === "string" ||
				editingItem.type === "number" ||
				editingItem.type === "array"
			) {
				if (key.return) {
					commitEditing();
					return;
				}
				if (key.backspace || key.delete) {
					setInputBuffer((prev) => prev.slice(0, -1));
					return;
				}
				if (input && !key.ctrl && !key.meta) {
					setInputBuffer((prev) => prev + input);
				}
			}
		},
		{ isActive: status === "editing" },
	);

	const handleBooleanChange = (item: { value: boolean }) => {
		if (config && editingItem) {
			setConfig({ ...config, [editingItem.key]: item.value });
			cancelEditing();
		}
	};

	const handleSelectChange = (item: { value: string }) => {
		if (config && editingItem) {
			setConfig({ ...config, [editingItem.key]: item.value });
			cancelEditing();
		}
	};

	const handleQuitConfirm = (item: { value: "yes" | "no" }) => {
		if (item.value === "yes") {
			exit();
		} else {
			setStatus("selecting");
		}
	};

	const renderEditor = () => {
		if (!editingItem) {
			return null;
		}

		switch (editingItem.type) {
			case "boolean":
				return (
					<Box flexDirection="column">
						<Text>Set value for "{String(editingItem.key)}":</Text>
						<SelectInput
							items={[
								{ label: "true", value: true },
								{ label: "false", value: false },
							]}
							onSelect={handleBooleanChange}
							itemComponent={BooleanItem}
						/>
					</Box>
				);
			case "select":
				return (
					<Box flexDirection="column">
						<Text>Set value for "{String(editingItem.key)}":</Text>
						<SelectInput
							items={editingItem.options?.map((opt) => ({
								label: opt,
								value: opt,
							}))}
							onSelect={handleSelectChange}
							itemComponent={Item}
						/>
					</Box>
				);
			case "string":
			case "number":
			case "array": {
				let prompt = "Enter a string";
				if (editingItem.type === "number") {
					prompt = "Enter a number (>= 0)";
				}
				if (editingItem.type === "array") {
					prompt = "Enter comma-separated values";
				}
				return (
					<Box flexDirection="column">
						<Text>{prompt} (leave empty to unset):</Text>
						<Text color="cyan">{inputBuffer || "<empty>"}</Text>
						<Text color="gray">Enter: save / Esc: cancel</Text>
						{inputError && <Text color="red">{inputError}</Text>}
					</Box>
				);
			}
		}
		return null;
	};

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold>{toolName} Configuration Editor</Text>
			{status === "loading" && (
				<Text>
					<Spinner /> Loading configuration...
				</Text>
			)}
			{status === "selecting" && config && (
				<>
					<Box marginTop={1}>
						<SelectInput
							items={items}
							onSelect={handleSelect}
							itemComponent={Item}
						/>
					</Box>
					<Box marginTop={1}>
						<Text>
							Select an item to edit. 'S' to save, 'Q' to exit.
							{isDirty && <Text color="yellow"> (unsaved)</Text>}
						</Text>
					</Box>
				</>
			)}
			{status === "editing" && renderEditor()}
			{status === "confirm_quit" && (
				<Box flexDirection="column">
					<Text color="yellow">Unsaved changes detected. Exit?</Text>
					<SelectInput
						items={[
							{ label: "No", value: "no" },
							{ label: "Yes", value: "yes" },
						]}
						onSelect={handleQuitConfirm}
					/>
				</Box>
			)}
			{status === "saving" && <Text>💾 Saving configuration...</Text>}
		</Box>
	);
};
