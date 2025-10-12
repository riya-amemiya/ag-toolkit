import { describe, expect, test } from "bun:test";
import { sanitizeString } from "../lib/sanitizeString.js";

describe("sanitizeString", () => {
	test("should return unchanged string for printable ASCII characters", () => {
		expect(sanitizeString("Hello World")).toBe("Hello World");
		expect(sanitizeString("ABC123")).toBe("ABC123");
		expect(sanitizeString("!@#$%^&*()")).toBe("!@#$%^&*()");
	});

	test("should preserve newlines", () => {
		expect(sanitizeString("line1\nline2")).toBe("line1\nline2");
		expect(sanitizeString("first\nsecond\nthird")).toBe("first\nsecond\nthird");
	});

	test("should preserve carriage returns", () => {
		expect(sanitizeString("line1\rline2")).toBe("line1\rline2");
	});

	test("should preserve tabs", () => {
		expect(sanitizeString("column1\tcolumn2")).toBe("column1\tcolumn2");
		expect(sanitizeString("\tindented")).toBe("\tindented");
	});

	test("should remove non-printable characters", () => {
		expect(sanitizeString("test\x00string")).toBe("teststring");
		expect(sanitizeString("hello\x01world")).toBe("helloworld");
		expect(sanitizeString("test\x1Bstring")).toBe("teststring");
	});

	test("should remove ANSI escape codes", () => {
		expect(sanitizeString("\x1b[31mRed Text\x1b[0m")).toBe("[31mRed Text[0m");
		expect(sanitizeString("\x1b[1;32mGreen\x1b[0m")).toBe("[1;32mGreen[0m");
	});

	test("should handle empty strings", () => {
		expect(sanitizeString("")).toBe("");
	});

	test("should handle strings with only non-printable characters", () => {
		expect(sanitizeString("\x00\x01\x02")).toBe("");
	});

	test("should handle mixed printable and non-printable characters", () => {
		expect(sanitizeString("Hello\x00World\x01!")).toBe("HelloWorld!");
	});

	test("should preserve spaces", () => {
		expect(sanitizeString("  spaces  ")).toBe("  spaces  ");
	});

	test("should handle unicode characters outside printable ASCII", () => {
		expect(sanitizeString("Hello 世界")).toBe("Hello ");
		expect(sanitizeString("Emoji 😀 test")).toBe("Emoji  test");
	});

	test("should handle strings with newlines, tabs, and carriage returns mixed", () => {
		expect(sanitizeString("line1\nline2\tcolumn\rend")).toBe(
			"line1\nline2\tcolumn\rend",
		);
	});
});
