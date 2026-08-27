# 22 — CMA Data Access, Privacy & Business Continuity Policy

**Status:** Final internal security and continuity policy; implementation required  
**Version:** 2026-08-26.5  
**Effective date:** [EFFECTIVE DATE]  
**Last reviewed:** 2026-08-26  
**Document owner:** CMA-I / CMA-PM  
**Approved by:** Pending annual consent  
**Related documents:** 11, 12, 16, 19, 20, 23

## Purpose

Protect applicant, tenant, company, banking, tax, and property information while ensuring CMA-PM can operate if the primary operator is unavailable.

## 1. Systems in Scope

- DoorLoop;
- Bluevine;
- Maryland security-deposit bank;
- Google Workspace and Drive;
- Google Voice;
- Super;
- Stable;
- CMA custom app;
- ChatGPT and Claude;
- CPA, tax, insurer, lender, and compliance portals.

## 2. Access Rules

- require MFA where available;
- use a company password manager;
- do not share personal passwords;
- use separate accounts when practical;
- apply least privilege;
- restrict bank and deposit-account access;
- remove access promptly when no longer needed;
- review access at least annually.

## 3. Sensitive Information

High-sensitivity data includes:

- Social Security numbers;
- government IDs;
- bank statements;
- consumer reports;
- tax returns;
- credentials;
- accommodation or disability documentation;
- deposit-bank and payment-account information.

Collect only what is reasonably needed.

## 4. AI Data Boundary

Do not place full high-sensitivity records in a general AI workflow by default.

Prefer:

- redaction;
- summaries;
- property IDs instead of tenant names;
- minimum necessary financial detail;
- synthetic data for development.

Do not upload SSNs, full IDs, credentials, unredacted bank statements, full screening reports, or accommodation/medical records unless the use is specifically approved and the environment is appropriate.

AI may assist with drafts and analysis but may not autonomously make housing decisions, execute leases, move deposit funds, or send legal notices.

## 5. File Separation

- keep accommodation and disability-supporting information separate with restricted access;
- keep deposit liabilities separate from rent revenue;
- keep governance, capital, and tax records in controlled permanent folders.

## 6. Retention Defaults

Unless a longer period is required:

| Record | Internal Default |
|---|---|
| Declined / withdrawn application and decision record | At least 3 years |
| Consumer-report adverse-action record | At least 3 years |
| Executed leases and addenda | At least 7 years after tenancy |
| Security-deposit accounting | At least 7 years after tenancy |
| Material maintenance / inspection records | At least 7 years after tenancy |
| Vendor invoices and tax support | At least 7 years after tax year |
| Governance / capital / profits-interest records | Permanent |
| Accommodation documentation | Minimum necessary; longer if needed for tenancy, claim, or legal hold |

A litigation hold, audit, claim, or legal rule overrides ordinary deletion.

## 7. Backups and Exports

Retain independent copies of:

- executed leases;
- tenant ledgers;
- deposit ledger;
- inspection photos;
- major maintenance records;
- vendor invoices;
- bank statements;
- tax filings and K-1s;
- entity documents;
- insurance policies;
- major resolutions.

Test export and recovery at least annually.

## 8. Backup Operator Model

Primary day-to-day operator: **Cameron**  
Initial operating backup: **Carrie**  
Succession / secondary continuity contact: **Jay**, when legally authorized.

The annual consent may designate additional backup operators.

## 9. Emergency Access Matrix

Maintain a separate secure matrix without passwords in this document.

| System | Primary | Backup | Recovery Confirmed? |
|---|---|---|---|
| DoorLoop | Cameron | Carrie | |
| Bluevine | Cameron | Carrie | |
| Security Deposit Bank | Cameron | Carrie | |
| Google Workspace | Cameron | Carrie | |
| Google Voice | Cameron | Carrie | |
| Insurance / Broker | Cameron | Carrie | |
| CPA / Tax | Cameron | Carrie | |
| State / Local Portals | Cameron | Carrie | |

Jay's access should be activated only when legally appropriate.

## 10. Primary Operator Unavailable

The backup operator should be able to:

- receive tenant communications;
- handle emergencies;
- access leases and Home Guides;
- contact Super and vendors;
- pay authorized obligations;
- view operating and deposit-account records;
- coordinate with insurer and CPA;
- access the compliance calendar;
- preserve records.

## 11. Data Incident Response

```text
Suspected unauthorized access / disclosure
        ↓
Contain access and reset credentials
        ↓
Preserve logs and evidence
        ↓
Identify systems and data affected
        ↓
Notify platform / bank as needed
        ↓
Notify cyber insurer / broker if applicable
        ↓
Determine legal notice obligations
        ↓
Document remediation
```

Do not delete logs or relevant communications after discovering a potential incident.

## 12. Vendor and User Offboarding

When access is no longer needed:

- disable accounts;
- revoke keys, codes, and tokens;
- transfer company-owned files;
- export data before ending software;
- confirm deletion and retention obligations;
- update the emergency-access matrix.

## 13. Annual Test

At least annually:

- review all users and permissions;
- confirm recovery methods;
- test access to critical archives;
- export a sample lease, ledger, and bank statement;
- verify the backup operator can locate the continuity checklist;
- document deficiencies and due dates.
