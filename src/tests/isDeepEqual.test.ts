import { describe, expect, test } from "bun:test";
import { isDeepEqual } from "../lib/isDeepEqual.js";

describe("isDeepEqual", () => {
	describe("primitive values", () => {
		test("should return true for identical primitive values", () => {
			expect(isDeepEqual(1, 1)).toBe(true);
			expect(isDeepEqual("hello", "hello")).toBe(true);
			expect(isDeepEqual(true, true)).toBe(true);
			expect(isDeepEqual(null, null)).toBe(true);
			expect(isDeepEqual(undefined, undefined)).toBe(true);
		});

		test("should return false for different primitive values", () => {
			expect(isDeepEqual(1, 2)).toBe(false);
			expect(isDeepEqual("hello", "world")).toBe(false);
			expect(isDeepEqual(true, false)).toBe(false);
			expect(isDeepEqual(null, undefined)).toBe(false);
		});

		test("should handle NaN correctly", () => {
			expect(isDeepEqual(Number.NaN, Number.NaN)).toBe(true);
		});

		test("should handle +0 and -0 correctly", () => {
			expect(isDeepEqual(0, 0)).toBe(true);
			expect(isDeepEqual(+0, +0)).toBe(true);
		});
	});

	describe("arrays", () => {
		test("should return true for identical arrays with strictOrder", () => {
			expect(isDeepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
			expect(isDeepEqual(["a", "b", "c"], ["a", "b", "c"])).toBe(true);
			expect(isDeepEqual([{ a: 1 }, { b: 2 }], [{ a: 1 }, { b: 2 }])).toBe(
				true,
			);
		});

		test("should return false for arrays with different order when strictOrder is true", () => {
			expect(isDeepEqual([1, 2, 3], [3, 2, 1])).toBe(false);
			expect(isDeepEqual(["a", "b", "c"], ["c", "b", "a"])).toBe(false);
		});

		test("should return true for arrays with different order when strictOrder is false", () => {
			expect(isDeepEqual([1, 2, 3], [3, 2, 1], { strictOrder: false })).toBe(
				true,
			);
			expect(
				isDeepEqual(["a", "b", "c"], ["c", "b", "a"], { strictOrder: false }),
			).toBe(true);
		});

		test("should return false when array elements don't match with strictOrder false", () => {
			expect(isDeepEqual([1, 2, 3], [1, 2, 4], { strictOrder: false })).toBe(
				false,
			);
			expect(isDeepEqual([1, 2, 3], [1, 4, 5], { strictOrder: false })).toBe(
				false,
			);
		});

		test("should return false for arrays with different lengths", () => {
			expect(isDeepEqual([1, 2], [1, 2, 3])).toBe(false);
			expect(isDeepEqual([1, 2, 3], [1, 2])).toBe(false);
		});

		test("should return false for arrays with different elements", () => {
			expect(isDeepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
			expect(isDeepEqual(["a", "b"], ["a", "c"])).toBe(false);
		});

		test("should handle nested arrays", () => {
			expect(
				isDeepEqual(
					[
						[1, 2],
						[3, 4],
					],
					[
						[1, 2],
						[3, 4],
					],
				),
			).toBe(true);
			expect(
				isDeepEqual(
					[
						[1, 2],
						[3, 4],
					],
					[
						[1, 2],
						[3, 5],
					],
				),
			).toBe(false);
		});
	});

	describe("objects", () => {
		test("should return true for identical objects", () => {
			expect(isDeepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
			expect(isDeepEqual({ b: 2, a: 1 }, { a: 1, b: 2 })).toBe(true);
		});

		test("should return false for objects with different keys", () => {
			expect(isDeepEqual({ a: 1 }, { b: 1 })).toBe(false);
			expect(isDeepEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
		});

		test("should return false for objects with different values", () => {
			expect(isDeepEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
		});

		test("should handle nested objects", () => {
			expect(isDeepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(
				true,
			);
			expect(isDeepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } })).toBe(
				false,
			);
		});

		test("should handle objects with arrays", () => {
			expect(
				isDeepEqual({ a: [1, 2, 3], b: "test" }, { a: [1, 2, 3], b: "test" }),
			).toBe(true);
		});
	});

	describe("Date objects", () => {
		test("should return true for identical dates", () => {
			const date1 = new Date("2024-01-01");
			const date2 = new Date("2024-01-01");
			expect(isDeepEqual(date1, date2)).toBe(true);
		});

		test("should return false for different dates", () => {
			const date1 = new Date("2024-01-01");
			const date2 = new Date("2024-01-02");
			expect(isDeepEqual(date1, date2)).toBe(false);
		});
	});

	describe("RegExp objects", () => {
		test("should return true for identical regex patterns", () => {
			expect(isDeepEqual(/test/g, /test/g)).toBe(true);
			expect(isDeepEqual(/hello/i, /hello/i)).toBe(true);
		});

		test("should return false for different regex patterns", () => {
			expect(isDeepEqual(/test/g, /test/i)).toBe(false);
			expect(isDeepEqual(/hello/, /world/)).toBe(false);
		});
	});

	describe("Set objects", () => {
		test("should return true for identical sets", () => {
			expect(isDeepEqual(new Set([1, 2, 3]), new Set([1, 2, 3]))).toBe(true);
			expect(isDeepEqual(new Set([1, 2, 3]), new Set([3, 2, 1]))).toBe(true);
		});

		test("should return false for different sets", () => {
			expect(isDeepEqual(new Set([1, 2, 3]), new Set([1, 2, 4]))).toBe(false);
			expect(isDeepEqual(new Set([1, 2]), new Set([1, 2, 3]))).toBe(false);
		});

		test("should handle sets with objects", () => {
			expect(
				isDeepEqual(
					new Set([{ a: 1 }, { b: 2 }]),
					new Set([{ a: 1 }, { b: 2 }]),
				),
			).toBe(true);
		});
	});

	describe("Map objects", () => {
		test("should return true for identical maps", () => {
			expect(
				isDeepEqual(
					new Map([
						["a", 1],
						["b", 2],
					]),
					new Map([
						["a", 1],
						["b", 2],
					]),
				),
			).toBe(true);
			expect(
				isDeepEqual(
					new Map([
						["a", 1],
						["b", 2],
					]),
					new Map([
						["b", 2],
						["a", 1],
					]),
				),
			).toBe(true);
		});

		test("should return false for different maps", () => {
			expect(
				isDeepEqual(
					new Map([
						["a", 1],
						["b", 2],
					]),
					new Map([
						["a", 1],
						["b", 3],
					]),
				),
			).toBe(false);
			expect(
				isDeepEqual(
					new Map([["a", 1]]),
					new Map([
						["a", 1],
						["b", 2],
					]),
				),
			).toBe(false);
		});
	});

	describe("TypedArray", () => {
		test("should return true for identical typed arrays", () => {
			expect(
				isDeepEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3])),
			).toBe(true);
			expect(
				isDeepEqual(new Int16Array([10, 20, 30]), new Int16Array([10, 20, 30])),
			).toBe(true);
		});

		test("should return false for different typed arrays", () => {
			expect(
				isDeepEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4])),
			).toBe(false);
		});

		test("should return false for typed arrays with different types", () => {
			expect(
				isDeepEqual(new Uint8Array([1, 2, 3]), new Int8Array([1, 2, 3])),
			).toBe(false);
		});

		test("should return false for typed arrays with different lengths", () => {
			expect(
				isDeepEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2])),
			).toBe(false);
			expect(
				isDeepEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3])),
			).toBe(false);
		});
	});

	describe("circular references", () => {
		test("should handle circular references", () => {
			const obj1: { a: number; self?: unknown } = { a: 1 };
			obj1.self = obj1;

			const obj2: { a: number; self?: unknown } = { a: 1 };
			obj2.self = obj2;

			expect(isDeepEqual(obj1, obj2)).toBe(true);
		});
	});

	describe("mixed types", () => {
		test("should return false for different types", () => {
			expect(isDeepEqual(1, "1")).toBe(false);
			expect(isDeepEqual([1], { 0: 1 })).toBe(false);
			expect(isDeepEqual(null, {})).toBe(false);
			expect(isDeepEqual(undefined, null)).toBe(false);
		});

		test("should handle complex nested structures", () => {
			const obj1 = {
				a: [1, 2, { b: 3 }],
				c: new Set([4, 5]),
				d: new Map([["e", 6]]),
				f: new Date("2024-01-01"),
			};
			const obj2 = {
				a: [1, 2, { b: 3 }],
				c: new Set([4, 5]),
				d: new Map([["e", 6]]),
				f: new Date("2024-01-01"),
			};
			expect(isDeepEqual(obj1, obj2)).toBe(true);
		});
	});
});
