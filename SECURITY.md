# Security Policy

## Supported Versions

Security updates and vulnerability patches are actively maintained for the following branches:

| Version / Branch | Supported          |
| ---------------- | ------------------ |
| `main`           | :white_check_mark: |
| Development tags | :x:                |

---

## Reporting a Vulnerability

The HostelSwap team is committed to ensuring the safety, privacy, and integrity of hostel resident data and institutional operations.

If you believe you have discovered a security vulnerability in this project, **please do not disclose it in a public GitHub issue, pull request, or discussion**.

Instead, please report vulnerabilities privately using one of the following methods:

1. **GitHub Private Vulnerability Reporting**:
   - Navigate to the repository's **Security** tab on GitHub.
   - Click **Report a vulnerability** to open an encrypted advisory draft.

2. **Direct Contact**:
   - Email the repository maintainer directly with subject line `[SECURITY] HostelSwap Vulnerability Report`.

### What to Include in Your Report
To help us triage and resolve the issue quickly, please provide:
- A description of the vulnerability, its potential impact, and affected components (e.g., matching engine, approval service, authentication).
- Step-by-step instructions or a minimal Proof of Concept (PoC) to reproduce the vulnerability.
- Any relevant logs, request/response headers, or code references.
- Suggested remediations or mitigations, if known.

---

## Response Timeline & Coordinated Disclosure

- **Initial Acknowledgment**: Within 48 hours of report receipt.
- **Triage & Assessment**: Within 5 business days, confirming severity and validity.
- **Fix & Patch Delivery**: Within 14 business days, depending on severity and complexity.
- **Public Disclosure**: Coordinated disclosure will occur only after a tested patch has been deployed to the `main` branch.

---

## Security Practices in HostelSwap

- **ACID Transaction Isolation**: Multi-party swap executions utilize PostgreSQL row-level locks (`SELECT FOR UPDATE`) in ascending primary-key order to prevent concurrent race conditions.
- **Role-Based Access Control (RBAC)**: Strict server-side permission checks across Student, Warden, Chief Warden, Hostel Admin, and Dean personas.
- **Credential Hygiene**: Production secrets, tokens, and encryption keys are strictly driven by environment variables and excluded from version control.

