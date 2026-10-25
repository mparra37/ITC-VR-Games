# VR ITC Games

Cooperative virtual-reality mini-games for the classroom, built for **Meta Quest** headsets with [A-Frame](https://aframe.io/) (WebXR). They run in the Quest Browser in VR, and in any desktop browser in 2D with the mouse. Nothing to install, no build step.

The games were made for the **VR, Networks and Technology** area of **CODEXIA**, a Computer Science (ITC) outreach event for high-school students, where teams beat challenges to defeat Ultrón. Each game is a standalone challenge. The visual style follows the event's look: black, red and silver, with Orbitron and Rajdhani fonts.

> **Language:** the games, the menus and the printed material are in **Spanish** (the event's audience). This README is in English.

**Live demo:** `https://YOUR-USERNAME.github.io/vr-itc-games/` (replace with your GitHub Pages address)

## Printable material

Everything needed to run a session is in the site itself: open **Material para imprimir** (`material.html`) from the menu.

- **Guía rápida del profesor** (Teacher's quick guide): preparation checklist, room setup, the headset hand-off ritual, a 60-minute session plan, scoring and troubleshooting. It applies to every game.
- **Per game:** teacher guide, student rules, Field Manual for the decoders, answer key, scoreboard and play-order sheet, plus extra sheets some games need (worksheet, board and token).
- Operator cards, used only to play without a headset.
- Each game also has a **ZIP** with all its PDFs.

All PDFs are letter size, in Spanish, and live in the `material/` folder.

## How it works

Every game follows the *Keep Talking and Nobody Explodes* model:

- **Operator:** one student wears the headset. They see the challenge but **not** the instructions.
- **Decoders:** the rest of the team has the printed **Field Manual** (*Manual de campo*). They know how to solve it but **can't** see the screen.
- They have to talk to each other to score.

Same rules in every game:

| Rule | Value |
| --- | --- |
| Round length | 3 minutes (or untimed practice mode) |
| Correct answer | +1 point |
| Wrong answer or skip | 5-second lockout ("¡Contraataque de Ultrón!"): nobody talks |
| Level up | every 5 correct answers (3 levels) |
| End of round | big score on screen: the team writes it on the paper scoreboard (it's the energy Ultrón loses) |

There is no team selection: the round starts right away, and the final score is written down by hand. A class of about 25 students can share 6 headsets: teams play in sync, one Operator per round, and the headset is passed to the next student.

## The games

| Page | Game (English) | Topic | What happens |
| --- | --- | --- | --- |
| `drones.html` | **Drones de Ultrón** (Ultron's Drones: friend or foe?) | AI: decision trees | Drones fly in around the Operator, who turns their head to find them and describes them (shape, eye color, blinking, antennas, propellers, serial number). The team follows a decision tree: shoot enemies, let allies pass. After each answer the console shows the path through the tree. |
| `marte.html` | **Misión Marte** (Mars Mission: the rover's AI) | AI: neural networks | Inside a dome on Mars, the Operator reads sensor values; the team computes one neural-network layer (value × weight, add, pick the largest) to classify ROCK, ICE, METAL or LIFE. |
| `router.html` | **Router humano** (Human Router) | Networks: IP routing | Inside the computer, a packet arrives with an IP address; the team checks the routing table and the Operator turns to find the right portal and fires the packet. |
| `arma.html` | **Arma la computadora** (Build the Computer) | Hardware | The motherboard asks for a part (by function, problem, or unit of measure); the Operator finds it among 8 floating parts and it flies into its slot. |
| `carrera.html` | **Carrera de palabras** (Word Race) | Binary and ASCII | A word in binary, one byte per letter; the team decodes it and the Operator types it. |
| `robot.html` | **Robot programado** (Programmed Robot) | Algorithms | Follow a short program (forward, turn, repeat) on a 4 × 4 board and pick the square where the robot ends. |
| `contrasena.html` | **¿Contraseña segura?** (Strong Password?) | Cybersecurity | The Operator spells a password; the team checks it against 5 rules: strong, weak, or which rule fails. |

### Trailer: *El sistema de Ultrón* (`viaje.html`)

A seated, roughly 2-minute ride through a computer taken over by Ultrón. It's meant to open the session. Stages:

1. A fiber-optic cable with light pulses and IP packets.
2. A router that scans your packet.
3. A RAM corridor where six bytes on the walls spell `ULTRON` in ASCII.
4. The CPU, where the Operator shoots Ultrón's core. His 6 shields appear, one per challenge.

To reduce motion sickness, the ride only moves forward, slowly, with no turns and no climbs. The player's platform moves with them, and starts and stops are smooth. Spanish narration uses the browser's speech synthesis when a Spanish voice is available; otherwise subtitles only.

Everything is drawn with code: no videos, models or images, so it loads fast on school Wi-Fi.

## Try it on a computer

Open `index.html` in a browser. It needs internet access to load A-Frame and the fonts. Some browsers block local files; if so, serve the folder:

```bash
python -m http.server 8090
```

Then open `http://localhost:8090/`. Click and drag to look around. Keyboard shortcuts:

| Game | Keys |
| --- | --- |
| Drones de Ultrón | click a drone = shoot (enemy), ALIADO button = let it pass · `E` = enemy, `A` = ally |
| Misión Marte | `R` rock, `H` ice, `M` metal, `V` life |
| Router humano | `S`, `B`, `I`, `V`, `T`, `D` (one per portal) |
| Arma la computadora | `1`–`8` (manual order) |
| Carrera de palabras | letters, `Backspace`, `Enter` |
| Robot programado | type the square (e.g. `c2`) + `Enter` |
| ¿Contraseña segura? | `S` strong, `D` weak; level 3: `1`–`5` rule, `0` none |
| Trailer | `Enter` = start without voice, `Space` = shoot Ultrón |

If you don't see your changes after editing a file, reload the page: browsers often cache the old JavaScript.

## Publish with GitHub Pages

The Quest needs an **https** address, and GitHub Pages provides one for free.

1. Create a **public** repository (for example `vr-itc-games`).
2. Upload the **contents of this folder**: the `.html` files, `README.md`, and the `js` and `material` folders.
3. Go to **Settings → Pages → Source: Deploy from a branch**, then choose branch `main`, folder `/ (root)`, and **Save**.
4. After a minute or two the site is at `https://YOUR-USERNAME.github.io/vr-itc-games/`.

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
| `viaje.html`, `js/viaje.js` | The trailer ride |
| `*.html` + `js/<game>.js` | One page and one script per game |
| `material.html`, `material/` | The printable material page and its PDFs and ZIPs (**generated**) |
| `js/menu.js` | The list of games used by both menus: add a new game here |
| `js/comun.js` | Shared pieces: canvas text panels, buttons, sounds, environments, colors and fonts |
| `js/*_datos.js`, `js/material_datos.js`, `js/palabras.js`, `js/robot_programas.js`, `js/contrasenas.js`, `js/mision_marte.js` | Game data (**generated**, don't edit by hand) |

All text in the scenes is drawn on canvas textures, so Spanish accents render correctly in VR.

### Printed material and game data

Each game has a printable kit (letter-size PDFs): teacher guide, student rules, Field Manual, Operator cards for a paper-only version, answer key, scoreboard and observation sheet. The kits and their generators live in the full project, outside this web folder:

- one JSON file per game (for example `drones.json`) is the single source of truth;
- a Python script in `prototipo_papel/` (for example `generar_drones.py`) builds the PDFs **and** writes the matching `js/*_datos.js`, so paper and headset always agree;
- `prototipo_papel/publicar_material.py` then copies every PDF into `material/`, builds the ZIPs and writes `js/material_datos.js` for the material page.

## Tech notes

- [A-Frame 1.7.0](https://aframe.io/) loaded from its CDN; plain JavaScript, no framework or bundler.
- Fonts: Orbitron and Rajdhani from Google Fonts. If they don't load, the system font is used.
- Sounds are synthesized with the Web Audio API (no audio files).

## Status

These are prototypes. So far they have been tested in desktop browsers (2D mode), **not yet on a real Quest**. Things still to check on the headset:

- frame rate, especially the trailer;
- readability of the small details (drone propellers and antennas);
- whether the Quest Browser has a Spanish voice for the trailer narration.

## Credits

- *Misión Marte* is inspired by the [AI Unplugged](https://www.ddi.tf.fau.de/en/schule/unterrichtsmaterialien/ai-unplugged/) activities (Lindner, Seegerer & Romeike, 2019).
- The cooperative format is inspired by *Keep Talking and Nobody Explodes*.
- Ultron is a Marvel character, used here only as the theme of a non-commercial school event. This project is not affiliated with or endorsed by Marvel.
