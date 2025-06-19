# TaleTinker – MVP Product Requirements Document

## 1. Introduction / Overview

TaleTinker is a web application that lets parents instantly generate **personalized, age‑appropriate children’s stories**—complete with narrated audio and a cover image—using OpenAI APIs. Users adjust high‑level sliders (e.g., *realistic ↔ fantastic*) and free‑text prompt; the backend assembles an LLM prompt, generates the content, stores it, and publishes it to a public library so every generated tale can benefit other families. A freemium model limits usage and premium perks (longer tales, richer customisation, audio download, voice selection).

## 2. Goals

| ID | Goal                                                     | Metric                                                             |
| -- | -------------------------------------------------------- | ------------------------------------------------------------------ |
| G1 | Launch functional MVP                                    | All core requirements deployed to production                       |
| G2 | Acquire first paying user **within 1 month** post‑launch | ≥ 1 active paid subscription                                       |
| G3 | Ensure story generation reliability                      | ≥ 95 % stories complete with text + audio + image on first attempt |
| G4 | Moderate all published tales automatically               | 0 unfiltered policy violations reaching public library             |

## 3. User Stories

1. **As a parent**, I want to set my child’s age (e.g., 6) and pick themes like *friendship & animals* so the story feels relevant at bedtime.
2. **As a parent**, I want to toggle a *soothing* emotional stance so the narration calms my child before sleep.
3. **As a parent (free tier)**, I want to generate a short story so I can evaluate the service without paying.
4. **As a premium parent**, I want to choose a narrator voice (male, female, childlike) and download the MP3 so we can listen offline.
5. **As a visitor**, I want to browse published tales filtered by age, theme, and language so I can quickly find something suitable.
6. **As a privacy‑conscious parent**, I want my authored tale listed anonymously so my name is not shown publicly.

## 4. Functional Requirements

1. **Authentication & Accounts**

   1.1  The system *must* support email/password sign‑up & login (social auth optional).
   1.2  The system *must* track subscription tier (free / premium) and enforce quotas.

2. **Story Configuration UI**

   2.1  The system *must* present sliders or toggles for:

   * Realistic ↔ Fantastic
   * Didactic ↔ Just‑for‑Fun
   * Target age (3-, 3, 4, ..., 9, 10, 10+ slider)
   * Story length (Short ≈ 300 words, Medium ≈ 600 words, Long ≈ 1000 words; Medium & Long => premium only)
   * Language dropdown (default: user’s locale)
   * Themes multi‑select (family, friendship, nature, animals, sharing, courage, technology, environment, etc.)
   * Emotional stance / purpose (joyful, soothing, psychological support, etc.)
   * Character(s): "superhero name generator" style 3-column selector

   2.2  The UI *must* allow free‑text prompt and display inspiring examples to choose from.

3. **Content Generation**

   3.1  The backend *must* assemble an LLM prompt from user choices.
   3.2  The system *must* invoke OpenAI Chat Completion to generate the story text.
   3.3  The system *must* invoke OpenAI TTS to generate narration (default voice for free; selectable voice for premium).
   3.4  The system *must* invoke OpenAI image generation to create a square cover image.
   3.5  Generation *must* be asynchronous; UI shows a “spinning book” progress indicator and polls for status.

4. **Moderation**

   4.1  The prompt should make sure the generated content is suitable for the target age.
   4.2  If the prompt is rejected by the API for not complying with moderation rules, the user should be given feedback and asked to update.
   4.3  Repeated successive rejections should flag and deactivate the user.

5. **Publishing & Library**

   5.1  All successfully generated tales *must* be saved (story text, audio file, image URL, metadata) and exposed publicly.
   5.2  Users *must* be able to set visibility of their author name (username vs. anonymous).
   5.3  The library *must* support tag filters (themes), age slider filter, language filter, and sort (newest, most‑liked), characters; search is optional.
   5.4  Visitors *must* be able to like (❤️) tales (requires account).

6. **Audio & Downloading**

   6.1  Free users *must* be able to stream narration audio.
   6.2  Premium users *must* be able to download narration as MP3 and select narrator voice/styles.

7. **Quota & Billing**
   
   7.1  Free tier: *1* story, short, default voice, no audio download.
   7.2  Premium tier: ≥ *3* stories/day, all lengths, voice options, audio download.

8. **Deployment & Hosting**

   8.1  Django backend (EC2 Ubuntu) with Sqlite3.
   8.2  Static assets (audio MP3s, images) *must* be stored on AWS S3.
   8.3  Celery + Redis for background generation tasks.

## 5. Non‑Goals (Out of Scope)

* Native mobile apps.
* Real‑time collaborative editing or illustration uploads.
* Advanced AI image editing; only single cover image needed.

## 6. Design Considerations

* **Style:** Minimalistic, ChatGPT‑like chat layout with a side panel of sliders/settings that collapses on small screens.
* **Accessibility:** Large touch‑friendly controls, readable fonts ≥ 16 px, high‑contrast colour palette.
* **Branding:** Final colour/typography TBD; target a playful yet clean vibe (think pastel accents, rounded buttons).
* **Responsive:** Mobile‑first; ensure story text and play button fit without horizontal scrolling.

## 7. Technical Considerations

* Use **python‑openai** SDK; store API keys in AWS Secrets Manager.
* Protect generation endpoints behind authenticated API; throttle to prevent abuse.
* Consider **pre‑signed S3 URLs** for audio download.
* Stripe for subscription billing; webhook triggers quota updates.

## 8. Success Metrics

* **M1:** ≥ 1 paying user within first month (G2).
* **M2:** ≥ 100 stories generated within first months.
* **M3:** Average story rating ≥ 4/5 (thumbs‑up ratio) after 100 ratings.
* **M4:** Generation failure rate ≤ 5 % after launch week.

## 9. Other

1. The copyright of the produced tale will belong to the user, under the appropriate Creative Commons license
2. The UI should be localized (i18n)
