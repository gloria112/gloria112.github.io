JOHANNES BRÜSTLE — ACADEMIC WEBSITE

A responsive static website with a restrained science-fiction influence:
midnight blue, geometric typography, subtle grid lines, and cool-blue accents.
No build step, database, or paid hosting is required.

PAGES
index.html                 About and recent research
research/index.html        All publications, preprints, and manuscripts
teaching/index.html        Teaching experience
cv/index.html              Academic background
assets/johannes-brustle-cv.pdf  Downloadable public CV
assets/style.css           Appearance and responsive layout
assets/site.js             Paper filters, search, and single-player shape game
assets/packing-pieces.js   Shared piece geometry
assets/packing-worker.js   Seeded puzzle generation
assets/packing-solver.js   Packing and optimal-layout verification

PUBLISH ON GITHUB PAGES
1. Create a public repository named jbrustle01.github.io, under the jbrustle01 account.
2. Upload the contents of this folder into the repository's top level.
   The index.html file and assets folder must be at the top level, not nested
   inside a johannes-brustle-website folder. Keep .nojekyll if uploading with Git.
3. Open the repository's Settings > Pages. Under Build and deployment,
   choose Deploy from a branch, then main and / (root), and Save.
4. GitHub will show the published address, normally
   https://jbrustle01.github.io/. Initial publication may take several minutes.

Official instructions: https://docs.github.com/en/pages/quickstart

UPDATING THE SITE
Edit the relevant HTML file. Publication entries are ordinary HTML article
elements in research/index.html. Selected papers also appear on index.html.
The content is present without JavaScript, so search engines can read it.
The optional JavaScript adds paper search, category filters, and an interactive
13-by-13 single-player shape-placement game at the bottom of the Teaching page.
Every piece covers five squares. All connected five-square shapes are
possible, including their distinct rotations and reflections.
Place the current piece without rotating or skipping it. Only the next piece
is visible. The game ends when the current piece has no legal placement.
A fresh seed fixes eight to twelve random blocked squares, with no symmetry
requirement, and the full sequence of pieces and orientations.
Boards mix scattered blockers with small clusters and exclude stranded
regions smaller than a piece. Each puzzle is generated with a packing that
reaches the free-area bound, then its pieces are shuffled into arrival order.
Generation favors varied families and limits long runs of the same family.
New game generates a fresh seed; Reset replays the same board and sequence.
At the end, compare your layout with the optimal hindsight solution for the
same board and piece order. The score is 100 times your covered squares
divided by the optimal covered squares. The optimal
benchmark is certified by that area-bound packing. Puzzle preparation runs
separately from the page in assets/packing-worker.js and packing-solver.js.

Replace assets/johannes-brustle-cv.pdf to update the downloadable CV.

ADDING A PHOTO LATER
Place the photo at assets/portrait.jpg. In index.html, an HTML comment near
the research-interest sidebar shows where to insert the image. The portrait
style is already defined. No empty photo placeholder is shown to visitors.

TYPOGRAPHY
The site loads Space Grotesk, IBM Plex Sans, and IBM Plex Mono from Google Fonts.
System fonts are used if the font service is unavailable.

LOCAL PREVIEW
Open a terminal in this folder and run:
python3 -m http.server 8765 --bind 127.0.0.1
Then visit http://127.0.0.1:8765/ in a browser.
Press Control-C in that terminal to stop the preview.
