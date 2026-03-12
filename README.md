# Filipe Amaral - Resume

My resume built with [JSON Resume](https://jsonresume.org/), an open-source standard for resumes.

## Quick Start

```bash
npm install
npm run serve    # Preview at http://localhost:4000
```

## Export

```bash
npm run export:html              # Elegant theme
npm run export:html:stackoverflow # StackOverflow theme
npm run export:pdf               # PDF (requires Chrome)
```

## Available Themes

- `elegant` - Clean, professional design (default)
- `stackoverflow` - Developer-focused theme
- `kendall` - Minimalist
- `even` - Modern design

To use a different theme:
```bash
npx resume export resume.html --theme <theme-name>
```

## Validate

```bash
npm run validate
```

## Structure

- `resume.json` - Resume data following JSON Resume schema
- `resume.html` - Generated HTML (elegant theme)
- `resume-stackoverflow.html` - Generated HTML (stackoverflow theme)

## Online Tools

- [JSON Resume Registry](https://registry.jsonresume.org/) - Host your resume online
- [JSON Resume Editor](https://jsonresume.org/editor/) - Visual editor
