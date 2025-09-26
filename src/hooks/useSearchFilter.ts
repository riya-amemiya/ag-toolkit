import { useMemo } from "react";

export const useSearchFilter = <
	T extends Record<string, string | number | boolean | null | undefined>,
>(
	items: T[],
	searchTerm: string,
	searchableFields: (keyof T)[],
): T[] => {
	return useMemo(() => {
		if (!searchTerm.trim()) {
			return items;
		}
		const terms = searchTerm
			.toLowerCase()
			.split(/\s+/)
			.filter((term) => term.length > 0);
		if (terms.length === 0) {
			return items;
		}
		return items.filter((item) =>
			terms.every((term) =>
				searchableFields.some((field) => {
					const value = item[field];
					if (typeof value === "string") {
						return value.toLowerCase().includes(term);
					}
					return false;
				}),
			),
		);
	}, [items, searchTerm, searchableFields]);
};
