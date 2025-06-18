# TaleTinker

Create, share, and discover **AI-generated children’s stories** complete with audio narration and a charming cover image.

TaleTinker lets parents craft personalized tales in seconds—tuning realism, themes, character ideas, language, tone, and length—then publishes each story to a public library so other families can enjoy it too.

| Service           | Status                                                                                              |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| GitHub Actions CI | ![CI](https://img.shields.io/github/actions/workflow/status/your-org/taletinker/ci.yml?branch=main) |
| License           | ![MIT](https://img.shields.io/badge/license-MIT-green)                                              |

---

## ✨ Key Features

* **Story Generator** – OpenAI-powered pipeline produces text, cover image, and MP3 narration.
* **Rich Controls** – Sliders for realism vs. fantasy, didactic vs. fun, target age (3 – 10+), themes, emotional purpose, language, length, and custom prompts.
* **Public Library** – Browse, search, like, and bookmark stories; filter by age, theme, language, or popularity.
* **Freemium Model** – Monthly quota for free users; premium subscribers unlock higher limits, audio downloads, and narrator voice options.
* **Moderation & Privacy** – OpenAI moderation checks every story; authors may publish under a nickname or anonymously.
* **Modern Tech Stack** – Django + Django REST Framework, React (or Django templates), PostgreSQL, Celery, AWS S3, Stripe billing.
* **Docker-First** – One-command local setup with Docker Compose.

---

## 🗺️ Project Structure

```
taletinker/
├── accounts/          # auth, profiles, subscription data
├── stories/           # story models, generation services, API
├── subscriptions/     # Stripe plans, quota enforcement
├── frontend/          # React SPA (optional)
├── scripts/           # helper scripts (seed data, etc.)
├── tests/             # pytest test suite
├── Dockerfile
└── docker-compose.yml
```

---

## 🚀 Getting Started

### 1. Clone & Configure

```bash
git clone https://github.com/your-org/taletinker.git
cd taletinker
cp .env.example .env         # fill in secrets
```

**Required environment variables**

| Key                                           | Description                                     |
| --------------------------------------------- | ----------------------------------------------- |
| `OPENAI_API_KEY`                              | OpenAI key for text, TTS, image, and moderation |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | S3 credentials for media storage                |
| `AWS_S3_BUCKET_NAME`                          | S3 bucket for static & media                    |
| `STRIPE_SECRET_KEY`                           | Stripe secret for billing                       |
| `DATABASE_URL`                                | PostgreSQL connection string                    |
| *See `.env.example` for the full list*        |                                                 |

### 2. Local Development (Docker)

```bash
docker compose up --build
```

| Service             | URL                                                      |
| ------------------- | -------------------------------------------------------- |
| Django API          | [http://localhost:8000/api/](http://localhost:8000/api/) |
| Frontend (if React) | [http://localhost:5173/](http://localhost:5173/)         |
| PGAdmin (optional)  | [http://localhost:5050/](http://localhost:5050/)         |

> 💡 **Costs:** Every story generation hits OpenAI APIs. In local dev the quota is disabled, but you’ll pay standard OpenAI rates. Consider using the `OPENAI_API_TYPE=mock` setting during tests.

### 3. Run Migrations & Create Superuser

```bash
docker compose exec web python manage.py migrate
docker compose exec web python manage.py createsuperuser
```

### 4. Execute Tests

```bash
docker compose exec web pytest
```

---

## 🛠️ Architecture Highlights

* **Celery + Redis** – Off-loads story generation and media processing to background workers.
* **S3-backed Storage** – Durable media hosting with pre-signed URLs for audio downloads.
* **Stripe Webhooks** – Keeps subscription status and monthly quotas in sync.
* **OpenAI Moderation** – Blocks stories containing disallowed content before publishing.

For detailed implementation steps, see [`/tasks/tasks-prd.md`](./tasks/tasks-prd.md).

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
