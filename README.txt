JOHANNES BRÜSTLE — ACADEMIC WEBSITE

A responsive static website with a restrained science-fiction influence:
midnight blue, geometric typography, subtle grid lines, and cool-blue accents.
The academic pages use static files on GitHub Pages. The optional shared
puzzle leaderboards use a separate Cloudflare Worker with a D1 database.

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
assets/leaderboard.js      Shared leaderboard and optional score submission
assets/player-names.js     Nickname validation shared with the score service
assets/player-names-LICENSE.txt  Dictionary sources and attribution

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
single-player shape-placement game at the bottom of the Teaching page.
Choose a 5-by-5, 7-by-7, or 9-by-9 board before starting; 7-by-7 is the default.
Every piece covers four squares. All connected four-square shapes are
possible, including their distinct rotations and reflections.
Place the current piece without rotating it. The next three pieces are visible
alongside the current piece. Keep up to two pieces on hold. Click a hold slot,
or press H for slot 1 or J for slot 2, to store the current piece and draw the
next, or swap it with the piece in that slot. One hold or swap is available
per placement across both slots; placing a piece unlocks both slots again.
Each placed piece immediately shows its original arrival number, so pieces
can be matched to the optimal layout even when holding changes their order.
The game ends only when the current piece cannot fit and no permitted hold
can provide a playable piece.
Hover any square that a legal placement could cover; clicking places the
exact preview. Focus and Enter provide the same choices with the keyboard.
A fresh seed fixes random blocked squares, with no symmetry requirement,
and the full sequence of pieces and orientations. Blocked-square ranges
scale with the board: 0–1 on 5-by-5, 1–3 on 7-by-7, and 2–4 on 9-by-9.
Boards mix scattered blockers with small clusters and exclude stranded
regions smaller than a piece. Each puzzle is generated with a packing that
reaches the free-area bound, then its pieces are shuffled into arrival order.
Generation favors varied families and limits long runs of the same family.
New game returns to the size picker; Start game generates a fresh seed.
Reset replays the same board and sequence with both hold slots empty.
At the end, compare your layout with the Optimal offline solution for the
same board, arrival sequence, and hold rules. The score is 100 times your covered squares
divided by the optimal covered squares. The optimal
benchmark is certified by that area-bound packing: it remains achievable
without holding, and no use of hold can exceed the board's area bound.
Puzzle preparation runs
separately from the page in assets/packing-worker.js and packing-solver.js.

LEADERBOARDS
A shared top ten is kept separately for 5-by-5, 7-by-7 and 9-by-9 boards.
Scores are ranked by exact covered/optimal percentage, with newer submissions
first in a tie. Adding a qualifying score is optional: visitors can enter a
name or everyday noun, optionally followed by up to five digits, or leave the
field blank to remain Anonymous. Nicknames are limited to 24 characters and
checked for vulgar language both in the browser and on the server. Invalid
names can be corrected without losing the game's submission opportunity.
The vocabulary includes international given names and surnames, recognized
full names, and English nouns. It is a broad list, not a complete registry of
every real name. Dictionary attribution is in assets/player-names-LICENSE.txt.
The service regenerates the signed starting seed and replays all legal moves
before accepting a score. Submitted percentages are never trusted. This
checks a legal replay; it does not claim to distinguish humans from bots.
The database keeps at most 30 scores and no discarded score history. Anonymous
one-use submission receipts (no name or score) expire after 24 hours. One
score may be added per starting ticket; Reset preserves an already-added score.
The static game remains playable if the score service is unavailable, with
an explicit message that the local game cannot submit a leaderboard score.
The API origin is configured in teaching/index.html as data-leaderboard-api.
Backend source and deployment records are maintained separately from the
public academic-site repository. No signing key is shipped to visitors.

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
