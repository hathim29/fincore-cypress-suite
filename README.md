# FinCore Bank: Cypress Test Suite

[![Cypress Tests](https://github.com/hathim29/fincore-cypress-suite/actions/workflows/cypress.yml/badge.svg)](https://github.com/hathim29/fincore-cypress-suite/actions/workflows/cypress.yml)

An end-to-end and API test suite built **from scratch in Cypress** for **FinCore Bank**, a full-stack banking app (customers, KYC onboarding, accounts, loans & EMIs, credit cards, transactions).

The same app is also automated in Playwright + TypeScript in [fincore-bank-qa-lab](https://github.com/hathim29/fincore-bank-qa-lab), so the two repos show one application tested with both frameworks.

> Built and maintained by **Hathim Al Ghifari**, Senior QA Engineer · [LinkedIn](https://linkedin.com/in/hathimjk3)

---

## What's tested

| Spec | Area | Highlights |
|---|---|---|
| `auth/login.cy.js` | Login & access control | Admin and viewer login, Enter key, data-driven invalid logins, empty and whitespace input, redirect without a session, role-based UI |
| `customers/customers.cy.js` | Customers | Search (debounced, waits on the API call), empty result, KYC filter, details popup, admin-only actions |
| `onboarding/onboarding.cy.js` | 4-step KYC wizard | Field validation, PAN and Aadhaar rules (fixture-driven), Back keeps data, **full onboarding end to end** with the result checked through the API |
| `loans/loans.cy.js` | Loans & EMI | Status filter, EMI preview maths (₹8,814.86), create loan, **pay an EMI** checked through both the UI and the API, 120-month schedule, viewer is read-only |
| `dashboard/dashboard.cy.js` | Dashboard | Stat cards match the API response, every card drills into a filtered list (data-driven) |
| `api/customers-api.cy.js` | REST API | Response shape, 201 / 400 / 404 paths, duplicate email, server-side EMI calculation |
| `network/network-stubbing.cy.js` | UI states | `cy.intercept`: empty state (fixture), API down (`forceNetworkError`), slow response (`setDelay`), request spying |

**50 Cypress tests across 7 specs**, plus a **Postman collection of 46 requests and 226 assertions** run by **Newman** (below).

## Cypress features demonstrated

| Feature | Where | Why it matters |
|---|---|---|
| `cy.session` + custom `cy.login(role)` | `support/commands.js` | Logs in through the real UI once per role, then restores the session instantly for every later test |
| Custom commands | `getByTestId`, `visitAs`, `api`, `createCustomer`, `createLoan` | Readable tests, and test data created through the API |
| Page Object Model | `cypress/pages/` | Selectors and flows live in one place |
| `cy.intercept`: **wait** | Page objects | The intercept is registered *before* the action, so the response is never missed (no race conditions) |
| `cy.intercept`: **stub / spy / delay / fail** | `network-stubbing.cy.js` | Tests empty, error and loading states that real data can't produce on demand |
| `cy.clock()` / `cy.tick()` | Onboarding end-to-end test | Fast-forwards a 20-second processing animation, so the test takes seconds instead of 20+ |
| `cy.request` API testing | `api/`, plus checks behind the UI tests | Verifies through the API what the UI claims to have done |
| Fixtures | `cypress/fixtures/` | Test data kept apart from test logic |
| Data-driven tests | Login, dashboard, PAN checks | One test definition, many inputs |
| Retries + test isolation | `cypress.config.js` | Retries once on CI, never while developing, and each test starts with a fresh browser state |

## API tests with Postman + Newman

The same API is also covered by a Postman collection (`postman/`). Newman, Postman's command-line runner, runs it without opening Postman, locally and on every CI build.

| | |
|---|---|
| Collection | `postman/fincore-api.postman_collection.json`: 7 folders (Dashboard, Customers, Accounts, Loans, Loan Repayment, Credit Cards, Transactions) |
| Size | 46 requests, 226 assertions |
| Style | Requests chain together: IDs created by one request are saved as collection variables and used by the next (create loan → pay first EMI → pay second EMI → check loan score) |
| Checks on every request | Collection-level tests for response time and JSON content type |
| Report | `newman/report.html` (htmlextra), plus JUnit XML on CI |

```bash
npm run api:test        # app must be running on http://localhost:3000
```
Open `newman/report.html` in a browser for the full report. To point it at another environment, change `baseUrl`:
```bash
npx newman run postman/fincore-api.postman_collection.json --env-var baseUrl=https://fincore-qalab.com
```

## Project structure

```
cypress/
  e2e/            specs grouped by feature (auth, customers, onboarding, loans, dashboard, api, network)
  pages/          page objects
  fixtures/       test data
  support/        custom commands + global hooks
cypress.config.js
.github/workflows/cypress.yml   CI: fresh Postgres → schema → seed → app → Cypress
db/  routes/  public/  server.js   the FinCore app under test (Node.js / Express / PostgreSQL)
postman/          Postman collection + environment, run by Newman
newman/           Newman HTML report (generated, not committed)
```

## Run it locally

**Prerequisites:** Node.js 20+ and a PostgreSQL database.

```bash
npm install
cp .env.example .env            # set DATABASE_URL (and DB_SSL=false for a local Postgres)
npm run db:schema               # create tables (needs psql; on Windows: psql "your-DATABASE_URL" -f db/schema.sql)
npm run db:seed                 # load demo data
npm start                       # app on http://localhost:3000
```

In a second terminal:

```bash
npm run cy:open                 # Cypress app: pick a spec and watch it run
npm run cy:run                  # headless run of the whole suite
npx cypress run --spec "cypress/e2e/loans/**"           # one feature
npx cypress run --spec "cypress/e2e/auth/login.cy.js"   # one spec
npm run api:test                # Postman collection through Newman
```

Run a single test while developing: change `it(` to `it.only(` in the spec, then run that spec.

**Another environment:** point the suite at any deployed FinCore instance.
```bash
CYPRESS_BASE_URL=https://fincore-qalab.com npm run cy:run                # macOS / Linux / Git Bash
$env:CYPRESS_BASE_URL="https://fincore-qalab.com"; npm run cy:run        # Windows PowerShell
```

Demo logins: `admin / admin123` and `viewer / viewer123`.

## CI

Every push and pull request runs the suite on GitHub Actions. The workflow:
1. starts a **throwaway PostgreSQL** container, so tests never touch shared data
2. creates the schema and seeds fresh demo data
3. starts the app and runs Cypress in Chrome
4. re-seeds the data and runs the Postman collection through Newman
5. turns any failure into an annotation on the run page and writes a results table for each suite
6. uploads the Newman HTML report, and screenshots of any Cypress failure, as build artifacts

## The app under test

FinCore Bank is a deliberately realistic practice target: role-based access (admin / viewer), customer onboarding with KYC rules, loans with EMI schedules and a loan score, credit cards, and transactions. It has a REST API with Swagger docs at `/api-docs`. See [CHALLENGES.md](CHALLENGES.md) for exploratory-testing challenges.
