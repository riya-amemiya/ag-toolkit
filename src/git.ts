import { type SimpleGit, type SimpleGitOptions, simpleGit } from "simple-git";
import { isValidBranchName } from "./lib/isValidBranchName.js";

export type BranchType = "local" | "remote";

export interface BranchInfo {
	ref: string;
	name: string;
	type: BranchType;
	remote?: string;
	lastCommitDate: Date | null;
	lastCommitSha: string | null;
	lastCommitSubject: string | null;
	isMerged: boolean;
	ahead: number;
	behind: number;
}

const BRANCH_LIST_FORMAT =
	"%(refname)%00%(committerdate:iso8601)%00%(objectname)%00%(contents:subject)";

export class GitOperations {
	private git: SimpleGit;

	constructor(workingDir?: string) {
		const options: SimpleGitOptions = {
			baseDir: workingDir || process.cwd(),
			binary: "git",
			maxConcurrentProcesses: 10,
			config: [],
			trimmed: false,
		};
		this.git = simpleGit(options);
	}

	async getCurrentBranch(): Promise<string> {
		const status = await this.git.status();
		return status.current || "HEAD";
	}

	async isWorkdirClean(): Promise<boolean> {
		const status = await this.git.status();
		return status.isClean();
	}

	async fetchAll(): Promise<void> {
		await this.git.fetch(["--all"]);
	}

	async getBranchInfos(
		options: { includeRemote?: boolean } = {},
	): Promise<BranchInfo[]> {
		const includeRemote = options.includeRemote === true;

		const [localMerged, remoteMerged, baseBranch] = await Promise.all([
			this.getMergedSet("local"),
			includeRemote
				? this.getMergedSet("remote")
				: Promise.resolve(new Set<string>()),
			this.getBaseBranch(),
		]);

		const localBranches = await this.listBranches("refs/heads/", "local");
		const remoteBranches = includeRemote
			? await this.listBranches("refs/remotes/", "remote")
			: [];

		const allBranches: Array<
			Omit<BranchInfo, "isMerged" | "ahead" | "behind">
		> = [...localBranches, ...remoteBranches];

		const withCommitCounts = await Promise.all(
			allBranches.map(async (branch) => {
				const { ahead, behind } = baseBranch
					? await this.getAheadBehind(branch.ref, baseBranch)
					: { ahead: 0, behind: 0 };
				const isMerged =
					branch.type === "local"
						? localMerged.has(branch.ref)
						: remoteMerged.has(branch.ref);
				return { ...branch, isMerged, ahead, behind };
			}),
		);

		return withCommitCounts.sort((a, b) => {
			if (a.type !== b.type) {
				return a.type === "local" ? -1 : 1;
			}
			const dateA = a.lastCommitDate?.getTime() ?? 0;
			const dateB = b.lastCommitDate?.getTime() ?? 0;
			return dateB - dateA;
		});
	}

	async deleteLocalBranch(
		branch: string,
		options: { force?: boolean } = {},
	): Promise<void> {
		if (!isValidBranchName(branch)) {
			throw new Error(`Invalid branch name: ${branch}`);
		}
		const args = ["branch", options.force ? "-D" : "-d", branch];
		await this.git.raw(args);
	}

	async deleteRemoteBranch(branch: {
		remote: string;
		name: string;
	}): Promise<void> {
		const { remote, name } = branch;
		if (!isValidBranchName(name)) {
			throw new Error(`Invalid branch name: ${name}`);
		}
		await this.git.push([remote, "--delete", name]);
	}

	async detectDefaultBranch(remote: string = "origin"): Promise<string | null> {
		try {
			const remoteInfo = await this.git.raw(["remote", "show", remote]);
			const match = remoteInfo.match(/HEAD branch:\s*(.+)/);
			if (match?.[1]) {
				return match[1].trim();
			}
		} catch (error) {
			if (error instanceof Error && error.message.includes("No such remote")) {
				throw error;
			}
		}

		try {
			await this.git.raw(["remote", "set-head", remote, "--auto"]);
			const symbolicRef = await this.git.raw([
				"symbolic-ref",
				`refs/remotes/${remote}/HEAD`,
			]);
			const ref = symbolicRef.trim();
			if (!ref) {
				return null;
			}
			const parts = ref.split("/");
			const branchName = parts.at(-1);
			return branchName ?? null;
		} catch (error) {
			if (error instanceof Error && error.message.includes("No such remote")) {
				throw error;
			}
			return null;
		}
	}

	private async getBaseBranch(): Promise<string | null> {
		const { all: remoteBranches } = await this.git.branch(["-r"]);
		const defaultRemoteBranches = [
			"origin/main",
			"origin/master",
			"origin/develop",
		];
		for (const branch of defaultRemoteBranches) {
			if (remoteBranches.includes(branch.trim())) {
				return branch.trim();
			}
		}

		const { all: localBranches } = await this.git.branchLocal();
		const defaultLocalBranches = ["main", "master", "develop"];
		for (const branch of defaultLocalBranches) {
			if (localBranches.includes(branch)) {
				return branch;
			}
		}

		return null;
	}

	private async getAheadBehind(
		branch: string,
		base: string,
	): Promise<{ ahead: number; behind: number }> {
		if (branch === base) {
			return { ahead: 0, behind: 0 };
		}
		try {
			// `git rev-list --left-right --count base...branch` returns "behind ahead"
			const result = await this.git.raw([
				"rev-list",
				"--left-right",
				"--count",
				`${base}...${branch}`,
			]);
			const [behind, ahead] = result.trim().split("\t").map(Number);
			return { ahead: ahead ?? 0, behind: behind ?? 0 };
		} catch {
			return { ahead: 0, behind: 0 };
		}
	}

	private async getMergedSet(type: BranchType): Promise<Set<string>> {
		const args =
			type === "local" ? ["branch", "--merged"] : ["branch", "-r", "--merged"];
		const output = await this.git.raw(args);
		const lines = output
			.split("\n")
			.map((line) => line.replace(/\*/g, "").trim());
		const filtered = lines
			.filter(Boolean)
			.filter((name) => !name.includes(" -> "))
			.map((name) => (type === "remote" ? name : name));
		return new Set(filtered);
	}

	private async listBranches(
		refPrefix: string,
		type: BranchType,
	): Promise<Array<Omit<BranchInfo, "isMerged" | "ahead" | "behind">>> {
		const output = await this.git.raw([
			"for-each-ref",
			`--format=${BRANCH_LIST_FORMAT.replace("%(refname:short)", "%(refname)")}`,
			refPrefix,
		]);

		return output
			.split("\n")
			.map((line) => line.trim())
			.filter(Boolean)
			.map((line) => this.parseBranchLine(line, type))
			.filter(
				(branch): branch is Omit<BranchInfo, "isMerged" | "ahead" | "behind"> =>
					branch !== null,
			);
	}

	private parseBranchLine(
		line: string,
		type: BranchType,
	): Omit<BranchInfo, "isMerged" | "ahead" | "behind"> | null {
		const [ref, dateStr, sha, subject] = line.split("\u0000");

		const shortRef =
			ref?.replace(/^refs\/heads\//, "").replace(/^refs\/remotes\//, "") ?? "";

		if (!shortRef || shortRef.endsWith("/HEAD")) {
			return null;
		}

		let lastCommitDate: Date | null = null;
		if (dateStr) {
			const parsed = new Date(dateStr);
			if (!Number.isNaN(parsed.getTime())) {
				lastCommitDate = parsed;
			}
		}

		const trimmedSubject = subject?.trim() ?? null;
		const lastCommitSubject = trimmedSubject?.length ? trimmedSubject : null;
		const lastCommitSha = sha?.trim()?.length ? sha.trim() : null;

		if (type === "remote") {
			const [remote, ...nameParts] = shortRef.split("/");
			const name = nameParts.join("/");
			if (!(remote && name) || name === "HEAD") {
				return null;
			}
			return {
				ref: shortRef,
				name,
				type,
				remote,
				lastCommitDate,
				lastCommitSha,
				lastCommitSubject,
			};
		}

		return {
			ref: shortRef,
			name: shortRef,
			type,
			lastCommitDate,
			lastCommitSha,
			lastCommitSubject,
		};
	}

	async getAllBranches(): Promise<string[]> {
		const branches = await this.git.branch(["-r"]);
		return branches.all
			.filter(
				(branch) =>
					typeof branch === "string" &&
					branch.startsWith("origin/") &&
					!branch.includes("HEAD"),
			)
			.map((branch) => (branch as string).replace("origin/", ""));
	}

	async getLocalBranches(): Promise<string[]> {
		const branches = await this.git.branch(["-l"]);
		return branches.all
			.filter(
				(branch) => typeof branch === "string" && !branch.includes("HEAD"),
			)
			.map((branch) => (branch as string).replace("* ", ""));
	}

	async branchExists(branch: string): Promise<boolean> {
		if (!isValidBranchName(branch)) {
			throw new Error(`Invalid branch name: ${branch}`);
		}
		try {
			await this.git.raw([
				"show-ref",
				"--verify",
				"--quiet",
				`refs/remotes/origin/${branch}`,
			]);
			return true;
		} catch {
			try {
				await this.git.raw([
					"show-ref",
					"--verify",
					"--quiet",
					`refs/heads/${branch}`,
				]);
				return true;
			} catch {
				return false;
			}
		}
	}

	private async resolveBranchRef(branch: string): Promise<string> {
		try {
			await this.git.raw([
				"show-ref",
				"--verify",
				"--quiet",
				`refs/remotes/origin/${branch}`,
			]);
			return `origin/${branch}`;
		} catch {
			return branch;
		}
	}

	async setupCherryPick(targetBranch: string): Promise<string> {
		if (!isValidBranchName(targetBranch)) {
			throw new Error(`Invalid branch name: ${targetBranch}`);
		}
		const tempBranchName = `temp-rebase-${process.pid}`;
		const checkoutTarget = await this.resolveBranchRef(targetBranch);
		await this.git.checkout(["-b", tempBranchName, checkoutTarget]);
		return tempBranchName;
	}

	async getMergeBase(branch1: string, branch2: string): Promise<string> {
		if (!isValidBranchName(branch1)) {
			throw new Error(`Invalid branch name: ${branch1}`);
		}
		if (!isValidBranchName(branch2)) {
			throw new Error(`Invalid branch name: ${branch2}`);
		}
		const baseBranch = await this.resolveBranchRef(branch1);
		const result = await this.git.raw(["merge-base", baseBranch, branch2]);
		return result.trim();
	}

	async getCommitsToCherryPick(from: string, to: string): Promise<string[]> {
		const result = await this.git.raw([
			"rev-list",
			"--reverse",
			"--no-merges",
			`${from}..${to}`,
		]);
		return result.trim().split("\n").filter(Boolean);
	}

	async cherryPick(
		commitSha: string,
		options?: { allowEmpty?: boolean },
	): Promise<void> {
		const args = ["cherry-pick"];
		if (options?.allowEmpty) {
			args.push("--allow-empty");
		}
		args.push(commitSha);
		await this.git.raw(args);
	}

	async continueCherryPick(): Promise<void> {
		await this.git.raw(["cherry-pick", "--continue"]);
	}

	async skipCherryPick(): Promise<void> {
		await this.git.raw(["cherry-pick", "--skip"]);
	}

	async abortCherryPick(): Promise<void> {
		try {
			await this.git.raw(["cherry-pick", "--abort"]);
		} catch {}
	}

	async resolveConflictWithStrategy(
		strategy: "ours" | "theirs",
	): Promise<void> {
		await this.git.checkout([`--${strategy}`, "."]);
		await this.git.add(".");
	}

	async finishCherryPick(
		currentBranch: string,
		tempBranchName: string,
		options?: { createBackup?: boolean },
	): Promise<void> {
		await this.git.checkout(currentBranch);
		if (options?.createBackup) {
			try {
				const currentSha = (await this.git.revparse([currentBranch])).trim();
				const safeBranch = currentBranch.replace(/\//g, "-");
				const tagName = `agrb-backup-${safeBranch}-${Date.now()}`;
				await this.git.addAnnotatedTag(
					tagName,
					`Backup before agrb reset: ${currentBranch} @ ${currentSha}`,
				);
			} catch (error) {
				throw new Error(
					`Failed to create backup tag: ${
						error instanceof Error ? error.message : String(error)
					}`,
				);
			}
		}
		await this.git.raw(["reset", "--hard", tempBranchName]);
	}

	async cleanupCherryPick(
		tempBranchName: string,
		originalBranch: string,
	): Promise<void> {
		try {
			const current = await this.getCurrentBranch();
			if (current === tempBranchName) {
				await this.git.checkout(originalBranch);
			}
			await this.git.branch(["-D", tempBranchName]);
		} catch {}
	}

	async performLinearRebase(
		currentBranch: string,
		targetBranch: string,
		progressCallback?: (message: string) => void,
		options?: { continueOnConflict?: boolean },
	): Promise<void> {
		if (!isValidBranchName(targetBranch)) {
			throw new Error(`Invalid branch name: ${targetBranch}`);
		}
		try {
			progressCallback?.("Fetching all branches...");
			await this.fetchAll();

			progressCallback?.("Checking if target branch exists...");
			if (!(await this.branchExists(targetBranch))) {
				throw new Error(`Target branch '${targetBranch}' does not exist`);
			}

			progressCallback?.("Starting linear rebase...");
			await this.git.checkout(currentBranch);

			const rebaseTarget = await this.resolveBranchRef(targetBranch);

			const rebaseArgs = ["rebase", rebaseTarget];
			if (options?.continueOnConflict) {
				rebaseArgs.push("-X", "ours");
			}

			await this.git.raw(rebaseArgs);
			progressCallback?.("Linear rebase completed successfully");
		} catch (error) {
			if (options?.continueOnConflict) {
				try {
					progressCallback?.(
						"Conflicts detected, auto-resolving and continuing...",
					);
					await this.git.checkout(["--ours", "."]);
					await this.git.add(".");
					await this.git.raw(["rebase", "--continue"]);
					progressCallback?.(
						"Linear rebase completed with conflicts auto-resolved",
					);
				} catch (e) {
					try {
						await this.git.raw(["rebase", "--abort"]);
					} catch {}
					throw new Error(
						`Linear rebase failed during continue: ${
							e instanceof Error ? e.message : String(e)
						}`,
					);
				}
			} else {
				try {
					await this.git.raw(["rebase", "--abort"]);
				} catch {}
				throw new Error(
					`Linear rebase failed: ${
						error instanceof Error ? error.message : String(error)
					}`,
				);
			}
		}
	}

	async getCommitSubject(sha: string): Promise<string> {
		const out = await this.git.raw(["show", "-s", "--format=%s", sha]);
		return out.trim();
	}

	async startAutostash(): Promise<string | null> {
		const label = `agrb-${process.pid}`;
		await this.git.raw(["stash", "push", "-u", "-m", label]);
		const list = await this.git.raw(["stash", "list", "--format=%gd %gs"]);
		const line = list
			.split("\n")
			.map((l) => l.trim())
			.find((l) => l.includes(label));
		if (!line) {
			return null;
		}
		const ref = line.split(" ")[0];
		return ref || null;
	}

	async popStash(stashRef: string): Promise<void> {
		await this.git.raw(["stash", "pop", stashRef]);
	}

	async pushWithLease(branch: string): Promise<void> {
		await this.git.push(["-u", "origin", branch, "--force-with-lease"]);
	}
}
