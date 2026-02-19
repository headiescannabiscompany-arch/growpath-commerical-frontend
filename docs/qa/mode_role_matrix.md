# Mode/Role Capability Matrix

| Account/Role | Personal Home | Commercial Home | Facility Home | Feed | Courses | Live | Admin/Facility Tools |
|---|---:|---:|---:|---:|---:|---:|---:|
| personal-free | ✅ expected visible | ❌ expected hidden | ❌ expected hidden | ✅ | ✅ (gated where applicable) | ✅ (gated where applicable) | ❌ |
| personal-pro | ✅ expected visible | ❌ expected hidden | ❌ expected hidden | ✅ | ✅ | ✅ | ❌ |
| commercial | ❌ expected hidden | ✅ expected visible | ❌ expected hidden | ✅ | ✅ | ✅ | ✅ commercial tools |
| facility-owner | ❌ expected hidden | ❌ expected hidden | ✅ expected visible | ✅ | ✅ | ✅ | ✅ full facility tools |
| facility-manager | ❌ expected hidden | ❌ expected hidden | ✅ expected visible | ✅ | ✅ | ✅ | ✅ manager facility tools |
| facility-staff | ❌ expected hidden | ❌ expected hidden | ✅ expected visible | ✅ | ✅ | ✅ | ⚠️ limited facility tools |
| facility-viewer | ❌ expected hidden | ❌ expected hidden | ✅ expected visible | ✅ | ✅ | ✅ | ⚠️ read-only facility tools |

## Notes
- Use this matrix as expected visibility assertions in smoke tests.
- Back this matrix with capability checks in Auth/entitlement context before release.
