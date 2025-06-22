// Emergency SOS System JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const sosForm = document.getElementById('sosForm');
    const submitBtn = document.getElementById('submitBtn');
    const loadingAlert = document.getElementById('loadingAlert');
    const successAlert = document.getElementById('successAlert');
    const errorAlert = document.getElementById('errorAlert');

    if (sosForm) {
        sosForm.addEventListener('submit', handleSOSSubmission);
    }

    // Get user's location if available
    if (navigator.geolocation) {
        const locationInput = document.getElementById('location');
        if (locationInput && !locationInput.value) {
            navigator.geolocation.getCurrentPosition(function(position) {
                const lat = position.coords.latitude.toFixed(6);
                const lon = position.coords.longitude.toFixed(6);
                locationInput.placeholder = `Current location: ${lat}, ${lon}`;
            }, function(error) {
                console.log('Geolocation not available:', error);
            });
        }
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

        // Show loading state
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
        
        // Scroll to success message
        successAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function showError(message) {
        document.getElementById('errorMessage').textContent = message;
        errorAlert.style.display = 'block';
        
        // Scroll to error message
        errorAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function hideAlerts() {
        successAlert.style.display = 'none';
        errorAlert.style.display = 'none';
    }

    // Auto-hide alerts after 10 seconds
    function autoHideAlert(alertElement) {
        setTimeout(() => {
            alertElement.style.display = 'none';
        }, 10000);
    }

    // Apply auto-hide to success and error alerts when they're shown
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const target = mutation.target;
                if (target.style.display === 'block' && 
                    (target.id === 'successAlert' || target.id === 'errorAlert')) {
                    autoHideAlert(target);
                }
            }
        });
    });

    if (successAlert) observer.observe(successAlert, { attributes: true });
    if (errorAlert) observer.observe(errorAlert, { attributes: true });
});

// Utility functions for the dashboard
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

function getPriorityBadgeClass(score) {
    if (score >= 800) return 'badge-danger';
    if (score >= 600) return 'badge-warning';
    if (score >= 400) return 'badge-info';
    return 'badge-secondary';
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Emergency contact information (could be configurable)
const EMERGENCY_CONTACTS = {
    fire: '911',
    police: '911',
    medical: '911',
    general: '911'
};

// Add emergency contact display
function showEmergencyContacts() {
    const contactsHtml = `
        <div class="alert alert-warning">
            <h6><i class="fas fa-phone me-2"></i>Emergency Contacts</h6>
            <p class="mb-0">
                For immediate life-threatening emergencies, call <strong>911</strong> directly.
                This system complements but does not replace emergency services.
            </p>
        </div>
    `;
    
    // This could be added to the page dynamically if needed
    return contactsHtml;
}
