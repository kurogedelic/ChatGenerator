#!/usr/bin/env node

/**
 * Simple Chat Generator
 * With live preview and easy export
 */

const fs = require("fs");
const path = require("path");
const { program } = require("commander");
const express = require("express");
const puppeteer = require("puppeteer");
const chokidar = require("chokidar");
const open = require("open");
const yaml = require("js-yaml");

// Version information
const version = "1.0.0";

// Characters config
const DEFAULT_CHARACTERS = {
	mercury: { name: "Mercury", emoji: "🎧", color: "#89CFF0" },
	glasses: { name: "Glasses", emoji: "👓", color: "#A0A0A0" },
	darkhair: { name: "Dark Hair", emoji: "🖤", color: "#36454F" },
	blonde: { name: "Blonde", emoji: "💛", color: "#FFD700" },
};

// Command setup
program
	.version(version)
	.description("Simple chat image generator with live preview")
	.option("-c, --characters <path>", "Characters JSON file", "characters.json")
	.option("-o, --output <dir>", "Output directory", "docs")
	.option("-w, --watch", "Watch mode (auto-update on file changes)", false)
	.option("-p, --port <number>", "Preview server port", "3000");

program
	.command("preview <file>")
	.description("Preview chat in browser with live updates")
	.action((file, options) => {
		const opts = { ...program.opts(), ...options };
		startPreviewServer(file, opts);
	});

program
	.command("export <file>")
	.description("Export chat to PNG images")
	.action((file, options) => {
		const opts = { ...program.opts(), ...options };
		exportImages(file, opts);
	});

program
	.command("html <file>")
	.description("Export chat as HTML file")
	.action((file, options) => {
		const opts = { ...program.opts(), ...options };
		exportHTML(file, opts);
	});

program
	.command("init")
	.description("Create sample files")
	.action(() => {
		createSampleFiles();
	});

program.parse(process.argv);

// Default help if no command specified
if (!process.argv.slice(2).length) {
	program.help();
}

/**
 * Create initial sample files
 */
function createSampleFiles() {
	console.log("Creating sample files...");

	// Characters JSON file
	fs.writeFileSync(
		"characters.json",
		JSON.stringify(DEFAULT_CHARACTERS, null, 2),
		"utf8"
	);
	console.log("Created: characters.json");

	// Sample markdown file
	const sampleMarkdown = `# DTM Tutorial
## Session 1: Introduction

mercury:right "はじめまして！DTMを始めたばかりの**Mercury**です。よろしくお願いします♪"

glasses:left:think "よろしく。僕は**Glasses**、電子音楽と自作機材が専門だよ。"

darkhair:right "初めまして、**Dark Hair**と申します。クラシック音楽が専門ですわ。"

blonde:left:shout "ヤッホー！**Blonde**だよ。EDMとか作ってるよー！よろしく〜"

---

## About DAW Software

mercury:left "みんなはどんな**DAW**使ってるの？私はLogic Pro！安かったから買ったんだけど…"

glasses:right:think "僕は**Max/MSP**とPure Dataがメイン。自作の装置と組み合わせるとおもしろい挙動をするんだ。"

darkhair:left "私は**Pro Tools HDX**を使っておりますわ。精度の高いレコーディングに適しているので。"

blonde:right:shout "**Ableton Live一択**！！ライブパフォーマンスも視野に入れるならこれでしょ！"
`;

	fs.writeFileSync("sample-chat.md", sampleMarkdown, "utf8");
	console.log("Created: sample-chat.md");

	// Create folders
	if (!fs.existsSync("icons")) {
		fs.mkdirSync("icons", { recursive: true });
		console.log("Created: icons/ directory");
	}

	if (!fs.existsSync("output")) {
		fs.mkdirSync("output", { recursive: true });
		console.log("Created: output/ directory");
	}

	if (!fs.existsSync("res")) {
		fs.mkdirSync("res", { recursive: true });
		console.log("Created: res/ directory");
	}

	// Make sure styles.css exists
	if (!fs.existsSync("styles.css")) {
		console.log(
			"Warning: styles.css not found. Please create it or copy from the template."
		);
	}

	console.log("\nInitialization complete!\n");
	console.log("To start live preview:");
	console.log("  npm run preview\n");
	console.log("To export as images:");
	console.log("  npm run export");
}

/**
 * Load characters configuration
 */
function loadCharacters(configPath) {
	try {
		if (fs.existsSync(configPath)) {
			const content = fs.readFileSync(configPath, "utf8");
			return JSON.parse(content);
		}
	} catch (err) {
		console.warn(`Warning: Could not load ${configPath}, using defaults`);
	}

	return DEFAULT_CHARACTERS;
}

/**
 * Parse markdown chat file
 */
function parseMarkdownChat(filePath) {
	try {
		const markdown = fs.readFileSync(filePath, "utf8");
		const sections = [];
		let currentSection = { title: "", subtitle: "", messages: [] };
		let mainTitle = "";

		// Process line by line
		const lines = markdown.split("\n");

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();

			// Skip empty lines
			if (!line) continue;

			// Section divider
			if (line === "---") {
				if (currentSection.messages.length > 0) {
					sections.push(currentSection);
					currentSection = {
						title: mainTitle,
						subtitle: "",
						messages: [],
					};
				}
				continue;
			}

			// Main title
			if (line.startsWith("# ")) {
				mainTitle = line.substring(2).trim();
				currentSection.title = mainTitle;
				continue;
			}

			// Subtitle
			if (line.startsWith("## ")) {
				currentSection.subtitle = line.substring(3).trim();
				continue;
			}

			// Parse message
			// Format: "character:direction:iconType:bubbleType "message""
			// Format: "character:direction:iconType "message""
			// Format: "character:direction "message""
			const messageMatch = line.match(
				/^(\w+):(left|right)(?::(\w+))?(?::(\w+))?\s+"([^"]+)"$/
			);

			if (messageMatch) {
				const [, character, direction, iconType, bubbleType, text] =
					messageMatch;

				// 省略時のデフォルト
				const type =
					bubbleType ||
					(iconType === "think" || iconType === "shout" ? iconType : "norm");
				const icon = iconType || "norm";

				currentSection.messages.push({
					character,
					direction,
					type,
					icon,
					text,
				});
			}
		}

		// Add the last section
		if (currentSection.messages.length > 0) {
			sections.push(currentSection);
		}

		return sections;
	} catch (error) {
		console.error("Error parsing Markdown file:", error);
		throw error;
	}
}

/**
 * Generate HTML for chat
 * @param {Array} sections - The chat sections
 * @param {Object} characters - The characters configuration
 * @param {boolean} isExport - Whether this is for export (to ignore images)
 */
function generateChatHTML(sections, characters, isExport = false) {
	// Read external CSS file
	let cssContent = "";
	try {
		if (fs.existsSync("styles.css")) {
			cssContent = fs.readFileSync("styles.css", "utf8");
			console.log("Using regular bubble styles");
		} else {
			throw new Error("No CSS file found");
		}
	} catch (error) {
		console.warn("Warning: CSS file not found. Using basic styles.");
		cssContent =
			"body { font-family: sans-serif; }\n.chat-bubble { border: 1px solid black; padding: 10px; margin: 10px; }";
	}

	// Build HTML
	let html = `
  <!DOCTYPE html>
  <html lang="ja">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat Preview</title>
    <style>${cssContent}</style>
  </head>
  <body>
  `;

	// Generate HTML for each section
	sections.forEach((section, sectionIndex) => {
		html += `<div class="chat-container" id="section-${sectionIndex + 1}">`;


		// Add messages
		section.messages.forEach((msg) => {
			const character = characters[msg.character] || {
				name: msg.character,
				emoji: "❓",
				color: "#CCCCCC",
			};

			// Try to load icon from icons directory using icon type
			const iconPath = `icons/${msg.character}_${msg.icon}.png`;
			const fallbackIconPath = `icons/${msg.character}_norm.png`;

			let usedIconPath = null;
			if (fs.existsSync(iconPath)) {
				usedIconPath = iconPath;
			} else if (fs.existsSync(fallbackIconPath)) {
				usedIconPath = fallbackIconPath;
			}

			const iconHtml = usedIconPath
				? `<img src="/${usedIconPath}" class="chat-icon-img" alt="${character.name}">`
				: `<div class="chat-icon-text">${character.emoji}</div>`;

			// Simple bubble HTML structure
			html += `
        <div class="chat-message ${msg.direction}">
          <div class="chat-icon" >
            ${iconHtml}
          </div>
          <div class="chat-bubble ${msg.character} ${msg.direction} ${
				msg.type
			}">
            ${parseMessageText(msg.text, isExport)}
          </div>
        </div>
      `;
		});

		html += `</div>`;

		// Add page break for all sections except the last one
		if (sectionIndex < sections.length - 1) {
			html += `<div class="page-break"></div>`;
		}
	});

	html += `
  </body>
  </html>
  `;

	return html;
}

/**
 * Parse message text (Markdown support)
 * @param {string} text - The text to parse
 * @param {boolean} isExport - Whether this is for export (to ignore images)
 */
function parseMessageText(text, isExport = false) {
	// Bold text
	text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

	// Italic text
	text = text.replace(/\*(.*?)\*/g, "<em>$1</em>");

	// Code text
	text = text.replace(/`(.*?)`/g, "<code>$1</code>");

	// Image links - only for preview mode, ignore in export mode
	if (!isExport) {
		text = text.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="markdown-image">');
	} else {
		// Remove image links for export
		text = text.replace(/!\[(.*?)\]\((.*?)\)/g, '');
	}

	return text;
}

/**
 * Start preview server with live reload
 */
async function startPreviewServer(filePath, options) {
	const { characters: charsPath, port, watch } = options;
	const app = express();

	// WebSocket server for real-time preview
	const server = require("http").createServer(app);
	const io = require("socket.io")(server);

	// Make public directory for static assets
	app.use("/icons", express.static("icons"));
	app.use("/res", express.static("res"));

	// Watch for file changes
	if (watch) {
		const watcher = chokidar.watch(
			[filePath, charsPath, "styles.css", "icons", "res"],
			{
				persistent: true,
				ignoreInitial: true,
			}
		);

		watcher.on("all", (eventType, path) => {
			console.log(`File ${eventType}: ${path}`);
			io.emit("reload");
		});

		console.log(
			`Watch mode enabled. Monitoring changes in: ${filePath}, ${charsPath}, styles.css, icons/, res/`
		);
	}

	// Serve HTML preview
	app.get("/", (req, res) => {
		try {
			const characters = loadCharacters(charsPath);
			const sections = parseMarkdownChat(filePath);
			// プレビューモードでは画像を表示する（isExport = false）
			let html = generateChatHTML(sections, characters, false);

			// Add real-time reload script
			if (watch) {
				html = html.replace(
					"</body>",
					`
          <script src="/socket.io/socket.io.js"></script>
          <script>
            const socket = io();
            socket.on('reload', () => {
              console.log('Change detected. Reloading...');
              window.location.reload();
            });
          </script>
        </body>`
				);
			}

			res.send(html);
		} catch (error) {
			console.error("Preview error:", error);
			res.status(500).send(`<h1>Error</h1><pre>${error.stack}</pre>`);
		}
	});

	// Section route for screenshot
	app.get("/section/:id", async (req, res) => {
		try {
			const sectionId = parseInt(req.params.id) || 1;
			const characters = loadCharacters(charsPath);
			const sections = parseMarkdownChat(filePath);

			if (sectionId > sections.length) {
				return res.status(404).send("Section not found");
			}

			const section = sections[sectionId - 1];
			// プレビューモードでは画像を表示する（isExport = false）
			const html = generateChatHTML([section], characters, false);

			res.send(html);
		} catch (error) {
			console.error("Section render error:", error);
			res.status(500).send(`<h1>Error</h1><pre>${error.stack}</pre>`);
		}
	});

	// Start server
	server.listen(port, () => {
		const url = `http://localhost:${port}`;
		console.log(`Preview server running at: ${url}`);
		console.log("Press Ctrl+C to stop the server");

		try {
			open(url);
		} catch (error) {
			console.log(
				`Could not open browser automatically. Please visit ${url} manually.`
			);
		}
	});
}

/**
 * Export chat as PNG images
 */
async function exportImages(filePath, options) {
	const { characters: charsPath, output } = options;

	console.log("Exporting chat to images...");

	try {
		// Make sure output directory exists
		if (!fs.existsSync(output)) {
			fs.mkdirSync(output, { recursive: true });
		}

		const characters = loadCharacters(charsPath);
		const sections = parseMarkdownChat(filePath);
		const baseFilename = path.basename(filePath, path.extname(filePath));

		// Create browser and configure page
		const browser = await puppeteer.launch({ headless: "new" });
		const page = await browser.newPage();

		// Set initial viewport with fixed width but arbitrary height
		// Height will be adjusted per section
		await page.setViewport({
			width: 800,
			height: 600, // この値は後で動的に調整されます
			deviceScaleFactor: 2,
		});

		// Start a temporary server for rendering
		const app = express();
		app.use("/icons", express.static("icons"));
		app.use("/res", express.static("res"));

		// CSS for cleaner screenshots
		const extraStyles = `
		<style>
		  body { margin: 0; padding: 0; }
		  .chat-container { padding: 20px; }
		</style>
	  `;

		// Section route with additional styles
		app.get("/render/:id", (req, res) => {
			const id = parseInt(req.params.id) - 1;
			if (id >= 0 && id < sections.length) {
				// エクスポートモードでは画像を無視する（isExport = true）
				let html = generateChatHTML([sections[id]], characters, true);
				// 追加CSSを挿入
				html = html.replace("</head>", `${extraStyles}</head>`);
				res.send(html);
			} else {
				res.status(404).send("Section not found");
			}
		});

		// Start server
		const server = require("http").createServer(app);
		const port = 3333; // Random port for internal use
		await new Promise((resolve) => server.listen(port, resolve));

		// Generate screenshots for each section
		for (let i = 0; i < sections.length; i++) {
			const url = `http://localhost:${port}/render/${i + 1}`;
			await page.goto(url, { waitUntil: "networkidle0" });

			// 1. コンテンツの実際の高さを取得
			const bodyHeight = await page.evaluate(() => {
				// .chat-containerの高さを取得、なければbody全体
				const container = document.querySelector(".chat-container");
				return (
					(container ? container.offsetHeight : document.body.offsetHeight) + 40
				); // 余白のために少し追加
			});

			// 2. ビューポートの高さを調整
			await page.setViewport({
				width: 800,
				height: bodyHeight,
				deviceScaleFactor: 2,
			});

			// 3. スクリーンショット撮影
			const outputPath = path.join(output, `${baseFilename}_${i + 1}.png`);
			await page.screenshot({
				path: outputPath,
				fullPage: true,
				omitBackground: true,
			});

			console.log(
				`Exported section ${i + 1} to ${outputPath} (height: ${bodyHeight}px)`
			);
		}

		// Clean up
		await browser.close();
		server.close();

		console.log(
			`Export complete! ${sections.length} images saved to ${output}/`
		);
	} catch (error) {
		console.error("Export error:", error);
		process.exit(1);
	}
}

/**
 * Export chat as HTML file
 * @param {string} file - The markdown file path
 * @param {Object} options - Export options
 */
async function exportHTML(file, options) {
	try {
		const { characters = "characters.json", output = "docs" } = options;

		console.log(`Exporting ${file} as HTML...`);

		// Ensure output directory exists
		if (!fs.existsSync(output)) {
			fs.mkdirSync(output, { recursive: true });
		}

		// Read and parse the markdown file
		const sections = parseMarkdownChat(file);
		console.log(`Parsed ${sections.length} sections from ${file}`);

		// Load characters config
		let charactersConfig = DEFAULT_CHARACTERS;
		if (fs.existsSync(characters)) {
			charactersConfig = JSON.parse(fs.readFileSync(characters, "utf8"));
			console.log(`Loaded characters from ${characters}`);
		} else {
			console.warn(`Characters file ${characters} not found. Using defaults.`);
		}

		// Generate HTML
		const html = generateChatHTML(sections, charactersConfig, false);

		// Save HTML file
		const baseFilename = path.basename(file, path.extname(file));
		const outputPath = path.join(output, `${baseFilename}.html`);
		
		fs.writeFileSync(outputPath, html, 'utf8');
		console.log(`HTML exported to ${outputPath}`);

	} catch (error) {
		console.error("HTML export error:", error);
		process.exit(1);
	}
}
