# Contributing to HostelSwap

Thank you for your interest in contributing to **Hostel Room Exchange and Multi-Party Swap Platform (HostelSwap)**. This document outlines the guidelines, development setup, code quality standards, and pull request workflow for contributors.

---

## 1. Code of Conduct

All contributors and maintainers are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it to ensure a welcoming and inclusive environment.

---

## 2. Getting Started

### Prerequisites
- **Python**: Version 3.12 or 3.13
- **Node.js**: Version 20.x or higher
- **PostgreSQL**: Version 16 (default local port `5433` or `5432`)
- **Git**: Installed and configured

### Setting Up Your Local Environment

1. **Fork and Clone the Repository**:
   ```bash
   git clone https://github.com/kkundantech/Hostel-Room-Swap.git
   cd Hostel-Room-Swap
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `backend/.env`:
   ```bash
   cp .env.example backend/.env
   ```
   Update `backend/.env` with your local PostgreSQL database credentials.

3. **Backend Setup**:
   ```bash
   # Create and activate a virtual environment
   python -m venv .venv
   source .venv/bin/activate       # On Linux/macOS
   .venv\Scripts\activate          # On Windows

   # Install dependencies
   pip install -r backend/requirements.txt pytest-django

   # Run migrations
   python backend/manage.py migrate

   # Optional: Seed initial demo data for local exploration
   python backend/manage.py seed_demo_data

   # Start the development server
   python backend/manage.py runserver 8000
   ```

4. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   npm run dev
   # Accessible at http://localhost:3000 (proxies /api to port 8000)
   ```

---

## 3. Development Guidelines & Standards

### Architecture Principles
- **ACID Integrity**: Multi-party swap operations must remain within PostgreSQL transactions utilizing ascending row-level locks (`select_for_update()`) to prevent race conditions and deadlocks.
- **Role Isolation**: Authorization must be strictly enforced on the backend via Django REST Framework permission classes. Frontend guards are convenience UI cues, not security boundaries.
- **Zero Schema Warnings**: All new endpoints must include DRF Spectacular annotations (`@extend_schema`) to maintain clean OpenAPI generation.

### Module Documentation
All modules in `backend/` and `frontend/src/` must maintain the standard 3-part header comment:
```python
"""
Module: <relative_path>

Work / Purpose:
    <Concise summary of module responsibility>

Connected Modules (Used By / Routes):
    - <Consumers and dependents>

Helpful / Supporting Modules (Dependencies):
    - <Libraries and services used>
"""
```

---

## 4. Testing & Quality Verification

Before submitting any Pull Request, ensure that all local test suites and linters pass:

```bash
# 1. Django System Checks
python backend/manage.py check

# 2. Check for Missing Migrations
python backend/manage.py makemigrations --check --dry-run

# 3. Backend Test Suite (Pytest)
pytest backend/tests backend/apps/accounts -v

# 4. Frontend Linting (ESLint 9)
npm --prefix frontend run lint

# 5. Frontend Unit Tests (Vitest)
npm --prefix frontend test

# 6. Production Bundle Build
npm --prefix frontend run build
```

---

## 5. Pull Request Process

1. Create a descriptive feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```
2. Commit your changes with clear, semantic commit messages (e.g. `feat: add room preference filter`, `fix: prevent duplicate student activation`).
3. Push your branch to your fork and submit a Pull Request against the `main` branch.
4. Fill in the provided [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md).
5. Ensure continuous integration checks pass. Address any reviewer feedback promptly.

---

## 6. Reporting Security Vulnerabilities

Please **do not** report security vulnerabilities via public GitHub issues. Follow the coordinated disclosure guidelines outlined in our [Security Policy](SECURITY.md).

