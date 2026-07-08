import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import json
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize Firebase
cred = credentials.Certificate({
    "type": "service_account",
    "project_id": os.getenv("FIREBASE_PROJECT_ID"),
    "private_key": os.getenv("FIREBASE_PRIVATE_KEY").replace("\\n", "\n"),
    "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
    "token_uri": "https://oauth2.googleapis.com/token",
})

try:
    app = firebase_admin.get_app()
except ValueError:
    app = firebase_admin.initialize_app(cred)

db = firestore.client()
doc_ref = db.collection("users").document("test").collection("sessions").document("async-test-001")
doc = doc_ref.get()

if doc.exists:
    data = doc.to_dict()
    print("=== EMPIRICIST ===")
    print(json.dumps(data.get("empiricistAssessment", {}), indent=2))
    print("\n=== CLASSIFIER ===")
    print(json.dumps(data.get("classifier", {}), indent=2))
    print("\n=== DASHBOARD (SYNTHESIS) ===")
    print(json.dumps(data.get("dashboard", {}), indent=2))
else:
    print("Document does not exist.")
