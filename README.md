# Chat Generator

A CLI tool to generate chat-style images and HTML from simple Markdown files.

This tool allows you to write dialogue in a structured Markdown format and export it as visually appealing chat bubbles, perfect for tutorials, stories, or social media content.

![Chat Preview](https://user-images.githubusercontent.com/12345/67890.png) <!-- Replace with an actual image URL later -->

## Features

-   **Live Preview**: See your chat story in a browser with hot-reloading as you edit.
-   **Image Export**: Export each section of your chat as a high-resolution PNG image.
-   **HTML Export**: Generate a self-contained HTML file of your entire chat.
-   **Customizable**: Easily define your own characters, icons, colors, and styles via a simple YAML config file.
-   **Dynamic Icons**: Automatically detects character icons based on file naming (`character_emotion.png`).

## Installation

You can install this tool globally via NPM:

```bash
npm install -g .
```

Or, you can install it as a development dependency in your project:

```bash
npm install --save-dev .
```
*(Note: For now, you need to clone this repository to install it. It will be published to NPM soon.)*

## Quick Start

1.  **Initialize a new project:**

    Create a new folder for your story and run the `init` command inside it.

    ```bash
    mkdir my-awesome-story
    cd my-awesome-story
    chat-generator init
    ```

    This will create the necessary directory structure and a sample configuration file:

    ```
    my-awesome-story/
    ├── icons/
    ├── stories/
    │   └── sample-story.md
    ├── output/
    ├── assets/
    └── chat-config.yml
    ```

2.  **Define your characters:**

    Open `chat-config.yml` and add your characters.

    ```yaml
    characters:
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
    ```

3.  **Add character icons:**

    Place your character icon images in the `icons/` directory. The file name should follow the format `characterid_emotion.png`. For example:

    -   `icons/yuki_norm.png`
    -   `icons/yuki_smile.png`
    -   `icons/haru_think.png`

    If an icon for a specific emotion is not found, it will fall back to `characterid_norm.png`. If no icon is found, it will display the emoji defined in the config.

4.  **Write your story:**

    Edit `stories/sample-story.md`. The syntax is simple:

    ```markdown
    # My First Story
    ## A new beginning

    yuki:left "Hi, I'm Yuki. Nice to meet you!"

    haru:right:smile "Hello, Yuki! I'm Haru. The pleasure is all mine."

    yuki:left:think "I wonder what adventures await us."
    ```

    **Format**: `character_id:direction:emotion:bubble_type "Message text"`

    -   `direction`: `left` or `right`
    -   `emotion` (optional): `smile`, `think`, `shout`, etc. This corresponds to the icon file name.
    -   `bubble_type` (optional): `norm`, `think`, `shout`. Affects the bubble style.

5.  **Preview your work:**

    ```bash
    chat-generator preview sample-story.md
    ```

    This will open a live preview in your browser.

6.  **Export your chat:**

    ```bash
    # Export as PNG images (one for each section)
    chat-generator export sample-story.md

    # Export as a single HTML file
    chat-generator html sample-story.md
    ```

    Your files will be saved in the `output/` directory.

## Customization

You can customize the look and feel of the chat by editing `chat-config.yml` and creating a `styles.css` file in your project's root directory.
