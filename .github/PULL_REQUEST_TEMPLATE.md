## Summary of Changes
Provide a clear, high-level summary of the modifications in this Pull Request and reference any related issues (e.g. `Fixes #12`).

## Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature that alters existing API contracts or database models)
- [ ] Security hardening or vulnerability fix
- [ ] Documentation update
- [ ] Refactoring / Performance optimization

## Architectural Impact
- [ ] Modifies database models or requires new Django migrations
- [ ] Modifies Matching Engine graph or cycle detection logic
- [ ] Modifies Two-Phase swap transaction or locking behavior
- [ ] Updates API schema or OpenAPI endpoints
- [ ] Modifies frontend design tokens or navigation components

## Testing Checklist
Please verify the following test runs locally before requesting review:
- [ ] Django system checks pass: `python backend/manage.py check`
- [ ] Django migrations are complete: `python backend/manage.py makemigrations --check --dry-run`
- [ ] Backend test suite passes: `pytest backend/tests backend/apps/accounts`
- [ ] Frontend unit tests pass: `npm --prefix frontend test`
- [ ] Frontend linter passes: `npm --prefix frontend run lint`
- [ ] Frontend production build succeeds: `npm --prefix frontend run build`

## Security & Privacy Verification
- [ ] No hardcoded passwords, tokens, or credentials committed
- [ ] `.env` and runtime data directories remain untracked
- [ ] Role-based authorization verified on new endpoints
- [ ] Input validation applied to avoid injection or XSS risks

