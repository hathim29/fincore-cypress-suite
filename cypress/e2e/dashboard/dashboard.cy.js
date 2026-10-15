describe('Dashboard', () => {

    beforeEach(() => {
        cy.intercept('GET', '**/api/dashboard/stats').as('stats');
        cy.visitAs('admin', '/dashboard.html');
    });

    it('shows live stat cards that match the API', () => {
        cy.wait('@stats').then(({ response }) => {
            expect(response.statusCode).to.eq(200);
            const s = response.body;
            cy.getByTestId('stat-customers').should('contain.text', String(s.total_customers));
            cy.getByTestId('stat-loans').should('contain.text', String(s.active_loans));
        });
    });

    it('lists recent transactions', () => {
        cy.getByTestId('recent-txn-body').find('tr').should('have.length.greaterThan', 0);
    });

    // Every stat card is a shortcut to a filtered list
    const shortcuts = [
        { card: 'stat-customers', path: '/customers.html' },
        { card: 'stat-loans', path: '/loans.html', query: 'status=active' },
        { card: 'stat-overdue', path: '/loans.html', query: 'status=overdue' },
        { card: 'stat-txn-today', path: '/transactions.html', query: 'date=today' },
    ];
    shortcuts.forEach(({ card, path, query }) => {
        it(`${card} opens ${path}${query ? '?' + query : ''}`, () => {
            cy.getByTestId(card).click();
            cy.location('pathname').should('eq', path);
            if (query) cy.location('search').should('include', query);
        });
    });
});
