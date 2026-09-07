# EduGram

[![Checks](https://github.com/pralav-25/EduGram/actions/workflows/ci.yml/badge.svg)](https://github.com/pralav-25/EduGram/actions/workflows/ci.yml)

A gamified education prototype designed around culturally relevant learning for
students in Odisha. It combines student and teacher dashboard concepts with
subject activities, language learning, quizzes, and puzzle-based progress.

[View the live prototype](https://edu-gram.vercel.app)

## Experiences included

- Student dashboard and progress views
- Teacher dashboard and module-management concepts
- Odia and English language-learning activities
- Mathematics, history, and optics challenges
- Quiz, puzzle, score, and leaderboard flows
- English and Odia interface content

## Stack

- HTML, CSS, and JavaScript
- Tailwind CSS via CDN
- Browser-based audio and image assets

## Run locally

No build step is required:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Scope

EduGram is a front-end learning prototype. Login, progress, scoring, and teacher
data are demonstration experiences rather than a production student-information
system.

## Quality checks

Run `python3 scripts/check_site.py` with Node.js installed. This checks every
HTML page for missing local assets, duplicate IDs, broken local fragments, and
JavaScript syntax errors. GitHub Actions runs the same checks on each change.

The optics quiz accepts one answer per question, supports keyboard controls,
and retries missed questions. Images, audio, and dashboard links use the asset
names committed to this repository, including their case.

Run `node --test tests/*.test.cjs` for rapid-answer, language-switching, and
quiz-completion regression tests.
