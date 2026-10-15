/**
 * Custom Cypress commands
 *
 *   cy.getByTestId('login-button')            → [data-testid="login-button"]
 *   cy.login('admin')                         → log in once per role, reused via cy.session
 *   cy.visitAs('viewer', '/loans.html')       → logged-in visit in one line
 *   cy.api('POST', '/api/customers', body)    → API call that returns the response (no fail on 4xx)
 *   cy.createCustomer({...})                  → create test data through the API
 *   cy.createLoan({...})                      → create a loan through the API
 */

// ── Selectors ──────────────────────────────────────────────────
Cypress.Commands.add('getByTestId', (id, options) => cy.get(`[data-testid="${id}"]`, options));

// ── Authentication ─────────────────────────────────────────────
// Logs in through the real UI the first time, then cy.session caches the
// browser state (FinCore keeps the session in sessionStorage) and restores
// it instantly for every later test that logs in with the same role.
Cypress.Commands.add('login', (role = 'admin') => {
    const user = Cypress.env(`${role}User`);
    const pass = Cypress.env(`${role}Pass`);

    cy.session(['fincore', role], () => {
        cy.visit('/login.html');
        cy.getByTestId('username-input').type(user);
        cy.getByTestId('password-input').type(pass, { log: false });
        cy.getByTestId('login-button').click();
        cy.location('pathname').should('include', '/dashboard.html');
    }, {
        // Re-login only if the cached session is no longer valid
        validate() {
            cy.window().then(win => {
                const s = JSON.parse(win.sessionStorage.getItem('fincore_user') || '{}');
                expect(s.role, 'cached role').to.eq(role);
            });
        },
        cacheAcrossSpecs: true,
    });
});

Cypress.Commands.add('visitAs', (role, path) => {
    cy.login(role);
    cy.visit(path);
});

// ── API helpers ────────────────────────────────────────────────
Cypress.Commands.add('api', (method, url, body) =>
    cy.request({ method, url, body, failOnStatusCode: false }));

const unique = () => `${Date.now()}${Cypress._.random(100, 999)}`;

Cypress.Commands.add('createCustomer', (overrides = {}) => {
    const id = unique();
    const customer = {
        name: 'Cypress Test Customer',
        email: `cypress.${id}@example.com`,
        phone: '9876543210',
        city: 'Chennai',
        kyc_status: 'verified',
        ...overrides,
    };
    return cy.api('POST', '/api/customers', customer).then(res => {
        expect(res.status, 'create customer').to.eq(201);
        return res.body;
    });
});

Cypress.Commands.add('createLoan', (overrides = {}) => {
    const loan = {
        customer_id: 1,
        loan_type: 'personal',
        principal_amount: 100000,
        interest_rate: 10.5,
        tenure_months: 12,
        ...overrides,
    };
    return cy.api('POST', '/api/loans', loan).then(res => {
        expect(res.status, 'create loan').to.eq(201);
        return res.body;
    });
});
