import { describe, expect, test } from "bun:test";
import { formatConfigValue, formatDate } from "../lib/format.js";

describe("formatDate", () => {
	test("should format valid date to ISO date string", () => {
		const date = new Date("2024-01-15T10:30:00Z");
		expect(formatDate(date)).toBe("2024-01-15");
	});

	test("should handle different dates", () => {
		expect(formatDate(new Date("2023-12-31T00:00:00Z"))).toBe("2023-12-31");
		expect(formatDate(new Date("2024-06-15T23:59:59Z"))).toBe("2024-06-15");
	});

	test("should return '--' for null", () => {
		expect(formatDate(null)).toBe("--");
	});

	test("should handle dates at year boundaries", () => {
		expect(formatDate(new Date("2024-01-01T00:00:00Z"))).toBe("2024-01-01");
		expect(formatDate(new Date("2024-12-31T23:59:59Z"))).toBe("2024-12-31");
	});

	test("should handle dates with different times on same day", () => {
		expect(formatDate(new Date("2024-03-15T00:00:00Z"))).toBe("2024-03-15");
		expect(formatDate(new Date("2024-03-15T12:00:00Z"))).toBe("2024-03-15");
		expect(formatDate(new Date("2024-03-15T23:59:59Z"))).toBe("2024-03-15");
	});
});

describe("formatConfigValue", () => {
	describe("arrays", () => {
		test("should join array elements with comma and space", () => {
			expect(formatConfigValue(["item1", "item2", "item3"])).toBe(
				"item1, item2, item3",
			);
			expect(formatConfigValue([1, 2, 3])).toBe("1, 2, 3");
		});

		test("should return '(not set)' for empty arrays", () => {
			expect(formatConfigValue([])).toBe("(not set)");
		});

		test("should handle arrays with single element", () => {
			expect(formatConfigValue(["single"])).toBe("single");
		});

		test("should handle arrays with mixed types", () => {
			expect(formatConfigValue([1, "two", true])).toBe("1, two, true");
		});
	});

	describe("null, undefined, and empty string", () => {
		test("should return '(not set)' for undefined", () => {
			expect(formatConfigValue(undefined)).toBe("(not set)");
		});

		test("should return '(not set)' for null", () => {
			expect(formatConfigValue(null)).toBe("(not set)");
		});

		test("should return '(not set)' for empty string", () => {
			expect(formatConfigValue("")).toBe("(not set)");
		});
	});

	describe("other values", () => {
		test("should convert strings to string", () => {
			expect(formatConfigValue("test")).toBe("test");
			expect(formatConfigValue("hello world")).toBe("hello world");
		});

		test("should convert numbers to string", () => {
			expect(formatConfigValue(42)).toBe("42");
			expect(formatConfigValue(0)).toBe("0");
			expect(formatConfigValue(-10)).toBe("-10");
			expect(formatConfigValue(3.14)).toBe("3.14");
		});

		test("should convert booleans to string", () => {
			expect(formatConfigValue(true)).toBe("true");
			expect(formatConfigValue(false)).toBe("false");
		});

		test("should convert objects to string", () => {
			expect(formatConfigValue({ a: 1, b: 2 })).toBe("[object Object]");
		});

		test("should handle special numeric values", () => {
			expect(formatConfigValue(Number.NaN)).toBe("NaN");
			expect(formatConfigValue(Number.POSITIVE_INFINITY)).toBe("Infinity");
			expect(formatConfigValue(Number.NEGATIVE_INFINITY)).toBe("-Infinity");
		});
	});
});
