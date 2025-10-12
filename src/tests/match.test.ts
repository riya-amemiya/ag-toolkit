import { describe, expect, test } from "bun:test";
import { matchPattern } from "../lib/match.js";

describe("matchPattern", () => {
	describe("exact string matching", () => {
		test("should match identical strings", () => {
			expect(matchPattern("hello", "hello")).toBe(true);
			expect(matchPattern("test123", "test123")).toBe(true);
		});

		test("should not match different strings", () => {
			expect(matchPattern("hello", "world")).toBe(false);
			expect(matchPattern("test", "test123")).toBe(false);
		});

		test("should be case-sensitive for exact matches", () => {
			expect(matchPattern("Hello", "hello")).toBe(false);
			expect(matchPattern("TEST", "test")).toBe(false);
		});

		test("should handle empty strings", () => {
			expect(matchPattern("", "")).toBe(true);
			expect(matchPattern("test", "")).toBe(false);
			expect(matchPattern("", "test")).toBe(false);
		});
	});

	describe("regex pattern matching", () => {
		test("should match regex patterns with delimiters", () => {
			expect(matchPattern("hello", "/hello/")).toBe(true);
			expect(matchPattern("test123", "/test\\d+/")).toBe(true);
			expect(matchPattern("abc", "/[a-z]+/")).toBe(true);
		});

		test("should not match when regex pattern doesn't match", () => {
			expect(matchPattern("hello", "/world/")).toBe(false);
			expect(matchPattern("abc", "/\\d+/")).toBe(false);
		});

		test("should support regex flags", () => {
			expect(matchPattern("Hello", "/hello/i")).toBe(true);
			expect(matchPattern("TEST", "/test/i")).toBe(true);
			expect(matchPattern("Hello", "/hello/")).toBe(false);
		});

		test("should support global flag", () => {
			expect(matchPattern("test test", "/test/g")).toBe(true);
		});

		test("should support multiline flag", () => {
			expect(matchPattern("line1\nline2", "/^line2/m")).toBe(true);
		});

		test("should handle complex regex patterns", () => {
			expect(
				matchPattern("email@example.com", "/^[\\w.-]+@[\\w.-]+\\.\\w+$/"),
			).toBe(true);
			expect(matchPattern("2024-01-01", "/^\\d{4}-\\d{2}-\\d{2}$/")).toBe(true);
			expect(matchPattern("invalid-date", "/^\\d{4}-\\d{2}-\\d{2}$/")).toBe(
				false,
			);
		});

		test("should handle patterns with special characters", () => {
			expect(matchPattern("(test)", "/\\(test\\)/")).toBe(true);
			expect(matchPattern("[abc]", "/\\[abc\\]/")).toBe(true);
			expect(matchPattern("a.b", "/a\\.b/")).toBe(true);
		});

		test("should return false for invalid regex patterns", () => {
			expect(matchPattern("test", "/(/")).toBe(false);
			expect(matchPattern("test", "/[/")).toBe(false);
			expect(matchPattern("test", "/*/")).toBe(false);
		});

		test("should handle patterns with multiple slashes", () => {
			expect(matchPattern("path/to/file", "/path\\/to\\/file/")).toBe(true);
		});
	});

	describe("edge cases", () => {
		test("should treat patterns without proper delimiters as exact strings", () => {
			expect(matchPattern("/test", "/test")).toBe(true);
			expect(matchPattern("test/", "test/")).toBe(true);
		});

		test("should handle patterns that look like regex but aren't properly formatted", () => {
			expect(matchPattern("/test", "/test")).toBe(true);
			expect(matchPattern("test/", "test/")).toBe(true);
		});

		test("should handle empty regex pattern", () => {
			expect(matchPattern("test", "//")).toBe(true);
			expect(matchPattern("", "//")).toBe(true);
		});

		test("should handle patterns with only opening slash", () => {
			expect(matchPattern("/hello", "/hello")).toBe(true);
			expect(matchPattern("hello", "/hello")).toBe(false);
		});

		test("should handle anchored patterns", () => {
			expect(matchPattern("hello world", "/^hello/")).toBe(true);
			expect(matchPattern("hello world", "/world$/")).toBe(true);
			expect(matchPattern("hello world", "/^world/")).toBe(false);
		});
	});
});
