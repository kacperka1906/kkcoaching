import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const target = path.join(root, 'dist/personal-training-cwmbran/index.html');
const description = 'Personal trainer in Cwmbran at JD Gyms. 1:1 coaching, personalised training plans, technique support and progress tracking. Book a free consultation.';

const length = Array.from(description).length;
if (length < 25 || length > 160) {
  throw new Error(`Personal Training meta description must be 25–160 characters; got ${length}.`);
}

if (!fs.existsSync(target)) {
  throw new Error(`Missing built page: ${target}`);
}

const html = fs.readFileSync(target, 'utf8');
const matches = html.match(/<meta name="description" content="[^"]*"\s*\/?>/g) ?? [];

if (matches.length !== 1) {
  throw new Error(`Expected exactly one meta description on Personal Training page; found ${matches.length}.`);
}

const replacement = `<meta name="description" content="${description}" />`;
const updated = html.replace(matches[0], replacement);
fs.writeFileSync(target, updated, 'utf8');

console.log(`Personal Training meta description set (${length} characters).`);
