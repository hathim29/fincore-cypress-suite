import customersPage from '../../pages/CustomersPage';

describe('Customers', () => {

    beforeEach(() => {
        customersPage.visit('admin');
    });

    it('lists customers with a total count', () => {
        customersPage.rows.should('have.length.greaterThan', 0);
        customersPage.totalCount.invoke('text').should('match', /^\d+ customers found$/);
    });

    it('searches by name and shows only matching customers', () => {
        // Create a customer with a unique name so the search result is predictable
        const name = `Zara Cypress${Date.now()}`;
        cy.createCustomer({ name }).then(created => {
            customersPage.search(name);
            customersPage.rows.should('have.length', 1)
                .first().should('contain.text', name)
                .and('have.attr', 'data-testid', `customer-row-${created.id}`);
        });
    });

    it('shows a friendly message when nothing matches', () => {
        customersPage.search('zzzz-no-such-customer');
        customersPage.body.should('contain.text', 'No customers found');
        customersPage.totalCount.should('have.text', '0 customers found');
    });

    it('filters by KYC status', () => {
        customersPage.filterKyc('verified');
        customersPage.rows.should('have.length.greaterThan', 0)
            .each(row => cy.wrap(row).should('contain.text', 'verified'));
    });

    it('opens a customer popup with their details', () => {
        cy.createCustomer({ name: 'Popup Check Customer', city: 'Madurai' }).then(c => {
            customersPage.search(c.email);
            cy.getByTestId(`customer-row-${c.id}`).click();
            cy.getByTestId('view-customer-modal').should('have.class', 'open')
                .and('contain.text', 'Popup Check Customer')
                .and('contain.text', c.email);
        });
    });

    it('shows the Onboard Customer action to admins only', () => {
        customersPage.onboardBtn.should('be.visible').and('have.attr', 'href', 'onboarding.html');
        customersPage.visit('viewer');
        customersPage.onboardBtn.should('not.be.visible');
    });
});
