import fs from 'fs';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/*
 * Section headings live here so the PDF and the Markdown export can never drift
 * apart. `note` is a short qualifier rendered under the heading.
 */
const SECTIONS = {
  summary: { title: 'Summary' },
  skills: { title: 'Skills' },
  work: { title: 'Experience' },
  freelance: {
    title: 'Freelance & Contract Experience',
    note: 'Client engagements delivered alongside the full-time role above.',
  },
  projects: { title: 'Open Source' },
  education: { title: 'Education' },
  languages: { title: 'Languages' },
};

function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return 'Present';
  const [year, month] = dateStr.split('-');
  return month ? `${MONTHS[parseInt(month) - 1]} ${year}` : year;
}

function formatDateRange(start, end) {
  return `${formatDate(start)} - ${formatDate(end)}`;
}

/*
 * Months are counted inclusively on both ends, matching how LinkedIn reports
 * tenure, so the durations here line up with the ones on a candidate's profile.
 */
function calculateDuration(startDate, endDate) {
  const [startYear, startMonth = 1] = startDate.split('-').map(Number);
  const end = endDate ? endDate.split('-').map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1];
  const [endYear, endMonth = 1] = end;

  let months = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
  const years = Math.floor(months / 12);
  months = months % 12;

  const parts = [];
  if (years > 0) parts.push(`${years} yr${years > 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} mo${months > 1 ? 's' : ''}`);
  return parts.join(' ') || '1 mo';
}

/* A URL is more useful on a printed page as readable text than as a hidden href. */
function linkText(entry) {
  return entry.displayUrl || entry.url.replace(/^https?:\/\/(www\.)?/, '');
}

function jobMeta(job) {
  const meta = [job.employmentType, job.locationType, job.location].filter(Boolean);
  return meta.length ? ` · ${meta.join(' · ')}` : '';
}

function renderMarkdown(resume) {
  const { basics, skills, work, education, languages, projects, freelance } = resume;

  let md = `# ${basics.name}\n\n`;
  md += `**${basics.label}**\n\n`;

  const contacts = [];
  if (basics.location?.countryCode) contacts.push(basics.location.countryCode);
  if (basics.phone) contacts.push(basics.phone);
  if (basics.email) contacts.push(`[${basics.email}](mailto:${basics.email})`);
  basics.profiles?.forEach(p => contacts.push(`[${linkText(p)}](${p.url})`));
  md += contacts.join(' · ') + '\n\n';

  if (basics.summary) {
    md += `## ${SECTIONS.summary.title}\n\n${basics.summary}\n\n`;
  }

  if (skills?.length) {
    md += `## ${SECTIONS.skills.title}\n\n`;
    skills.forEach(group => {
      md += `- **${group.name}**: ${group.keywords.join(', ')}\n`;
    });
    md += '\n';
  }

  if (work?.length) {
    md += `## ${SECTIONS.work.title}\n\n`;
    work.forEach(job => {
      const companyName = job.url ? `[${job.name}](${job.url})` : job.name;
      const duration = calculateDuration(job.startDate, job.endDate);

      md += `### ${job.position}\n`;
      md += `**${companyName}**${jobMeta(job)} | ${formatDateRange(job.startDate, job.endDate)} · ${duration}\n\n`;

      job.highlights?.forEach(h => {
        md += `- ${h}\n`;
      });
      if (job.highlights?.length) md += '\n';
    });
  }

  if (freelance?.length) {
    md += `## ${SECTIONS.freelance.title}\n\n`;
    md += `*${SECTIONS.freelance.note}*\n\n`;
    freelance.forEach(project => {
      const duration = calculateDuration(project.startDate, project.endDate);
      md += `- **${project.name}** (${formatDateRange(project.startDate, project.endDate)} · ${duration}): ${project.description}\n`;
    });
    md += '\n';
  }

  if (projects?.length) {
    md += `## ${SECTIONS.projects.title}\n\n`;
    projects.forEach(project => {
      const projectName = project.url ? `[${project.name}](${project.url})` : project.name;
      md += `- **${projectName}** (${linkText(project)}): ${project.description}\n`;
    });
    md += '\n';
  }

  if (education?.length) {
    md += `## ${SECTIONS.education.title}\n\n`;
    education.forEach(edu => {
      const institutionName = edu.url ? `[${edu.institution}](${edu.url})` : edu.institution;
      const dateRange = edu.startDate ? `${formatDate(edu.startDate)} - ${formatDate(edu.endDate)}` : formatDate(edu.endDate);
      md += `### ${edu.studyType}, ${edu.area}\n`;
      md += `**${institutionName}** | ${dateRange}\n\n`;
    });
  }

  if (languages?.length) {
    md += `## ${SECTIONS.languages.title}\n\n`;
    md += languages.map(lang => `${lang.language} (${lang.fluency})`).join(' · ') + '\n';
  }

  return md;
}

function renderHTML(resume) {
  const { basics, skills, work, education, languages, projects, freelance } = resume;

  const section = (key, body) => `
  <section class="section">
    <h2 class="section-title">
      <span>${escapeHTML(SECTIONS[key].title)}</span>
      ${SECTIONS[key].note ? `<span class="section-note">${escapeHTML(SECTIONS[key].note)}</span>` : ''}
    </h2>
    ${body}
  </section>`;

  const skillsHTML = skills?.map(group => `
    <div class="skill-row">
      <span class="skill-name">${escapeHTML(group.name)}:</span>
      ${escapeHTML(group.keywords.join(', '))}
    </div>
  `).join('') || '';

  const workHTML = work?.map(job => {
    const companyName = job.url
      ? `<a href="${escapeHTML(job.url)}">${escapeHTML(job.name)}</a>`
      : escapeHTML(job.name);

    return `
    <div class="entry">
      <div class="entry-header">
        <div class="entry-heading">
          <span class="entry-company">${companyName}</span>${job.displayUrl ? `<span class="entry-meta"> (${escapeHTML(job.displayUrl)})</span>` : ''}
          <span class="entry-title">${escapeHTML(job.position)}</span><span class="entry-meta">${escapeHTML(jobMeta(job))}</span>
        </div>
        <div class="entry-date">${escapeHTML(formatDateRange(job.startDate, job.endDate))} · ${escapeHTML(calculateDuration(job.startDate, job.endDate))}</div>
      </div>
      ${job.highlights?.length ? `
        <ul class="highlights">
          ${job.highlights.map(h => `<li>${escapeHTML(h)}</li>`).join('')}
        </ul>
      ` : ''}
    </div>
  `;
  }).join('') || '';

  const freelanceHTML = freelance?.map(project => `
    <li><strong>${escapeHTML(project.name)}</strong> (${escapeHTML(formatDateRange(project.startDate, project.endDate))} · ${escapeHTML(calculateDuration(project.startDate, project.endDate))}): ${escapeHTML(project.description)}</li>
  `).join('') || '';

  const projectsHTML = projects?.map(project => `
    <li><strong>${project.url ? `<a href="${escapeHTML(project.url)}">${escapeHTML(project.name)}</a>` : escapeHTML(project.name)}</strong>
    (${escapeHTML(linkText(project))}): ${escapeHTML(project.description)}</li>
  `).join('') || '';

  const educationHTML = education?.map(edu => {
    const institutionName = edu.url
      ? `<a href="${escapeHTML(edu.url)}">${escapeHTML(edu.institution)}</a>`
      : escapeHTML(edu.institution);
    const dateRange = edu.startDate ? `${formatDate(edu.startDate)} - ${formatDate(edu.endDate)}` : formatDate(edu.endDate);
    return `
    <div class="entry">
      <div class="entry-header">
        <div class="entry-heading">
          <span class="entry-company">${institutionName}</span>
          <span class="entry-title">${escapeHTML(`${edu.studyType}, ${edu.area}`)}</span>
        </div>
        <div class="entry-date">${escapeHTML(dateRange)}</div>
      </div>
    </div>
  `;
  }).join('') || '';

  const languagesHTML = languages
    ?.map(lang => `${escapeHTML(lang.language)} (${escapeHTML(lang.fluency)})`)
    .join(' · ') || '';

  const summaryHTML = basics.summary?.split('\n\n')
    .map(p => `<p>${escapeHTML(p)}</p>`)
    .join('') || '';

  const contactHTML = [
    basics.location?.countryCode && escapeHTML(basics.location.countryCode),
    basics.phone && escapeHTML(basics.phone),
    basics.email && `<a href="mailto:${escapeHTML(basics.email)}">${escapeHTML(basics.email)}</a>`,
    ...(basics.profiles?.map(p => `<a href="${escapeHTML(p.url)}">${escapeHTML(linkText(p))}</a>`) || []),
  ].filter(Boolean).map(item => `<span>${item}</span>`).join('');

  return `<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHTML(basics.name)} - Resume</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    html {
      font-family: 'Times New Roman', Times, serif;
      font-size: 10.5pt;
      line-height: 1.2;
      color: #000;
    }

    body {
      max-width: 8.5in;
      margin: 0 auto;
      background: #fff;
    }

    a { color: #000; text-decoration: none; }

    .header {
      text-align: center;
      margin-bottom: 5pt;
    }

    .name {
      font-size: 16pt;
      font-weight: bold;
      letter-spacing: 0.3pt;
    }

    .label {
      font-size: 10pt;
      margin-top: 1pt;
    }

    .contact-info {
      font-size: 9pt;
      margin-top: 2pt;
    }

    .contact-info span:not(:last-child)::after {
      content: " · ";
    }

    .summary p {
      margin-bottom: 3pt;
    }

    .summary p:last-child {
      margin-bottom: 0;
    }

    .section {
      margin-top: 6pt;
    }

    .section-title {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8pt;
      font-size: 10.5pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.6pt;
      border-bottom: 0.6pt solid #000;
      padding-bottom: 1pt;
      margin-bottom: 2.5pt;
    }

    /* Rides on the heading's own line so the qualifier costs no vertical space. */
    .section-note {
      font-size: 8.5pt;
      font-weight: normal;
      font-style: italic;
      text-transform: none;
      letter-spacing: 0;
    }

    .skill-row {
      margin-bottom: 1pt;
    }

    .skill-name {
      font-weight: bold;
    }

    .entry {
      margin-bottom: 4pt;
    }

    .entry:last-child {
      margin-bottom: 0;
    }

    /*
     * Employer, role, and dates share one row. The stacked version cost a line
     * per entry, which is the difference between a one- and two-page resume.
     */
    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8pt;
    }

    .entry-company {
      font-weight: bold;
      font-size: 10.5pt;
    }

    .entry-title {
      font-style: italic;
    }

    .entry-title::before {
      content: " — ";
      font-style: normal;
    }

    .entry-date {
      white-space: nowrap;
    }

    ul.highlights {
      list-style: disc;
      padding-left: 11pt;
      margin-top: 1pt;
    }

    ul.highlights li {
      margin-bottom: 0.5pt;
    }

    @media print {
      .entry { page-break-inside: avoid; }
      .section-title { page-break-after: avoid; }
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="name">${escapeHTML(basics.name)}</div>
    <div class="label">${escapeHTML(basics.label)}</div>
    <div class="contact-info">${contactHTML}</div>
  </header>

  ${basics.summary ? `<section class="section summary"><h2 class="section-title">${escapeHTML(SECTIONS.summary.title)}</h2>${summaryHTML}</section>` : ''}
  ${skills?.length ? section('skills', skillsHTML) : ''}
  ${work?.length ? section('work', workHTML) : ''}
  ${freelance?.length ? section('freelance', `<ul class="highlights">${freelanceHTML}</ul>`) : ''}
  ${projects?.length ? section('projects', `<ul class="highlights">${projectsHTML}</ul>`) : ''}
  ${education?.length ? section('education', educationHTML) : ''}
  ${languages?.length ? section('languages', `<div>${languagesHTML}</div>`) : ''}
</body>
</html>`;
}

async function exportResume(resumeFile, outputPdf) {
  const resume = JSON.parse(fs.readFileSync(resumeFile, 'utf8'));

  const mdFile = outputPdf.replace('.pdf', '.md');
  fs.writeFileSync(mdFile, renderMarkdown(resume));
  console.log(`Created ${mdFile}`);

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setContent(renderHTML(resume), { waitUntil: 'domcontentloaded' });

  await page.pdf({
    path: outputPdf,
    format: 'Letter',
    printBackground: true,
    margin: { top: '0.4in', bottom: '0.4in', left: '0.45in', right: '0.45in' },
  });

  await browser.close();

  const stats = fs.statSync(outputPdf);
  console.log(`Created ${outputPdf} (${Math.round(stats.size / 1024)}KB)`);
}

/* Only export when run as a command; importing this module must have no side effects. */
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  exportResume(args[0] || 'resume.json', args[1] || 'resume.pdf').catch(console.error);
}

export { renderHTML, renderMarkdown };
