# Security Policy

## Supported Versions

We currently support the following versions of `ag-toolkit` with security updates:

| Version | Supported |
| ------- | --------- |
| 0.7.x   | ✅ Yes    |
| 0.6.x   | ❌ No     |
| 0.5.x   | ❌ No     |
| 0.4.x   | ❌ No     |
| 0.3.x   | ❌ No     |
| 0.2.x   | ❌ No     |
| 0.1.x   | ❌ No     |

## Reporting a Vulnerability

If you discover a security vulnerability within `ag-toolkit`, please report it responsibly:
1. **Do not** open a public issue for security vulnerabilities.
2. Send an email to: <oss-contact+aglib@tokidux.com>
3. Provide a detailed description of the vulnerability.
4. Include steps to reproduce the issue if possible.
5. Allow time for the maintainer to respond and fix the issue.

### What to expect

- We will investigate and validate the reported vulnerability.
- We will work on a fix and release it as soon as possible.
- Response times may vary depending on the severity and complexity of the issue.

## Security Considerations

When using `ag-toolkit`, please be aware that:
- This library provides components and utilities for Git operations.
- `GitOperations` validates branch names with `isValidBranchName` before deleting, looking up, cherry-picking onto, or rebasing onto a branch, so names such as `-D` or `--all` are rejected instead of being passed to Git as options.
- Ensure you understand the functionality you are importing and using.
- Use in trusted environments.

## Best Practices

- Keep `ag-toolkit` updated to the latest version.
- Review the changelog for any security-related updates.
