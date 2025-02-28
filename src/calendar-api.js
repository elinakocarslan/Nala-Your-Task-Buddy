// scripts/calendar-api.js

// Function to fetch calendar events from Google Calendar API
async function fetchCalendarEvents() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['authToken'], async function(result) {
        if (!result.authToken) {
          reject(new Error('Not authenticated'));
          return;
        }
  
        try {
          // Get today's date at midnight
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // Get tomorrow's date at midnight
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          // Format dates in RFC3339 format
          const timeMin = today.toISOString();
          const timeMax = tomorrow.toISOString();
          
          // Build the URL
          const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;
          
          // Make API request
          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${result.authToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || 'Failed to fetch events');
          }
          
          const data = await response.json();
          resolve(data.items || []);
        } catch (error) {
          console.error('Error fetching calendar events:', error);
          reject(error);
        }
      });
    });
  }
  
  // Function to create a new calendar event
  async function createCalendarEvent(eventDetails) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['authToken'], async function(result) {
        if (!result.authToken) {
          reject(new Error('Not authenticated'));
          return;
        }
  
        try {
          const eventDate = new Date(eventDetails.date);
          const [hours, minutes] = eventDetails.time.split(':');
          eventDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          
          // Calculate end time based on duration
          const endDate = new Date(eventDate);
          endDate.setMinutes(endDate.getMinutes() + parseInt(eventDetails.duration));
          
          const event = {
            summary: eventDetails.title,
            start: {
              dateTime: eventDate.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
              dateTime: endDate.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }
          };
          
          // Make API request to create event
          const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${result.authToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || 'Failed to create event');
          }
          
          const data = await response.json();
          resolve(data);
        } catch (error) {
          console.error('Error creating calendar event:', error);
          reject(error);
        }
      });
    });
  }