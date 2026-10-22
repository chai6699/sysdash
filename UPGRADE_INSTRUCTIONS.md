# Apply the SysDash v1.1 upgrade

This is a **source-code overlay** for your existing repository at https://github.com/chai6699/sysdash. It is **not** a standalone installer and has not been pushed to GitHub.

## Step 1 — Get your original repository

If you already have SysDash on your machine, open the original repository folder. Otherwise:

```bash
git clone https://github.com/chai6699/sysdash.git
cd sysdash
```

To keep your current work safe, make a new branch before copying files:

```bash
git checkout -b feature/sysdash-v1.1
```

## Step 2 — Copy the upgrade files into the repository

Extract `sysdash-v1.1-upgrade.zip` and **copy its contents to your original `sysdash` folder**, preserving the paths. When your operating system asks whether to replace files, choose **Replace**.

For example, the patch file `src/renderer/src/App.jsx` should overwrite `sysdash/src/renderer/src/App.jsx`.

The patch adds the files `src/main/metricsStore.js`, `src/main/settings.js`, `src/main/alerts.js`, `src/main/assets/tray.png` and new tests.

**Don't delete original files** that aren't in the patch: particularly `src/main/protocol.js`, `src/renderer/src/main.jsx`, `src/renderer/index.html`, `vite.config.mjs`, `package.json` and `package-lock.json`.

## Step 3 — Install and run

```bash
npm install
npm test
npm run dev
```

On Windows you can create the installer using `npm run dist` after validating the application. On a Mac, `npm run dev` is the simplest option for trying the dashboard.

## Step 4 — Explore

- Overview: live CPU/RAM/disk/network and a hoverable performance chart.
- Processes: search across the full process list and sort by resource usage.
- Hardware: disks, network, CPU cores and supported GPU/battery information.
- Docker: optional stats when your local Docker daemon is running.
- Reports & alerts: export metrics to CSV and see sustained-threshold events.
- Settings: select theme, refresh speed, alert thresholds and minimise-to-tray behaviour.

The `PREVIEW.html` file is an **inert design preview with sample data**. Open it in a browser only to inspect the layout; it does not collect metrics or require Electron.

## Step 5 — Review before publishing

```bash
git status
git diff --stat
git add README.md UPGRADE_INSTRUCTIONS.md src tests docs PREVIEW.html
git commit -m "feat: redesigned SysDash monitoring and diagnostics"
```

Make sure the app, tests and native OS functions work on your device before pushing the commit. Once the upgrade is verified, update the version in both `package.json` and `package-lock.json` together before creating a v1.1 release.

### Known testing limit

The code has been checked for JavaScript/JSX syntax and the new pure backend logic has been smoke-tested with fake hardware responses. This environment could not install your project's npm packages or launch a real Electron window, so the full Jest suite, real hardware readings and installer still need local validation.

If a test fails or you see a blank window, share the terminal error or a screenshot and we can debug it together.
