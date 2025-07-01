#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { program } = require("commander");
const express = require("express");
const puppeteer = require("puppeteer");
const chokidar = require("chokidar");
const open = require("open");
const yaml = require("js-yaml");

const version = "1.0.1";

// --- Configuration Loading ---

function loadConfig() {
    const defaultConfig = {
        style: {
            backgroundColor: '#ffffff',
            fontFamily: '"Hiragino Sans", "Meiryo", sans-serif',
            fontSize: '16px',
            padding: '20px',
            maxWidth: '800px',
            titleColor: '#333333',
            subtitleColor: '#666666',
        },
        bubbles: {
            borderRadius: '18px',
            padding: '12px 16px',
            margin: '10px 0',
            tailSize: '10px',
            thinkStyle: 'dashed',
            thinkBorderWidth: '2px',
            shoutBorderRadius: '4px',
        },
        characters: {
            mercury: { name: "Mercury", emoji: "🎧", color: "#89CFF0", textColor: "#000000" },
            glasses: { name: "Glasses", emoji: "👓", color: "#A0A0A0", textColor: "#FFFFFF" },
        },
        directories: {
            stories: 'stories',
            icons: 'icons',
            output: 'output',
            assets: 'assets'
        },
        customCSS: ''
    };

    const userConfigPath = path.resolve(process.cwd(), 'chat-config.yml');
    if (fs.existsSync(userConfigPath)) {
        try {
            const userConfig = yaml.load(fs.readFileSync(userConfigPath, 'utf8'));
            // Deep merge user config into default config
            return require('lodash.merge')(defaultConfig, userConfig);
        } catch (e) {
            console.error("Error loading chat-config.yml:", e);
            return defaultConfig;
        }
    }
    return defaultConfig;
}

const CONFIG = loadConfig();
const DIRS = {
    stories: path.resolve(process.cwd(), CONFIG.directories.stories),
    icons: path.resolve(process.cwd(), CONFIG.directories.icons),
    output: path.resolve(process.cwd(), CONFIG.directories.output),
    assets: path.resolve(process.cwd(), CONFIG.directories.assets),
    // --- Internal assets ---
    internalAssets: path.resolve(__dirname, 'res'),
    internalStyles: path.resolve(__dirname, 'styles.css')
};


// --- Commander Setup ---

program
    .version(version)
    .description("A CLI tool to generate chat-style images from Markdown files.");

program
    .command("preview <file>")
    .description("Preview a chat file in the browser with live updates.")
    .option("-p, --port <number>", "Port to run the preview server on.", "3000")
    .action((file, options) => {
        const filePath = path.resolve(DIRS.stories, file);
        startPreviewServer(filePath, options.port);
    });

program
    .command("export <file>")
    .description("Export a chat file to PNG images.")
    .action((file) => {
        const filePath = path.resolve(DIRS.stories, file);
        exportImages(filePath);
    });

program
    .command("html <file>")
    .description("Export a chat file to a single HTML file.")
    .action((file) => {
        const filePath = path.resolve(DIRS.stories, file);
        exportHTML(filePath);
    });

program
    .command("init")
    .description("Initialize a new project with example directories and config file.")
    .action(initProject);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.help();
}


// --- Core Functions ---

function parseMarkdownChat(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error(`Error: Story file not found at ${filePath}`);
        process.exit(1);
    }
    const markdown = fs.readFileSync(filePath, "utf8");
    const sections = [];
    let currentSection = { title: "", subtitle: "", messages: [] };
    let mainTitle = "";

    const lines = markdown.split('\n');
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        if (trimmedLine === '---') {
            if (currentSection.messages.length > 0) sections.push(currentSection);
            currentSection = { title: mainTitle, subtitle: "", messages: [] };
            continue;
        }
        if (trimmedLine.startsWith('# ')) {
            mainTitle = trimmedLine.substring(2).trim();
            continue;
        }
        if (trimmedLine.startsWith('## ')) {
            currentSection.subtitle = trimmedLine.substring(3).trim();
            continue;
        }

        const messageMatch = trimmedLine.match(/^(\w+):(left|right)(?::(\w+))?(?::(\w+))?\s+"([^"]+)"$/);
        if (messageMatch) {
            const [, character, direction, iconType, bubbleType, text] = messageMatch;
            const type = bubbleType || (iconType === 'think' || iconType === 'shout' ? iconType : 'norm');
            const icon = iconType || 'norm';
            currentSection.messages.push({ character, direction, type, icon, text });
        }
    }
    if (currentSection.messages.length > 0) sections.push(currentSection);
    return sections;
}

function getStyleContent() {
    const userStylesPath = path.resolve(process.cwd(), 'styles.css');
    if (fs.existsSync(userStylesPath)) {
        return fs.readFileSync(userStylesPath, 'utf8');
    }
    return fs.readFileSync(DIRS.internalStyles, 'utf8');
}

function generateChatHTML(sections, isExport = false) {
    let cssContent = getStyleContent();
    if (isExport) {
        // For exports, embed assets as base64 to make the HTML self-contained
        cssContent = cssContent.replace(/url("?\/res\/(.*?)"?)/g, (match, resFile) => {
            const assetPath = path.resolve(DIRS.assets, resFile);
            const internalAssetPath = path.resolve(DIRS.internalAssets, resFile);
            const finalPath = fs.existsSync(assetPath) ? assetPath : internalAssetPath;

            if (fs.existsSync(finalPath)) {
                const fileContent = fs.readFileSync(finalPath);
                const mimeType = mime.getType(finalPath) || 'application/octet-stream';
                return `url(data:${mimeType};base64,${fileContent.toString('base64')})`;
            }
            return match; // Keep original if not found
        });
    }

    let html = `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <title>Chat Preview</title>
        <style>${cssContent}</style>
        <style>${CONFIG.customCSS}</style>
    </head>
    <body>`;

    sections.forEach((section, sectionIndex) => {
        html += `<div class="chat-container" id="section-${sectionIndex + 1}">`;
        section.messages.forEach(msg => {
            const characterInfo = CONFIG.characters[msg.character] || { name: msg.character, emoji: '❓', color: '#ccc' };
            
            const iconPath = path.join(DIRS.icons, `${msg.character}_${msg.icon}.png`);
            const fallbackIconPath = path.join(DIRS.icons, `${msg.character}_norm.png`);
            let usedIconPath = null;

            if (fs.existsSync(iconPath)) usedIconPath = iconPath;
            else if (fs.existsSync(fallbackIconPath)) usedIconPath = fallbackIconPath;

            const iconSrc = isExport && usedIconPath 
                ? `data:image/png;base64,${fs.readFileSync(usedIconPath).toString('base64')}`
                : (usedIconPath ? `/icons/${path.basename(usedIconPath)}` : '');

            const iconHtml = usedIconPath
                ? `<img src="${iconSrc}" class="chat-icon-img" alt="${characterInfo.name}">`
                : `<div class="chat-icon-text">${characterInfo.emoji}</div>`;

            html += `
            <div class="chat-message ${msg.direction}">
                <div class="chat-icon">${iconHtml}</div>
                <div class="chat-bubble ${msg.character} ${msg.direction} ${msg.type}">
                    ${parseMessageText(msg.text)}
                </div>
            </div>`;
        });
        html += `</div>`;
        if (sectionIndex < sections.length - 1) {
            html += `<div class="page-break"></div>`;
        }
    });

    html += `</body></html>`;
    return html;
}

function parseMessageText(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>');
}


// --- Commands Implementation ---

async function startPreviewServer(filePath, port) {
    const app = express();
    const server = require('http').createServer(app);
    const io = require('socket.io')(server);

    // Serve static assets from user's and internal directories
    app.use('/icons', express.static(DIRS.icons));
    app.use('/assets', express.static(DIRS.assets));
    app.use('/res', express.static(DIRS.internalAssets)); // Fallback to internal resources

    app.get('/', (req, res) => {
        try {
            const sections = parseMarkdownChat(filePath);
            let html = generateChatHTML(sections, false);
            html = html.replace('</body>', `
                <script src="/socket.io/socket.io.js"></script>
                <script>
                    const socket = io();
                    socket.on('reload', () => window.location.reload());
                </script>
            </body>`);
            res.send(html);
        } catch (error) {
            res.status(500).send(`<pre>${error.stack}</pre>`);
        }
    });

    const watchPaths = [
        filePath,
        path.resolve(process.cwd(), 'chat-config.yml'),
        path.resolve(process.cwd(), 'styles.css'),
        DIRS.icons,
        DIRS.assets
    ];

    chokidar.watch(watchPaths, { ignoreInitial: true }).on('all', (event, p) => {
        console.log(`Change detected in ${path.basename(p)}, reloading...`);
        io.emit('reload');
    });

    server.listen(port, () => {
        const url = `http://localhost:${port}`;
        console.log(`Preview server running at: ${url}`);
        open(url).catch(err => console.log(`Could not open browser. Please visit ${url} manually.`));
    });
}

async function exportImages(filePath) {
    console.log("Exporting to PNGs...");
    const sections = parseMarkdownChat(filePath);
    const baseFilename = path.basename(filePath, path.extname(filePath));
    fs.mkdirSync(DIRS.output, { recursive: true });

    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    for (let i = 0; i < sections.length; i++) {
        const html = generateChatHTML([sections[i]], true);
        await page.setContent(html, { waitUntil: 'networkidle0' });

        const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
        await page.setViewport({ width: 800, height: bodyHeight, deviceScaleFactor: 2 });
        
        const outputPath = path.join(DIRS.output, `${baseFilename}_${i + 1}.png`);
        await page.screenshot({ path: outputPath, omitBackground: true });
        console.log(`Exported: ${outputPath}`);
    }

    await browser.close();
    console.log("Export complete.");
}

async function exportHTML(filePath) {
    console.log("Exporting to HTML...");
    const sections = parseMarkdownChat(filePath);
    const html = generateChatHTML(sections, true);
    const baseFilename = path.basename(filePath, path.extname(filePath));
    const outputPath = path.join(DIRS.output, `${baseFilename}.html`);

    fs.mkdirSync(DIRS.output, { recursive: true });
    fs.writeFileSync(outputPath, html, 'utf8');
    console.log(`HTML exported to ${outputPath}`);
}

function initProject() {
    console.log("Initializing project...");

    // Create directories
    Object.values(DIRS).forEach(dir => {
        if (!fs.existsSync(dir) && (dir.includes(process.cwd()))) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`Created directory: ${path.relative(process.cwd(), dir)}`);
        }
    });

    // Create sample config
    const sampleConfigPath = path.resolve(process.cwd(), 'chat-config.yml');
    if (!fs.existsSync(sampleConfigPath)) {
        const sampleConfig = `
# Chat Generator Configuration
style:
  fontFamily: '"Helvetica Neue", Arial, sans-serif'
  fontSize: 18px

characters:
  # Add your characters here
  # format: character_id: { name: "Display Name", emoji: "❓", color: "#hex", textColor: "#hex" }
  yuki:
    name: Yuki
    emoji: "❄️"
    color: "#E0F7FA"
    textColor: "#006064"
  haru:
    name: Haru
    emoji: "🌸"
    color: "#FCE4EC"
    textColor: "#880E4F"

directories:
  stories: stories
  icons: icons
  output: output
  assets: assets
`;
        fs.writeFileSync(sampleConfigPath, sampleConfig.trim());
        console.log("Created: chat-config.yml");
    }

    // Create sample story
    const sampleStoryPath = path.join(DIRS.stories, 'sample-story.md');
    if (!fs.existsSync(sampleStoryPath)) {
        const sampleStory = `
# My First Story
## A new beginning

yuki:left "Hi, I'm Yuki. Nice to meet you!"

haru:right:smile "Hello, Yuki! I'm Haru. The pleasure is all mine."

yuki:left:think "I wonder what adventures await us."
`;
        fs.writeFileSync(sampleStoryPath, sampleStory.trim());
        console.log("Created: stories/sample-story.md");
    }
    
    console.log("\nInitialization complete!");
        console.log("Next steps:");
        console.log("1. Add your character icons (e.g., yuki_norm.png) to the 'icons' directory.");
        console.log("2. Edit 'chat-config.yml' to define your characters.");
        console.log("3. Write your story in 'stories/sample-story.md'.");
        console.log("4. Run `chat-generator preview sample-story.md` to see it live.");
}