import fs from 'fs';
import puppeteer from 'puppeteer';

function renderHTML(resume) {
  const { basics, work, education, certificates, skills, languages } = resume;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Present';
    const [year, month] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return month ? `${months[parseInt(month) - 1]} ${year}` : year;
  };

  const workHTML = work?.map(job => `
    <div class="entry">
      <div class="entry-header">
        <div class="entry-left">
          <span class="entry-title">${job.position}</span>
          <span class="entry-company"> | ${job.name}${job.url ? ` <a href="${job.url}" class="link">↗</a>` : ''}</span>
        </div>
        <div class="entry-date">${formatDate(job.startDate)} - ${formatDate(job.endDate)}</div>
      </div>
      ${job.highlights?.length ? `
        <ul class="highlights">
          ${job.highlights.map(h => `<li>${h}</li>`).join('')}
        </ul>
      ` : ''}
    </div>
  `).join('') || '';

  const educationHTML = education?.map(edu => `
    <div class="entry">
      <div class="entry-header">
        <div class="entry-left">
          <span class="entry-title">${edu.studyType} in ${edu.area}</span>
          <span class="entry-company"> | ${edu.institution}</span>
        </div>
        <div class="entry-date">${formatDate(edu.endDate)}</div>
      </div>
    </div>
  `).join('') || '';

  const certificatesHTML = certificates?.map(cert => `
    <div class="entry">
      <div class="entry-header">
        <div class="entry-left">
          <span class="entry-title">${cert.name}</span>
          <span class="entry-company"> | ${cert.issuer}</span>
        </div>
        <div class="entry-date">${formatDate(cert.date)}</div>
      </div>
    </div>
  `).join('') || '';

  const skillsHTML = skills?.map(skill =>
    `<div class="skill-line"><strong>${skill.name}:</strong> ${skill.keywords?.join(', ')}</div>`
  ).join('') || '';

  const languagesHTML = languages?.map(lang =>
    `<span class="lang-item">${lang.language} <span class="lang-level">(${lang.fluency})</span></span>`
  ).join(' • ') || '';

  const contactItems = [];
  if (basics.email) contactItems.push(`<a href="mailto:${basics.email}">${basics.email}</a>`);
  if (basics.phone) contactItems.push(`<a href="tel:${basics.phone}">${basics.phone}</a>`);
  if (basics.location) contactItems.push(`${basics.location.city}, ${basics.location.region || basics.location.countryCode}`);
  basics.profiles?.forEach(p => {
    contactItems.push(`<a href="${p.url}">${p.network}</a>`);
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${basics.name} - Resume</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    html {
      font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 10pt;
      line-height: 1.3;
      color: #2d2d2d;
    }

    body {
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0.5in 0.6in;
      background: #fff;
    }

    a { color: #2d2d2d; text-decoration: none; }
    a:hover { color: #0066cc; }

    /* Header */
    .header {
      text-align: center;
      margin-bottom: 16pt;
    }

    .name {
      font-size: 20pt;
      font-weight: 700;
      color: #0066cc;
      margin-bottom: 6pt;
      letter-spacing: 0.5pt;
    }

    .contact {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 4pt 16pt;
      font-size: 9pt;
      color: #525252;
    }

    .contact a { color: #525252; }

    /* Summary */
    .summary {
      font-size: 9.5pt;
      line-height: 1.4;
      text-align: justify;
      margin-bottom: 14pt;
      color: #3d3d3d;
    }

    /* Sections */
    .section {
      margin-bottom: 12pt;
    }

    .section-title {
      font-size: 11pt;
      font-weight: 700;
      color: #0066cc;
      border-bottom: 1.5pt solid #0066cc;
      padding-bottom: 2pt;
      margin-bottom: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
    }

    /* Entries */
    .entry {
      margin-bottom: 8pt;
    }

    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 2pt;
    }

    .entry-left {
      flex: 1;
    }

    .entry-title {
      font-weight: 700;
      font-size: 10pt;
    }

    .entry-company {
      font-size: 10pt;
      color: #525252;
    }

    .entry-date {
      font-size: 9pt;
      color: #525252;
      white-space: nowrap;
      margin-left: 8pt;
    }

    .highlights {
      list-style: disc;
      padding-left: 16pt;
      margin-top: 3pt;
    }

    .highlights li {
      font-size: 9.5pt;
      line-height: 1.35;
      margin-bottom: 1.5pt;
      color: #3d3d3d;
    }

    /* Skills */
    .skill-line {
      font-size: 9.5pt;
      margin-bottom: 2pt;
    }

    .skill-line strong {
      font-weight: 500;
    }

    /* Languages */
    .lang-item {
      font-size: 9.5pt;
    }

    .lang-level {
      color: #666;
    }

    .link {
      font-size: 8pt;
      color: #888;
    }

    /* Print styles */
    @media print {
      body { padding: 0; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <header class="header">
    <h1 class="name">${basics.name}</h1>
    <div class="contact">${contactItems.join(' <span style="color:#999">|</span> ')}</div>
  </header>

  ${basics.summary ? `<p class="summary">${basics.summary}</p>` : ''}

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

  ${certificates?.length ? `
  <section class="section">
    <h2 class="section-title">Certifications</h2>
    ${certificatesHTML}
  </section>
  ` : ''}

  ${skills?.length ? `
  <section class="section">
    <h2 class="section-title">Skills</h2>
    ${skillsHTML}
  </section>
  ` : ''}

  ${languages?.length ? `
  <section class="section">
    <h2 class="section-title">Languages</h2>
    <div>${languagesHTML}</div>
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
  });

  await browser.close();

  const stats = fs.statSync(outputPdf);
  console.log(`Created ${outputPdf} (${Math.round(stats.size / 1024)}KB)`);
}

const args = process.argv.slice(2);
const resumeFile = args[0] || 'resume.json';
const outputPdf = args[1] || 'resume.pdf';

exportResume(resumeFile, outputPdf).catch(console.error);
