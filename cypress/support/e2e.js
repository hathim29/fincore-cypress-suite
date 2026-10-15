// Loaded before every spec file.
import './commands';

// The app loads its icon font from a CDN. If the CDN is slow or blocked,
// don't let that stall page loads in tests — the icons are cosmetic.
beforeEach(() => {
    cy.intercept({ method: 'GET', url: /cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com/ }, { statusCode: 200, body: '' });
});
