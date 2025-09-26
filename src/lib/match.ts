export const matchPattern = (text: string, pattern: string): boolean => {
	if (pattern.startsWith("/") && pattern.lastIndexOf("/") > 0) {
		try {
			const regex = new RegExp(
				pattern.slice(1, pattern.lastIndexOf("/")),
				pattern.slice(pattern.lastIndexOf("/") + 1),
			);
			return regex.test(text);
		} catch {
			return false;
		}
	}
	return text === pattern;
};
