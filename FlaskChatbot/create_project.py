#!/usr/bin/env python3
"""
Complete project creator for Emergency Response System
Run this script to create all files needed
"""

import os

# Create directories
os.makedirs('templates', exist_ok=True)
os.makedirs('static/css', exist_ok=True)
os.makedirs('static/js', exist_ok=True)

print("Creating project files...")

# requirements.txt
with open('requirements.txt', 'w') as f:
    f.write("""flask==3.0.0
flask-cors==4.0.0
google-genai==0.3.2
python-dotenv==1.0.0
gunicorn==21.2.0""")

# .env file
with open('.env', 'w') as f:
    f.write("""GEMINI_API_KEY=your_actual_api_key_here
SESSION_SECRET=emergency_response_secret_key_2024""")

# main.py
with open('main.py', 'w') as f:
    f.write("""from app import app

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)""")

# config.py
with open('config.py', 'w') as f:
    f.write("""import os
import logging
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)

tickets_data = []

class TicketsCollection:
    def __init__(self):
        self.data = tickets_data
        self.next_id = 1
    
    def insert_one(self, document):
        document['_id'] = str(self.next_id)
        self.next_id += 1
        self.data.append(document)
        
        class InsertResult:
            def __init__(self, inserted_id):
                self.inserted_id = inserted_id
        return InsertResult(document['_id'])
    
    def find(self, query=None):
        if query is None:
            query = {}
        
        result = []
        for doc in self.data:
            match = True
            for key, value in query.items():
                if key not in doc or doc[key] != value:
                    match = False
                    break
            if match:
                result.append(doc)
        
        class FindResult:
            def __init__(self, data):
                self.data = data
            
            def sort(self, key, direction):
                reverse = direction == -1
                self.data.sort(key=lambda x: x.get(key, 0), reverse=reverse)
                return self
            
            def __iter__(self):
                return iter(self.data)
        
        return FindResult(result)
    
    def update_one(self, query, update):
        for doc in self.data:
            match = True
            for key, value in query.items():
                if key == '_id':
                    if doc.get('_id') != value:
                        match = False
                        break
                elif doc.get(key) != value:
                    match = False
                    break
            
            if match:
                if '$set' in update:
                    doc.update(update['$set'])
                
                class UpdateResult:
                    def __init__(self, modified_count):
                        self.modified_count = modified_count
                return UpdateResult(1)
        
        class UpdateResult:
            def __init__(self, modified_count):
                self.modified_count = modified_count
        return UpdateResult(0)
    
    def count_documents(self, query=None):
        if query is None:
            query = {}
        
        count = 0
        for doc in self.data:
            match = True
            for key, value in query.items():
                if key not in doc or doc[key] != value:
                    match = False
                    break
            if match:
                count += 1
        return count
    
    def aggregate(self, pipeline):
        result = []
        if len(pipeline) >= 1 and '$group' in pipeline[0]:
            group_stage = pipeline[0]['$group']
            if group_stage.get('_id') == '$disaster_type':
                disaster_counts = {}
                for doc in self.data:
                    disaster_type = doc.get('disaster_type', 'unknown')
                    disaster_counts[disaster_type] = disaster_counts.get(disaster_type, 0) + 1
                
                for disaster_type, count in disaster_counts.items():
                    result.append({'_id': disaster_type, 'count': count})
                
                if len(pipeline) >= 2 and '$sort' in pipeline[1]:
                    sort_field = list(pipeline[1]['$sort'].keys())[0]
                    reverse = pipeline[1]['$sort'][sort_field] == -1
                    result.sort(key=lambda x: x.get(sort_field, 0), reverse=reverse)
        return result
    
    def create_index(self, index_spec):
        pass

tickets_collection = TicketsCollection()
logging.info("Using in-memory storage for tickets (demo mode)")""")

# app.py
with open('app.py', 'w') as f:
    f.write("""import os
import logging
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from dotenv import load_dotenv
from config import tickets_collection
from google import genai
from datetime import datetime
import json
import re

load_dotenv()
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "emergency_response_secret_key")
CORS(app)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    logging.error("GEMINI_API_KEY not found in environment variables")
    raise ValueError("GEMINI_API_KEY is required")

client = genai.Client(api_key=GEMINI_API_KEY)

def classify_disaster(text):
    try:
        prompt = f'''You are a disaster type classifier. Given the following user report, identify the type of disaster present in a single word or short phrase. 
Possible disaster types include: fire, flood, earthquake, landslide, cyclone, drought, tsunami, pandemic, accident, explosion, tornado, hailstorm, storm, volcanic eruption, etc. 
If none detected, answer 'none'.
Text: {text}
Disaster type:'''
        
        response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        return response.text.strip() if response.text else "unknown"
    except Exception as e:
        logging.error(f"Error classifying disaster: {e}")
        return "unknown"

def get_priority_score(text):
    try:
        prompt = f"Given the following SOS report, assign a numeric priority score from 1 to 1000. Text: {text} Only reply with the number."
        response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        
        score_text = response.text.strip() if response.text else "500"
        numbers = re.findall(r'\\d+', score_text)
        if numbers:
            score = int(numbers[0])
            return min(max(score, 1), 1000)
        return 500
    except Exception as e:
        logging.error(f"Error getting priority score: {e}")
        return 500

def get_priority_reason(text):
    try:
        prompt = f"Give a short reason (1-2 lines) explaining the priority score of the following SOS report: {text}"
        response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        return response.text.strip() if response.text else "Standard emergency assessment"
    except Exception as e:
        logging.error(f"Error getting priority reason: {e}")
        return "Standard emergency assessment"

def get_explanation(disaster_type):
    try:
        prompt = f"Explain the disaster type in detail: {disaster_type}"
        response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        return response.text.strip() if response.text else f"Information about {disaster_type}"
    except Exception as e:
        logging.error(f"Error getting explanation: {e}")
        return f"Information about {disaster_type}"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route("/sos_new", methods=["POST"])
def receive_sos():
    try:
        data = request.get_json()
        text = data.get("text", "").strip()
        location = data.get("location", "").strip()

        if not text or not location:
            return jsonify({"error": "Missing text or location"}), 400

        disaster_type = classify_disaster(text)
        priority_score = get_priority_score(text)
        priority_reason = get_priority_reason(text)
        explanation = get_explanation(disaster_type)

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

        result = tickets_collection.insert_one(entry)
        entry["_id"] = str(result.inserted_id)
        
        logging.info(f"New SOS ticket created: {result.inserted_id}")
        return jsonify({"message": "SOS received and processed", "entry": entry}), 201

    except Exception as e:
        logging.error(f"Error processing SOS: {e}")
        return jsonify({"error": f"Failed to process SOS report: {str(e)}"}), 500

@app.route("/available-sos", methods=["GET"])
def view_available_sos():
    try:
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
    try:
        total_tickets = tickets_collection.count_documents({})
        open_tickets = tickets_collection.count_documents({"status": "open"})
        closed_tickets = tickets_collection.count_documents({"status": "closed"})
        
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
    app.run(host="0.0.0.0", port=5000, debug=True)""")

# Create HTML templates
with open('templates/index.html', 'w') as f:
    f.write("""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Emergency SOS System</title>
    <link href="https://cdn.replit.com/agent/bootstrap-agent-dark-theme.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <div class="container">
            <a class="navbar-brand" href="/">
                <i class="fas fa-exclamation-triangle text-warning me-2"></i>
                Emergency SOS System
            </a>
            <div class="navbar-nav ms-auto">
                <a class="nav-link" href="/dashboard">
                    <i class="fas fa-dashboard me-1"></i>Response Dashboard
                </a>
            </div>
        </div>
    </nav>

    <div class="container mt-5">
        <div class="row justify-content-center">
            <div class="col-md-8">
                <div class="card border-warning">
                    <div class="card-header bg-warning text-dark">
                        <h2 class="card-title mb-0">
                            <i class="fas fa-sos me-2"></i>Emergency SOS Report
                        </h2>
                    </div>
                    <div class="card-body">
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            Please provide detailed information about your emergency situation. Our AI system will analyze and prioritize your report.
                        </div>

                        <form id="sosForm">
                            <div class="mb-4">
                                <label for="location" class="form-label">
                                    <i class="fas fa-map-marker-alt me-2"></i>Location
                                </label>
                                <input type="text" class="form-control" id="location" name="location" 
                                       placeholder="Enter your current location" required>
                            </div>

                            <div class="mb-4">
                                <label for="description" class="form-label">
                                    <i class="fas fa-edit me-2"></i>Emergency Description
                                </label>
                                <textarea class="form-control" id="description" name="description" rows="6" 
                                          placeholder="Describe your emergency situation in detail..." required></textarea>
                            </div>

                            <div class="d-grid">
                                <button type="submit" class="btn btn-danger btn-lg" id="submitBtn">
                                    <i class="fas fa-paper-plane me-2"></i>Submit Emergency Report
                                </button>
                            </div>
                        </form>

                        <div id="loadingAlert" class="alert alert-warning mt-3" style="display: none;">
                            <i class="fas fa-spinner fa-spin me-2"></i>
                            Processing your emergency report...
                        </div>

                        <div id="successAlert" class="alert alert-success mt-3" style="display: none;">
                            <i class="fas fa-check-circle me-2"></i>
                            <span id="successMessage"></span>
                        </div>

                        <div id="errorAlert" class="alert alert-danger mt-3" style="display: none;">
                            <i class="fas fa-exclamation-circle me-2"></i>
                            <span id="errorMessage"></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="/static/js/app.js"></script>
</body>
</html>""")

with open('templates/dashboard.html', 'w') as f:
    f.write("""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Emergency Response Dashboard</title>
    <link href="https://cdn.replit.com/agent/bootstrap-agent-dark-theme.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <div class="container-fluid">
            <a class="navbar-brand" href="/">
                <i class="fas fa-exclamation-triangle text-warning me-2"></i>
                Emergency Response Dashboard
            </a>
            <div class="navbar-nav ms-auto">
                <a class="nav-link" href="/">
                    <i class="fas fa-plus me-1"></i>New SOS Report
                </a>
                <button class="btn btn-outline-success btn-sm ms-2" onclick="refreshDashboard()">
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
            </div>
        </div>
    </nav>

    <div class="container-fluid mt-3">
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="card border-danger">
                    <div class="card-body text-center">
                        <i class="fas fa-exclamation-circle fa-2x text-danger mb-2"></i>
                        <h3 id="openTickets" class="text-danger">-</h3>
                        <small>Open Emergencies</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card border-success">
                    <div class="card-body text-center">
                        <i class="fas fa-check-circle fa-2x text-success mb-2"></i>
                        <h3 id="closedTickets" class="text-success">-</h3>
                        <small>Resolved</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card border-info">
                    <div class="card-body text-center">
                        <i class="fas fa-chart-bar fa-2x text-info mb-2"></i>
                        <h3 id="totalTickets" class="text-info">-</h3>
                        <small>Total Reports</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card border-warning">
                    <div class="card-body text-center">
                        <i class="fas fa-fire fa-2x text-warning mb-2"></i>
                        <h6 id="topDisaster" class="text-warning">-</h6>
                        <small>Most Common</small>
                    </div>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h5 class="mb-0">
                    <i class="fas fa-list me-2"></i>Active Emergency Reports
                    <span class="badge bg-danger ms-2" id="activeCount">0</span>
                </h5>
            </div>
            <div class="card-body">
                <div id="loadingSpinner" class="text-center py-4">
                    <i class="fas fa-spinner fa-spin fa-2x"></i>
                    <p class="mt-2">Loading emergency reports...</p>
                </div>

                <div id="noTicketsMessage" class="text-center py-4" style="display: none;">
                    <i class="fas fa-check-circle fa-3x text-success mb-3"></i>
                    <h5>No Active Emergencies</h5>
                    <p class="text-muted">All emergency reports have been resolved.</p>
                </div>

                <div id="ticketsContainer" class="row"></div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        let tickets = [];

        function refreshDashboard() {
            loadStats();
            loadTickets();
        }

        function loadStats() {
            fetch('/ticket-stats')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('openTickets').textContent = data.open_tickets || 0;
                    document.getElementById('closedTickets').textContent = data.closed_tickets || 0;
                    document.getElementById('totalTickets').textContent = data.total_tickets || 0;
                    
                    if (data.disaster_types && data.disaster_types.length > 0) {
                        document.getElementById('topDisaster').textContent = 
                            data.disaster_types[0]._id.charAt(0).toUpperCase() + 
                            data.disaster_types[0]._id.slice(1);
                    } else {
                        document.getElementById('topDisaster').textContent = 'None';
                    }
                })
                .catch(error => console.error('Error loading stats:', error));
        }

        function loadTickets() {
            document.getElementById('loadingSpinner').style.display = 'block';
            document.getElementById('noTicketsMessage').style.display = 'none';
            document.getElementById('ticketsContainer').innerHTML = '';

            fetch('/available-sos')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('loadingSpinner').style.display = 'none';
                    
                    if (data.tickets && data.tickets.length > 0) {
                        tickets = data.tickets;
                        document.getElementById('activeCount').textContent = tickets.length;
                        displayTickets(tickets);
                    } else {
                        document.getElementById('noTicketsMessage').style.display = 'block';
                        document.getElementById('activeCount').textContent = '0';
                    }
                })
                .catch(error => {
                    console.error('Error loading tickets:', error);
                    document.getElementById('loadingSpinner').style.display = 'none';
                });
        }

        function displayTickets(tickets) {
            const container = document.getElementById('ticketsContainer');
            container.innerHTML = '';

            tickets.forEach(ticket => {
                const priorityColor = getPriorityColor(ticket.priority_score);
                const timeAgo = getTimeAgo(ticket.timestamp);
                
                const ticketCard = `
                    <div class="col-md-6 col-lg-4 mb-3">
                        <div class="card border-${priorityColor} h-100">
                            <div class="card-header bg-${priorityColor} text-white">
                                <div class="d-flex justify-content-between align-items-center">
                                    <h6 class="mb-0">
                                        <i class="fas fa-fire me-1"></i>${ticket.disaster_type}
                                    </h6>
                                    <span class="badge bg-light text-dark">${ticket.priority_score}</span>
                                </div>
                            </div>
                            <div class="card-body">
                                <p class="card-text">
                                    <i class="fas fa-map-marker-alt text-primary me-1"></i>
                                    <small>${ticket.location}</small>
                                </p>
                                <p class="card-text">${truncateText(ticket.text, 100)}</p>
                                <p class="card-text">
                                    <small class="text-muted">
                                        <i class="fas fa-clock me-1"></i>${timeAgo}
                                    </small>
                                </p>
                            </div>
                        </div>
                    </div>
                `;
                container.innerHTML += ticketCard;
            });
        }

        function getPriorityColor(score) {
            if (score >= 800) return 'danger';
            if (score >= 600) return 'warning';
            if (score >= 400) return 'info';
            return 'secondary';
        }

        function truncateText(text, length) {
            return text.length > length ? text.substring(0, length) + '...' : text;
        }

        function getTimeAgo(timestamp) {
            const now = new Date();
            const time = new Date(timestamp);
            const diffMs = now - time;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            if (diffMins > 0) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
            return 'Just now';
        }

        setInterval(refreshDashboard, 30000);
        refreshDashboard();
    </script>
</body>
</html>""")

# Create CSS
with open('static/css/style.css', 'w') as f:
    f.write("""body {
    background-color: var(--bs-body-bg);
}

.card {
    border-radius: 10px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s ease-in-out;
}

.card:hover {
    transform: translateY(-2px);
}""")

# Create JavaScript
with open('static/js/app.js', 'w') as f:
    f.write("""document.addEventListener('DOMContentLoaded', function() {
    const sosForm = document.getElementById('sosForm');
    const submitBtn = document.getElementById('submitBtn');
    const loadingAlert = document.getElementById('loadingAlert');
    const successAlert = document.getElementById('successAlert');
    const errorAlert = document.getElementById('errorAlert');

    if (sosForm) {
        sosForm.addEventListener('submit', handleSOSSubmission);
    }

    async function handleSOSSubmission(event) {
        event.preventDefault();
        
        const formData = new FormData(sosForm);
        const location = formData.get('location').trim();
        const description = formData.get('description').trim();

        if (!location || !description) {
            showError('Please fill in all required fields.');
            return;
        }

        showLoading(true);
        hideAlerts();

        try {
            const response = await fetch('/sos_new', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: description,
                    location: location
                })
            });

            const data = await response.json();

            if (response.ok) {
                showSuccess(data.message, data.entry);
                sosForm.reset();
            } else {
                showError(data.error || 'Failed to submit SOS report');
            }
        } catch (error) {
            console.error('Error submitting SOS:', error);
            showError('Network error. Please check your connection and try again.');
        } finally {
            showLoading(false);
        }
    }

    function showLoading(show) {
        if (show) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
            loadingAlert.style.display = 'block';
        } else {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Submit Emergency Report';
            loadingAlert.style.display = 'none';
        }
    }

    function showSuccess(message, entry) {
        const successMessage = document.getElementById('successMessage');
        let content = `<strong>${message}</strong><br>`;
        
        if (entry) {
            content += `
                <div class="mt-3">
                    <strong>Report Details:</strong><br>
                    <small>
                        • Disaster Type: ${entry.disaster_type}<br>
                        • Priority Score: ${entry.priority_score}/1000<br>
                        • Status: Emergency response team notified
                    </small>
                </div>
            `;
        }
        
        successMessage.innerHTML = content;
        successAlert.style.display = 'block';
        successAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function showError(message) {
        document.getElementById('errorMessage').textContent = message;
        errorAlert.style.display = 'block';
        errorAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function hideAlerts() {
        successAlert.style.display = 'none';
        errorAlert.style.display = 'none';
    }
});""")

print("✅ All project files created successfully!")
print()
print("📝 NEXT STEPS:")
print("1. Edit .env file and add your real Gemini API key")
print("2. Run: pip install -r requirements.txt")
print("3. Run: python main.py")
print("4. Open http://localhost:5000 in your browser")
print()
print("🔑 Get your API key at: https://ai.google.dev/")