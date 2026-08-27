# 22 — CMA Data Access, Privacy & Business Continuity Policy

**Status:** Canonical planning draft  
**Version:** 2026-08-26.2  
**Last reviewed:** 2026-08-26

## Purpose

Protect applicant, tenant, company, banking, tax, and property information while making sure CMA can keep operating if the primary operator is unavailable.

## 1. Systems in Scope

- DoorLoop
- Bluevine
- CMA-PM Security Deposit Account bank
- Google Workspace / Drive
- Google Voice
- Super
- Stable
- CMA custom app
- ChatGPT
- Claude
- CPA / tax portals
- insurer / broker portals
- state / local compliance portals

## 2. Access Rules

- MFA required where available;
- company password manager required;
- no shared personal passwords;
- separate user accounts when practical;
- least-privilege access;
- bank and security-deposit access limited to authorized people;
- remove access promptly when no longer needed;
- review access at least annually.

## 3. Sensitive Information

High-sensitivity data includes:

- SSNs;
- government IDs;
- bank statements;
- screening reports;
- tax returns;
- bank / platform credentials;
- accommodation / disability documentation;
- security-deposit bank details;
- payment account information.

Collect only what CMA reasonably needs.

## 4. AI Data Boundary

Do not place full high-sensitivity tenant/applicant records into a general AI workflow by default.

Prefer:

- redaction;
- summaries;
- property IDs instead of tenant names;
- partial financial figures when enough;
- synthetic/sample data for development.

Do not upload SSNs, full IDs, credentials, unredacted bank statements, full screening reports, or medical/accommodation documentation into ChatGPT, Claude, or another AI tool unless the use has been specifically approved and the environment is appropriate for that data.

AI may assist with summaries and drafts but may not autonomously approve/deny an applicant, execute a lease, move security-deposit funds, or send legal notices.

## 5. File Separation

Keep accommodation / disability-supporting information separate from ordinary leasing files with restricted access.

Security-deposit accounting should remain separate from ordinary rent revenue records.

## 6. Retention Defaults

Unless longer retention is required:

| Record | Internal Default |
|---|---|
| Declined / withdrawn application and decision record | At least 3 years |
| Consumer-report adverse-action record | At least 3 years |
| Executed leases / addenda | At least 7 years after tenancy |
| Security-deposit accounting | At least 7 years after tenancy |
| Material maintenance / inspection records | At least 7 years after tenancy |
| Vendor invoices / bookkeeping / tax-support records | At least 7 years after tax year |
| Corporate governance / capital / profits-interest records | Permanent |
| Accommodation documentation | Minimum necessary; longer if needed for tenancy, claim, or legal hold |

A litigation hold, audit, claim, tax issue, or legal rule overrides normal deletion.

## 7. Backups

Google Drive is the durable company archive, but critical records should also be exportable from operating platforms.

At least periodically export / retain:

- executed leases;
- tenant ledgers;
- security-deposit ledger;
- inspection photos;
- major maintenance records;
- vendor invoices;
- bank statements;
- tax filings / K-1s;
- entity documents;
- insurance policies;
- major resolutions.

## 8. Backup Operator Model

### Primary day-to-day operator
**Cameron**

### Initial governance / operating backup
**Carrie**

### Succession / secondary continuity contact
**Jay**, when legally authorized under the succession, estate, or emergency arrangement.

The annual company consent may designate different or additional backup operators.

## 9. Emergency Access Matrix

Maintain a separate secure matrix, without passwords in this document:

| System | Primary | Backup | Recovery Method Confirmed? |
|---|---|---|---|
| DoorLoop | Cameron | Carrie | |
| Bluevine | Cameron | Carrie | |
| Security Deposit Bank | Cameron | Carrie | |
| Google Workspace | Cameron | Carrie | |
| Google Voice | Cameron | Carrie | |
| Insurance / Broker | Cameron | Carrie | |
| CPA / Tax Records | Cameron | Carrie | |
| State Compliance Portals | Cameron | Carrie | |

Jay's access should be activated when legally appropriate rather than sharing standing credentials unnecessarily.

## 10. Primary Operator Unavailable

If Cameron cannot operate CMA-PM temporarily, the backup operator should be able to:

- receive tenant communications;
- handle emergencies;
- access leases and Home Guides;
- contact Super / emergency vendors;
- pay approved obligations;
- access operating and deposit-account records;
- coordinate with insurer / broker;
- access compliance calendar;
- preserve records;
- contact CPA / attorney as needed.

## 11. Data Incident Response

```text
Suspected unauthorized access / disclosure
        ↓
Contain access + reset credentials
        ↓
Preserve logs / evidence
        ↓
Identify systems + data affected
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

## 12. Vendor Offboarding

When a vendor, employee, contractor, or software provider no longer needs access:

- disable user access;
- revoke keys / codes / tokens;
- transfer company-owned files;
- confirm data export if ending a software subscription;
- confirm deletion / retention obligations;
- update the emergency-access matrix.
