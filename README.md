# Enlace VR

**Uno ve. El equipo sabe.** (One sees. The team knows.)

Cooperative virtual-reality games for teaching computing in the classroom, built for **Meta Quest** headsets with [A-Frame](https://aframe.io/) (WebXR). They run in the Quest Browser in VR, and in any desktop browser in 2D with the mouse. Nothing to install, no build step.

> **Language:** the games, the menus and the printed material are in **Spanish**. This README is in English.

**Live site:** [https://mparra37.github.io/ITC-VR-Games/](https://mparra37.github.io/ITC-VR-Games/)

## How it works

Every game follows the *Keep Talking and Nobody Explodes* model:

- **Operator:** one student wears the headset. They see the challenge but **not** the instructions.
- **Decoders:** the rest of the team has the printed **Field Manual** (*Manual de campo*). They know how to solve it but **can't** see the screen.
- They only win by talking to each other: that's the *enlace* (link).

Same rules in every game:

| Rule | Value |
| --- | --- |
| Round length | 3 minutes (or untimed practice mode); Laboratorio NOC-7 is a ~12-minute escape room with its own scoring |
| Correct answer | +1 point |
| Wrong answer or skip | 5-second lockout ("¡Enlace caído!", link down): nobody talks |
| Levels | 3, getting harder as the team scores |
| End of round | big score on screen: the team writes it on the paper scoreboard |

A class of about 25 students can share 6 headsets: teams play in sync, one Operator per round, and the headset is passed to the next student.

## The games

| Page | Game (English) | Topic | What happens |
| --- | --- | --- | --- |
| `router.html` | **Router humano** (Human Router) | Networks: IP addresses | A packet arrives with an IP address. Like an envelope, the first three numbers are the **network** (the street) and the last one is the **device** (the house number); the headset paints them in two colors. The Operator reads the network to the team, the team finds it in the routing table, and the Operator turns to find that door and fires the packet. After every answer the game shows why ("network 192.168.1 is in the table → SALÓN"). |
| `arma.html` | **Arma la computadora** (Build the Computer) | Hardware | A guided puzzle. The Operator sees an empty motherboard with numbered slots (model A, B or C) and the missing parts floating around as **drawings without names**. They grab a part and describe it; the team recognizes it in the parts catalog, finds it on the assembled plan for that board, and says the slot number. When the board is complete, the computer "boots" and shows every part's name. |
| `carrera.html` | **Carrera de palabras** (Word Race) | Binary and ASCII | A word in binary, one byte per letter; the team decodes it and the Operator types it. |
| `robot.html` | **Robot programado** (Programmed Robot) | Algorithms | Follow a short program (forward, turn, repeat) on a 4 × 4 board and pick the square where the robot ends. |
| `noc7.html` | **Laboratorio NOC-7** (NOC-7 Lab) | Escape room: binary, ASCII, logic | A 4-room escape room (about 12 minutes per team, its own scoring). Room 1: an IP address in binary → type it in decimal. Room 2: spell a word in binary with 8 light bulbs (ASCII). Room 3: variables a, b, c in binary → decimal. Room 4: true or false with a, b, c. Each solved room lights a lever on the right; pulling it opens the door, fades to black and pauses so the team can switch Operators. Values are random every game, so teams can't copy each other. |

## Printable material

Everything needed to run a session is in the site itself: open **Material para imprimir** (`material.html`) from the menu.

- **Guía rápida del profesor** (teacher's quick guide): preparation checklist, room setup, the headset hand-off ritual, a 60-minute session plan, scoring and troubleshooting. It applies to every game.
- **Per game:** teacher guide, student rules, Field Manual for the decoders, answer key, scoreboard and play-order sheet, plus extra sheets some games need.
- **Laboratorio NOC-7:** teacher guide, the support-team sheet (powers of 2, ASCII table and what to do in each room) and its own scoreboard.
- **For playing without a headset:** Operator cards (Router, Word Race, Robot) and a cut-out paper puzzle (Build the Computer).
- Each game also has a **ZIP** with all its PDFs.

All PDFs are letter size, in Spanish, and live in the `material/` folder. Print the *Arma la computadora* manual in color.

## Try it on a computer

Open `index.html` in a browser (it needs internet access to load A-Frame and the fonts). If your browser blocks local files, serve the folder:

```bash
python -m http.server 8090
```

Then open `http://localhost:8090/`. Click and drag to look around. Keyboard shortcuts:

| Game | Keys |
| --- | --- |
| Router humano | `S` salón, `B` biblioteca, `I` internet, `V` servidores, `L` laboratorio, `X` basura |
| Arma la computadora | click a part, then click its slot (or `1`–`8` for the slot) |
| Carrera de palabras | letters, `Backspace`, `Enter` |
| Robot programado | type the square (e.g. `c2`) + `Enter` |
| Laboratorio NOC-7 | digits, `Backspace`, `Enter`; `1`–`8` = bulbs; `V`/`F` = true/false; `R` = reset for the next team |

If you don't see your changes after editing a file, reload the page: browsers often cache the old JavaScript.

## Publish with GitHub Pages

The Quest needs an **https** address, and GitHub Pages provides one for free.

This repository is already published at [https://mparra37.github.io/ITC-VR-Games/](https://mparra37.github.io/ITC-VR-Games/). To publish your own copy:

1. Create a **public** repository.
2. Upload the **contents of this folder**: the `.html` files, `README.md`, and the `js` and `material` folders.
3. Go to **Settings → Pages → Source: Deploy from a branch**, then choose branch `main`, folder `/ (root)`, and **Save**.
4. After a minute or two the site is at `https://YOUR-USERNAME.github.io/REPO-NAME/`.

## Play on Meta Quest

1. Connect the headset to Wi-Fi and open **Browser**.
2. Go to the Pages address and bookmark it.
3. Tap **Entrar al menú en VR** (Enter the VR menu) and accept the permission prompt.
4. Point at a game with either controller and pull the **trigger**.
5. Every game has a **Menú de juegos** (games menu) button on its start and end screens.

When the page changes, the Quest Browser usually re-enters VR by itself. If it doesn't, tap the **VR** button in the bottom-right corner. Before class, check that the school Wi-Fi allows `github.io` on the headset.

### Classroom safety

- The Operator plays **seated**, with the guardian boundary on and the controller strap on the wrist.
- Targets appear to the sides and in front, never behind.
- The headset is taken off with both hands and passed carefully to the next Operator.

## Project structure

| File | What it is |
| --- | --- |
| `index.html` | Menu: web cards on a computer, and a 3D menu inside the headset |
| `material.html`, `material/` | The printable material page and its PDFs and ZIPs (**generated**) |
| `*.html` + `js/<game>.js` | One page and one script per game |
| `js/menu.js` | The list of games used by both menus: add a new game here |
| `js/comun.js` | Shared pieces: colors and fonts of the identity, canvas text panels, buttons, sounds, environments, SVG drawing |
| `js/router_datos.js`, `js/computadora_datos.js`, `js/palabras.js`, `js/robot_programas.js`, `js/noc7_datos.js`, `js/material_datos.js` | Game data and drawings (**generated**, don't edit by hand) |

All text in the scenes is drawn on canvas textures, so Spanish accents render correctly in VR.

### Identity

Black `#06080D`, navy `#0B1F3A`, gray `#8B95A7`, white `#F2F4F8` and a single ice-blue accent `#5AA9FF`; green and red only mean right or wrong. Fonts: Space Grotesk and IBM Plex Mono. The logo is two nodes joined by a dashed line. The colors live in `COLOR` in `js/comun.js` and in the CSS variables of `index.html` and `material.html`.

### Printed material and game data

The printable kits and their generators live in the full project, outside this web folder:

- one JSON file per game (for example `router.json`) is the single source of truth;
- a Python script in `prototipo_papel/` (for example `generar_router.py`) builds the PDFs **and** writes the matching `js/*_datos.js`, so paper and headset always agree. The drawings (door icons and computer parts) come from `prototipo_papel/iconos.py` and are the same on paper and in VR;
- `prototipo_papel/publicar_material.py` then copies every PDF into `material/`, builds the ZIPs and writes `js/material_datos.js` for the material page.

## Tech notes

- [A-Frame 1.7.0](https://aframe.io/) loaded from its CDN; plain JavaScript, no framework or bundler.
- Fonts: Space Grotesk and IBM Plex Mono from Google Fonts. If they don't load, the system font is used.
- Sounds are synthesized with the Web Audio API (no audio files).

## Status

These are prototypes. So far they have been tested in desktop browsers (2D mode), **not yet on a real Quest**. Things still to check on the headset: frame rate, and readability of the small details (the drawings of the computer parts, the IP addresses).

## Credits

The cooperative format is inspired by *Keep Talking and Nobody Explodes*. *Laboratorio NOC-7* is based on an earlier escape-room prototype by the author.


## Scoring without taking the headset

At the end of each round the headset shows the score and an 8-character verification code (game, team, score and time, checksummed). Teams write both on paper; `marcador.html` verifies them and builds the team scoreboard. Optionally, `js/config.js` points to a Google Apps Script web app (`apps_script/`) so scores are sent to Google Sheets automatically. `empezar.html` is a one-page quick start with the team score sheet.
