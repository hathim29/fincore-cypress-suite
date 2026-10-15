// Page object for onboarding.html — 4-step customer onboarding wizard
class OnboardingPage {
    visit() { cy.visitAs('admin', '/onboarding.html'); return this; }

    get nextBtn() { return cy.get('#btnNext'); }
    get backBtn() { return cy.get('#btnBack'); }
    section(n)    { return cy.get(`#section${n}`); }
    step(n)       { return cy.get(`#step${n}`); }
    error(field)  { return cy.get(`#err-${field}`); }

    next() { this.nextBtn.click(); return this; }

    fillPersonalDetails(p) {
        cy.get('#firstName').type(p.firstName);
        cy.get('#lastName').type(p.lastName);
        cy.get('#email').type(p.email);
        cy.get('#phone').type(p.phone);
        cy.get('#dob').type(p.dob);                 // yyyy-mm-dd for <input type="date">
        cy.get('#city').type(p.city);
        cy.get('#address').type(p.address);
        cy.get(`input[name="gender"][value="${p.gender}"]`).check();
        cy.get(`input[name="marital"][value="${p.marital}"]`).check();
        cy.get('#nationality').select(p.nationality);
        return this;
    }

    fillKyc({ pan, aadhaar } = {}) {
        if (pan) cy.get('#panNumber').clear().type(pan);
        if (aadhaar) cy.get('#aadhaarNumber').clear().type(aadhaar);
        return this;
    }
}

export default new OnboardingPage();
