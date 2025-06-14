import shutil
import os
import datetime

def backup_project(source_dir_path, backup_parent_dir_path):
    """
    Backs up the project directory.

    Args:
        source_dir_path (str): The path to the source project directory (e.g., "D:\\polyglot_connect").
        backup_parent_dir_path (str): The path to the directory where the backup folder will be created 
                                      (e.g., "D:\\" if you want "D:\\polyglot_connect_old").
    """
    if not os.path.exists(source_dir_path):
        print(f"Error: Source directory '{source_dir_path}' does not exist.")
        return

    source_dir_name = os.path.basename(source_dir_path)
    backup_dir_name = f"{source_dir_name}_old"
    backup_dir_path = os.path.join(backup_parent_dir_path, backup_dir_name)

    # Handle existing backup directory
    if os.path.exists(backup_dir_path):
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        archive_backup_path = f"{backup_dir_path}_{timestamp}"
        print(f"Warning: Backup directory '{backup_dir_path}' already exists.")
        try:
            os.rename(backup_dir_path, archive_backup_path)
            print(f"Existing backup moved to '{archive_backup_path}'.")
        except OSError as e:
            print(f"Error: Could not move existing backup directory '{backup_dir_path}': {e}")
            print("Please remove or rename it manually and try again.")
            return

    print(f"Starting backup of '{source_dir_path}' to '{backup_dir_path}'...")
    try:
        # Copy the entire directory tree, including node_modules for a complete snapshot.
        # If you want to exclude node_modules, you can use shutil.copytree with an ignore pattern.
        shutil.copytree(source_dir_path, backup_dir_path, symlinks=True) # symlinks=True if you use them
        print(f"Backup completed successfully: '{backup_dir_path}'")
    except Exception as e:
        print(f"Error during backup: {e}")

if __name__ == "__main__":
    # IMPORTANT: Adjust these paths if your actual polyglot_connect is elsewhere
    # or if you want the _old directory placed differently.
    project_directory = r"D:\polyglot_connect" 
    parent_of_project_directory = r"D:\\" # This will create D:\polyglot_connect_old

    # Confirm paths with the user
    print(f"This script will back up: {project_directory}")
    print(f"To a new folder named: {os.path.basename(project_directory)}_old")
    print(f"Inside this location: {parent_of_project_directory}")
    
    proceed = input("Do you want to proceed? (yes/no): ").strip().lower()
    if proceed == 'yes':
        backup_project(project_directory, parent_of_project_directory)
    else:
        print("Backup operation cancelled by the user.")