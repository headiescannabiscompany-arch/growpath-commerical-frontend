# Security & Compliance Checklist

Date: 2026-02-25
Status policy: each item is `DONE` or `NOT DONE` with owner, next action, and evidence path.

## 1. Sensitive Data Exposure

- DONE: Automated sensitive-copy scan runs in nightly.
- Owner: Engineering
- Evidence: `tmp/overnight/sensitive_night.txt`

- NOT DONE: Manual source/code review sign-off for secrets and PII logging.
- Owner: Security
- Next action: Complete line-by-line review for auth, logging, analytics, and export flows.
- Evidence target: `tmp/spec/security_manual_review_2026-02-25.md`

## 2. Secure Storage

- NOT DONE: Formal secure-storage verification report.
- Owner: Security + Mobile
- Next action: Validate token/user-data storage behavior on device and web.
- Evidence target: `tmp/spec/secure_storage_validation_2026-02-25.md`

## 3. API Security

- DONE: Contract delivery checks and drift scan run nightly.
- Owner: Engineering
- Evidence: `tmp/overnight/verify_night.txt`, `tmp/overnight/drift_night.txt`

- NOT DONE: Facility role enforcement proof set (OWNER/MANAGER/STAFF/VIEWER).
- Owner: QA + Backend
- Next action: Execute `docs/workflows/SOP-VERIFY-FACILITY-001.md` and attach `/api/me` + forced `403` evidence for each role.
- Evidence target: `tmp/spec/facility_role_evidence_2026-02-25.md`

## 4. Privacy & Legal Compliance

- NOT DONE: Legal/privacy review sign-off (GDPR/CCPA applicability and policy text).
- Owner: Legal + Product
- Next action: Review policy/copy and attach approval.
- Evidence target: `tmp/spec/legal_review_2026-02-25.md`

- NOT DONE: Data deletion/export request handling validation.
- Owner: Backend + Support
- Next action: Execute one deletion request and one export request end-to-end.
- Evidence target: `tmp/spec/data_rights_validation_2026-02-25.md`

## 5. Dependency and Vulnerability Posture

- NOT DONE: Current vulnerability audit artifact attached.
- Owner: Platform
- Next action: Run dependency audit in release environment and triage high/critical findings.
- Evidence target: `tmp/spec/dependency_audit_2026-02-25.md`
