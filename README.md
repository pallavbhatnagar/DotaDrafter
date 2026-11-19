# Counter Build: Dota 2 counter items

Pick your hero and the enemy draft (1–5 heroes). The app shows:

1. **Build type** in team-chat language ("Right-click · Physical"), with a Physical / Magical / Hybrid / Tanky switch.
2. **Enemy damage:** mostly magical, physical or mixed (tap to expand).
3. **Counters:** which item answers which enemy, and why. Passive items come first; "Press key" items are only suggested when no passive item does the job.
4. **Full build:** Early / Mid / Late, with the counter items already included. Normal and Turbo modes.

It's a static **PWA**: plain HTML, CSS and JavaScript with no build step and no server. It installs to an Android home screen from Chrome and works offline after the first load.

## Host it free on GitHub Pages

1. Create a new **public** repository on GitHub (for example `dota-counter-build`).
2. Upload everything in this folder to the root of the repo, including the hidden `.nojekyll` file.
   - On the website, use **Add file › Upload files** and drag in the folder contents.
   - Or, with git:
     ```
     git init
     git add .
     git commit -m "Counter Build PWA"
     git branch -M main
     git remote add origin https://github.com/<you>/dota-counter-build.git
     git push -u origin main
     ```
3. In the repo, go to **Settings › Pages**. Under **Build and deployment**, choose **Deploy from a branch**, then branch `main`, folder `/ (root)`, and click **Save**.
4. After about a minute, the app is live at `https://<you>.github.io/dota-counter-build/`.

**Install on Android:** open that link in Chrome, then use the menu (⋮) › **Install app** (or **Add to Home screen**).

**Updating:** push changes to GitHub. The app checks for new files whenever it opens online, so your phone picks up the new version on the next launch.

Netlify works too: drag this folder onto https://app.netlify.com/drop.

## Run it locally

Service workers need a web server, not a double-clicked file:

```
npx http-server -c-1
```

Then open http://localhost:8080.

## How it works

| File | What it does |
|------|--------------|
| `js/rules.js` | **The rules layer you tune.** Threat tags per hero, counter items per threat (passive or press key), damage profiles, build-type fit, item categories and search nicknames. |
| `js/engine.js` | Turns a draft into counters, the enemy damage split and the three-phase build. |
| `js/data.js` | Fetches OpenDota (`/constants/heroes`, `/constants/items`, `/heroes/{id}/itemPopularity`) and caches the results in localStorage, so the app works offline. |
| `js/app.js` | UI: draft, results, mobile screens and the desktop two-column view. |
| `sw.js` | Service worker. App files are loaded network-first (so updates arrive) with an offline fallback; hero and item images are cached. |

### Data notes
- No API key is needed. OpenDota's free tier allows 50,000 calls a month, and each user's phone makes only a handful.
- Hero and item constants are cached for 3 days and popular items for 12 hours. New heroes and items arrive automatically, a few days after a patch.
- **Turbo:** OpenDota's item-popularity data doesn't split by game mode, so Turbo uses the same popular items with Turbo timings (0–8, 8–18, 18+ min). Counters are identical in both modes. To get Turbo-specific builds later, add a Stratz API call.
- A hero added to the game but missing from `rules.js` still works: threats are guessed from its OpenDota roles until you add a row for it.
- Hero and item art belongs to Valve and is loaded from Valve's CDN. That's fine for a free fan app.

### Tuning the advice
- **Change which item counters a threat:** edit `THREATS` in `rules.js`. The order of options matters, and `p: true` marks an item as passive.
- **Re-tag a hero:** edit its row in `HEROES`, e.g. `phantom_assassin: [P, 'ev rc brk']`.
- **Change a hero's default build type:** add it to `BEST_OVERRIDE`.
