# aglib

`aglib` is a library that provides shared functionality for the [agbd](https://github.com/riya-amemiya/agbd) and [agrb](https://github.com/riya-amemiya/agrb) CLI tools.

## Features Included

- **UI Components:** Interactive UI components using Ink.
- **Git Operations:** Git command utilities wrapping `simple-git`.
- **Configuration Management:** Functions for reading, writing, and managing configuration files.
- **Other Utilities:** Argument parsers, validation functions, etc.

## Development

This library is intended to be used by the `agbd` and `agrb` projects.

```bash
# Install dependencies
bun install

# Build
bun run build

# Development (watch)
bun run dev

# Lint (check/fix)
bun run test
bun run lint
```

## License

MIT
