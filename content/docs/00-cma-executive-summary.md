# 00 — CMA Executive Summary

## Purpose

This document is the highest-level overview of how the CMA real-estate system is structured and operated.

It is intended to help a member, attorney, CPA, lender, advisor, or future operator quickly understand:

- what each entity does;
- who controls what;
- how money flows;
- how properties are owned;
- how rentals are managed;
- how banking is structured;
- how technology supports operations;
- how the rest of the CMA document set fits together.

This document is a summary only. If there is a conflict between this summary and a controlling operating agreement, contract, lease, tax document, or applicable law, the controlling document or law governs.

---

# 1. CMA at a Glance

```text
CMA-I
├── owns Property LLCs
├── owns CMA-PM
└── holds member governance and economics

Property LLC
└── owns the rental property / is the landlord

CMA-PM
├── tenant-facing manager / agent
├── leasing administration
├── rent administration
├── maintenance coordination
├── bookkeeping workflows
└── security deposit administration
```

---

# 2. Core Entities

## CMA Investments LLC

Short name: **CMA-I**

Role:
- parent holding / investment company;
- owns CMA-PM;
- owns the Property LLCs;
- receives member capital;
- deploys capital into acquisitions;
- receives excess property cash;
- receives sale / refinance proceeds;
- makes owner distributions;
- tracks member economics.

## CMA Property Management LLC

Short name: **CMA-PM**

Role:
- manager / agent for the Property LLCs;
- tenant-facing operating company;
- leasing administration;
- rent collection administration;
- maintenance coordination;
- vendor coordination;
- tenant communication;
- property-level bookkeeping workflows;
- security deposit administration.

CMA-PM does **not** own the rental houses.

Initial internal management fee: **$0** unless CMA later changes it.

## Property LLCs

Each rental property is generally held in its own Property LLC.

```text
CMA-I
├── Flamingo Properties LLC
├── Manatee Properties LLC
├── Heron Properties LLC
└── CMA-PM
```

Each Property LLC:
- owns the house;
- is the landlord;
- signs the lease as landlord;
- appoints CMA-PM as manager / agent.

---

# 3. Member Governance

| Member | Governance |
|---|---:|
| Carrie | 51% |
| Cameron | 49% |

Ordinary business decisions are governed by majority rule.

Because Carrie holds 51%, she controls ordinary business disagreements.

Certain fundamental decisions require approval of both Carrie and Cameron, including material changes to:
- governance percentages;
- admission of new members;
- Carrie's capital rights;
- Cameron's Service-Based Profits Interest;
- reverse vesting;
- intended 51/49 residual economics;
- capital hurdle rights;
- succession;
- mergers;
- voluntary dissolution;
- sale of substantially all assets;
- fundamental operating-agreement provisions.

---

# 4. Capital

| Member | Initial Capital |
|---|---:|
| Carrie | Approximately $500,000 |
| Cameron | $0 |

Carrie's contributed capital remains economically attributable to Carrie and is protected by a capital hurdle.

Cameron does not receive a claim on Carrie's existing contributed capital merely because he holds a profits interest.

---

# 5. Cameron's Service-Based Profits Interest

Cameron receives a **49% Service-Based Profits Interest** in exchange for substantial ongoing operating services.

Responsibilities include:
- sourcing properties;
- property analysis;
- acquisition due diligence;
- negotiations;
- closing coordination;
- renovation oversight;
- building and maintaining CMA tools;
- CMA-PM operations;
- vendor oversight;
- outside property-manager oversight;
- bookkeeping/reporting workflows;
- compliance coordination;
- hold / refinance / sell analysis;
- portfolio strategy;
- entity / banking / administrative coordination.

Cameron initially receives no salary or guaranteed annual payment.

The profits interest is intended to be his primary compensation.

---

# 6. Reverse Vesting

Cameron receives the full 49% Service-Based Profits Interest from the Grant Date.

He generally participates in 49% of residual profits and distributions from Day 1 while continuing to perform the required services.

The interest is subject to five-year reverse vesting.

| Completed Year | Nonforfeitable | Still Forfeitable |
|---|---:|---:|
| Grant Date | 0.0% | 49.0% |
| Year 1 | 9.8% | 39.2% |
| Year 2 | 19.6% | 29.4% |
| Year 3 | 29.4% | 19.6% |
| Year 4 | 39.2% | 9.8% |
| Year 5 | 49.0% | 0.0% |

Reverse vesting affects what Cameron permanently keeps. It does **not** reduce his current 49% residual distribution share while the full interest remains outstanding.

If Cameron voluntarily stops performing before full vesting:
- he keeps the nonforfeitable portion;
- he forfeits the remaining forfeitable portion;
- there is no automatic forced buyback of the retained portion.

Death or permanent disability accelerates the remaining forfeitable portion to fully nonforfeitable.

---

# 7. Residual Economics

| Member | Residual Economics |
|---|---:|
| Carrie | 51% |
| Cameron | 49% |

This applies to residual rental profits, appreciation, sale gain, and other residual company economics after applicable obligations and capital rights are respected.

There is no preferred return to Carrie.

---

# 8. Capital Hurdle

Carrie's existing contributed capital is not simply split 51/49.

General sale waterfall:

```text
Sale / Refinance Proceeds
        ↓
Debts / Costs / Taxes / Obligations
        ↓
Return Applicable Unrecovered Capital
        ↓
Split Residual Economics 51% / 49%
```

Example:

```text
Carrie capital associated with property: $200,000
Net sale proceeds: $325,000

Return capital to Carrie: $200,000

Residual: $125,000
Carrie 51%: $63,750
Cameron 49%: $61,250
```

---

# 9. Banking Structure

## CMA-I Operating Account
Use for:
- member capital;
- acquisitions;
- excess property cash;
- sale / refinance proceeds;
- owner distributions;
- CMA-I expenses.

## CMA-PM Operating Account
Use for:
- tenant rent;
- property operating expenses;
- repairs;
- vendors;
- HOA;
- insurance;
- owner-paid utilities;
- property reserves;
- permitted transfers to CMA-I.

## CMA-PM Security Deposit Account
Use only for:
- tenant security deposits;
- lawful refunds;
- lawful deductions / transfers when permitted.

Security deposits are liabilities, not rent revenue.

Each deposit must be tracked by tenant, property, Property LLC, amount, date received, date returned, and deductions if any.

---

# 10. Property Reserves

Current working reserve target:

## $20,000 per rental property

Preferred working rule:

## Minimum $20,000 or approximately 9–12 months of unavoidable carrying costs

Increase when the property has unusually high HOA, property taxes, insurance, debt service, fixed owner-paid utilities, or other unavoidable costs.

This cash reserve is separate from modeled annual vacancy, maintenance, CapEx, and turnover reserves.

---

# 11. Property Analysis

The CMA custom app is the primary tool for analyzing potential investments.

Preferred UI term: **Property Analysis**

The app should evaluate:
- purchase price;
- closing costs;
- expected rent;
- taxes;
- HOA;
- insurance;
- maintenance;
- vacancy;
- CapEx;
- turnover;
- management assumptions;
- Super coverage / maintenance protection if used;
- net cash flow;
- yield;
- cash-on-cash return;
- 10-year return;
- stress scenarios;
- sale assumptions;
- CMA-I capital deployment;
- member economics.

---

# 12. Business Infrastructure

```text
Stable
→ business mailing address

Google Workspace
→ email / Drive / Calendar / Docs

Google Voice
→ business phone

Bluevine
→ banking

DoorLoop
→ tenant/property operations

Super
→ maintenance marketplace / optional warranty

CMA App
→ property analysis / bookkeeping / reserves / economics

ChatGPT + Claude
→ AI / research / software development
```

---

# 13. DoorLoop

DoorLoop is the preferred operational property-management platform.

Use DoorLoop for:
- listings;
- applications;
- screening;
- lease generation;
- e-signatures;
- tenant portal;
- rent collection;
- tenant messaging;
- maintenance requests;
- vendor coordination;
- operational records;
- reports.

DoorLoop should become the tenant-operations system of record.

---

# 14. Super

Super is an optional supplemental maintenance layer.

Use Super when useful for:
- maintenance marketplace services;
- handyman work;
- plumbing;
- HVAC;
- pest control;
- cleaning;
- supported repair categories;
- optional home-system / appliance protection.

DoorLoop remains the maintenance system of record.

```text
Tenant
   ↓
DoorLoop Maintenance Request
   ↓
CMA-PM Triage
   ↓
Super or Preferred CMA Vendor
   ↓
Work Completed
   ↓
Record Closed in DoorLoop
```

CMA should still maintain direct emergency relationships with:
- plumber;
- HVAC;
- electrician;
- locksmith;
- restoration company.

For property analysis, CMA currently models the high Super estimate:

## $1,449 per property / year

as a property-level operating expense when enabled.

---

# 15. Leasing

The actual tenant lease should be created in DoorLoop.

CMA's internal lease document is:

## 10 — CMA Lease Requirements & Addenda

```text
DoorLoop Maryland Lease
        +
CMA Required Terms
        +
Property-Specific Addenda
        ↓
Final Lease
        ↓
E-Sign
```

The lease should identify:

**Landlord:** applicable Property LLC

**Manager / Agent:** CMA Property Management LLC

---

# 16. Tenant Screening

CMA-PM should use objective, written screening criteria.

```text
Application
    ↓
Applicant Authorization
    ↓
Credit / Rental / Eviction / Identity Screening
    ↓
Income Review
    ↓
Prior Landlord Verification
    ↓
Apply CMA Criteria
    ↓
Approve / Conditional / Deny
```

Avoid subjective screening based on appearance, clothing, car cleanliness, personality, “gut feeling,” or protected characteristics.

---

# 17. Leasing & Marketing

```text
Set Market Rent
      ↓
Prepare Property
      ↓
Professional Photos
      ↓
Create Listing
      ↓
Publish / Syndicate
      ↓
Handle Leads
      ↓
Scheduled Showings
      ↓
Application
      ↓
Screening
      ↓
Approval
      ↓
Lease
      ↓
Move-In
```

Pricing should rely on recent comparable rentals rather than mortgage payment or intuition.

Use approximately 3–5 strong rental comparables where practical, comparing similar property type, bedrooms/bathrooms, square footage, upgrades, parking, amenities, and location.

---

# 18. Maintenance

```text
Tenant submits DoorLoop request
      ↓
CMA-PM reviews
      ↓
Emergency?
  ├── Yes → immediate response
  └── No
       ↓
Check Super / CMA Vendor
       ↓
Schedule
       ↓
Complete Work
       ↓
Attach Invoice
       ↓
Tag Expense to Property
       ↓
Close Request
```

---

# 19. Bookkeeping

CMA-PM may use centralized bank accounts, but every transaction must be assigned to the correct property.

Minimum fields:
- date;
- Property LLC;
- property;
- tenant/vendor;
- category;
- amount;
- payment method;
- receipt/invoice;
- notes.

CMA's custom tool should remain the preferred internal system for property-level performance, reserves, CMA-I capital, owner economics, and portfolio reporting.

---

# 20. Digital Records

Preferred long-term archive: **Google Drive**

```text
CMA
├── Corporate
│   ├── CMA-I
│   └── CMA-PM
├── Properties
│   ├── Flamingo
│   │   ├── Acquisition
│   │   ├── Lease
│   │   ├── Tenant
│   │   ├── Inspections
│   │   ├── Maintenance
│   │   ├── HOA
│   │   ├── Insurance
│   │   └── Accounting
│   └── [Next Property]
└── Vendors
```

DoorLoop is the operational system.

Google Drive is the durable company archive.

---

# 21. AI & API Strategy

Near term:
- use DoorLoop normally;
- keep property IDs clean;
- use exports when needed;
- maintain CMA records separately;
- do not pay for API access before there is a real need.

Future:

```text
DoorLoop API
      ↓
CMA App
      ↓
AI / Reporting
```

Potential AI functions:
- summarize property history;
- flag delinquency;
- identify open maintenance issues;
- compare actual expenses to projected expenses;
- flag reserve shortfalls;
- identify upcoming lease expirations;
- summarize vendor activity;
- compare property performance.

AI should initially summarize, analyze, flag, draft, and recommend.

Human review should remain required before high-impact actions.

---

# 22. Succession

## If Carrie dies

Her CMA-I interest, including governance, residual, and capital rights, passes to:

**Jay Flatt**

## If Cameron dies

His remaining reverse-vested 49% accelerates to fully nonforfeitable.

His full CMA-I interest then passes to:

**Jay Flatt**

Cameron's permanent disability also accelerates the remaining forfeitable portion to fully nonforfeitable.

Controlling estate documents and applicable law govern actual transfer mechanics.

---

# 23. Current Technology Cost Direction

| Service | Approx. Monthly |
|---|---:|
| Stable | $49 |
| Google Workspace | $7 |
| Google Voice | $10 |
| Bluevine | $0 |
| DoorLoop Starter | ~$69 |
| ChatGPT Plus | $20 |
| Claude Pro | ~$17–$20 |
| Domain equivalent | ~$2 |
| CMA app hosting | $0–$25 |
| **Estimated Total** | **~$174–$202/month** |

Super paid warranty coverage is treated as a property-level operating expense if selected, not a required CMA-PM software subscription.

---

# 24. CMA Document Map

## Corporate / Ownership

**00 — CMA Executive Summary**  
High-level map of the entire CMA system.

**01 — How CMA-I Works**  
Plain-English explanation of CMA-I ownership, governance, capital, economics, and operations.

**02 — CMA Investments Operating Agreement**  
Formal CMA-I governance and economic terms.

**03 — CMA Property Management Operating Agreement**  
Formal CMA-PM governance and purpose.

**04 — Property LLC Operating Agreement Template**  
Template for each property-owning LLC.

**05 — Property Management Agency Agreement Template**  
Agreement appointing CMA-PM as manager / agent for a Property LLC.

**06 — Banking, Bookkeeping & Distribution Policy**  
How money, accounts, records, reserves, and distributions work.

**07 — Maryland Property Acquisition & Compliance Playbook**  
Exact-address compliance review for Maryland acquisitions and rentals.

**08 — Capital, Tax & Succession Plan**  
Capital rights, tax structure, succession, and related planning.

**09 — Cameron Service Profits Interest Agreement**  
Cameron's 49% Service-Based Profits Interest and reverse vesting.

## Leasing / Property Management

**10 — CMA Lease Requirements & Addenda**  
Internal checklist for the lease DoorLoop generates.

**11 — CMA-PM Self-Management Strategy**  
How CMA-PM self-manages the rental portfolio.

**12 — CMA Technology Stack & Cost Plan**  
Software, infrastructure, and operating costs.

**13 — CMA Tenant Screening & Leasing Policy**  
Objective tenant screening and leasing standards.

**14 — CMA Property Onboarding & Tenant Home Guide**  
Property setup, move-in, move-out, and tenant operating information.

**15 — CMA Maintenance, Vendor & Inspection Playbook**  
Repairs, Super, vendors, inspections, and recurring maintenance.

**16 — CMA Data, AI & API Strategy**  
How DoorLoop, the CMA app, Google Drive, ChatGPT, Claude, and future APIs fit together.

---

# 25. Overall Operating Philosophy

## Fewer systems, clearly defined.

Use:
- Property LLCs for ownership;
- CMA-PM for tenant operations;
- Bluevine for banking;
- DoorLoop for property-management operations;
- Super as a supplemental maintenance option;
- Google Workspace for business identity and records;
- the CMA app for investment and owner intelligence;
- AI for support, analysis, and automation.

Avoid duplicating workflows across multiple tools unless there is a clear operational reason.

The system should remain simple enough to operate with a small portfolio while being structured well enough to scale.
