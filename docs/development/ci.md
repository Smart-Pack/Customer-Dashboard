# Continuous Integration

SmartPack uses GitHub Actions for continuous integration (CI). CI automatically validates changes submitted through pull requests before they are merged into the project's protected branches.

## CI Workflow

The CI workflow runs for pull requests targeting:

* `testing`
* `main`

It can also be triggered manually when required.

## Quality Checks

The CI pipeline validates the Admin Dashboard through:

* Dependency installation using the project's lockfile.
* Code formatting checks.
* JavaScript, TypeScript, and Vue linting.
* Unit and component tests.
* Type checking.
* Production build verification.

## Quality Gate

A pull request must pass all CI checks before it should be merged.

The workflow ensures that changes are:

* Properly formatted.
* Free from detected linting issues.
* Type-safe.
* Covered by passing tests.
* Successfully buildable for production.

## Development Workflow

```text
Feature Branch
      ↓
Pull Request
      ↓
GitHub Actions CI
      ↓
Quality Checks
      ↓
CI Passes
      ↓
Code Review
      ↓
Merge into testing/main
```

CI provides an automated quality gate while code review remains responsible for reviewing the implementation and overall design.

## Git Hooks

The project uses Husky to automate local quality checks before changes are committed or pushed.

### Pre-commit

The pre-commit hook runs:

- Code formatting checks.
- Linting checks.
- Type checking.

### Pre-push

The pre-push hook runs:

- Unit tests.
- Production build verification.

These hooks provide an early quality gate locally before changes are committed or pushed to the remote repository. GitHub Actions provides the corresponding CI quality gate for pull requests.

