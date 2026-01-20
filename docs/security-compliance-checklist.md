# Security & Compliance Checklist

## 1. Sensitive Data Exposure

- [ ] No API keys, tokens, or secrets are hardcoded in any JS/TS files.
- [ ] User PII is never logged to the console or sent to third-party services without consent.
- [ ] All environment variables are managed securely (e.g., .env files, not committed to git).

## 2. Secure Storage

- [ ] Sensitive user data (tokens, PII) is stored using secure storage (AsyncStorage, Keychain, EncryptedStorage).
- [ ] No sensitive data is stored in plain text or insecurely.

## 3. API Security

- [ ] All API requests use HTTPS.
- [ ] Authentication tokens are sent securely (e.g., Authorization headers).
- [ ] API endpoints validate authentication and authorization for every request.
- [ ] Error messages do not leak sensitive backend details to the UI.

## 4. Privacy & Legal Compliance

- [ ] Privacy policy is accessible in the app (e.g., settings or onboarding).
- [ ] User consent is obtained for analytics, crash reporting, and third-party integrations.
- [ ] App complies with GDPR, CCPA, and other relevant regulations.
- [ ] Users can request data deletion or export.

## 5. General Best Practices

- [ ] All dependencies are up to date and free of known vulnerabilities.
- [ ] No deprecated or insecure libraries are used.
- [ ] All user data displayed is authorized for the current user.
