# Generate git commit message following conventional commits and best practices.

## Usage

```bash
/commit [optional-message]
```

## Instructions

When the user types `/commit`:

1. **Staging behavior:**

   - `/commit` (no argument) → Work only with already-staged files. Do NOT run `git add`.
   - `/commit all` → Run `git add .` first to stage all changes, then proceed.

2. **Analyze changes:**

   - Run `git status` and `git diff --cached` to see staged changes
   - If nothing is staged (and not using `/commit all`), inform user and stop

3. **Generate commit message** following the rules below.

4. **After lint-staged runs** (during commit), if it auto-fixes files, re-add only those specific fixed files before the commit completes.

## The Seven Rules of Great Commit Messages

1. **Separate subject from body with a blank line**
2. **Limit the subject line to 50 characters** (hard limit: 72)
3. **Capitalize the subject line**
4. **Do not end the subject line with a period**
5. **Use the imperative mood** (`Add feature` not `Added feature`)
6. **Wrap the body at 72 characters** (if body is needed)
7. **Use the body to explain what and why vs. how**

## Format

```
type(scope): Subject line (imperative, <50 chars, capitalized, no period)

Optional body explaining what and why (wrapped at 72 chars).
Focus on the problem this solves and why the change was made.

Optional footer with issue references.
```

## Conventional Commit Types

`feat`: A new feature
`fix`: A bug fix
`docs`: Documentation changes
`style`: Code style changes (formatting, missing semicolons, etc)
`refactor`: Code change that neither fixes bug nor adds feature
`perf`: Performance improvement
`test`: Adding/updating tests
`build`: Build system or dependency changes
`ci`: CI configuration changes
`chore`: Other changes that don't modify src or test files
`revert`: Reverts a previous commit

If unsure, default to `chore`

## Scope Detection

Auto-detect from file paths: `components`, `api`, `ui`, `config`, `deps`, etc.

## Imperative Test

Subject should complete: `If applied, this commit will [your subject line]`

## Output Guidelines

For simple changes: subject line only
For complex changes: add body explaining what/why
Always use imperative mood
Keep subject under 50 characters
Capitalize first letter of subject
No period at end of subject

## Execute Commit

**COMMIT ONLY — DO NOT PUSH**

This command creates commits only. AI agents and Cursor must NEVER run `git push`.
The user will push manually when ready.

### Approval Required

- Present commit message to user for approval
- WAIT for explicit user confirmation
- NEVER commit without explicit user approval of the message

### Quality Checks

Lint-staged runs automatically via the pre-commit hook (ESLint + Prettier on staged files).
If the commit fails due to hook errors, report the issue to the user.

### After Successful Commit

- Run `git status` to confirm commit succeeded
- Report commit hash and summary
- Remind user to push manually when ready
