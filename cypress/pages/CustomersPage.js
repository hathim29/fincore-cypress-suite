// Page object for customers.html
class CustomersPage {
    visit(role = 'admin') {
        cy.intercept('GET', '**/api/customers?*').as('getCustomers');
        cy.visitAs(role, '/customers.html');
        cy.wait('@getCustomers');
        return this;
    }

    get rows()       { return cy.get('[data-testid^="customer-row-"]'); }
    get body()       { return cy.getByTestId('customers-body'); }
    get totalCount() { return cy.getByTestId('total-count'); }
    get onboardBtn() { return cy.get('#addCustomerBtn'); }

    // The search box is debounced (400 ms) — wait for the API call it triggers
    search(text) {
        cy.intercept('GET', '**/api/customers?*').as('searchCustomers');
        cy.getByTestId('search-input').clear().type(text);
        cy.wait('@searchCustomers').its('request.url').should('include', `search=${encodeURIComponent(text)}`);
        return this;
    }

    // Changing the KYC filter reloads the page of results, then filters it in the browser
    filterKyc(status) {
        cy.intercept('GET', '**/api/customers?*').as('filterCustomers');
        cy.getByTestId('kyc-filter').select(status);
        cy.wait('@filterCustomers');
        return this;
    }
}

export default new CustomersPage();
