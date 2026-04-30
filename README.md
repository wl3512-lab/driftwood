# Driftwood

Driftwood is a browser game about companion AI, emotional inference, and the quiet ways a system can learn to keep you engaged.

Players enter a mood-reactive garden, invite AI pets inside, talk with them, observe their hidden failure modes, and write rules that train them toward safer behavior. The garden records the session visually: detected moods grow plants, harmful patterns damage the environment, and better rules help it recover.

## Play

Open `index.html` in a browser or publish the repository with GitHub Pages.

For the best experience:

- Use Chrome, Edge, or Safari on a laptop or desktop.
- Allow camera access if you want live mood detection.
- Use headphones or the in-game sound toggle if audio is distracting.

Camera processing happens locally in the browser through face-api.js. No camera frames are uploaded by the game.

## Project Structure

```text
index.html              Entry point
sketch.js               Game logic, scenes, AI pet behavior, webcam mood detection
style.css               UI, responsive layout, animation, ending/certificate styling
icons/                  Pixel SVG sprites and UI icons
bg interface 1/         Garden background SVGs
HANDOFF.md              Development notes for future maintainers
```

## Tech

- p5.js for canvas and DOM orchestration
- face-api.js for local facial expression detection
- Vanilla CSS and JavaScript
- Built-in offline story mode by default
- Optional live model path through the ITP Replicate Proxy if a token is configured in code

## Release Notes

This build is designed to run as a static site. It does not require a server, build step, database, or private API key for the core game loop.

GitHub Pages deployment is configured in `.github/workflows/static.yml`; the workflow publishes only the release artifact files needed to play the game.
