#!/bin/sh
# Build and publish dist/ to the gh-pages branch (GitHub Pages preview).
set -e
node scripts/chords/check.mjs
node scripts/landing/build.mjs
npx tsc --noEmit
npx vite build --base=/guitar-workouts/
# Keep the assets of the live version for pages still cached in browsers.
PREVIOUS=$(mktemp -d)
if git clone -q --depth 1 -b gh-pages "$(git remote get-url origin)" "$PREVIOUS" 2>/dev/null; then
  node scripts/keep-previous-assets.mjs "$PREVIOUS" dist
fi
rm -rf "$PREVIOUS"
cd dist
touch .nojekyll
git init -q -b gh-pages
git add -A
git commit -qm "Deploy preview"
git push -f "$(git -C .. remote get-url origin)" gh-pages
rm -rf .git
