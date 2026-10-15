import loansPage from '../../pages/LoansPage';

describe('Loans & EMI', () => {

    describe('as admin', () => {
        beforeEach(() => loansPage.visit('admin'));

        it('lists loans with a total count', () => {
            loansPage.rows.should('have.length.greaterThan', 0);
            loansPage.totalCount.invoke('text').should('match', /\d+ loans found/);
        });

        it('filters by status — every row matches', () => {
            loansPage.filterByStatus('active');
            loansPage.rows.should('have.length.greaterThan', 0)
                .each(row => cy.wrap(row).find('.badge-active').should('exist'));
        });

        it('previews the EMI with the reducing-balance formula', () => {
            // ₹1,00,000 at 10.5% for 12 months → ₹8,814.86 / month
            loansPage.fillNewLoan({ customerId: 1, type: 'personal', principal: 100000, rate: 10.5, tenure: 12 });
            cy.get('#emiPreview').should('be.visible');
            cy.get('#emiPreviewAmt').should('have.text', '₹8,814.86');
        });

        it('requires a customer ID for a new loan', () => {
            loansPage.fillNewLoan({ type: 'personal', principal: 50000, rate: 11, tenure: 12 });
            cy.getByTestId('save-new-loan-btn').click();
            cy.get('#newLoanError').should('be.visible').and('contain.text', 'required');
        });

        it('creates a new loan and lists it first', () => {
            cy.intercept('POST', '**/api/loans').as('createLoan');
            loansPage.fillNewLoan({ customerId: 1, type: 'personal', principal: 300000, rate: 11.5, tenure: 24 });
            cy.getByTestId('save-new-loan-btn').click();
            cy.wait('@createLoan').then(({ response }) => {
                expect(response.statusCode).to.eq(201);
                cy.get('#newLoanSuccess').should('contain.text', `Loan #${response.body.id} created successfully`);
                // Newest loans are listed first
                loansPage.rows.first().should('have.attr', 'data-testid', `loan-row-${response.body.id}`);
            });
        });

        it('pays the first EMI of a new loan', () => {
            // Arrange through the API: a fresh loan has a clean, predictable schedule
            cy.createLoan({ principal_amount: 120000, interest_rate: 12, tenure_months: 12 }).then(loan => {
                loansPage.visit('admin');
                loansPage.openLoan(loan.id);
                cy.getByTestId('repayment-table').should('contain.text', 'pending');

                // Act
                loansPage.payNextEmi('UPI-GPay').then(({ response }) => {
                    expect(response.statusCode).to.be.oneOf([200, 201]);
                    expect(response.body).to.include({ emi_number: 1, status: 'paid' });
                    cy.get('#payEmiSuccess').should('contain.text', 'EMI #1 recorded successfully');
                });

                // Assert through the API: EMI #1 is paid, EMI #2 is next
                cy.api('GET', `/api/loans/${loan.id}`).its('body.repayment_history').then(history => {
                    expect(history[0]).to.include({ emi_number: 1, status: 'paid', payment_channel: 'UPI-GPay' });
                    expect(history[1]).to.include({ emi_number: 2, status: 'pending' });
                });
            });
        });

        it('shows loan details, score and schedule in the popup', () => {
            cy.createLoan({ loan_type: 'home', principal_amount: 2500000, interest_rate: 8.5, tenure_months: 120 }).then(loan => {
                loansPage.visit('admin');
                loansPage.openLoan(loan.id);
                loansPage.loanModal.should('contain.text', `Loan #${loan.id}`).and('contain.text', 'home');
                cy.getByTestId('score-widget').should('be.visible');
                cy.getByTestId('repayment-table').find('tbody tr').should('have.length', 120);
            });
        });
    });

    describe('as viewer', () => {
        beforeEach(() => loansPage.visit('viewer'));

        it('can read loans but not create or pay', () => {
            loansPage.rows.should('have.length.greaterThan', 0);
            loansPage.newLoanBtn.should('not.be.visible');
            loansPage.rows.first().click();
            loansPage.loanModal.should('have.class', 'open');
            cy.getByTestId('pay-emi-btn').should('not.exist');
        });
    });
});
