import {fetchCalendarEvents} from "./src/calendar-api.js";
chrome.runtime.onInstalled.addListener(() => {
  console.log('Task Managing Pet extension installed');
});

// Change identity
chrome.identity.onSignInChanged.addListener((account, signedIn) => {
  console.log('Sign-in state changed:', signedIn);
});

// Authenticate user & send updated token
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "authenticate") {
    authenticateUser().then(token => {
      sendResponse({token: token});
    }).catch(error => {
      sendResponse({error: error.message});
    });
    return true; // Ensure asynchronous response
  }
});

// Use chrome identity to authenticate token
function authenticateUser() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({interactive: true}, function(token) {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(token);
      }
    });
  });
}

function createEventNotification(event, minutesBefore) {
  const eventTime = new Date(event.start.dateTime || event.start.date); // Event start time
  const timeDifference = eventTime - new Date() - minutesBefore * 60 * 1000; // Time difference for the specified interval
  
  if (timeDifference > 0) { // Ensure the time difference is positive
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/pet-icon.png", // Customize the icon
      title: "Event Coming Up!",
      message: `${event.summary} is starting in ${minutesBefore} minutes.`,
      priority: 2,
      requireInteraction: true, // Keeps the notification until the user interacts
    });
    console.log(`Notification created for event: ${event.summary}`);
  }
}

function scheduleEventNotifications(event) {
  const timesBefore = [30, 15, 5]; // Times before the event to notify (in minutes)

  timesBefore.forEach(minutesBefore => {
    const eventTime = new Date(event.start.dateTime || event.start.date);
    const timeDifference = eventTime - new Date() - minutesBefore * 60 * 1000; // Time difference for the specified interval
    console.log(`Time difference is ${timeDifference}ms for event:  ${event.summary}`);
    
    // Only schedule if the time difference is positive (i.e., it's still in the future)
    if (timeDifference > 0) {
      chrome.alarms.create(`event-notification-${event.id}-${minutesBefore}`, {
        when: Date.now() + timeDifference // Schedule for the future
      });
    }
  });
}


// Listen for alarms
chrome.alarms.onAlarm.addListener(function(alarm) {
  const parts = alarm.name.split('-');
  if (parts.length >= 3 && parts[0] === "event") {
    const eventId = parts[2]; // Extract the event ID
    const minutesBefore = parseInt(parts[3]); // Extract the time before the event

    // Fetch the event data from your storage (e.g., local storage or a global list of events)
    getEventById(eventId).then(event => {
      if (event) {
        createEventNotification(event, minutesBefore); // Create the notification
      }
    }).catch(err => {
      console.error('Error fetching event:', err);
    });
  }
});

function getEventById(eventId) {
  // You could retrieve event data from your local storage or API
  return fetch(`/api/events/${eventId}`).then(response => response.json());
}

// Function to load events
async function loadEvents() {
  try {
    // Replace this with your actual fetch logic
    chrome.storage.local.get(['authToken', 'events'], async function(result) {
      if (!result.authToken) {
        console.error('No auth token available');
        return;
      }
      
      const events = result.events || [];
      
      events.forEach(event => {
        scheduleEventNotifications(event); // Schedule notifications for this event
      });
    });
  } catch (error) {
    console.error('Error loading events:', error);
  }
}

// Periodically check for upcoming events every minute
setInterval(() => {
  loadEvents(); // Reload and check events every minute
}, 60 * 1000);
