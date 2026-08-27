# 16 — CMA Data, AI & API Strategy

**Status:** Final internal technology strategy; security and retention rules are controlled by Doc 22  
**Version:** 2026-08-26.5  
**Effective date:** [EFFECTIVE DATE]  
**Last reviewed:** 2026-08-26  
**Document owner:** CMA-I / CMA-PM  
**Approved by:** Pending  
**Related documents:** 06, 11, 12, 22

## Purpose

This document defines the role of the CMA custom app, DoorLoop, banking data, APIs, and AI. Doc 22 controls access, privacy, retention, backup, and incident response.

## 1. System Boundaries

```text
DoorLoop
├── applicants and tenants
├── leases and payments
├── maintenance and vendors
└── operating property records

Bluevine
└── CMA-I / CMA-PM operating banking

Maryland Security Deposit Bank
└── CMA-PM security-deposit account and liability support

CMA App
├── Property Analysis
├── deal comparison
├── property subledgers
├── reserves
├── CMA-I capital and Member Loans
├── member economics
├── portfolio reporting
└── AI-supported analysis

Google Drive
└── durable document archive
```

Do not rebuild tenant operations in the CMA app when DoorLoop already handles them well.

## 2. Stable Identifiers

Every property should have one internal identifier used across systems.

```text
CMA-PROP-001
Property name: Flamingo
Property LLC: Flamingo Properties LLC
DoorLoop ID: [ID]
Bank / ledger tag: Flamingo
Drive folder: /Properties/Flamingo
```

Also maintain stable IDs for:

- Property LLCs;
- tenants;
- leases;
- vendors;
- capital transactions;
- Member Loans.

## 3. Near-Term Operating Model

API integration is not required on Day 1.

Initially:

- use DoorLoop normally;
- use exports for reconciliation and reporting;
- archive executed documents in Google Drive;
- maintain CMA-I capital, Member Loan, and residual-economics records in the CMA app or controlled accounting schedules;
- keep the Maryland security-deposit liability ledger separate from rent revenue.

## 4. Future API Model

When automation is justified:

```text
DoorLoop / Bank / Accounting APIs
              ↓
           CMA App
              ↓
       Reporting and AI
```

Potential use cases:

- delinquency summary;
- lease expirations in the next 90 or 120 days;
- open maintenance tickets;
- actual versus projected property expenses;
- reserve shortfalls;
- vendor spend trends;
- recurring repair patterns;
- property and portfolio summaries.

## 5. Human Review Boundary

AI may:

- summarize;
- compare;
- flag;
- draft;
- recommend.

AI may not autonomously:

- approve or deny an applicant;
- send a legal notice;
- execute a lease;
- move security-deposit funds;
- authorize a material repair;
- change capital or tax records;
- make a member distribution.

A human with the required company authority must approve high-impact actions.

## 6. Data Quality and Reconciliation

An integration should not be considered complete unless it addresses:

- duplicate records;
- missing property IDs;
- reversed or failed payments;
- split transactions;
- refunds and chargebacks;
- security-deposit liabilities;
- effective dates;
- audit trail;
- source-system timestamps.

Bank balances do not replace property subledgers.

## 7. Company Records and Exports

CMA-I and CMA-PM should retain independent copies of critical records, including:

- executed leases;
- tenant notices;
- security-deposit accounting;
- material inspection and maintenance records;
- vendor invoices;
- financial reports;
- tax and governance records.

A SaaS platform should not be the only copy of a critical record.

## 8. ChatGPT and Claude

### ChatGPT

Primary uses:

- operating strategy;
- research;
- policy drafting;
- financial and portfolio reasoning;
- document review;
- report analysis.

### Claude

Primary uses:

- CMA app coding;
- UI implementation;
- API integration;
- automation;
- refactoring and debugging.

The tools may overlap. API use is separate from consumer chat subscriptions.

## 9. API Upgrade Trigger

Pay for live API access when one or more of these is true:

- manual copying takes meaningful time each month;
- the portfolio is large enough that live operational dashboards matter;
- AI requires current payment, lease, or maintenance data;
- automated reconciliation produces measurable value;
- multiple operators require synchronized systems;
- expected labor savings justify the subscription and implementation cost.

Until then, keep data models API-ready without paying for unused access.

## 10. Security and Continuity

Follow Doc 22 for:

- MFA and password management;
- sensitive-data handling;
- AI data restrictions;
- retention and deletion;
- backups and exports;
- backup-operator access;
- data-incident response;
- vendor offboarding.
