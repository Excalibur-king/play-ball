Card art files are resolved by strategy card id.

Preferred naming (in lookup order):

- `/assets/game/cards/<card-id>.png`
- `/assets/game/cards/<card-id>.svg`
- `/assets/game/cards/<card-id>.webp`
- `/assets/game/cards/<card-id>.jpg`

UI surfaces that consume this convention:

- Home skill loadout configuration
- Home shop card display
- Battle recommendation cards
- Battle skill pack cards

If no matching asset exists, the UI falls back to a styled placeholder without
changing gameplay logic. Current assets are AI-generated pixel art at 1024 px
on the long side; downscale or convert to WEBP if file size becomes a concern.
