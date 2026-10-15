import onboarding from '../../pages/OnboardingPage';

describe('Customer onboarding (4-step KYC wizard)', () => {

    beforeEach(function () {
        cy.fixture('onboarding-customer').as('customer');   // available as this.customer
        onboarding.visit();
    });

    it('starts on step 1 with Next visible and Back hidden', () => {
        onboarding.step(1).should('have.class', 'active');
        onboarding.section(1).should('have.class', 'active');
        onboarding.nextBtn.should('be.visible');
        onboarding.backBtn.should('not.be.visible');
    });

    it('flags every required field when step 1 is submitted empty', () => {
        onboarding.next();
        ['firstName', 'lastName', 'email', 'phone', 'dob', 'city', 'address', 'gender', 'marital']
            .forEach(field => onboarding.error(field).should('have.class', 'show'));
        onboarding.section(1).should('have.class', 'active');
    });

    it('rejects an invalid email and a short phone number', function () {
        onboarding.fillPersonalDetails({ ...this.customer, email: 'notanemail', phone: '12345' }).next();
        onboarding.error('email').should('have.class', 'show');
        onboarding.error('phone').should('have.class', 'show');
    });

    describe('KYC step', () => {
        beforeEach(function () {
            onboarding.fillPersonalDetails({ ...this.customer, email: `kyc.${Date.now()}@example.com` }).next();
            onboarding.section(2).should('have.class', 'active');
        });

        it('requires at least one KYC document', () => {
            onboarding.next();
            cy.get('#kycWarning').should('be.visible');
            onboarding.fillKyc({ pan: 'ABCDE1234F' });
            cy.get('#kycWarning').should('not.be.visible');
        });

        it('rejects badly formatted PAN numbers', () => {
            cy.fixture('invalid-pan').then(pans => {
                pans.forEach(pan => {
                    onboarding.fillKyc({ pan }).next();
                    onboarding.error('pan').should('have.class', 'show');
                    onboarding.section(2).should('have.class', 'active');
                });
            });
        });

        it('upper-cases PAN and formats Aadhaar as 4-4-4 digits', () => {
            onboarding.fillKyc({ pan: 'abcde1234f', aadhaar: '2345abc67890123' });
            cy.get('#panNumber').should('have.value', 'ABCDE1234F');
            cy.get('#aadhaarNumber').should('have.value', '2345 6789 0123');   // letters stripped, max 12 digits
        });

        it('keeps step 1 data when going Back', function () {
            onboarding.backBtn.click();
            onboarding.section(1).should('have.class', 'active');
            cy.get('#firstName').should('have.value', this.customer.firstName);
            cy.get('#city').should('have.value', this.customer.city);
        });
    });

    it('onboards a customer end to end and opens their account', function () {
        const c = this.customer;
        const email = `onboard.${Date.now()}@example.com`;

        // Step 1 — personal details
        onboarding.fillPersonalDetails({ ...c, email }).next();
        // Step 2 — KYC (both documents → KYC "verified")
        onboarding.fillKyc({ pan: c.pan, aadhaar: c.aadhaar }).next();
        // Step 3 — account setup
        onboarding.section(3).should('have.class', 'active');
        cy.get('input[name="accountType"][value="savings"]').should('be.checked');
        cy.get('#initialBalance').clear().type(c.initialDeposit);
        onboarding.next();
        // Step 4 — review + declaration
        onboarding.section(4).should('have.class', 'active');
        cy.get('#reviewContent').should('contain.text', `${c.firstName} ${c.lastName}`).and('contain.text', email);
        onboarding.next();
        onboarding.error('declaration').should('have.class', 'show');   // declaration is mandatory

        cy.intercept('POST', '**/api/customers').as('createCustomer');
        cy.intercept('POST', '**/api/accounts').as('createAccount');
        cy.get('#declaration').check();

        // The app plays a ~20 s "processing" animation (6 steps) before calling the API.
        // cy.clock() takes control of the page's timers; cy.tick() fast-forwards them.
        // We tick one step at a time and wait for that step to finish, so the app's
        // `await` can schedule the next timer before we tick again.
        const stepDurations = [2000, 3000, 4000, 5000, 3000, 3000];
        cy.clock();
        onboarding.next();
        cy.get('#processingOverlay').should('have.class', 'show');
        stepDurations.forEach((ms, i) => {
            cy.tick(ms);
            cy.get(`#pStep${i + 1}`).should('have.class', 'done');
        });

        cy.wait('@createCustomer').its('response.statusCode').should('eq', 201);
        cy.wait('@createAccount').then(({ response }) => {
            expect(response.statusCode).to.eq(201);
            const accountNumber = response.body.account_number;

            // Success screen
            cy.get('#successOverlay').should('have.class', 'show');
            cy.get('#successAccountNumber').should('have.text', accountNumber);
            cy.get('#successDetails').should('contain.text', 'Savings Account')
                .and('contain.text', 'KYC: Verified')
                .and('contain.text', '25,000');

            // Back-end check: the customer really exists with verified KYC
            cy.api('GET', `/api/customers?search=${encodeURIComponent(email)}`)
                .its('body.data').should('have.length', 1)
                .its(0).should('include', { email, kyc_status: 'verified' });
        });
    });
});
