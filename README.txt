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
assets/site.js             Paper filters, search, and two-player shape game

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
7-by-7 shape-placement game on the homepage, inspired by Domineering.
Players must place their current piece in its fixed orientation: a domino,
a three-square bar, or an L-shaped triomino. Each player sees two pieces ahead.
A fresh seed fixes two to six random blocked squares, with no symmetry
requirement, and both full piece sequences at the start.
New game generates a new seed; Reset replays the same board and sequences.

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
