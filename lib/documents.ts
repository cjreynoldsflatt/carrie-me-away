import fs from 'fs'
import path from 'path'

export interface Document {
  slug: string
  title: string
  updatedAt: string
  content: string
}

function readDoc(filename: string): string {
  const filepath = path.join(process.cwd(), 'content/docs', filename)
  if (!fs.existsSync(filepath)) return `_Content not yet loaded for ${filename}._`
  return fs.readFileSync(filepath, 'utf-8')
}

export function getDocuments(): Document[] {
  return [
  {
    slug: 'cma-executive-summary',
    title: '00 — CMA Executive Summary',
    updatedAt: '2026-08-26',
    content: readDoc('00-cma-executive-summary.md'),
  },
  {
    slug: 'how-cma-works',
    title: '01 — How CMA-I Works',
    updatedAt: 'August 25, 2026',
    content: readDoc('01-how-cma-i-works.md'),
  },
  {
    slug: 'operating-agreement',
    title: '02 — CMA Investments Operating Agreement',
    updatedAt: 'August 25, 2026',
    content: readDoc('02-cma-investments-operating-agreement.md'),
  },
  {
    slug: 'cma-pm-operating-agreement',
    title: '03 — CMA Property Management Operating Agreement',
    updatedAt: 'August 25, 2026',
    content: readDoc('03-cma-property-management-operating-agreement.md'),
  },
  {
    slug: 'property-llc-operating-agreement',
    title: '04 — Property LLC Operating Agreement Template',
    updatedAt: 'August 25, 2026',
    content: readDoc('04-property-llc-operating-agreement-template.md'),
  },
  {
    slug: 'property-management-agency-agreement',
    title: '05 — Property Management & Agency Agreement Template',
    updatedAt: 'August 25, 2026',
    content: readDoc('05-property-management-agency-agreement-template.md'),
  },
  {
    slug: 'banking-bookkeeping-distribution-policy',
    title: '06 — Banking, Bookkeeping & Distribution Policy',
    updatedAt: 'August 25, 2026',
    content: readDoc('06-banking-bookkeeping-distribution-policy.md'),
  },
  {
    slug: 'maryland-acquisition-playbook',
    title: '07 — Maryland Property Acquisition & Compliance Playbook',
    updatedAt: 'August 25, 2026',
    content: readDoc('07-maryland-property-acquisition-compliance-playbook.md'),
  },
  {
    slug: 'capital-tax-succession-plan',
    title: '08 — Capital, Tax & Succession Plan',
    updatedAt: 'August 25, 2026',
    content: readDoc('08-capital-tax-succession-plan.md'),
  },
  {
    slug: 'cameron-service-profits-interest-agreement',
    title: '09 — Cameron Service & Profits Interest Agreement',
    updatedAt: 'August 25, 2026',
    content: readDoc('09-cameron-service-profits-interest-agreement.md'),
  },
  {
    slug: 'cma-lease-requirements-and-addenda',
    title: '10 — CMA Lease Requirements & Addenda',
    updatedAt: 'August 25, 2026',
    content: readDoc('10-cma-lease-requirements-and-addenda.md'),
  },
  {
    slug: 'cma-pm-self-management-strategy',
    title: '11 — CMA-PM Self-Management Strategy',
    updatedAt: 'August 25, 2026',
    content: readDoc('11-cma-pm-self-management-strategy.md'),
  },
  {
    slug: 'cma-technology-stack-and-costs',
    title: '12 — CMA Technology Stack & Cost Plan',
    updatedAt: 'August 25, 2026',
    content: readDoc('12-cma-technology-stack-and-costs.md'),
  },
  {
    slug: 'cma-tenant-screening-and-leasing-policy',
    title: '13 — CMA Tenant Screening & Leasing Policy',
    updatedAt: 'August 25, 2026',
    content: readDoc('13-cma-tenant-screening-and-leasing-policy.md'),
  },
  {
    slug: 'cma-property-onboarding-and-tenant-home-guide',
    title: '14 — CMA Property Onboarding & Tenant Home Guide',
    updatedAt: 'August 25, 2026',
    content: readDoc('14-cma-property-onboarding-and-tenant-home-guide.md'),
  },
  {
    slug: 'cma-maintenance-vendor-and-inspection-playbook',
    title: '15 — CMA Maintenance, Vendor & Inspection Playbook',
    updatedAt: 'August 25, 2026',
    content: readDoc('15-cma-maintenance-vendor-and-inspection-playbook.md'),
  },
  {
    slug: 'cma-data-ai-and-api-strategy',
    title: '16 — CMA Data, AI & API Strategy',
    updatedAt: 'August 25, 2026',
    content: readDoc('16-cma-data-ai-and-api-strategy.md'),
  },
  {
    slug: 'cma-leasing-and-marketing-playbook',
    title: '17 — CMA Leasing & Marketing Playbook',
    updatedAt: '2026-08-26',
    content: readDoc('17-cma-leasing-and-marketing-playbook.md'),
  },
  {
    slug: 'cma-wear-tear-and-security-deposit-guide',
    title: '18 — CMA Wear, Tear & Security Deposit Guide',
    updatedAt: '2026-08-26',
    content: readDoc('18-cma-wear-tear-and-security-deposit-guide.md'),
  },
]
}
