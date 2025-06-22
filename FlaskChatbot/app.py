import os
import logging
from flask import Flask, request, jsonify, render_template, redirect, url_for, flash
from flask_cors import CORS
from dotenv import load_dotenv
from config import tickets_collection
from google import genai
from google.genai import types
from datetime import datetime
# from bson.objectid import ObjectId  # Not needed for in-memory storage
import json

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)

# Configure logging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "emergency_response_secret_key")
CORS(app)

# Initialize Gemini AI
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    logging.error("GEMINI_API_KEY not found in environment variables")
    raise ValueError("GEMINI_API_KEY is required")

client = genai.Client(api_key=GEMINI_API_KEY)

def classify_disaster(text):
    """Classify the type of disaster from the given text"""
    try:
        prompt = (
            "You are a disaster type classifier. "
            "Given the following user report (in any language), identify the type of disaster present in a single word or short phrase. "
            "Possible disaster types include: fire, flood, earthquake, landslide, cyclone, drought, tsunami, pandemic, accident, explosion, tornado, hailstorm, storm, volcanic eruption, etc. "
            "If none detected, answer 'none'.\n"
            f"Text: {text}\n"
            "Disaster type:"
        )
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        
        return response.text.strip() if response.text else "unknown"
    except Exception as e:
        logging.error(f"Error classifying disaster: {e}")
        return "unknown"

def get_priority_score(text):
    """Get priority score for the SOS report"""
    try:
        prompt = f"Given the following SOS report, assign a numeric priority score from 1 to 1000.\nText: {text}\nOnly reply with the number."
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        
        score_text = response.text.strip() if response.text else "500"
        # Extract numeric value
        import re
        numbers = re.findall(r'\d+', score_text)
        if numbers:
            score = int(numbers[0])
            return min(max(score, 1), 1000)  # Ensure score is between 1-1000
        return 500
    except Exception as e:
        logging.error(f"Error getting priority score: {e}")
        return 500

def get_priority_reason(text):
    """Get explanation for the priority score"""
    try:
        prompt = f"Give a short reason (1-2 lines) explaining the priority score of the following SOS report:\n\n{text}"
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        
        return response.text.strip() if response.text else "Standard emergency assessment"
    except Exception as e:
        logging.error(f"Error getting priority reason: {e}")
        return "Standard emergency assessment"

def get_explanation(disaster_type):
    """Get detailed explanation of the disaster type"""
    try:
        prompt = f"Give some emergency tips based on situation given: {disaster_type}"
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        
        return response.text.strip() if response.text else f"Information about {disaster_type}"
    except Exception as e:
        logging.error(f"Error getting explanation: {e}")
        return f"Information about {disaster_type}"

# Routes
@app.route('/')
def index():
    """Main page for submitting SOS reports"""
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    """Emergency response dashboard"""
    return render_template('dashboard.html')

@app.route("/sos_new", methods=["POST"])
def receive_sos():
    """Endpoint to receive new SOS reports"""
    try:
        data = request.get_json()
        text = data.get("text", "").strip()
        location = data.get("location", "").strip()

        if not text or not location:
            return jsonify({"error": "Missing text or location"}), 400

        # Process with AI
        disaster_type = classify_disaster(text)
        priority_score = get_priority_score(text)
        priority_reason = get_priority_reason(text)
        explanation = get_explanation(disaster_type)

        # Create ticket entry
        entry = {
            "text": text,
            "location": location,
            "disaster_type": disaster_type,
            "priority_score": priority_score,
            "priority_reason": priority_reason,
            "explanation": explanation,
            "status": "open",
            "timestamp": datetime.utcnow().isoformat(),
            "created_at": datetime.utcnow()
        }

        # Insert into database
        result = tickets_collection.insert_one(entry)
        entry["_id"] = str(result.inserted_id)
        
        logging.info(f"New SOS ticket created: {result.inserted_id}")
        return jsonify({"message": "SOS received and processed", "entry": entry}), 201

    except Exception as e:
        logging.error(f"Error processing SOS: {e}")
        return jsonify({"error": f"Failed to process SOS report: {str(e)}"}), 500

@app.route("/available-sos", methods=["GET"])
def view_available_sos():
    """View all available SOS tickets sorted by priority"""
    try:
        # Fetch all open tickets sorted by priority score (descending)
        open_tickets = tickets_collection.find({"status": "open"}).sort("priority_score", -1)

        result = []
        for ticket in open_tickets:
            result.append({
                "ticket_id": str(ticket["_id"]),
                "location": ticket.get("location", ""),
                "text": ticket.get("text", ""),
                "disaster_type": ticket.get("disaster_type", ""),
                "priority_score": ticket.get("priority_score", 0),
                "priority_reason": ticket.get("priority_reason", ""),
                "explanation": ticket.get("explanation", ""),
                "status": ticket.get("status", "open"),
                "timestamp": ticket.get("timestamp", ""),
                "msg": "Available"
            })

        if not result:
            return jsonify({"msg": "No tickets currently open", "tickets": []}), 200

        return jsonify({"tickets": result, "count": len(result)}), 200

    except Exception as e:
        logging.error(f"Error fetching SOS tickets: {e}")
        return jsonify({"error": f"Failed to fetch tickets: {str(e)}"}), 500

@app.route("/close-ticket/<ticket_id>", methods=["POST"])
def close_ticket(ticket_id):
    """Close a specific ticket"""
    try:
        result = tickets_collection.update_one(
            {"_id": ticket_id},
            {"$set": {"status": "closed", "closed_at": datetime.utcnow()}}
        )
        
        if result.modified_count == 0:
            return jsonify({"error": "Ticket not found"}), 404
            
        return jsonify({"message": "Ticket closed successfully"}), 200
        
    except Exception as e:
        logging.error(f"Error closing ticket: {e}")
        return jsonify({"error": f"Failed to close ticket: {str(e)}"}), 500

@app.route("/ticket-stats", methods=["GET"])
def get_ticket_stats():
    """Get statistics about tickets"""
    try:
        total_tickets = tickets_collection.count_documents({})
        open_tickets = tickets_collection.count_documents({"status": "open"})
        closed_tickets = tickets_collection.count_documents({"status": "closed"})
        
        # Get disaster type distribution
        pipeline = [
            {"$group": {"_id": "$disaster_type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        disaster_types = list(tickets_collection.aggregate(pipeline))
        
        return jsonify({
            "total_tickets": total_tickets,
            "open_tickets": open_tickets,
            "closed_tickets": closed_tickets,
            "disaster_types": disaster_types
        }), 200
        
    except Exception as e:
        logging.error(f"Error getting stats: {e}")
        return jsonify({"error": f"Failed to get statistics: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
