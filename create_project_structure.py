import os
import shutil # For deleting if it's a true reset

# --- CONFIGURATION ---
# Set to True if you want to delete existing 'css', 'data', 'images', 'js' folders and 'index.html'
# in the current directory before creating the new structure.
# BE VERY CAREFUL WITH THIS IF YOU HAVE OTHER FILES YOU WANT TO KEEP.
PERFORM_CLEAN_RESET = True # Set to False if you want to merge/add to existing structure

def clean_existing_structure():
    """Deletes specified folders and index.html in the current directory."""
    folders_to_delete = ["css", "data", "images", "js"]
    files_to_delete = ["index.html"]
    
    for folder in folders_to_delete:
        if os.path.exists(folder) and os.path.isdir(folder):
            try:
                shutil.rmtree(folder)
                print(f"Removed existing directory: {folder}")
            except OSError as e:
                print(f"Error removing directory {folder}: {e}")
        elif os.path.exists(folder):
            print(f"'{folder}' exists but is not a directory. Manual check needed.")

    for file_path in files_to_delete:
        if os.path.exists(file_path) and os.path.isfile(file_path):
            try:
                os.remove(file_path)
                print(f"Removed existing file:      {file_path}")
            except OSError as e:
                print(f"Error removing file {file_path}: {e}")
        elif os.path.exists(file_path):
             print(f"'{file_path}' exists but is not a file. Manual check needed.")


# Define the directory structure and files
# (filename, content_placeholder - None for just folder creation)
structure = {
    "css": {
        "base": {
            "_reset.css": "/* CSS Reset - consider using normalize.css or a modern reset */\nbody, h1, h2, p, ul, li { margin: 0; padding: 0; box-sizing: border-box; }",
            "_variables.css": ":root {\n  /* Define your CSS custom properties here */\n  --primary-color: #007bff;\n  --dark-bg: #18191a;\n  --light-text: #e4e6eb;\n  /* Add more variables for fonts, spacing, etc. */\n  --font-primary: 'Roboto', sans-serif;\n  --font-secondary: 'Merriweather Sans', sans-serif;\n}",
            "global.css": "/* Global styles for body, typography, etc. */\nbody { font-family: var(--font-primary); line-height: 1.6; background-color: #f0f2f5; color: #1c1e21; margin:0; display: flex; height: 100vh; overflow: hidden;}\n\n.loading-message, .empty-list-msg {\n    text-align: center;\n    padding: 40px;\n    font-size: 1.1em;\n    color: #777;\n    font-style: italic;\n}"
        },
        "components": {
            "card.css": "/* Styles for connector cards */\n.connector-card { /* Basic placeholder */ border: 1px solid #ddd; margin-bottom: 10px; padding: 10px; border-radius: 8px; }",
            "modal_call.css": "/* Styles for call-related modals (virtual, direct, voice-chat) */\n.calling-modal { /* Basic placeholder */ background: white; padding: 20px; border-radius: 8px; }",
            "modal_message.css": "/* Styles for messaging_interface modal */",
            "modal_persona.css": "/* Styles for detailed_persona_modal */",
            "modal_recap.css": "/* Styles for session_recap modal */",
            "buttons.css": "/* Styles for common buttons */\n.action-btn { /* Basic placeholder */ padding: 10px 15px; background-color: var(--primary-color); color: white; border: none; border-radius: 5px; cursor: pointer; }",
            "chat_bubbles.css": "/* Styles for chat messages UI */\n.chat-message-ui { /* Basic placeholder */ padding: 8px 12px; border-radius: 15px; margin-bottom: 5px; max-width: 75%; }"
        },
        "layout": {
            "shell.css": "/* Styles for the main 3-panel app shell layout */\n#polyglot-connect-app-shell { display: flex; height: 100vh; }",
            "hub.css": "/* Styles for the connector grid (hub) */\n.connector-grid { display: grid; gap: 20px; }"
        },
        "theme": {
            "dark_mode.css": "/* Dark mode specific theme overrides */\nbody.dark-mode { background-color: var(--dark-bg); color: var(--light-text); }"
        }
    },
    "data": {
        "personas.js": "// Data for AI Persona Objects\nconsole.log('data/personas.js loaded');\nwindow.polyglotPersonasDataSource = [];",
        "groups.js": "// Data for Group Definitions\nconsole.log('data/groups.js loaded');\nwindow.polyglotGroupsData = [];",
        "minigames.js": "// Data for Minigame Definitions\nconsole.log('data/minigames.js loaded');\nwindow.polyglotMinigamesData = [];",
        "shared_content.js": "// Data for Shared Tutor Images, Homepage Tips, etc.\nconsole.log('data/shared_content.js loaded');\nwindow.polyglotSharedContent = { tutorImages: [], homepageTips: [] };"
    },
    "images": { # This will create the folders. You add actual images manually.
        "characters": {
            "polyglot_connect_modern": {
                "Emile_Modern.png.txt": "Placeholder for Emile_Modern.png",
                "Sofia_Modern.png.txt": "Placeholder for Sofia_Modern.png",
                "Liselotte_Modern.png.txt": "Placeholder for Liselotte_Modern.png",
                "Chloe_Modern.png.txt": "Placeholder for Chloe_Modern.png",
                "Mateo_Modern.png.txt": "Placeholder for Mateo_Modern.png",
                # Add more character image name placeholders (48+ total)
                "Astrid_Modern.png.txt": "Placeholder for Astrid_Modern.png",
                "Rizki_Modern.png.txt": "Placeholder for Rizki_Modern.png",
                "Giorgio_Modern.png.txt": "Placeholder for Giorgio_Modern.png",
                "Mateus_Modern.png.txt": "Placeholder for Mateus_Modern.png (Portuguese)",
                "Yelena_Modern.png.txt": "Placeholder for Yelena_Modern.png (Russian)",
                # ... etc for all your personas
            }
        },
        "tutor_games": {
            "market_scene.jpg.txt": "Placeholder for market_scene.jpg",
            "travel_landmark_paris.jpg.txt": "Placeholder for travel_landmark_paris.jpg",
            # ... etc.
        },
        "flags": {
            "unknown.png.txt": "Placeholder for unknown.png (default/fallback flag)"
        },
        "channel_profile_aljohn_polyglot.png.txt": "Placeholder for your logo/favicon (channel_profile_aljohn_polyglot.png)"
    },
    "js": {
        "app.js": "// Main Application Logic (formerly connect_main.js)\ndocument.addEventListener('DOMContentLoaded', () => {\n  console.log('App.js loaded - Main Application Logic Initializing...');\n  if (window.shellController && typeof window.shellController.initializeAppShell === 'function') {\n    window.shellController.initializeAppShell();\n  } else { \n    console.error('Error: shellController or initializeAppShell not found!');\n  }\n  // Further app-wide initializations if needed\n});",
        "core": {
            "session_manager.js": "// Manages modal-based session states (calls, voice chats)\nconsole.log('core/session_manager.js loaded');\nwindow.sessionManager = {};",
            "chat_manager.js": "// Manages 1-on-1 persistent text chats (embedded UI & modal messaging)\nconsole.log('core/chat_manager.js loaded');\nwindow.chatManager = {};",
            "group_manager.js": "// Manages group chat logic (formerly group_chat_manager.js)\nconsole.log('core/group_manager.js loaded');\nwindow.groupManager = {};",
            "activity_manager.js": "// Manages persona active status, typing indicators, etc.\nconsole.log('core/activity_manager.js loaded');\nwindow.activityManager = {};"
        },
        "services": {
            "gemini_service.js": "// All Gemini API interactions (formerly connect_gemini.js)\nconsole.log('services/gemini_service.js loaded');\nwindow.geminiService = {};"
        },
        "ui": {
            "shell_controller.js": "// Manages the 3-panel app shell, tabs, main view switching (formerly app_shell_controller.js)\nconsole.log('ui/shell_controller.js loaded');\nwindow.shellController = {};",
            "modal_handler.js": "// Generic open/close for all modals (extracted from connect_ui.js)\nconsole.log('ui/modal_handler.js loaded');\nwindow.modalHandler = {};",
            "card_renderer.js": "// Renders connector cards into the hub\nconsole.log('ui/card_renderer.js loaded');\nwindow.cardRenderer = {};",
            "list_renderer.js": "// Renders dynamic lists (chat, summary, groups)\nconsole.log('ui/list_renderer.js loaded');\nwindow.listRenderer = {};",
            "dom_elements.js": "// Centralized DOM element selectors\nconsole.log('ui/dom_elements.js loaded');\nwindow.domElements = {};",
            "ui_updater.js": "// Functions to update various parts of the UI (e.g., chat logs, status indicators)\nconsole.log('ui/ui_updater.js loaded');\nwindow.uiUpdater = {};"
        },
        "utils": {
            "helpers.js": "// Utility functions (calculateAge, FlagCDN, localStorage, UUID, etc., formerly utils.js)\nconsole.log('utils/helpers.js loaded');\nwindow.polyglotHelpers = {};"
        },
        "config": {
            "api_keys.js": "// window.GEMINI_API_KEY = 'YOUR_ACTUAL_GEMINI_API_KEY_HERE';\nconsole.log('config/api_keys.js loaded - IMPORTANT: Add your Gemini API Key here and ensure this file is NOT committed to public repositories if it contains sensitive keys.');"
        }
    },
    "index.html": """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Polyglot Connect - Revamped</title>
  <link rel="icon" href="images/channel_profile_aljohn_polyglot.png" type="image/png">

  <!-- Base CSS -->
  <link rel="stylesheet" href="css/base/_reset.css">
  <link rel="stylesheet" href="css/base/_variables.css">
  <link rel="stylesheet" href="css/base/global.css">

  <!-- Layout CSS -->
  <link rel="stylesheet" href="css/layout/shell.css">
  <link rel="stylesheet" href="css/layout/hub.css">

  <!-- Component CSS (add as needed) -->
  <link rel="stylesheet" href="css/components/card.css">
  <link rel="stylesheet" href="css/components/modal_call.css">
  <link rel="stylesheet" href="css/components/modal_message.css">
  <link rel="stylesheet" href="css/components/modal_persona.css">
  <link rel="stylesheet" href="css/components/modal_recap.css">
  <link rel="stylesheet" href="css/components/buttons.css">
  <link rel="stylesheet" href="css/components/chat_bubbles.css">


  <!-- Theme CSS (optional) -->
  <link rel="stylesheet" href="css/theme/dark_mode.css">

  <!-- Font Awesome -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <!-- Google Fonts (Example) -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Merriweather+Sans:wght@400;700&display=swap" rel="stylesheet">

</head>
<body>
  <div id="polyglot-connect-app-shell">
    <!-- App shell structure will be defined here by JavaScript or static HTML -->
    <p style="padding:20px; text-align:center;">Loading Polyglot Connect Interface...</p>
  </div>

  <!-- Configuration -->
  <script src="js/config/api_keys.js"></script>

  <!-- Utilities -->
  <script src="js/utils/helpers.js"></script>

  <!-- Data Files -->
  <script src="data/personas.js"></script>
  <script src="data/groups.js"></script>
  <script src="data/minigames.js"></script>
  <script src="data/shared_content.js"></script>

  <!-- Services -->
  <script src="js/services/gemini_service.js"></script>

  <!-- UI Modules -->
  <script src="js/ui/dom_elements.js"></script>
  <script src="js/ui/modal_handler.js"></script>
  <script src="js/ui/card_renderer.js"></script>
  <script src="js/ui/list_renderer.js"></script>
  <script src="js/ui/ui_updater.js"></script>
  <script src="js/ui/shell_controller.js"></script> <!-- Shell controller depends on other UI modules -->


  <!-- Core Logic Modules -->
  <script src="js/core/activity_manager.js"></script>
  <script src="js/core/session_manager.js"></script>
  <script src="js/core/chat_manager.js"></script>
  <script src="js/core/group_manager.js"></script>

  <!-- Main Application Entry Point -->
  <script src="js/app.js"></script>
</body>
</html>
"""
}

def create_dir_structure(base_path, structure_dict):
    """Recursively creates directories and files."""
    for name, content in structure_dict.items():
        current_path = os.path.join(base_path, name)
        if isinstance(content, dict): # It's a directory
            os.makedirs(current_path, exist_ok=True)
            # print(f"Created directory: {current_path}") # Less verbose
            create_dir_structure(current_path, content) # Recurse
        else: # It's a file
            try:
                # Write with UTF-8 encoding
                with open(current_path, "w", encoding="utf-8") as f:
                    if content is not None:
                        f.write(content)
                # print(f"Created file:      {current_path}") # Less verbose
            except IOError as e:
                print(f"Error creating file {current_path}: {e}")

if __name__ == "__main__":
    print("Starting project structure creation in the current directory.")

    if PERFORM_CLEAN_RESET:
        print("\nPERFORM_CLEAN_RESET is True. Attempting to remove existing structure...")
        clean_existing_structure()
        print("Cleaning attempt complete.\n")
    else:
        print("\nPERFORM_CLEAN_RESET is False. Will create files/folders; existing ones might be overwritten if names match.\n")

    # Create the structure in the current directory (".")
    create_dir_structure(".", structure)

    print("\n-------------------------------------------")
    print("Project structure creation complete!")
    print("-------------------------------------------")
    print("\nNext Steps:")
    print("1. Review the created folders and placeholder files.")
    print("2. Place your actual image files (e.g., Emile_Modern.png) into the")
    print("   relevant 'images' subfolders, replacing the '.txt' placeholder files.")
    print("   (e.g., images/characters/polyglot_connect_modern/Emile_Modern.png)")
    print("3. Update 'js/config/api_keys.js' with your actual Gemini API Key.")
    print("4. Begin populating the placeholder JS and CSS files with the actual code.")
    print("-------------------------------------------\n")