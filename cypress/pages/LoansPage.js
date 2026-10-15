// Page object for loans.html
class LoansPage {
    visit(role = 'admin') {
        cy.intercept('GET', '**/api/loans?*').as('getLoans');
        cy.visitAs(role, '/loans.html');
        cy.wait('@getLoans');
        return this;
    }

    get rows()       { return cy.get('[data-testid^="loan-row-"]'); }
    get totalCount() { return cy.getByTestId('total-count'); }
    get newLoanBtn() { return cy.getByTestId('add-loan-btn'); }
    get loanModal()  { return cy.get('#loanModal'); }

    // Register the intercept BEFORE changing the filter, then wait for it —
    // the response can never be missed (no race between action and wait)
    filterByStatus(status) {
        cy.intercept('GET', '**/api/loans?*').as('filterLoans');
        cy.getByTestId('status-filter').select(status);
        cy.wait('@filterLoans').its('request.url').should('include', `status=${status}`);
        return this;
    }

    openLoan(id) {
        cy.intercept('GET', `**/api/loans/${id}`).as('getLoan');
        cy.getByTestId(`loan-row-${id}`).click();
        cy.wait('@getLoan');
        this.loanModal.should('have.class', 'open');
        return this;
    }

    payNextEmi(channel = 'UPI-GPay') {
        cy.intercept('POST', '**/api/loan-repayments').as('payEmi');
        cy.getByTestId('pay-emi-btn').first().click();
        cy.getByTestId('pay-emi-modal').should('have.class', 'open');
        cy.getByTestId('pay-emi-channel').select(channel);
        cy.getByTestId('confirm-pay-emi-btn').click();
        return cy.wait('@payEmi');
    }

    fillNewLoan({ customerId, type, principal, rate, tenure }) {
        this.newLoanBtn.click();
        cy.get('#newLoanModal').should('have.class', 'open');
        if (customerId !== undefined) cy.getByTestId('nl-customer-id').clear().type(String(customerId));
        if (type) cy.getByTestId('nl-loan-type').select(type);
        if (principal) cy.getByTestId('nl-principal').clear().type(String(principal));
        if (rate) cy.getByTestId('nl-rate').clear().type(String(rate));
        if (tenure) cy.getByTestId('nl-tenure').select(String(tenure));
        return this;
    }
}

export default new LoansPage();
