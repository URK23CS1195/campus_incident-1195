"""
CareerFlow Backend — Flask + Firestore (Google Cloud)
Matches all fields used by the CareerFlow frontend (app.js / data.js).
"""

import json
from datetime import date, datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore

app = Flask(__name__)
CORS(app)


@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response


# ---- Firebase / Firestore setup ----
cred = credentials.Certificate("firebasekey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

COLLECTION = "applications"
FOLLOWUP_DAYS = 7


def doc_to_dict(doc):
    d = doc.to_dict()
    d["id"] = doc.id
    if "history" not in d or d["history"] is None:
        d["history"] = []
    return d


@app.route("/applications", methods=["POST"])
def create_application():
    data = request.get_json(force=True) or {}
    if not data.get("company") or not data.get("jobTitle"):
        return jsonify({"error": "company and jobTitle are required"}), 400

    today = date.today().isoformat()
    new_id = f"app-{int(datetime.now().timestamp() * 1000)}"

    record = {
        "company": data.get("company"),
        "website": data.get("website"),
        "logo_url": data.get("logoUrl"),
        "job_title": data.get("jobTitle"),
        "job_type": data.get("jobType"),
        "mode": data.get("mode"),
        "location": data.get("location"),
        "status": data.get("status", "wishlist"),
        "priority": data.get("priority", "medium"),
        "date_applied": data.get("dateApplied", today),
        "deadline": data.get("deadline"),
        "assessment_date": data.get("assessmentDate"),
        "interview_date": data.get("interviewDate"),
        "technical_date": data.get("technicalDate"),
        "hr_date": data.get("hrDate"),
        "offer_date": data.get("offerDate"),
        "salary": data.get("salary"),
        "offered_salary": data.get("offeredSalary"),
        "job_url": data.get("jobUrl"),
        "company_url": data.get("companyUrl"),
        "resume": data.get("resume"),
        "portfolio": data.get("portfolio"),
        "linkedin": data.get("linkedin"),
        "notes": data.get("notes"),
        "recruiter": data.get("recruiter"),
        "recruiter_email": data.get("recruiterEmail"),
        "recruiter_phone": data.get("recruiterPhone"),
        "last_updated": today,
        "history": [[today, "Application added"]],
    }

    db.collection(COLLECTION).document(new_id).set(record)
    record["id"] = new_id
    return jsonify(record), 201


@app.route("/applications", methods=["GET"])
def get_applications():
    docs = db.collection(COLLECTION).order_by(
        "last_updated", direction=firestore.Query.DESCENDING
    ).stream()
    return jsonify([doc_to_dict(d) for d in docs])


@app.route("/applications/<string:app_id>", methods=["PUT"])
def update_application(app_id):
    doc_ref = db.collection(COLLECTION).document(app_id)
    existing = doc_ref.get()
    if not existing.exists:
        return jsonify({"error": "Application not found"}), 404

    existing_dict = doc_to_dict(existing)
    data = request.get_json(force=True) or {}
    today = date.today().isoformat()

    # map camelCase frontend fields to snake_case stored fields where relevant
    field_map = {
        "jobTitle": "job_title", "jobType": "job_type", "logoUrl": "logo_url",
        "dateApplied": "date_applied", "assessmentDate": "assessment_date",
        "interviewDate": "interview_date", "technicalDate": "technical_date",
        "hrDate": "hr_date", "offerDate": "offer_date", "offeredSalary": "offered_salary",
        "jobUrl": "job_url", "companyUrl": "company_url", "recruiterEmail": "recruiter_email",
        "recruiterPhone": "recruiter_phone",
    }
    normalized = {}
    for k, v in data.items():
        normalized[field_map.get(k, k)] = v

    merged = {**existing_dict, **normalized}

    history = existing_dict.get("history", [])
    if normalized.get("status") and normalized["status"] != existing_dict.get("status"):
        history.append([today, f"Moved to {normalized['status']}"])
    elif normalized:
        history.append([today, "Application details updated"])

    merged["last_updated"] = today
    merged["history"] = history
    merged.pop("id", None)

    doc_ref.set(merged)
    merged["id"] = app_id
    return jsonify(merged)


@app.route("/applications/<string:app_id>", methods=["DELETE"])
def delete_application(app_id):
    doc_ref = db.collection(COLLECTION).document(app_id)
    existing = doc_ref.get()
    if not existing.exists:
        return jsonify({"error": "Application not found"}), 404
    doc_ref.delete()
    return jsonify({"message": "deleted", "id": app_id})


@app.route("/applications/search", methods=["GET"])
def search_applications():
    query = request.args.get("q", "").strip().lower()
    docs = db.collection(COLLECTION).stream()
    results = [doc_to_dict(d) for d in docs]
    if query:
        results = [
            r for r in results
            if query in (r.get("company") or "").lower()
            or query in (r.get("job_title") or "").lower()
        ]
    results.sort(key=lambda r: r.get("last_updated") or "", reverse=True)
    return jsonify(results)


@app.route("/applications/summary", methods=["GET"])
def get_summary():
    docs = list(db.collection(COLLECTION).stream())
    summary = {"total": len(docs)}
    for d in docs:
        status = d.to_dict().get("status", "wishlist")
        summary[status] = summary.get(status, 0) + 1
    return jsonify(summary)


@app.route("/applications/followups", methods=["GET"])
def get_followups():
    docs = db.collection(COLLECTION).stream()
    today = date.today()
    followups = []
    for doc in docs:
        d = doc_to_dict(doc)
        if d.get("status") in ("accepted", "rejected", "withdrawn"):
            continue
        if not d.get("last_updated"):
            continue
        last_change = datetime.strptime(d["last_updated"], "%Y-%m-%d").date()
        days_since = (today - last_change).days
        if days_since >= FOLLOWUP_DAYS:
            d["days_since_update"] = days_since
            followups.append(d)
    return jsonify(followups)


@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "time": datetime.now().isoformat()})


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)