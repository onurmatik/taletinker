# TaleTinker Frontend Assets

The user-facing frontend is rendered by Django templates and powered by vanilla JavaScript in `../static/js/app.js`.

This directory only owns the Tailwind build pipeline.

## Commands

```bash
npm run dev
npm run build
```

`npm run build` compiles `styles/app.css` to `../static/css/app.css`, which Django serves through `staticfiles`.
