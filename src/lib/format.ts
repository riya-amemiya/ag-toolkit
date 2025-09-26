export const formatDate = (date: Date | null) => {
	if (!date) {
		return "--";
	}
	return date.toISOString().split("T")[0] ?? "--";
};

export const formatConfigValue = (value: unknown): string => {
	if (Array.isArray(value)) {
		return value.length > 0 ? value.join(", ") : "(not set)";
	}
	if (value === undefined || value === null || value === "") {
		return "(not set)";
	}
	return String(value);
};
