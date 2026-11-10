#!/bin/sh
# Build and publish dist/ to the gh-pages branch (GitHub Pages preview).
set -e
npx tsc --noEmit
npx vite build --base=/fretly/
cd dist
touch .nojekyll
git init -q -b gh-pages
git add -A
git commit -qm "Deploy preview"
git push -f "$(git -C .. remote get-url origin)" gh-pages
rm -rf .git
