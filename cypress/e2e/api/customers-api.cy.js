// API tests — cy.request only, no browser UI involved
describe('Customers API', () => {

    it('GET /api/customers returns a paginated list', () => {
        cy.api('GET', '/api/customers?page=1&limit=5').then(res => {
            expect(res.status).to.eq(200);
            expect(res.headers['content-type']).to.include('application/json');
            expect(res.body).to.have.all.keys('data', 'total', 'page', 'limit');
            expect(res.body.data).to.be.an('array').with.length.at.most(5);
            res.body.data.forEach(c => expect(c).to.include.all.keys('id', 'name', 'email', 'kyc_status'));
        });
    });

    it('POST /api/customers creates a customer (201)', () => {
        cy.createCustomer({ name: 'API Created Customer', city: 'Coimbatore' }).then(c => {
            expect(c).to.include({ name: 'API Created Customer', city: 'Coimbatore', kyc_status: 'verified' });
            expect(c.id).to.be.a('number');
            cy.api('GET', `/api/customers/${c.id}`).its('body.name').should('eq', 'API Created Customer');
        });
    });

    it('POST /api/customers without a name is rejected (400)', () => {
        cy.api('POST', '/api/customers', { email: `noname.${Date.now()}@example.com` }).then(res => {
            expect(res.status).to.eq(400);
            expect(res.body.error).to.eq('Name and email are required');
        });
    });

    it('POST /api/customers with a duplicate email is rejected (400)', () => {
        cy.createCustomer().then(c => {
            cy.api('POST', '/api/customers', { name: 'Duplicate', email: c.email, phone: '9876500000' }).then(res => {
                expect(res.status).to.eq(400);
                expect(res.body.error).to.contain('already exists');
            });
        });
    });

    it('GET /api/loans/:id for a missing loan returns 404', () => {
        cy.api('GET', '/api/loans/99999999').then(res => {
            expect(res.status).to.eq(404);
            expect(res.body).to.deep.eq({ error: 'Loan not found' });
        });
    });

    it('POST /api/loans computes the EMI server-side', () => {
        cy.createLoan({ principal_amount: 100000, interest_rate: 10.5, tenure_months: 12 }).then(loan => {
            expect(Number(loan.emi_amount)).to.be.closeTo(8814.86, 0.01);
            expect(loan.status).to.eq('active');
            expect(Number(loan.outstanding_balance)).to.eq(100000);
        });
    });
});
