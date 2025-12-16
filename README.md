# Teckathon

Simple static project containing `index.html`, `loanDecisionLogic.js`, `ui.js`, and styles.

## What this repo contains
- `index.html` — main page
- `loanDecisionLogic.js` — application logic
- `ui.js` — UI interactions
- `styles.css` — styles (may be missing locally)

## Run locally
You can serve the folder with a lightweight HTTP server. From PowerShell run:

```powershell
python -m http.server 8080; Start-Process "http://localhost:8080"
```

Open `http://localhost:8080` in your browser.

## Preparing for GitHub
1. Initialize a git repo: `git init`
2. Create a new repository on GitHub (via the website) and add the remote.
3. Push the initial commit: `git remote add origin <URL>` then `git push -u origin main`

Example PowerShell commands after creating a GitHub repo named `Teckathon`:

```powershell
git init
git add --all
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<username>/Teckathon.git
git push -u origin main
```

## License
This project is available under the MIT License. See `LICENSE`.
