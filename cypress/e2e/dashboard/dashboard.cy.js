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

    // Regression for BUG-FC-103: four cards showed 0 because the stats API never
    // sent their fields. Each card must match an independent source: the filtered
    // total from that entity's own list API.
    const accuracy = [
        { card: 'stat-frozen',        source: '/api/accounts?status=frozen&limit=1' },
        { card: 'stat-closed-loans',  source: '/api/loans?status=closed&limit=1' },
        { card: 'stat-cards',         source: '/api/credit-cards?limit=1' },
        { card: 'stat-blocked-cards', source: '/api/credit-cards?status=blocked&limit=1' },
    ];
    accuracy.forEach(({ card, source }) => {
        it(`${card} matches the ${source.split('?')[0]} total`, () => {
            cy.wait('@stats');
            cy.api('GET', source).its('body.total').then(total => {
                cy.getByTestId(card).find('.stat-value')
                    .should('have.text', Number(total).toLocaleString('en-IN'));
            });
        });
    });
});
