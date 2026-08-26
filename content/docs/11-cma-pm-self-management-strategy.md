# 11 — CMA-PM Self-Management Strategy

## Purpose

This document defines how **CMA Property Management LLC (CMA-PM)** will self-manage CMA rental properties using a small number of modern tools.

The goal is to build a repeatable operating system where software handles repetitive tenant workflows, CMA-PM owns policies and decisions, each Property LLC remains the landlord, tenant communication runs through CMA-PM, banking and security deposits remain separated, and the system can scale into automation and AI later.

## 1. Operating Structure

```text
CMA-I
├── Property LLCs
│   └── Each Property LLC owns one rental property
│
└── CMA-PM
    ├── Tenant-facing manager / agent
    ├── Rent collection administration
    ├── Maintenance coordination
    ├── Tenant communication
    ├── Lease administration
    ├── Property-level bookkeeping workflow
    └── Security deposit administration
```

The applicable **Property LLC** is the landlord.

**CMA-PM** is the manager and agent.

## 2. Recommended Core Stack

### Business identity
- **Stable** — business mailing address
- **Google Workspace** — company email, Drive, Calendar, Docs
- **Google Voice** — business phone number

### Banking
- **Bluevine**
  - CMA-PM Operating Account
  - CMA-PM Security Deposit Account

### Property management
- **DoorLoop** - preferred tenant/property management platform
- **Super** - supplemental maintenance marketplace and optional property warranty platform

Use DoorLoop for:
- listings;
- rental applications;
- tenant screening;
- leases;
- e-signatures;
- tenant portal;
- rent collection;
- tenant messaging;
- maintenance requests;
- vendor coordination;
- tenant/property records;
- operational reporting.

### AI + custom software
- **ChatGPT** — research, documents, analysis, operating procedures
- **Claude** — coding, UI, app development, automation
- **CMA custom app** — property analysis, portfolio economics, reserves, CMA-I capital, owner reporting, and future AI tools

## 3. Why DoorLoop

CMA initially considered using separate tools for applications, SmartMove screening, Avail leases, Bluevine recurring rent invoices, maintenance requests, and tenant records.

DoorLoop can consolidate most of those functions into one modern native-app-first system.

That reduces duplicate data entry, tenant confusion, separate logins, manual recordkeeping, fragmented communication, and duplicate forms.

## 4. What DoorLoop Replaces

| Need | Separate Tool Previously Considered | Preferred Direction |
|---|---|---|
| Applications | Avail | DoorLoop |
| Screening | SmartMove | DoorLoop / TransUnion integration |
| Lease generation | Avail | DoorLoop |
| E-signatures | DocuSign / Avail | DoorLoop |
| Rent collection | Bluevine invoices | DoorLoop |
| Tenant portal | Avail | DoorLoop |
| Maintenance requests | Avail | DoorLoop |
| Tenant messaging | Email / text | DoorLoop |
| Tenant ledger | CMA manual doc | DoorLoop |
| Operational property records | CMA manual docs | DoorLoop |

Bluevine remains the bank.

**Super does not replace DoorLoop.** DoorLoop remains the maintenance system of record. Super is an optional vendor-dispatch and coverage layer used by CMA-PM after a maintenance request is received and triaged.

## 5. What CMA Still Owns

DoorLoop should not replace CMA's internal policies.

CMA still owns:
- tenant screening standards;
- property-specific lease requirements;
- compliance review;
- vendor standards;
- emergency-response policy;
- reserve policy;
- bookkeeping structure;
- Property LLC attribution;
- CMA-I capital tracking;
- investment analysis;
- owner economics;
- succession/governance records.

## 6. Tenant Lifecycle

```text
Property Ready
    ↓
List Property
    ↓
Application
    ↓
Screening
    ↓
Apply CMA Screening Policy
    ↓
Approve / Conditional / Deny
    ↓
Generate Lease + Addenda
    ↓
E-Sign
    ↓
Collect Required Funds
    ↓
Move-In Documentation
    ↓
Tenant Portal + Rent Collection
    ↓
Maintenance + Communication
    ↓
Periodic Property Review
    ↓
Renewal or Move-Out
```

## 7. Rent Collection

Preferred direction:

**DoorLoop handles tenant-facing rent collection.**

Bluevine remains the underlying banking platform.

```text
Tenant
   ↓
DoorLoop
   ↓
Rent Payment
   ↓
CMA-PM Operating Account
```

CMA-PM should periodically reconcile DoorLoop payment records to Bluevine.

## 8. Security Deposits

Security deposits remain separate from operating funds.

```text
CMA-PM
├── Operating Account
└── Security Deposit Account
```

DoorLoop may track the deposit transaction and tenant liability, but the actual funds should be held in the CMA-PM Security Deposit Account in accordance with applicable Maryland law.

Track:
- property;
- tenant;
- amount;
- date received;
- account held;
- deductions;
- refund date.

## 9. Lease Strategy

Use DoorLoop's state-specific lease workflow as the primary drafting system if it meets CMA's needs.

CMA should maintain an internal checklist of required terms and addenda rather than a completely separate static lease whenever possible.

Potential addenda:
- HOA / condominium rules;
- parking;
- pets;
- assistance-animal process;
- smoking;
- lawn care;
- snow removal;
- HVAC filters;
- septic;
- satellite dishes / exterior attachments;
- utilities;
- renter's insurance;
- property-specific operating rules.

Final lease should identify:

**Landlord:** applicable Property LLC

**Manager / Agent:** CMA Property Management LLC

## 10. Move-In Strategy

Before key handoff:
- final lease signed;
- required funds received;
- security deposit properly transferred;
- required disclosures delivered;
- move-in condition documented;
- tenant receives property-specific Home Guide;
- tenant has CMA-PM contact information.

Tenant should know:
- water shutoff;
- electrical panel;
- HVAC filter location and size;
- smoke/CO alarm locations;
- maintenance request process;
- emergency contact process;
- trash;
- parking;
- HOA rules;
- septic rules if applicable.

## 11. Maintenance Strategy

DoorLoop remains the single tenant-facing maintenance system. Tenants should generally not be instructed to submit maintenance requests directly to Super.

Preferred workflow:

```text
Tenant submits DoorLoop request
      |
CMA-PM reviews / triages
      |
Emergency?
  |-- Yes -> immediate response / emergency vendor
  |-- No
       |
Check Super coverage / marketplace
       |
Appropriate for Super?
  |-- Yes -> dispatch through Super
  |-- No  -> use preferred CMA vendor
       |
Work completed
       |
Invoice / service record attached in DoorLoop
       |
Expense tagged to property
       |
Request closed
```

### Super

CMA-PM may use **Super** for supported on-demand repair and maintenance services and, on selected properties, optional home-system / appliance warranty coverage.

Use Super when its availability, service quality, response time, and price make sense. Do not automatically purchase a paid warranty for every rental. Evaluate coverage property by property based on HVAC age, water-heater age, appliance age, repair history, likely replacement risk, service fees, exclusions, annual premium, and expected repair economics.

CMA should still maintain direct emergency vendor relationships for at least:

- plumber;
- HVAC;
- electrician;
- locksmith;
- water / fire restoration.

A third-party marketplace should not be CMA's only emergency-response option.

Maintain preferred vendors for plumbing, electrical, HVAC, roofing, appliances, handyman, locksmith, flooring, landscaping, pest control, cleaning, septic, and restoration.

## 12. Communication Strategy

Routine tenant communication should run through:
- DoorLoop;
- Google Voice;
- CMA-PM business email.

Avoid using personal phone numbers or personal email for routine property management.

Important tenant communications should be documented.

## 13. Property Inspections

CMA-PM should conduct reasonable inspections consistent with lease and law.

Types:
- move-in;
- exterior review;
- scheduled interior review;
- maintenance inspection;
- move-out.

Use photos and notes for material issues.

## 14. Delinquency

Use a repeatable process rather than informal promises.

```text
Rent Delinquent
      ↓
DoorLoop records balance
      ↓
Apply lawful late fee if applicable
      ↓
Check current Maryland/local notice rules
      ↓
Send required notice
      ↓
Document delivery
      ↓
Escalate as legally appropriate
```

Do not invent unsupported administrative, eviction, or processing fees.

## 15. Bookkeeping

DoorLoop may maintain operational records, but CMA's internal bookkeeping must still associate every transaction with the correct property.

Minimum property-level fields:
- date;
- Property LLC;
- property;
- tenant/vendor;
- category;
- amount;
- payment method;
- receipt/invoice;
- notes.

The CMA custom app should remain the preferred internal source for property-level performance, reserves, CMA-I capital deployment, owner economics, and portfolio analysis.

## 16. Growth Strategy

Start with DoorLoop at the plan level that supports CMA's actual operating needs.

Do not pay for API access before there is a real integration to build.

Upgrade when:
- portfolio size grows;
- CMA needs advanced accounting;
- CMA needs API access;
- automation saves meaningful time;
- CMA wants AI to read/write operational property data.

## 17. Outside Property Manager Fallback

If CMA later hires an outside property manager, CMA-PM should continue to oversee rent collection, delinquency, maintenance, vendor costs, lease renewals, vacancy, reserve balances, inspections, compliance, and manager performance.
