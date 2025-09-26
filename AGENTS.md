# AGENTS.md

## Project Overview

This project provides command-line interface (CLI) tools for Git: `agbd` (auto git branch delete) and `agrb` (auto git rebase). These tools are built with TypeScript, React (using Ink for the CLI UI), and Node.js.

### agbd (auto git branch delete)

`agbd` helps you review and delete Git branches confidently:

1. **Interactive pruning**: Select local or remote branches from an Ink-powered UI, see last-commit metadata, and confirm deletions.
2. **Automated cleanup**: Use filters (pattern, age, protection rules) and non-interactive mode to prune branches in bulk.

The tool is designed to be transparent and configurable, letting you dry-run plans or persist default behaviours via a config file.

### agrb (auto git rebase)

`agrb` simplifies the rebase process by offering two different strategies:

1. **Cherry-pick based replay**: This is the default strategy. It identifies the non-merge commits between the current branch and the target branch and applies them one by one to a temporary branch created from the target. This method avoids issues with merge commits in the history.
2. **Linear history via `git rebase`**: This strategy uses the standard `git rebase` command to create a linear history.

The tool is designed to be interactive, allowing the user to select the target branch from a list of available branches if not specified via command-line arguments.

## Building and Running

The project uses `bun` for package management and running scripts.

**Install Dependencies:**

```bash
bun install
```

**Build the project:**

```bash
bun run build
```

**Run in development mode (with file watching):**

```bash
bun run dev
```

**Lint the code:**

```bash
bun run lint
```

**Run tests:**

```bash
bun run test
```

## Development Conventions

**Code Style**: The project uses Biome for code formatting and linting. The configuration can be found in the `biome.json` file.
**Testing**: The project uses Biome for static checks. Add automated tests where possible.
**Contribution**: Contribution guidelines are available in `CONTRIBUTING.md`.
