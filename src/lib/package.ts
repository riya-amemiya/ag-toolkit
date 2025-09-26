import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

interface PackageJson {
	name: string;
	version: string;
	[key: string]: unknown;
}

export const loadPackageJson = (importMetaUrl: string): PackageJson => {
	const filename = fileURLToPath(importMetaUrl);
	const scriptDir = dirname(filename);
	const packageJsonPath = join(scriptDir, "..", "package.json");
	const packageJsonContent = readFileSync(packageJsonPath, "utf-8");
	return JSON.parse(packageJsonContent) as PackageJson;
};
