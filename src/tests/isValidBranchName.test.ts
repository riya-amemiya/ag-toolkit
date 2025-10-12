import { describe, expect, test } from "bun:test";
import { isValidBranchName } from "../lib/isValidBranchName.js";

describe("isValidBranchName", () => {
	describe("valid branch names", () => {
		test("should return true for simple branch names", () => {
			expect(isValidBranchName("main")).toBe(true);
			expect(isValidBranchName("develop")).toBe(true);
			expect(isValidBranchName("feature")).toBe(true);
		});

		test("should return true for branch names with hyphens", () => {
			expect(isValidBranchName("feature-branch")).toBe(true);
			expect(isValidBranchName("bug-fix")).toBe(true);
		});

		test("should return true for branch names with underscores", () => {
			expect(isValidBranchName("feature_branch")).toBe(true);
			expect(isValidBranchName("bug_fix")).toBe(true);
		});

		test("should return true for branch names with dots", () => {
			expect(isValidBranchName("release.1.0")).toBe(true);
			expect(isValidBranchName("v1.2.3")).toBe(true);
		});

		test("should return true for branch names with slashes", () => {
			expect(isValidBranchName("feature/new-feature")).toBe(true);
			expect(isValidBranchName("bugfix/issue-123")).toBe(true);
			expect(isValidBranchName("release/v1.0.0")).toBe(true);
		});

		test("should return true for branch names with numbers", () => {
			expect(isValidBranchName("feature123")).toBe(true);
			expect(isValidBranchName("v1.2.3")).toBe(true);
		});

		test("should return true for mixed valid characters", () => {
			expect(isValidBranchName("feature/ABC-123_test.v1")).toBe(true);
			expect(isValidBranchName("release/2024.01.01")).toBe(true);
		});
	});

	describe("invalid branch names", () => {
		test("should return false for empty strings", () => {
			expect(isValidBranchName("")).toBe(false);
		});

		test("should return false for branch names with invalid characters", () => {
			expect(isValidBranchName("feature@branch")).toBe(false);
			expect(isValidBranchName("bug#fix")).toBe(false);
			expect(isValidBranchName("test branch")).toBe(false);
			expect(isValidBranchName("feature:branch")).toBe(false);
		});

		test("should return false for branch names with double dots", () => {
			expect(isValidBranchName("feature..branch")).toBe(false);
			expect(isValidBranchName("test..test")).toBe(false);
		});

		test("should return false for branch names starting with slash", () => {
			expect(isValidBranchName("/feature")).toBe(false);
			expect(isValidBranchName("/main")).toBe(false);
		});

		test("should return false for branch names ending with slash", () => {
			expect(isValidBranchName("feature/")).toBe(false);
			expect(isValidBranchName("main/")).toBe(false);
		});

		test("should return false for branch names with double slashes", () => {
			expect(isValidBranchName("feature//branch")).toBe(false);
			expect(isValidBranchName("test//test")).toBe(false);
		});

		test("should return false for branch names ending with dot", () => {
			expect(isValidBranchName("feature.")).toBe(false);
			expect(isValidBranchName("branch.")).toBe(false);
		});

		test("should return false for components starting with dot", () => {
			expect(isValidBranchName("feature/.hidden")).toBe(false);
			expect(isValidBranchName(".hidden/branch")).toBe(false);
		});

		test("should return false for components ending with .lock", () => {
			expect(isValidBranchName("feature/branch.lock")).toBe(false);
			expect(isValidBranchName("test.lock")).toBe(false);
		});
	});

	describe("edge cases", () => {
		test("should handle single character branch names", () => {
			expect(isValidBranchName("a")).toBe(true);
			expect(isValidBranchName("1")).toBe(true);
		});

		test("should handle very long branch names", () => {
			const longName = "a".repeat(255);
			expect(isValidBranchName(longName)).toBe(true);
		});

		test("should handle branch names with multiple slashes", () => {
			expect(isValidBranchName("feature/sub/branch")).toBe(true);
			expect(isValidBranchName("a/b/c/d/e")).toBe(true);
		});
	});
});
