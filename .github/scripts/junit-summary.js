// Turns JUnit results (Cypress or Newman) into GitHub annotations + a job summary table.
// Usage: node .github/scripts/junit-summary.js <results-dir> [label]
const fs = require('fs');
const path = require('path');

const dir = process.argv[2] || 'cypress/results';
const label = process.argv[3] || 'Cypress';   // e.g. 'Newman (Postman API)'
if (!fs.existsSync(dir)) { console.log(`No results in ${dir}`); process.exit(0); }

const decode = s => (s || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const esc = s => s.replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A');

const specs = new Map();
const failures = [];
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.xml'))) {
    const xml = fs.readFileSync(path.join(dir, f), 'utf8');
    // One XML can hold many <testsuite>s (Newman: one per request; Cypress: one per describe)
    for (const ts of xml.matchAll(/<testsuite\b([^>]*)>([\s\S]*?)<\/testsuite>/g)) {
        const tsAttrs = ts[1];
        const file = (xml.match(/<testsuite[^>]*file="([^"]+)"/) || [])[1]
            || decode((tsAttrs.match(/name="([^"]*)"/) || [])[1]) || f;
        const s = specs.get(file) || { passed: 0, failed: 0, skipped: 0, time: 0 };
        for (const m of ts[2].matchAll(/<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g)) {
            const attrs = m[1];
            const name = decode((attrs.match(/name="([^"]*)"/) || [])[1]);
            s.time += parseFloat((attrs.match(/time="([^"]*)"/) || [])[1] || 0);
            const fail = (m[3] || '').match(/<failure[^>]*message="([^"]*)"/);
            if (fail) { s.failed++; failures.push({ file, name, message: decode(fail[1]) }); }
            else if (/<skipped/.test(m[3] || '')) s.skipped++;
            else s.passed++;
        }
        specs.set(file, s);
    }
}

for (const x of failures) console.log(`::error title=${esc(x.name)}::${esc(`${x.file}\n${x.message}`.slice(0, 1500))}`);

const total = [...specs.values()].reduce((a, s) => ({ p: a.p + s.passed, f: a.f + s.failed, k: a.k + s.skipped }), { p: 0, f: 0, k: 0 });
console.log(`::notice title=${label} results::${total.p} passed, ${total.f} failed, ${total.k} skipped across ${specs.size} suites`);
let md = `## ${label} results: ${total.p} passed, ${total.f} failed, ${total.k} skipped\n\n| Suite | Passed | Failed | Skipped | Time |\n|---|---|---|---|---|\n`;
for (const [file, s] of [...specs.entries()].sort()) md += `| \`${file}\` | ${s.passed} | ${s.failed ? '❌ ' + s.failed : 0} | ${s.skipped} | ${s.time.toFixed(1)}s |\n`;
if (failures.length) md += `\n### Failures\n\n` + failures.map(x => `- **${x.name}** (\`${x.file}\`)\n  > ${x.message.split('\n')[0].slice(0, 300)}`).join('\n') + '\n';
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
console.log(md);
