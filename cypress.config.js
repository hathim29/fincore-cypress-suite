const { defineConfig } = require('cypress');

module.exports = defineConfig({
    e2e: {
        // App under test. Override per environment:
        //   CYPRESS_BASE_URL=https://fincore-qalab.com npx cypress run
        baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:3000',
        specPattern: 'cypress/e2e/**/*.cy.js',
        supportFile: 'cypress/support/e2e.js',
        viewportWidth: 1440,
        viewportHeight: 900,

        // Cypress retries assertions automatically; these are the ceilings
        defaultCommandTimeout: 8000,
        requestTimeout: 10000,
        responseTimeout: 15000,

        // Retry a failed test once in `cypress run` (CI), never while developing
        retries: { runMode: 1, openMode: 0 },

        // On CI, write JUnit XML (turned into annotations + a summary table by the workflow);
        // locally, keep Cypress's readable 'spec' output
        reporter: process.env.CI ? 'junit' : 'spec',
        reporterOptions: process.env.CI
            ? { mochaFile: 'cypress/results/results-[hash].xml', toConsole: false }
            : {},

        // Evidence for failures
        screenshotOnRunFailure: true,
        video: false,

        // Keep each spec independent — fresh browser state per test
        testIsolation: true,
    },
    env: {
        // Seeded demo credentials (see db/seed.js)
        adminUser: 'admin',
        adminPass: 'admin123',
        viewerUser: 'viewer',
        viewerPass: 'viewer123',
    },
});
