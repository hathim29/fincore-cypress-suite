import loginPage from '../../pages/LoginPage';

describe('Login', () => {

    beforeEach(() => loginPage.visit());

    // ── Happy path ─────────────────────────────────────────────
    it('shows the login form with no error on load', () => {
        loginPage.username.should('be.visible');
        loginPage.password.should('have.attr', 'type', 'password');
        loginPage.submitBtn.should('be.enabled');
        loginPage.error.should('not.be.visible');
    });

    it('logs in as admin and lands on the dashboard', () => {
        loginPage.loginAs(Cypress.env('adminUser'), Cypress.env('adminPass'));
        loginPage.success.should('contain.text', 'Login successful');
        cy.location('pathname').should('eq', '/dashboard.html');
        cy.window().its('sessionStorage').invoke('getItem', 'fincore_user')
            .then(JSON.parse).should('include', { username: 'admin', role: 'admin' });
    });

    it('logs in as viewer with the viewer role', () => {
        loginPage.loginAs(Cypress.env('viewerUser'), Cypress.env('viewerPass'));
        cy.location('pathname').should('eq', '/dashboard.html');
        cy.window().its('sessionStorage').invoke('getItem', 'fincore_user')
            .then(JSON.parse).its('role').should('eq', 'viewer');
    });

    it('submits with the Enter key', () => {
        loginPage.username.type(Cypress.env('adminUser'));
        loginPage.password.type(`${Cypress.env('adminPass')}{enter}`, { log: false });
        cy.location('pathname').should('eq', '/dashboard.html');
    });

    // ── Negative path (data-driven) ────────────────────────────
    const invalid = [
        { user: 'wronguser', pass: 'wrongpassword', why: 'unknown user' },
        { user: 'admin', pass: 'wrongpassword', why: 'wrong password' },
        { user: 'ADMIN', pass: 'admin123', why: 'username is case-sensitive' },
    ];
    invalid.forEach(({ user, pass, why }) => {
        it(`rejects invalid credentials — ${why}`, () => {
            loginPage.loginAs(user, pass).shouldShowError('Invalid username or password');
            cy.location('pathname').should('eq', '/login.html');
        });
    });

    it('requires both username and password', () => {
        loginPage.loginAs('', '').shouldShowError('Username and password are required');
        loginPage.visit().loginAs('admin', '').shouldShowError('Username and password are required');
    });

    it('treats a whitespace-only username as empty', () => {
        loginPage.loginAs('   ', 'admin123').shouldShowError('Username and password are required');
    });
});

describe('Access control', () => {

    it('redirects to login when opening a page without a session', () => {
        cy.visit('/dashboard.html');
        cy.location('pathname').should('eq', '/login.html');
    });

    it('hides admin-only actions from a viewer', () => {
        cy.visitAs('viewer', '/loans.html');
        cy.getByTestId('loans-body').find('tr').should('have.length.greaterThan', 0);
        cy.getByTestId('add-loan-btn').should('not.be.visible');
    });

    it('redirects a viewer away from customer onboarding', () => {
        cy.visitAs('viewer', '/onboarding.html');
        cy.location('pathname').should('eq', '/customers.html');
    });
});
