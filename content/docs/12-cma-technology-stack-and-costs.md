# 12 — CMA Technology Stack & Cost Plan

## Purpose

This document lists the technology and infrastructure CMA-PM needs to operate professionally without unnecessary software overlap.

Prices change. Verify current pricing before purchasing.

## 1. Business Infrastructure

| Need | Preferred Tool | Initial Plan | Approx. Cost |
|---|---|---|---:|
| Business mailing address | Stable | Business address plan | ~$49/month |
| Registered agent | Maryland resident agent or Stable add-on | As needed | Variable |
| Domain | Domain registrar | 1 domain | ~$15–$25/year |
| Business email/files | Google Workspace | Business Starter | ~$7/user/month |
| Business phone | Google Voice | Starter | ~$10/user/month |

Suggested business identity:

```text
CMA Property Management LLC
[Stable Business Address]
[Google Voice Number]
rentals@[CMA DOMAIN]
```

## 2. Banking

### Bluevine

Initial structure:

```text
CMA-PM Business Checking
├── Operating Account
└── Security Deposit Account
```

Use Bluevine primarily as the bank, not necessarily as the tenant-facing rent platform.

Approximate base platform cost:

**$0/month on Standard**, subject to current Bluevine terms.

## 3. Property Management Platform

### Preferred: DoorLoop

Use for:
- listings;
- applications;
- screening;
- leases;
- e-signatures;
- rent collection;
- tenant portal;
- maintenance;
- messaging;
- vendor records;
- reports.

### Initial Recommendation

Start with the lowest DoorLoop plan that provides the operational features CMA actually needs.

Do not upgrade solely for API access until CMA is ready to build a live integration.

Approximate current pricing previously reviewed:

| DoorLoop Tier | Approx. Monthly Cost* | Best For |
|---|---:|---|
| Starter | ~$69/month | Initial CMA portfolio |
| Pro | ~$149/month | More advanced operations |
| Premium | ~$209/month | API / advanced integrations |

*Pricing may require annual billing and may change.

Possible transaction fees may apply for e-signatures on lower tiers, screening, card payments, ACH depending on plan, and optional services.

## 4. Maintenance Marketplace / Optional Warranty

### Super

Recommended role:

**Supplemental maintenance marketplace and optional property-specific warranty layer.**

CMA-PM should continue to receive and track tenant maintenance requests in DoorLoop first.

```text
Tenant
   |
DoorLoop
   |
CMA-PM triage
   |
Super or CMA Vendor
```

Use Super for supported on-demand repair and maintenance categories when its pricing, availability, and response time are competitive. Paid home-system / appliance coverage should be evaluated separately for each property rather than treated as a required portfolio-wide subscription.

Approximate pricing previously reviewed:

| Super Option | Approx. Cost | CMA Use |
|---|---:|---|
| Maintenance marketplace/access | $0-variable | Initial vendor option |
| Simple coverage | ~$525/property/year | Optional |
| Signature coverage | ~$849/property/year | Optional |
| Lux coverage | ~$1,449/property/year | Optional |

Verify current pricing, coverage, service-call fees, exclusions, caps, and availability for each property before purchase.


## 5. AI Tools

### ChatGPT

Recommended:

**ChatGPT Plus** initially.

Approximate cost:

**$20/month**

Use for:
- CMA strategy;
- research;
- drafting;
- document review;
- property comparisons;
- operating procedures;
- workflow design.

### Claude

Recommended:

**Claude Pro**

Approximate cost:

**$17–$20/month equivalent**

Use for:
- CMA custom app development;
- coding;
- UI iteration;
- automation;
- API integration;
- debugging.

## 6. CMA Custom App

Purpose:

```text
CMA App
├── Property Analysis
├── Deal Comparison
├── Property-Level Bookkeeping
├── Operating Reserves
├── CMA-I Capital Tracking
├── 51/49 Residual Economics
├── Portfolio Reporting
└── Future AI Tools
```

Use the term **Property Analysis** in the UI instead of “underwriting” if clearer.

Initial hosting/API costs:

**$0–$25/month** depending on architecture.

## 7. Document Storage

Use **Google Drive** through Google Workspace.

Recommended structure:

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

DoorLoop can hold operational records while Google Drive remains the long-term company archive.

## 8. Recommended Lean Monthly Cost

Approximate fixed monthly software cost at startup:

| Service | Approx. Monthly |
|---|---:|
| Stable | $49 |
| Google Workspace | $7 |
| Google Voice | $10 |
| Bluevine | $0 |
| DoorLoop Starter | $69 |
| Super maintenance access | $0-variable |
| ChatGPT Plus | $20 |
| Claude Pro | ~$17–$20 |
| Domain equivalent | ~$2 |
| CMA app hosting | $0–$25 |
| **Estimated Total** | **~$174–$202/month** |

Approximate annual fixed software spend:

## ~$2,100–$2,425/year

before registered-agent fees, insurance, CPA/bookkeeping, Property LLC fees, screening transaction fees, rent payment processing, maintenance/repairs, utilities, vendor services, and any optional Super warranty premiums.

A paid Super warranty, if selected, should be treated as a **property-level operating cost**, not a required CMA-PM software subscription.

## 9. Tools We Probably Do Not Need Separately

If DoorLoop performs well, CMA likely does not need separate paid subscriptions for:
- Avail;
- TurboTenant;
- RentRedi;
- SmartMove as a standalone workflow;
- DocuSign;
- separate maintenance software;
- separate tenant messaging software;
- Bluevine recurring rent invoicing.

## 10. Upgrade Triggers

Upgrade software only when there is a specific need.

### DoorLoop Premium
Consider when:
- API access becomes necessary;
- CMA builds live AI integrations;
- higher-tier payment economics justify the cost;
- advanced automation saves enough time.

### Google Workspace
Add users only when another person needs a true separate inbox/account.

Use aliases where appropriate.

### Bluevine
Upgrade only when sub-account limits, payment features, or banking needs justify it.

## 11. Annual Technology Review

Once per year, compare:
- total software cost;
- transaction fees;
- duplicate functionality;
- unused subscriptions;
- API needs;
- number of properties;
- time saved;
- tenant experience;
- bookkeeping quality.

The goal is not to use the most software.

The goal is to use the smallest stack that makes CMA-PM professional, reliable, and scalable.
