async function fetchCalendarEvents() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['authToken'], async function(result) {
      if (!result.authToken) {
        window.location.href = 'signinpage.html';
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

        // 1. Get the list of all calendars
        const calendarListUrl = `https://www.googleapis.com/calendar/v3/users/me/calendarList`;
        const calendarResponse = await fetch(calendarListUrl, {
          headers: {
            'Authorization': `Bearer ${result.authToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!calendarResponse.ok) {
          throw new Error('Failed to fetch calendar list');
        }

        const calendarData = await calendarResponse.json();
        // 2. Filter calendars that are checked/visible (`selected: true`)
        const visibleCalendars = calendarData.items.filter(cal => cal.selected);

        let allEvents = [];

        // 3. Fetch events from only the visible calendars
        for (const calendar of visibleCalendars) {
          const calendarId = encodeURIComponent(calendar.id);
          const eventsUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;

          const eventsResponse = await fetch(eventsUrl, {
            headers: {
              'Authorization': `Bearer ${result.authToken}`,
              'Content-Type': 'application/json'
            }
          });

          if (eventsResponse.ok) {
            const eventData = await eventsResponse.json();
            allEvents = allEvents.concat(eventData.items || []);
          } else {
            console.warn(`Failed to fetch events from calendar: ${calendarId}`);
          }
        }
        // Sort events by start time
        allEvents.sort((a, b) => {
          const timeA = a.start.dateTime ? new Date(a.start.dateTime).getTime() : Infinity; // Timed events have real timestamps
          const timeB = b.start.dateTime ? new Date(b.start.dateTime).getTime() : Infinity; // All-day events = Infinity

          return timeA - timeB; // Sort ascending, all-day events at the end
        });

        resolve(allEvents);
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
          const eventDate = new Date(eventDetails.date + 'T' + eventDetails.time + ':00'); // Explicitly create Date object in local time
          console.log('Event Date:', eventDetails.date); // Original date from frontend
          console.log('Event Date object:', eventDate); // Event date after processing
  
          // Adjust the eventDate to local time zone manually
          const [hours, minutes] = eventDetails.time.split(':');
          eventDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          console.log('Updated Event Date:', eventDate);

          // Calculate end time based on duration
          const endDate = new Date(eventDate);
          endDate.setMinutes(eventDate.getMinutes() + parseInt(eventDetails.duration));
          endDate.setHours(endDate.getHours(), endDate.getMinutes(), 0, 0);
          console.log('End Date:', endDate);

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
  async function deleteCalendarEvent(eventId) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['authToken'], async function(result) {
        if (!result.authToken) {
          reject(new Error('Not authenticated'));
          return;
        }
  
        try {
          // Make API request to delete event
          const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${result.authToken}`
            }
          });
          
          if (!response.ok && response.status !== 204) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || 'Failed to delete event');
          }
          
          resolve(true);
        } catch (error) {
          console.error('Error deleting calendar event:', error);
          reject(error);
        }
      });
    });
  }