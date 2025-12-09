import fs from 'fs';
import puppeteer from 'puppeteer';

function renderHTML(resume) {
  const { basics, work, education, languages } = resume;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Present';
    const [year, month] = dateStr.split('-');
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return month ? `${months[parseInt(month) - 1]} ${year}` : year;
  };

  const formatDateRange = (start, end) => {
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const workHTML = work?.map(job => {
    const meta = [];
    if (job.employmentType) meta.push(job.employmentType);
    if (job.locationType) meta.push(job.locationType);
    if (job.location) meta.push(job.location);
    const metaStr = meta.length ? ` · ${meta.join(' · ')}` : '';
    const companyName = job.url ? `<a href="${job.url}">${job.name}</a>` : job.name;

    return `
    <div class="entry">
      <div class="entry-header">
        <div class="entry-title">${job.position}</div>
        <div class="entry-date">${formatDateRange(job.startDate, job.endDate)}</div>
      </div>
      <div class="entry-company">${companyName}${metaStr}</div>
      ${job.highlights?.length ? `
        <ul class="highlights">
          ${job.highlights.map(h => `<li>${h}</li>`).join('')}
        </ul>
      ` : ''}
    </div>
  `;
  }).join('') || '';

  const educationHTML = education?.map(edu => `
    <div class="entry">
      <div class="entry-header">
        <div class="entry-title">${edu.studyType}, ${edu.area}</div>
        <div class="entry-date">${formatDate(edu.endDate)}</div>
      </div>
      <div class="entry-company">${edu.institution}</div>
    </div>
  `).join('') || '';

  const languagesHTML = languages?.map(lang =>
    `<div class="lang-item">${lang.language} (${lang.fluency})</div>`
  ).join('') || '';

  // Format summary with paragraphs
  const summaryHTML = basics.summary?.split('\n\n').map(p =>
    `<p>${p}</p>`
  ).join('') || '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${basics.name} - Resume</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    html {
      font-family: 'Times New Roman', Times, serif;
      font-size: 9pt;
      line-height: 1.2;
      color: #000;
    }

    body {
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0;
      background: #fff;
    }

    a { color: #000; text-decoration: none; }

    /* Header - centered */
    .header {
      text-align: center;
      margin-bottom: 6pt;
    }

    .name {
      font-size: 13pt;
      font-weight: bold;
      margin-bottom: 1pt;
    }

    .contact-info {
      font-size: 8.5pt;
    }

    .contact-info span:not(:last-child)::after {
      content: " · ";
    }

    /* Summary */
    .summary {
      margin-bottom: 6pt;
    }

    .summary p {
      font-size: 8.5pt;
      line-height: 1.25;
      margin-bottom: 3pt;
      text-align: justify;
    }

    .summary p:last-child {
      margin-bottom: 0;
    }

    /* Sections */
    .section {
      margin-bottom: 5pt;
    }

    .section-title {
      font-size: 9.5pt;
      font-weight: bold;
      text-decoration: underline;
      margin-bottom: 3pt;
    }

    /* Entries */
    .entry {
      margin-bottom: 5pt;
    }

    .entry:last-child {
      margin-bottom: 0;
    }

    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }

    .entry-title {
      font-weight: bold;
      font-size: 9pt;
    }

    .entry-date {
      font-size: 8.5pt;
      white-space: nowrap;
    }

    .entry-company {
      font-size: 8.5pt;
      margin-bottom: 1pt;
    }

    .highlights {
      list-style: disc;
      padding-left: 12pt;
      margin-top: 1pt;
    }

    .highlights li {
      font-size: 8.5pt;
      line-height: 1.2;
      margin-bottom: 0;
    }

    /* Languages */
    .lang-item {
      font-size: 8.5pt;
      display: inline;
    }

    .lang-item:not(:last-child)::after {
      content: " · ";
    }

    /* Print styles */
    @media print {
      body { padding: 0; }
      .entry { page-break-inside: avoid; }
      .section-title { page-break-after: avoid; }
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="name">${basics.name}</div>
    <div class="contact-info">
      <span>Brazil</span>
      <span>${basics.phone}</span>
      <span><a href="mailto:${basics.email}">${basics.email}</a></span>
      ${basics.profiles?.map(p => `<span><a href="${p.url}">${p.url}</a></span>`).join('') || ''}
    </div>
  </header>

  ${basics.summary ? `
  <section class="section summary">
    <h2 class="section-title">Summary</h2>
    ${summaryHTML}
  </section>
  ` : ''}

  ${work?.length ? `
  <section class="section">
    <h2 class="section-title">Experience</h2>
    ${workHTML}
  </section>
  ` : ''}

  ${education?.length ? `
  <section class="section">
    <h2 class="section-title">Education</h2>
    ${educationHTML}
  </section>
  ` : ''}

  ${languages?.length ? `
  <section class="section">
    <h2 class="section-title">Languages</h2>
    ${languagesHTML}
  </section>
  ` : ''}
</body>
</html>`;
}

async function exportResume(resumeFile, outputPdf) {
  const resume = JSON.parse(fs.readFileSync(resumeFile, 'utf8'));
  const html = renderHTML(resume);

  // Also save HTML for reference
  const htmlFile = outputPdf.replace('.pdf', '.html');
  fs.writeFileSync(htmlFile, html);
  console.log(`Created ${htmlFile}`);

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: 'networkidle0' });

  await page.pdf({
    path: outputPdf,
    format: 'Letter',
    printBackground: true,
    margin: {
      top: '0.4in',
      bottom: '0.4in',
      left: '0.4in',
      right: '0.4in'
    }
  });

  await browser.close();

  const stats = fs.statSync(outputPdf);
  console.log(`Created ${outputPdf} (${Math.round(stats.size / 1024)}KB)`);
}

const args = process.argv.slice(2);
const resumeFile = args[0] || 'resume.json';
const outputPdf = args[1] || 'resume.pdf';

exportResume(resumeFile, outputPdf).catch(console.error);
