# Wortality Solutions — Python + Data Science + AI/ML Beginner Course Workbook

Official developer-documentation learning platform for **Wortality Solutions** (*FROM CAMPUS TALENT TO INDUSTRY EXCELLENCE*).

## Project Structure

```text
wortality-python-ai-ml-workbook/
├── index.html               # Main application shell
├── vercel.json              # Vercel static hosting & cache config
├── .gitignore
├── README.md
├── assets/
│   ├── logo-full.png        # Official Wortality Solutions wordmark
│   └── logo-icon.png        # Official Wortality Solutions icon & favicon
├── css/
│   └── styles.css           # Wortality Solutions theme & responsive layout
├── js/
│   └── app.js               # Navigation, search, Python highlighter, quizzes & progress
└── data/
    └── workbook-data.json   # Complete 14-day curriculum, 72 quiz Q&As, 10 projects, glossary & cheat sheets
```

## Run Locally

Because `js/app.js` loads `./data/workbook-data.json` over HTTP, start any local static server:

```bash
# Using Node.js
npx serve .

# Or using Python 3
python3 -m http.server 8000
```

Then open `http://localhost:8000` (or the URL printed by `serve`).

## Push to GitHub & Host on Vercel

1. **Initialize and push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Wortality Solutions Python + AI/ML Workbook"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

2. **Deploy on Vercel:**
   - Go to [vercel.com/new](https://vercel.com/new) and import your GitHub repository.
   - Leave **Framework Preset** as `Other`, **Build Command** empty, and **Output Directory** as `.` (root).
   - Click **Deploy**. Your site will be live in seconds with automatic HTTPS and instant redeploys on every `git push`.
