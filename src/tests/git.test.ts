import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	test,
} from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GitOperations } from "../git.js";

const GIT_ENV_KEYS = [
	"GIT_CONFIG_GLOBAL",
	"GIT_CONFIG_NOSYSTEM",
	"GIT_AUTHOR_NAME",
	"GIT_AUTHOR_EMAIL",
	"GIT_COMMITTER_NAME",
	"GIT_COMMITTER_EMAIL",
] as const;

const originalEnv = Object.fromEntries(
	GIT_ENV_KEYS.map((key) => [key, process.env[key]]),
);
const createdDirs: string[] = [];
const sandboxRoot = mkdtempSync(join(tmpdir(), "ag-toolkit-git-test-"));

const runGit = (
	cwd: string,
	args: string[],
	extraEnv: Record<string, string> = {},
): string => {
	const result = Bun.spawnSync(["git", ...args], {
		cwd,
		env: { ...process.env, ...extraEnv },
		stdout: "pipe",
		stderr: "pipe",
	});
	if (result.exitCode !== 0) {
		throw new Error(
			`git ${args.join(" ")} failed: ${result.stderr.toString().trim()}`,
		);
	}
	return result.stdout.toString().trim();
};

const makeTempDir = (prefix: string): string => {
	const dir = mkdtempSync(join(sandboxRoot, prefix));
	createdDirs.push(dir);
	return dir;
};

const commitFile = (
	cwd: string,
	file: string,
	content: string,
	message: string,
	date?: string,
): string => {
	writeFileSync(join(cwd, file), content);
	runGit(cwd, ["add", file]);
	runGit(
		cwd,
		date
			? ["commit", "-q", "-m", message, "--date", date]
			: ["commit", "-q", "-m", message],
		date ? { GIT_COMMITTER_DATE: date } : {},
	);
	return runGit(cwd, ["rev-parse", "HEAD"]);
};

const configureIdentity = (cwd: string) => {
	runGit(cwd, ["config", "user.name", "Test"]);
	runGit(cwd, ["config", "user.email", "test@example.com"]);
};

const initRepo = (prefix: string, branch: string): string => {
	const dir = makeTempDir(prefix);
	runGit(dir, ["init", "-q", "-b", branch]);
	configureIdentity(dir);
	return dir;
};

const createRepo = (): string => {
	const dir = initRepo("repo-", "main");
	commitFile(dir, "README.md", "initial\n", "initial commit");
	return dir;
};

const createRepoWithOrigin = (): { origin: string; clone: string } => {
	const seed = createRepo();
	const origin = makeTempDir("origin-");
	runGit(origin, ["init", "-q", "--bare", "-b", "main"]);
	runGit(seed, ["remote", "add", "origin", origin]);
	runGit(seed, ["push", "-q", "origin", "main"]);
	const parent = makeTempDir("clone-");
	runGit(parent, ["clone", "-q", origin, "work"]);
	const clone = join(parent, "work");
	configureIdentity(clone);
	return { origin, clone };
};

beforeAll(() => {
	const globalConfig = join(sandboxRoot, "gitconfig");
	writeFileSync(globalConfig, "");
	process.env.GIT_CONFIG_GLOBAL = globalConfig;
	process.env.GIT_CONFIG_NOSYSTEM = "1";
	process.env.GIT_AUTHOR_NAME = "Test";
	process.env.GIT_AUTHOR_EMAIL = "test@example.com";
	process.env.GIT_COMMITTER_NAME = "Test";
	process.env.GIT_COMMITTER_EMAIL = "test@example.com";
});

afterEach(() => {
	for (const dir of createdDirs.splice(0)) {
		rmSync(dir, { recursive: true, force: true });
	}
});

afterAll(() => {
	rmSync(sandboxRoot, { recursive: true, force: true });
	for (const key of GIT_ENV_KEYS) {
		const value = originalEnv[key];
		if (value === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	}
});

describe("GitOperations", () => {
	describe("status helpers", () => {
		test("getCurrentBranch returns the checked out branch", async () => {
			const repo = createRepo();
			runGit(repo, ["switch", "-q", "-c", "feature/x"]);
			const git = new GitOperations(repo);

			expect(await git.getCurrentBranch()).toBe("feature/x");
		});

		test("isWorkdirClean reflects tracked and untracked changes", async () => {
			const repo = createRepo();
			const git = new GitOperations(repo);

			expect(await git.isWorkdirClean()).toBe(true);

			writeFileSync(join(repo, "untracked.txt"), "new\n");
			expect(await git.isWorkdirClean()).toBe(false);

			rmSync(join(repo, "untracked.txt"));
			writeFileSync(join(repo, "README.md"), "changed\n");
			expect(await git.isWorkdirClean()).toBe(false);
		});
	});

	describe("getBranchInfos", () => {
		test("reports merge state, ahead/behind counts and commit metadata", async () => {
			const repo = createRepo();
			runGit(repo, ["branch", "merged-branch"]);
			runGit(repo, ["switch", "-q", "-c", "feature/unmerged"]);
			const featureSha = commitFile(
				repo,
				"feature.txt",
				"feature\n",
				"add feature",
			);
			runGit(repo, ["switch", "-q", "main"]);
			commitFile(repo, "main.txt", "main\n", "main only");

			const git = new GitOperations(repo);
			const infos = await git.getBranchInfos();

			const feature = infos.find((b) => b.name === "feature/unmerged");
			const merged = infos.find((b) => b.name === "merged-branch");
			const main = infos.find((b) => b.name === "main");

			expect(infos.every((b) => b.type === "local")).toBe(true);
			expect(feature).toMatchObject({
				ref: "feature/unmerged",
				type: "local",
				isMerged: false,
				ahead: 1,
				behind: 1,
				lastCommitSha: featureSha,
				lastCommitSubject: "add feature",
			});
			expect(feature?.lastCommitDate).toBeInstanceOf(Date);
			expect(merged).toMatchObject({ isMerged: true, ahead: 0, behind: 1 });
			expect(main).toMatchObject({ isMerged: true, ahead: 0, behind: 0 });
		});

		test("sorts local branches by most recent commit first", async () => {
			const repo = createRepo();
			runGit(repo, ["switch", "-q", "-c", "old"]);
			commitFile(repo, "old.txt", "old\n", "old", "2001-01-01T00:00:00Z");
			runGit(repo, ["switch", "-q", "main"]);
			runGit(repo, ["switch", "-q", "-c", "new"]);
			commitFile(repo, "new.txt", "new\n", "new", "2030-01-01T00:00:00Z");

			const git = new GitOperations(repo);
			const names = (await git.getBranchInfos()).map((b) => b.name);

			expect(names[0]).toBe("new");
			expect(names.at(-1)).toBe("old");
		});

		test("excludes remote branches unless includeRemote is true", async () => {
			const { clone } = createRepoWithOrigin();
			runGit(clone, ["push", "-q", "origin", "main:remote-only"]);
			runGit(clone, ["fetch", "-q", "origin"]);
			const git = new GitOperations(clone);

			const localOnly = await git.getBranchInfos();
			expect(localOnly.some((b) => b.type === "remote")).toBe(false);

			const withRemote = await git.getBranchInfos({ includeRemote: true });
			const remotes = withRemote.filter((b) => b.type === "remote");
			expect(remotes.map((b) => b.ref).sort()).toEqual([
				"origin/main",
				"origin/remote-only",
			]);
			expect(remotes.every((b) => b.remote === "origin")).toBe(true);
			expect(remotes.some((b) => b.name === "HEAD")).toBe(false);
			expect(withRemote.findIndex((b) => b.type === "remote")).toBe(
				withRemote.filter((b) => b.type === "local").length,
			);
		});

		test("returns zero ahead/behind when no base branch exists", async () => {
			const repo = initRepo("nobase-", "trunk");
			commitFile(repo, "a.txt", "a\n", "a");
			const git = new GitOperations(repo);

			const [info] = await git.getBranchInfos();
			expect(info).toMatchObject({ name: "trunk", ahead: 0, behind: 0 });
		});
	});

	describe("branch deletion", () => {
		test("deleteLocalBranch removes merged branches", async () => {
			const repo = createRepo();
			runGit(repo, ["branch", "done"]);
			const git = new GitOperations(repo);

			await git.deleteLocalBranch("done");

			expect(await git.getLocalBranches()).toEqual(["main"]);
		});

		test("deleteLocalBranch refuses unmerged branches unless forced", async () => {
			const repo = createRepo();
			runGit(repo, ["switch", "-q", "-c", "wip"]);
			commitFile(repo, "wip.txt", "wip\n", "wip");
			runGit(repo, ["switch", "-q", "main"]);
			const git = new GitOperations(repo);

			await expect(git.deleteLocalBranch("wip")).rejects.toThrow(
				"not fully merged",
			);
			await git.deleteLocalBranch("wip", { force: true });
			expect(await git.getLocalBranches()).toEqual(["main"]);
		});

		test("deleteLocalBranch rejects invalid branch names before running git", async () => {
			const git = new GitOperations(createRepo());

			await expect(git.deleteLocalBranch("-D")).rejects.toThrow(
				"Invalid branch name: -D",
			);
			await expect(git.deleteLocalBranch("a..b")).rejects.toThrow(
				"Invalid branch name",
			);
		});

		test("deleteRemoteBranch deletes the branch on the remote", async () => {
			const { origin, clone } = createRepoWithOrigin();
			runGit(clone, ["push", "-q", "origin", "main:to-delete"]);
			const git = new GitOperations(clone);

			await git.deleteRemoteBranch({ remote: "origin", name: "to-delete" });

			expect(runGit(origin, ["branch", "--list", "to-delete"])).toBe("");
		});

		test("deleteRemoteBranch rejects invalid branch names", async () => {
			const git = new GitOperations(createRepo());

			await expect(
				git.deleteRemoteBranch({ remote: "origin", name: "--all" }),
			).rejects.toThrow("Invalid branch name: --all");
		});
	});

	describe("detectDefaultBranch", () => {
		test("detects the default branch of the remote", async () => {
			const { clone } = createRepoWithOrigin();
			const git = new GitOperations(clone);

			expect(await git.detectDefaultBranch()).toBe("main");
		});

		test("returns null for an unknown remote", async () => {
			const git = new GitOperations(createRepo());

			expect(await git.detectDefaultBranch("missing")).toBeNull();
		});
	});

	describe("branch listing and lookup", () => {
		test("getAllBranches lists origin branches without HEAD", async () => {
			const { clone } = createRepoWithOrigin();
			runGit(clone, ["push", "-q", "origin", "main:release/1.0"]);
			runGit(clone, ["fetch", "-q", "origin"]);
			const git = new GitOperations(clone);

			expect((await git.getAllBranches()).sort()).toEqual([
				"main",
				"release/1.0",
			]);
		});

		test("getLocalBranches lists local branches", async () => {
			const repo = createRepo();
			runGit(repo, ["branch", "feature/a"]);
			const git = new GitOperations(repo);

			expect((await git.getLocalBranches()).sort()).toEqual([
				"feature/a",
				"main",
			]);
		});

		test("branchExists checks remote and local refs", async () => {
			const { clone } = createRepoWithOrigin();
			runGit(clone, ["branch", "local-only"]);
			const git = new GitOperations(clone);

			expect(await git.branchExists("main")).toBe(true);
			expect(await git.branchExists("local-only")).toBe(true);
			expect(await git.branchExists("missing")).toBe(false);
			await expect(git.branchExists("bad..name")).rejects.toThrow(
				"Invalid branch name",
			);
		});
	});

	describe("cherry-pick workflow", () => {
		test("getMergeBase and getCommitsToCherryPick list non-merge commits oldest first", async () => {
			const repo = createRepo();
			const base = runGit(repo, ["rev-parse", "HEAD"]);
			runGit(repo, ["switch", "-q", "-c", "topic"]);
			const first = commitFile(repo, "one.txt", "1\n", "one");
			runGit(repo, ["switch", "-q", "-c", "side"]);
			commitFile(repo, "side.txt", "side\n", "side");
			runGit(repo, ["switch", "-q", "topic"]);
			const second = commitFile(repo, "two.txt", "2\n", "two");
			runGit(repo, ["merge", "-q", "--no-ff", "side", "-m", "merge side"]);
			const git = new GitOperations(repo);

			const mergeBase = await git.getMergeBase("main", "topic");
			expect(mergeBase).toBe(base);

			const commits = await git.getCommitsToCherryPick(mergeBase, "topic");
			expect(commits).toHaveLength(3);
			expect(commits[0]).toBe(first);
			expect(commits.indexOf(first)).toBeLessThan(commits.indexOf(second));
			expect(await git.getCommitSubject(commits[0] ?? "")).toBe("one");
		});

		test("getMergeBase rejects invalid branch names", async () => {
			const git = new GitOperations(createRepo());

			await expect(git.getMergeBase("-x", "main")).rejects.toThrow(
				"Invalid branch name: -x",
			);
			await expect(git.getMergeBase("main", "a//b")).rejects.toThrow(
				"Invalid branch name: a//b",
			);
		});

		test("replays commits onto the target and creates a backup tag", async () => {
			const repo = createRepo();
			runGit(repo, ["switch", "-q", "-c", "feature/replay"]);
			commitFile(repo, "feature.txt", "feature\n", "feature work");
			runGit(repo, ["switch", "-q", "main"]);
			commitFile(repo, "main.txt", "main\n", "main work");
			runGit(repo, ["switch", "-q", "feature/replay"]);
			const originalSha = runGit(repo, ["rev-parse", "HEAD"]);
			const git = new GitOperations(repo);

			const mergeBase = await git.getMergeBase("main", "feature/replay");
			const commits = await git.getCommitsToCherryPick(
				mergeBase,
				"feature/replay",
			);
			const temp = await git.setupCherryPick("main");
			expect(temp).toBe(`temp-rebase-${process.pid}`);
			expect(await git.getCurrentBranch()).toBe(temp);

			for (const sha of commits) {
				await git.cherryPick(sha);
			}
			await git.finishCherryPick("feature/replay", temp, {
				createBackup: true,
			});
			await git.cleanupCherryPick(temp, "feature/replay");

			expect(await git.getCurrentBranch()).toBe("feature/replay");
			expect(runGit(repo, ["log", "--format=%s", "-3"]).split("\n")).toEqual([
				"feature work",
				"main work",
				"initial commit",
			]);
			expect(await git.getLocalBranches()).not.toContain(temp);

			const tags = runGit(repo, ["tag", "--list", "agrb-backup-*"]);
			expect(tags).toMatch(/^agrb-backup-feature-replay-\d+$/);
			expect(runGit(repo, ["rev-parse", `${tags}^{commit}`])).toBe(originalSha);
		});

		test("cherryPick with allowEmpty keeps empty commits", async () => {
			const repo = createRepo();
			runGit(repo, ["commit", "-q", "--allow-empty", "-m", "empty"]);
			const emptySha = runGit(repo, ["rev-parse", "HEAD"]);
			runGit(repo, ["switch", "-q", "-c", "target", "HEAD~1"]);
			const git = new GitOperations(repo);

			await git.cherryPick(emptySha, { allowEmpty: true });

			expect(await git.getCommitSubject("HEAD")).toBe("empty");
		});

		test("resolveConflictWithStrategy resolves conflicts and continueCherryPick completes", async () => {
			const repo = createRepo();
			runGit(repo, ["switch", "-q", "-c", "theirs-branch"]);
			const theirs = commitFile(repo, "README.md", "theirs\n", "theirs");
			runGit(repo, ["switch", "-q", "main"]);
			commitFile(repo, "README.md", "ours\n", "ours");
			const git = new GitOperations(repo);

			await expect(git.cherryPick(theirs)).rejects.toThrow();
			await git.resolveConflictWithStrategy("theirs");
			await git.continueCherryPick();

			expect(runGit(repo, ["show", "HEAD:README.md"])).toBe("theirs");
			expect(await git.isWorkdirClean()).toBe(true);
		});

		test("skipCherryPick drops a conflicting commit", async () => {
			const repo = createRepo();
			runGit(repo, ["switch", "-q", "-c", "theirs-branch"]);
			const theirs = commitFile(repo, "README.md", "theirs\n", "theirs");
			runGit(repo, ["switch", "-q", "main"]);
			const head = commitFile(repo, "README.md", "ours\n", "ours");
			const git = new GitOperations(repo);

			await expect(git.cherryPick(theirs)).rejects.toThrow();
			await git.skipCherryPick();

			expect(runGit(repo, ["rev-parse", "HEAD"])).toBe(head);
			expect(await git.isWorkdirClean()).toBe(true);
		});

		test("abortCherryPick is a no-op when nothing is in progress", async () => {
			const git = new GitOperations(createRepo());

			await expect(git.abortCherryPick()).resolves.toBeUndefined();
		});

		test("setupCherryPick rejects invalid branch names", async () => {
			const git = new GitOperations(createRepo());

			await expect(git.setupCherryPick("bad.lock")).rejects.toThrow(
				"Invalid branch name: bad.lock",
			);
		});
	});

	describe("performLinearRebase", () => {
		test("rebases the current branch onto the target", async () => {
			const { clone } = createRepoWithOrigin();
			runGit(clone, ["switch", "-q", "-c", "topic"]);
			commitFile(clone, "topic.txt", "topic\n", "topic");
			runGit(clone, ["switch", "-q", "main"]);
			commitFile(clone, "main.txt", "main\n", "main update");
			runGit(clone, ["push", "-q", "origin", "main"]);
			const git = new GitOperations(clone);
			const progress: string[] = [];

			await git.performLinearRebase("topic", "main", (message) => {
				progress.push(message);
			});

			expect(runGit(clone, ["log", "--format=%s", "-3"]).split("\n")).toEqual([
				"topic",
				"main update",
				"initial commit",
			]);
			expect(progress.at(-1)).toBe("Linear rebase completed successfully");
		});

		test("throws when the target branch does not exist", async () => {
			const { clone } = createRepoWithOrigin();
			const git = new GitOperations(clone);

			await expect(git.performLinearRebase("main", "missing")).rejects.toThrow(
				"Target branch 'missing' does not exist",
			);
		});

		test("aborts and reports conflicts without continueOnConflict", async () => {
			const { clone } = createRepoWithOrigin();
			runGit(clone, ["switch", "-q", "-c", "topic"]);
			commitFile(clone, "README.md", "topic\n", "topic");
			runGit(clone, ["switch", "-q", "main"]);
			commitFile(clone, "README.md", "main\n", "main");
			runGit(clone, ["push", "-q", "origin", "main"]);
			const git = new GitOperations(clone);

			await expect(git.performLinearRebase("topic", "main")).rejects.toThrow(
				"Linear rebase failed",
			);
			expect(await git.getCurrentBranch()).toBe("topic");
			expect(await git.isWorkdirClean()).toBe(true);
		});

		test("rejects invalid target branch names", async () => {
			const git = new GitOperations(createRepo());

			await expect(git.performLinearRebase("main", "-x")).rejects.toThrow(
				"Invalid branch name: -x",
			);
		});
	});

	describe("stash and push", () => {
		test("startAutostash stashes changes and popStash restores them", async () => {
			const repo = createRepo();
			writeFileSync(join(repo, "README.md"), "dirty\n");
			writeFileSync(join(repo, "new.txt"), "untracked\n");
			const git = new GitOperations(repo);

			const ref = await git.startAutostash();
			expect(ref).toBe("stash@{0}");
			expect(await git.isWorkdirClean()).toBe(true);

			await git.popStash(ref ?? "");
			expect(await git.isWorkdirClean()).toBe(false);
			expect(await Bun.file(join(repo, "new.txt")).text()).toBe("untracked\n");
		});

		test("startAutostash returns null when there is nothing to stash", async () => {
			const git = new GitOperations(createRepo());

			expect(await git.startAutostash()).toBeNull();
		});

		test("pushWithLease pushes the branch to origin", async () => {
			const { origin, clone } = createRepoWithOrigin();
			runGit(clone, ["switch", "-q", "-c", "pushed"]);
			const sha = commitFile(clone, "p.txt", "p\n", "pushed");
			const git = new GitOperations(clone);

			await git.pushWithLease("pushed");

			expect(runGit(origin, ["rev-parse", "pushed"])).toBe(sha);
		});
	});
});
