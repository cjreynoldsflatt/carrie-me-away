# 16 — CMA Data, AI & API Strategy

## Purpose

This document defines how CMA can use property-management data in its own software and AI tools over time.

## 1. Principle

Do not build custom software for tasks that a mature property-management platform already handles well.

Use DoorLoop for tenant operations.

Use the CMA app for investment intelligence and owner-level decision-making.

## 2. System Roles

```text
DoorLoop
├── Properties
├── Tenants
├── Applications
├── Leases
├── Payments
├── Maintenance
├── Vendors
└── Operational Records

Bluevine
├── Operating Bank Account
└── Security Deposit Bank Account

CMA App
├── Property Analysis
├── Deal Comparison
├── Property Bookkeeping
├── Reserves
├── Capital Tracking
├── 51/49 Economics
├── Portfolio Reporting
└── AI Layer
```

## 3. Near-Term Strategy

Do not require API integration on Day 1.

Start by:
- operating DoorLoop normally;
- maintaining CMA property IDs;
- maintaining clean Property LLC names;
- exporting records when needed;
- storing executed documents in Google Drive;
- keeping CMA's own property-analysis records separate.

## 4. Future API Strategy

When the portfolio is large enough to justify automation, consider DoorLoop's API-enabled tier.

Potential data flows:

```text
DoorLoop API
      ↓
CMA App
      ↓
AI / Reporting
```

Potential AI questions:
- Which tenants are currently delinquent?
- Which properties had the most maintenance expense this year?
- Which recurring issues suggest a capital replacement?
- Which leases expire in the next 90 days?
- Which properties have open maintenance tickets older than 7 days?
- Summarize the operating history for Flamingo.
- Compare actual expenses against the original property analysis.
- Which properties are below their operating reserve target?

## 5. AI Actions

Initially, AI should mostly:
- summarize;
- analyze;
- flag;
- draft;
- recommend.

Avoid allowing AI to automatically:
- approve/deny tenants;
- send legal notices;
- move security-deposit funds;
- execute leases;
- authorize large repairs;
- change accounting records;

without a human review step.

## 6. Property IDs

Every CMA system should use a stable internal property identifier.

Example:

```text
CMA-PROP-001
Property Name: Flamingo
Property LLC: Flamingo Properties LLC
DoorLoop ID: [ID]
Bluevine Ledger Tag: Flamingo
Google Drive Folder: /Properties/Flamingo
```

This makes future syncing much easier.

## 7. Data Ownership

CMA should retain independent copies of important records, including:
- executed leases;
- tenant notices;
- move-in/out records;
- material inspection records;
- security-deposit accounting;
- vendor invoices;
- financial reports;
- tax records.

Do not rely on a single SaaS vendor as the only copy of critical company records.

## 8. Google Drive Archive

DoorLoop is the operational system.

Google Drive is the durable document archive.

Suggested automation later:

```text
Signed DoorLoop Lease
      ↓
Automatically copy PDF
      ↓
Google Drive / Properties / [Property] / Lease
```

## 9. ChatGPT + Claude Roles

### ChatGPT
Best suited for:
- operational strategy;
- research;
- reviewing policy;
- analyzing reports;
- drafting communications;
- summarizing property history;
- portfolio reasoning.

### Claude
Best suited for:
- CMA app coding;
- API integration;
- UI implementation;
- automation scripts;
- software refactors.

Either tool may overlap. The distinction is operational convenience, not a legal requirement.

## 10. API Upgrade Trigger

Pay for API access when at least one of these becomes true:
- manual copying takes meaningful time each month;
- CMA has enough units that operational dashboards matter;
- AI needs live lease/payment/maintenance data;
- automated bookkeeping reconciliation becomes valuable;
- multiple people need synchronized systems;
- the saved labor exceeds the added subscription cost.

Until then, keep the architecture API-ready without paying for unused capability.
