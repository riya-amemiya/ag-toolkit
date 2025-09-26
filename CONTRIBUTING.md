# Contributing to aglib

Thank you for your interest in contributing to `aglib`! This library provides shared functionality for the `agbd` and `agrb` tools. We welcome contributions from everyone.

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

Since `aglib` is a shared library, changes here can affect both `agbd` and `agrb`. Please consider the impact on both tools when making changes.

### Reporting Bugs & Suggesting Enhancements

Bugs and enhancement suggestions for `aglib` should be filed in the main repository's issue tracker. Please specify that the issue relates to `aglib`.

### Pull Requests

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation and consider how it affects `agbd` and `agrb`.
4. Ensure the test suite for all packages passes (`bun run test`).
5. Make sure your code lints (`bun run lint`).
6. Submit the pull request!

## Development Setup

### Prerequisites

- Bun
- Git

### Setup

1. From the root of the `ag` repository, install dependencies:

   ```bash
   bun install
   ```

2. Create a new branch:

   ```bash
   git checkout -b feature/your-feature-name
   ```

### Development Commands

Commands should be run from the root of the repository.

```bash
# Install dependencies
bun install

# Build all packages
bun run build

# Development mode (watch for changes in all packages)
bun run dev

# Run linting and formatting checks for all packages
bun run test

# Fix linting and formatting issues for all packages
bun run lint
```

### Code Style

- We use Biome for code formatting and linting.
- Use TypeScript for all new code.
- Follow the existing code style and patterns.

### Commit Messages

We follow the [Conventional Commits](https://conventionalcommits.org/) specification.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
