import { describe, expect, test } from "bun:test";
import { Text } from "ink";
import { render } from "ink-testing-library";
import { useSearchFilter } from "../hooks/useSearchFilter.js";

type Entry = { name: string; subject: string | null; count: number };

const entries: Entry[] = [
	{ name: "feature/login", subject: "Add login form", count: 1 },
	{ name: "feature/logout", subject: null, count: 2 },
	{ name: "bugfix/crash", subject: "Fix login crash", count: 3 },
];

const fields: (keyof Entry)[] = ["name", "subject", "count"];

const Harness = ({ term }: { term: string }) => {
	const result = useSearchFilter(entries, term, fields);
	return <Text>{result.map((entry) => entry.name).join(",")}</Text>;
};

const renderNames = (term: string): string => {
	const { lastFrame, unmount } = render(<Harness term={term} />);
	const frame = lastFrame() ?? "";
	unmount();
	return frame;
};

describe("useSearchFilter", () => {
	test("returns all items for an empty or whitespace-only term", () => {
		const all = "feature/login,feature/logout,bugfix/crash";
		expect(renderNames("")).toBe(all);
		expect(renderNames("   ")).toBe(all);
	});

	test("matches case-insensitively across string fields", () => {
		expect(renderNames("LOGIN")).toBe("feature/login,bugfix/crash");
	});

	test("requires every whitespace-separated term to match", () => {
		expect(renderNames("feature log")).toBe("feature/login,feature/logout");
		expect(renderNames("login crash")).toBe("bugfix/crash");
	});

	test("ignores non-string field values", () => {
		expect(renderNames("3")).toBe("");
	});

	test("returns nothing when no item matches", () => {
		expect(renderNames("release")).toBe("");
	});
});
