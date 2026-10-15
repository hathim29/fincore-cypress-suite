// Page object for login.html
class LoginPage {
    visit() { cy.visit('/login.html'); return this; }

    get username() { return cy.getByTestId('username-input'); }
    get password() { return cy.getByTestId('password-input'); }
    get submitBtn() { return cy.getByTestId('login-button'); }
    get error()    { return cy.get('#loginError'); }
    get success()  { return cy.get('#loginSuccess'); }

    loginAs(user, pass) {
        if (user) this.username.type(user);
        if (pass) this.password.type(pass, { log: false });
        this.submitBtn.click();
        return this;
    }

    shouldShowError(text) {
        this.error.should('be.visible').and('contain.text', text);
        return this;
    }
}

export default new LoginPage();
