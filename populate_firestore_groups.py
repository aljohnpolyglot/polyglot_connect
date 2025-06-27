import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import json
import datetime # For a potential initial lastActivity

# --- CONFIGURATION ---
SERVICE_ACCOUNT_KEY_PATH = './polyglot-connect-firebase-adminsdk.json' # Update this path
GROUPS_DATA_JSON_PATH = './groups_data.json'  # Update this path
# --- END CONFIGURATION ---

def initialize_firebase():
    """Initializes the Firebase Admin SDK."""
    try:
        cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH)
        firebase_admin.initialize_app(cred)
        print("Firebase Admin SDK initialized successfully.")
        return firestore.client()
    except Exception as e:
        print(f"Error initializing Firebase Admin SDK: {e}")
        return None

def populate_groups(db):
    """Reads group data from JSON and creates/updates documents in Firestore."""
    if not db:
        return

    try:
        with open(GROUPS_DATA_JSON_PATH, 'r', encoding='utf-8') as f:
            groups_data = json.load(f)
    except FileNotFoundError:
        print(f"Error: {GROUPS_DATA_JSON_PATH} not found.")
        return
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON from {GROUPS_DATA_JSON_PATH}: {e}")
        return
    except Exception as e:
        print(f"An unexpected error occurred reading the JSON file: {e}")
        return

    print(f"Found {len(groups_data)} group definitions in JSON file.")

    for group_def in groups_data:
        group_id = group_def.get("id")
        if not group_id:
            print(f"Skipping group due to missing 'id': {group_def.get('name', 'Unnamed Group')}")
            continue

        group_doc_ref = db.collection('groups').document(group_id)

        # Prepare data for Firestore (can be the whole group_def or selected fields)
        # For now, let's write all defined fields from the JSON.
        # You might want to exclude fields like 'memberSelectionCriteria' if it's complex
        # and only used client-side, or structure it appropriately for Firestore.
        data_to_set = {
            "name": group_def.get("name"),
            "language": group_def.get("language"),
            "groupPhotoUrl": group_def.get("groupPhotoUrl"),
            "description": group_def.get("description"),
            "tutorId": group_def.get("tutorId"),
            "maxLearners": group_def.get("maxLearners"),
            "tags": group_def.get("tags", []), # Default to empty array
            "category": group_def.get("category"),
            "communityTags": group_def.get("communityTags", []), # Default to empty array
            # Add any other fields you want on the parent document
            # It's good practice to add an initial lastActivity
            "lastActivity": firestore.SERVER_TIMESTAMP, # Use server timestamp
            "lastMessage": { # Initial placeholder
                "text": "Group created.",
                "senderId": "system",
                "senderName": "System",
                "timestamp": firestore.SERVER_TIMESTAMP,
                "type": "system_event"
            }
        }
        # Remove None values to avoid writing nulls unless intended
        data_to_set = {k: v for k, v in data_to_set.items() if v is not None}


        try:
            # Using set with merge=True will create the document if it doesn't exist,
            # or update it if it does. This is safer than just create.
            group_doc_ref.set(data_to_set, merge=True)
            print(f"Successfully created/updated group document: {group_id}")
        except Exception as e:
            print(f"Error creating/updating group document {group_id}: {e}")
            print(f"Data attempted: {data_to_set}")


if __name__ == "__main__":
    db_client = initialize_firebase()
    if db_client:
        populate_groups(db_client)
        print("Group population script finished.")
    else:
        print("Aborting script due to Firebase initialization failure.")