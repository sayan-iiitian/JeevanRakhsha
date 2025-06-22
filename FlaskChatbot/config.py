import os
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)

# For this demo, we'll use an in-memory list instead of MongoDB
# This makes it easier to run without requiring MongoDB setup
tickets_data = []

class TicketsCollection:
    """In-memory MongoDB-like collection for demo purposes"""
    
    def __init__(self):
        self.data = tickets_data
        self.next_id = 1
    
    def insert_one(self, document):
        """Insert a document and return result with inserted_id"""
        document['_id'] = str(self.next_id)
        self.next_id += 1
        self.data.append(document)
        
        class InsertResult:
            def __init__(self, inserted_id):
                self.inserted_id = inserted_id
        
        return InsertResult(document['_id'])
    
    def find(self, query=None):
        """Find documents matching query"""
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
        """Update one document matching query"""
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
        """Count documents matching query"""
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
        """Simple aggregation pipeline support"""
        result = []
        
        # Simple implementation for disaster type grouping
        if len(pipeline) >= 1 and '$group' in pipeline[0]:
            group_stage = pipeline[0]['$group']
            if group_stage.get('_id') == '$disaster_type':
                disaster_counts = {}
                for doc in self.data:
                    disaster_type = doc.get('disaster_type', 'unknown')
                    disaster_counts[disaster_type] = disaster_counts.get(disaster_type, 0) + 1
                
                for disaster_type, count in disaster_counts.items():
                    result.append({'_id': disaster_type, 'count': count})
                
                # Apply sort if present
                if len(pipeline) >= 2 and '$sort' in pipeline[1]:
                    sort_field = list(pipeline[1]['$sort'].keys())[0]
                    reverse = pipeline[1]['$sort'][sort_field] == -1
                    result.sort(key=lambda x: x.get(sort_field, 0), reverse=reverse)
        
        return result
    
    def create_index(self, index_spec):
        """Mock index creation - no-op for in-memory storage"""
        pass

# Initialize the collection
tickets_collection = TicketsCollection()

logging.info("Using in-memory storage for tickets (demo mode)")
