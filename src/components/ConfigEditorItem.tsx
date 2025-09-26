import { Text } from "ink";
import type { ItemProps } from "ink-select-input";

export const Item = ({ label, isSelected }: ItemProps) => (
	<Text color={isSelected ? "cyan" : undefined}>{label}</Text>
);

export const BooleanItem = ({ label, isSelected }: ItemProps) => (
	<Text color={isSelected ? "cyan" : undefined}>
		{label === "true" ? (
			<Text color="green">true</Text>
		) : (
			<Text color="red">false</Text>
		)}
	</Text>
);
