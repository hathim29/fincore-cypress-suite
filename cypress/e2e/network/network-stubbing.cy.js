// cy.intercept — control the network to test states that are hard to create with real data
describe('UI states via network stubbing (cy.intercept)', () => {

    it('shows the empty state when the API returns no customers', () => {
        cy.intercept('GET', '**/api/customers?*', { fixture: 'customers-empty.json' }).as('emptyList');
        cy.visitAs('admin', '/customers.html');
        cy.wait('@emptyList');
        cy.getByTestId('customers-body').should('contain.text', 'No customers found');
        cy.getByTestId('total-count').should('have.text', '0 customers found');
    });

    it('shows an error when the API is unreachable', () => {
        cy.intercept('GET', '**/api/customers?*', { forceNetworkError: true }).as('networkDown');
        cy.visitAs('admin', '/customers.html');
        cy.wait('@networkDown');
        cy.getByTestId('customers-body').should('contain.text', 'Error loading customers');
    });

    it('shows a loading state while a slow response is in flight', () => {
        cy.intercept('GET', '**/api/customers?*', req => {
            req.on('response', res => res.setDelay(1500));     // real data, delivered slowly
        }).as('slowList');
        cy.visitAs('admin', '/customers.html');
        cy.get('.loading-row').should('be.visible').and('contain.text', 'Loading');
        cy.wait('@slowList');
        cy.get('.loading-row').should('not.exist');
        cy.get('[data-testid^="customer-row-"]').should('have.length.greaterThan', 0);
    });

    it('sends the right query when searching (spying, not stubbing)', () => {
        cy.intercept('GET', '**/api/customers?*').as('list');
        cy.visitAs('admin', '/customers.html');
        cy.wait('@list');
        cy.getByTestId('search-input').type('Chennai');
        cy.wait('@list').then(({ request, response }) => {
            const params = new URL(request.url).searchParams;
            expect(params.get('search')).to.eq('Chennai');
            expect(params.get('page')).to.eq('1');
            expect(response.statusCode).to.eq(200);
        });
    });
});
