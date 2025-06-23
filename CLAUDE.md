# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SORAMIMI is a chat image generator that converts Markdown format conversations into stylized chat bubble images. It features live preview functionality and CSS customization capabilities for creating visual chat conversations.

## Common Commands

### Initial Setup
```bash
npm install          # Install dependencies
npm run init         # Create sample files and directories
```

### Development Commands
```bash
# Live preview with auto-reload
npm run preview -- filename.md --watch
npm run preview:ep2  # Preview dtm-episode2-chat.md with watch mode

# Export chat to PNG images
npm run export -- filename.md  
npm run export:ep2   # Export dtm-episode2-chat.md
```

### Server
The preview server runs on http://localhost:3000 by default. Use `--port` flag to specify a different port.

## Architecture

### Core Components

1. **index.js** - Main application file containing:
   - Command-line interface setup using Commander.js
   - Markdown parser that converts chat syntax to structured data
   - HTML generator that creates styled chat bubbles
   - Preview server with Socket.io for live reload functionality
   - Export functionality using Puppeteer for PNG generation

2. **Character System**:
   - `characters.json` - Defines character metadata (name, emoji, color)
   - `SORAMIMI.yml` - Contains character descriptions and catchphrases
   - `icons/` directory - Character icon images in format: `{character}_{state}.png`

3. **Styling**:
   - `styles.css` - Main stylesheet for chat bubble appearance
   - `chat-config.yml` - Style configuration (colors, fonts, dimensions)
   - `res/` directory - Bubble background images

### Markdown Chat Syntax

```markdown
character:direction:iconType:bubbleType "message"
```

- **character**: mercury, glasses, darkhair, blonde
- **direction**: left, right
- **iconType**: norm, smile, angry, think, shout, etc. (defaults to "norm")
- **bubbleType**: norm, think, shout (defaults to iconType or "norm")

### Key Implementation Details

- The parser uses regex to extract chat messages from Markdown
- HTML generation differs between preview and export modes (images are stripped during export)
- Each section (divided by `---`) is exported as a separate PNG file
- Preview server serves static assets from `/icons` and `/res` directories
- Export functionality dynamically adjusts viewport height based on content