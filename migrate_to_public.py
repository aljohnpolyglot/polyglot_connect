import os
import shutil
import re

def migrate_assets_to_public(project_root):
    """
    Moves specified asset directories into a 'public' directory
    and updates src/href paths in index.html.
    """
    public_dir_name = "public"
    public_dir_path = os.path.join(project_root, public_dir_name)
    index_html_path = os.path.join(project_root, "index.html")

    directories_to_move = {
        "js": "js",
        "data": "data",
        "css": "css",
        "images": "images"
    } # source_dir_name_in_root: target_dir_name_in_public

    print(f"Project root: {project_root}")
    print(f"Public directory will be: {public_dir_path}")
    print(f"Index.html path: {index_html_path}")

    # 1. Create public directory if it doesn't exist
    if not os.path.exists(public_dir_path):
        os.makedirs(public_dir_path)
        print(f"Created directory: {public_dir_path}")
    else:
        print(f"Directory already exists: {public_dir_path}")

    # 2. Move specified directories into public
    for src_dir_name, target_dir_name_in_public in directories_to_move.items():
        src_path = os.path.join(project_root, src_dir_name)
        target_path_in_public = os.path.join(public_dir_path, target_dir_name_in_public)

        if os.path.exists(src_path):
            if os.path.exists(target_path_in_public):
                # If target exists, move contents of src into target (merge)
                # This is a bit more complex to do robustly, for simplicity,
                # we'll assume if target_path_in_public exists, we might be re-running.
                # A more robust version would handle merging or ask the user.
                # For now, if it's just files, we can copy them over.
                # If it has subdirectories, shutil.move might error if target exists.
                # Let's try to move and if it fails, it means the dir is already there.
                try:
                    print(f"Moving contents from {src_path} to {target_path_in_public} (if target exists, merging)...")
                    # Move each item from src_path to target_path_in_public
                    for item_name in os.listdir(src_path):
                        s_item = os.path.join(src_path, item_name)
                        d_item = os.path.join(target_path_in_public, item_name)
                        if os.path.isdir(s_item):
                            if os.path.exists(d_item):
                                shutil.rmtree(d_item) # Remove existing target dir to avoid merge issues with move
                            shutil.move(s_item, d_item)
                        else:
                            shutil.move(s_item, d_item)
                    # Remove the now-empty source directory
                    if not os.listdir(src_path): # Check if it's actually empty
                         os.rmdir(src_path)
                    print(f"Moved contents of {src_dir_name} and removed source directory.")

                except Exception as e:
                    print(f"Could not move {src_path} to {target_path_in_public}. It might already exist or there was an error: {e}")
                    print(f"Skipping move for {src_dir_name}. Please check manually.")
            else:
                # Target does not exist, so just move the whole directory
                try:
                    shutil.move(src_path, target_path_in_public)
                    print(f"Moved {src_path} to {target_path_in_public}")
                except Exception as e:
                    print(f"Error moving {src_path} to {target_path_in_public}: {e}")
        else:
            print(f"Source directory not found, skipping: {src_path}")

    # 3. Update paths in index.html
    if os.path.exists(index_html_path):
        try:
            with open(index_html_path, 'r', encoding='utf-8') as f:
                content = f.read()

            updated_content = content

            # Regex to find src="..." or href="..."
            # It looks for src=" or href=" followed by a quote,
            # then captures the path up to the closing quote.
            # It specifically targets paths starting with js/, data/, css/, images/
            # that are NOT http/https URLs.
            # And it ensures we don't add a slash if one is already there.
            # It also avoids re-prepending "/" if it's already done.

            def path_replacer(match):
                attr = match.group(1) # src or href
                quote = match.group(2) # " or '
                path = match.group(3)  # the actual path

                # Check if path starts with one of our target directories
                # and doesn't already start with '/' or 'http'
                is_target_path = False
                for prefix in directories_to_move.keys():
                    if path.startswith(prefix + "/"):
                        is_target_path = True
                        break
                
                if is_target_path and not path.startswith('/') and not path.startswith(('http://', 'https://')):
                    new_path = "/" + path
                    print(f"  Updating path: '{path}' to '{new_path}'")
                    return f'{attr}={quote}{new_path}{quote}'
                else:
                    # No change needed for this path
                    return match.group(0)


            # Update script src paths (excluding the main Vite entry point if it's specific)
            # This regex tries to be more specific to avoid modifying the Vite entry point `src="js/app.js"`
            # if it should remain relative for Vite's processing.
            # We want to change <script src="js/utils/helpers.js"> to <script src="/js/utils/helpers.js">

            # More robust: update only for directories we moved
            path_patterns_to_update = [
                r'(src|href)=(["\'])((?:js/utils/|js/services/|js/core/|js/sessions/|js/ui/|data/|css/|images/)[^"\']+)\2'
            ]

            for pattern in path_patterns_to_update:
                 updated_content = re.sub(pattern, path_replacer, updated_content)


            # Specifically for the main Vite module entry point:
            # If your Vite entry is <script type="module" src="js/app.js">,
            # it should become <script type="module" src="./js/app.js"> for Vite to resolve it as a source file.
            # Or, if your index.html is in the root alongside vite.config.js, it might be fine as is.
            # This script assumes that if it's `js/app.js`, it's the Vite entry.
            # Be careful with this part, verify it after running.
            # For now, the generic replacer above should handle most cases by adding a leading '/'.
            # The Vite entry point should be handled by Vite itself. The script tags we are modifying
            # are for *assets that will be in the public folder*.

            # If your main app.js is <script type="module" src="js/app.js"> and your index.html is in the root,
            # Vite handles this. We are only concerned with the *other* script tags.

            if updated_content != content:
                with open(index_html_path, 'w', encoding='utf-8') as f:
                    f.write(updated_content)
                print(f"Updated paths in {index_html_path}")
            else:
                print(f"No path changes needed in {index_html_path} based on current rules.")

        except Exception as e:
            print(f"Error processing {index_html_path}: {e}")
    else:
        print(f"File not found, skipping update: {index_html_path}")

    print("\nMigration process complete.")
    print("Please review the changes, especially in index.html and the public/ directory.")
    print("You will need to commit these changes to Git:")
    print("  git add .")
    print("  git commit -m \"Refactor static assets into public directory for Vite build\"")
    print("  git push origin main")

if __name__ == "__main__":
    # Assuming the script is in the project root
    project_directory = os.path.dirname(os.path.abspath(__file__))
    # Or, if you run it from elsewhere, set it manually:
    # project_directory = "D:\\polyglot_connect"

    migrate_assets_to_public(project_directory)