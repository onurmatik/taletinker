# TaleTinker

Create, share, and discover **AI-generated children’s stories** complete with audio narration and a charming cover image.


TaleTinker lets parents craft personalized tales in seconds—tuning realism, themes, character ideas, language, tone, and length—then publishes each story to a public library so other families can enjoy it too.

| Service           | Status                                                                                                       |
| ----------------- |--------------------------------------------------------------------------------------------------------------|
| GitHub Actions CI | ![Deploy](https://img.shields.io/github/actions/workflow/status/onurmatik/taletinker/deploy.yml?branch=main) |
| License           | ![MIT](https://img.shields.io/badge/license-MIT-green)                                                       |

---

## ✨ Key Features

* **Story Generator** – OpenAI-powered pipeline produces text, cover image, and MP3 narration.
* **Rich Controls** – Sliders for realism vs. fantasy, didactic vs. fun, target age (3 – 10+), themes (including joyful or soothing tones), language, length, and custom prompts.
* **On‑Demand Translations** – Base stories can be automatically translated into multiple languages with matching narration.
* **Public Library** – Browse, search, like, and bookmark stories; filter by age, theme, language, or popularity.
* **RSS Feeds** – Subscribe to new stories in any supported language.
* **Moderation & Privacy** – OpenAI moderation checks every story; authors may publish under a nickname or anonymously.

---

## 🚀 Getting Started

### 1. Clone & Configure

```bash
git clone https://github.com/onurmatik/taletinker.git
cd taletinker
cp .env.example .env         # fill in secrets
```

**Required environment variables**

| Key                                              | Description                                     |
|--------------------------------------------------| ----------------------------------------------- |
| `OPENAI_API_KEY`                                 | OpenAI key for text, TTS, image, and moderation |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` | S3 credentials for media storage                |
| `AWS_STORAGE_BUCKET_NAME`                             | S3 bucket for static & media                    |
| *See `.env.example` for the full list*           |                                                 |

### 2. Local Development

Run the server locally using Django's built-in SQLite database (no PostgreSQL setup needed):

```bash
python manage.py runserver
```

| Service    | URL |
| ---------- | ------------------------------------------- |
| Django app | [http://localhost:8000/](http://localhost:8000/) |

### 3. Run Migrations & Create Superuser

```bash
python manage.py migrate
python manage.py createsuperuser
```
### Updating Translations


Run JS extraction with:
```bash
python manage.py makemessages -d djangojs -l <language> --extension=js
```


---

## 📈 Roadmap

* [ ] Multi-voice audio narration (dialogue voice acting)
* [ ] Community comments & ratings
* [ ] Localization UI (i18n)
* [ ] Mobile-friendly PWA
* [ ] Offline story packs

---

## 🤝 Contributing

1. **Fork** the repo & create your branch: `git checkout -b feature/awesome-feature`
2. **Commit** with conventional messages & run `pre-commit run --all-files`.
3. **Test** your changes: `pytest`.
4. **Push** and open a Pull Request.

We love issues, feature ideas, and docs fixes too!

---

## 🪪 License

This project is licensed under the **MIT License** – see the [LICENSE](./LICENSE) file for details.
