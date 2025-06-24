#!/usr/bin/env node

/**
 * Static HTML Builder for SORAMIMI Stories
 * Builds all .md files in stories/ directory to static HTML in docs/
 */

const fs = require("fs");
const path = require("path");

// Characters config
const DEFAULT_CHARACTERS = {
	mercury: { name: "Mercury", emoji: "🎧", color: "#89CFF0" },
	glasses: { name: "Glasses", emoji: "👓", color: "#A0A0A0" },
	darkhair: { name: "Dark Hair", emoji: "🖤", color: "#36454F" },
	blonde: { name: "Blonde", emoji: "💛", color: "#FFD700" },
	sister: { name: "Sister", emoji: "👩", color: "#FFB6C1" },
	master: { name: "Master", emoji: "👴", color: "#8B4513" },
	butler: { name: "Butler", emoji: "🤵", color: "#2F4F4F" },
};

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
 * Parse Markdown file into sections
 */
function parseMarkdownFile(filePath) {
	try {
		const content = fs.readFileSync(filePath, "utf8");
		const lines = content.split("\n");

		const sections = [];
		let currentSection = { title: "", subtitle: "", messages: [] };

		for (const line of lines) {
			const trimmedLine = line.trim();

			// Skip empty lines
			if (!trimmedLine) continue;

			// Check for section divider
			if (trimmedLine === "---") {
				if (currentSection.messages.length > 0) {
					sections.push(currentSection);
					currentSection = { title: "", subtitle: "", messages: [] };
				}
				continue;
			}

			// Check for title (# Title)
			if (trimmedLine.startsWith("# ")) {
				currentSection.title = trimmedLine.substring(2).trim();
				continue;
			}

			// Check for subtitle (## Subtitle)
			if (trimmedLine.startsWith("## ")) {
				currentSection.subtitle = trimmedLine.substring(3).trim();
				continue;
			}

			// Parse message
			// Format: "character:direction:iconType:bubbleType "message""
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
 */
function generateChatHTML(sections, characters, title = "SORAMIMI Story") {
	// Read external CSS file
	let cssContent = "";
	try {
		if (fs.existsSync("styles.css")) {
			cssContent = fs.readFileSync("styles.css", "utf8");
		} else {
			cssContent = `
body { 
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
    margin: 0; 
    padding: 20px; 
    background: #f5f5f5; 
}
.chat-container { 
    max-width: 800px; 
    margin: 0 auto; 
    background: white; 
    border-radius: 8px; 
    padding: 20px; 
    margin-bottom: 20px; 
    box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
}
.chat-title { 
    color: #333; 
    text-align: center; 
    margin-bottom: 20px; 
}
.chat-subtitle { 
    color: #666; 
    text-align: center; 
    margin-bottom: 30px; 
}
.chat-bubble { 
    display: flex; 
    margin: 15px 0; 
    align-items: flex-start; 
}
.chat-bubble.left { 
    justify-content: flex-start; 
}
.chat-bubble.right { 
    justify-content: flex-end; 
}
.bubble-content { 
    max-width: 70%; 
    padding: 12px 16px; 
    border-radius: 18px; 
    position: relative; 
    word-wrap: break-word; 
}
.chat-bubble.left .bubble-content { 
    background: #e3f2fd; 
    margin-left: 10px; 
}
.chat-bubble.right .bubble-content { 
    background: #f3e5f5; 
    margin-right: 10px; 
}
.character-icon { 
    width: 40px; 
    height: 40px; 
    border-radius: 50%; 
    background: #ddd; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    font-size: 20px; 
}
`;
		}
	} catch (error) {
		console.warn("Warning: CSS file not found. Using basic styles.");
	}

	// Build HTML
	let html = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>${cssContent}</style>
</head>
<body>
`;

	// Generate HTML for each section
	sections.forEach((section, sectionIndex) => {
		html += `<div class="chat-container" id="section-${sectionIndex + 1}">`;

		if (section.title && section.title.trim()) {
			html += `<h1 class="chat-title">${section.title}</h1>`;
		}

		if (section.subtitle && section.subtitle.trim()) {
			html += `<h2 class="chat-subtitle">${section.subtitle}</h2>`;
		}

		// Add messages
		section.messages.forEach((msg) => {
			const character = characters[msg.character] || {
				name: msg.character,
				emoji: "❓",
				color: "#CCCCCC",
			};

			// Try to load icon from icons directory
			const iconPath = `icons/${msg.character}_${msg.icon}.png`;
			const fallbackIconPath = `icons/${msg.character}_norm.png`;

			let iconHtml = '';
			if (fs.existsSync(iconPath)) {
				iconHtml = `<img src="${iconPath}" alt="${character.name}" class="character-icon" style="background-color: ${character.color};">`;
			} else if (fs.existsSync(fallbackIconPath)) {
				iconHtml = `<img src="${fallbackIconPath}" alt="${character.name}" class="character-icon" style="background-color: ${character.color};">`;
			} else {
				iconHtml = `<div class="character-icon" style="background-color: ${character.color};">${character.emoji}</div>`;
			}

			// Format message text (bold, italic, etc.)
			let formattedText = msg.text
				.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
				.replace(/\*(.*?)\*/g, '<em>$1</em>');

			html += `
<div class="chat-bubble ${msg.direction}">
    ${msg.direction === 'left' ? iconHtml : ''}
    <div class="bubble-content">
        ${formattedText}
    </div>
    ${msg.direction === 'right' ? iconHtml : ''}
</div>`;
		});

		html += '</div>';
	});

	html += `
</body>
</html>`;

	return html;
}

/**
 * Build all stories to static HTML
 */
async function buildAllStories() {
    const storiesDir = path.join(__dirname, 'stories');
    const docsDir = path.join(__dirname, 'docs');
    
    // Create docs directory if it doesn't exist
    if (!fs.existsSync(docsDir)) {
        fs.mkdirSync(docsDir, { recursive: true });
        console.log('Created docs/ directory');
    }
    
    // Copy static assets
    copyStaticAssets(docsDir);
    
    // Load characters configuration
    const characters = loadCharacters('characters.json');
    
    // Get all .md files in stories directory
    const storyFiles = fs.readdirSync(storiesDir)
        .filter(file => file.endsWith('.md'))
        .sort();
    
    console.log(`Found ${storyFiles.length} story files to build:`);
    
    // Build each story
    const builtFiles = [];
    for (const file of storyFiles) {
        const inputPath = path.join(storiesDir, file);
        const outputName = file.replace('.md', '.html');
        const outputPath = path.join(docsDir, outputName);
        
        try {
            console.log(`Building ${file} -> ${outputName}`);
            
            // Parse markdown
            const sections = parseMarkdownFile(inputPath);
            
            // Generate HTML
            const title = extractTitle(sections) || file.replace('.md', '');
            const html = generateChatHTML(sections, characters, title);
            
            // Write HTML file
            fs.writeFileSync(outputPath, html, 'utf8');
            
            builtFiles.push({
                input: file,
                output: outputName,
                title: title,
                sections: sections.length
            });
            
        } catch (error) {
            console.error(`Error building ${file}:`, error.message);
        }
    }
    
    // Generate index.html
    generateIndexHTML(docsDir, builtFiles);
    
    console.log(`\n✅ Built ${builtFiles.length} stories to docs/`);
    console.log('📁 Static site ready at docs/index.html');
}

/**
 * Copy static assets to docs directory
 */
function copyStaticAssets(docsDir) {
    const assetDirs = ['icons', 'res'];
    
    assetDirs.forEach(dir => {
        const srcDir = path.join(__dirname, dir);
        const destDir = path.join(docsDir, dir);
        
        if (fs.existsSync(srcDir)) {
            copyDirectory(srcDir, destDir);
            console.log(`Copied ${dir}/ to docs/${dir}/`);
        }
    });
    
    // Copy styles.css
    const stylesPath = path.join(__dirname, 'styles.css');
    if (fs.existsSync(stylesPath)) {
        fs.copyFileSync(stylesPath, path.join(docsDir, 'styles.css'));
        console.log('Copied styles.css to docs/');
    }
}

/**
 * Copy directory recursively
 */
function copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    
    const files = fs.readdirSync(src);
    
    files.forEach(file => {
        const srcPath = path.join(src, file);
        const destPath = path.join(dest, file);
        
        if (fs.statSync(srcPath).isDirectory()) {
            copyDirectory(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    });
}

/**
 * Extract title from sections
 */
function extractTitle(sections) {
    if (sections.length > 0 && sections[0].title) {
        return sections[0].title;
    }
    return null;
}

/**
 * Generate index.html with list of all stories
 */
function generateIndexHTML(docsDir, builtFiles) {
    const indexHTML = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SORAMIMI Stories</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            line-height: 1.6;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        h1 {
            color: #4a5568;
            text-align: center;
            margin-bottom: 2rem;
            font-size: 2.5rem;
        }
        .story-grid {
            display: grid;
            gap: 1rem;
            margin-top: 2rem;
        }
        .story-card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 1.5rem;
            transition: all 0.2s ease;
            background: #f7fafc;
        }
        .story-card:hover {
            border-color: #667eea;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
        }
        .story-title {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #2d3748;
        }
        .story-meta {
            font-size: 0.9rem;
            color: #718096;
            margin-bottom: 1rem;
        }
        .story-link {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 500;
            transition: background 0.2s ease;
        }
        .story-link:hover {
            background: #5a67d8;
        }
        .category {
            font-weight: bold;
            color: #4a5568;
            margin-top: 2rem;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 2px solid #e2e8f0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎵 SORAMIMI Stories</h1>
        <p style="text-align: center; color: #718096; margin-bottom: 2rem;">
            音のふしぎ探検隊 - 音楽と技術の世界を探求する物語集
        </p>
        
        ${generateStoryCategories(builtFiles)}
    </div>
</body>
</html>`;
    
    fs.writeFileSync(path.join(docsDir, 'index.html'), indexHTML, 'utf8');
    console.log('Generated docs/index.html');
}

/**
 * Generate categorized story list
 */
function generateStoryCategories(builtFiles) {
    const categories = {
        'メインエピソード': builtFiles.filter(f => f.input.match(/^episode\d+\.md$/)),
        'リバランス版': builtFiles.filter(f => f.input.includes('_rebalanced')),
        '音楽史外伝': builtFiles.filter(f => f.input.startsWith('gaiden'))
    };
    
    let html = '';
    
    Object.entries(categories).forEach(([category, files]) => {
        if (files.length > 0) {
            html += `<div class="category">${category}</div>`;
            html += '<div class="story-grid">';
            
            files.forEach(file => {
                html += `
                <div class="story-card">
                    <div class="story-title">${file.title}</div>
                    <div class="story-meta">
                        📄 ${file.input} • ${file.sections} セクション
                    </div>
                    <a href="${file.output}" class="story-link">読む →</a>
                </div>`;
            });
            
            html += '</div>';
        }
    });
    
    return html;
}

// Run the build
if (require.main === module) {
    buildAllStories().catch(console.error);
}

module.exports = { buildAllStories };