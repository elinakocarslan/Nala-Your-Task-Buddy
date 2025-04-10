async function fetchCalendarEvents() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['authToken'], async function(result) {
      if (!result.authToken) {
        window.location.href = 'signinpage.html';
        reject(new Error('Not authenticated'));
        return;
      }

      try {
        //get today's date at midnight
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        //get tomorrow's date at midnight
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        //format dates in RFC3339 format
        const timeMin = today.toISOString();
        const timeMax = tomorrow.toISOString();        

        //get the list of all calendars
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
        // filter calendars that are checked/visible (`selected: true`)
        const visibleCalendars = calendarData.items.filter(cal => cal.selected);

        let allEvents = [];

        // fetch events from only the visible calendars
        for (const calendar of visibleCalendars) {
          const calendarId = encodeURIComponent(calendar.id);
          // here add option to see yesterday and the day after curr day!!!
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
        //sort events by start time
        allEvents.sort((a, b) => {
          const timeA = a.start.dateTime ? new Date(a.start.dateTime).getTime() : Infinity; //timed events have real timestamps
          const timeB = b.start.dateTime ? new Date(b.start.dateTime).getTime() : Infinity; //all-day events = Infinity

          return timeA - timeB; //sort ascending, all-day events at the end
        });

        resolve(allEvents);
      } catch (error) {
        console.error('Error fetching calendar events:', error);
        reject(error);
      }
    });
  });
}
 
  //function to create a new calendar event
  async function createCalendarEvent(eventDetails) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['authToken'], async function(result) {
        if (!result.authToken) {
          reject(new Error('Not authenticated'));
          return;
        }
  
        try {
          const eventDate = new Date(eventDetails.date + 'T' + eventDetails.time + ':00'); //explicitly create Date object in local time
          console.log('Event Date:', eventDetails.date); //original date from frontend
          console.log('Event Date object:', eventDate); //event date after processing
  
          //adjust the eventDate to local time zone manually
          const [hours, minutes] = eventDetails.time.split(':');
          eventDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          console.log('Updated Event Date:', eventDate);

          //calculate end time based on duration
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

          //make API request to create event
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
          //fetch the list of calendars
          const calendarListURL = 'https://www.googleapis.com/calendar/v3/users/me/calendarList';
          const calendarListResponse = await fetch(calendarListURL, {
            headers: {
              'Authorization': `Bearer ${result.authToken}`,
              'Content-Type': 'application/json'
            }
          });
  
          if (!calendarListResponse.ok) {
            throw new Error('Failed to fetch calendar list');
          }
  
          const calendarListData = await calendarListResponse.json();
          
          if (!calendarListData.items || calendarListData.items.length === 0) {
            throw new Error('No calendars found');
          }
  
          //loop through each calendar to search for the event
          let eventDeleted = false;
          for (let calendar of calendarListData.items) {
            const calendarId = encodeURIComponent(calendar.id);
  
            //fetch events from the current calendar
            const eventsURL = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;
            const eventsResponse = await fetch(eventsURL, {
              headers: {
                'Authorization': `Bearer ${result.authToken}`,
                'Content-Type': 'application/json'
              }
            });
  
            if (!eventsResponse.ok) {
              console.warn(`Failed to fetch events for calendar ${calendar.id}`);
              continue; //move to the next calendar if fetching fails
            }
  
            const eventsData = await eventsResponse.json();
  
            //search for the event in this calendar's events
            const eventToDelete = eventsData.items.find(event => event.id === eventId);
            if (eventToDelete) {
              //event found, proceed to delete it
              const deleteResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${result.authToken}`,
                  'Content-Type': 'application/json'
                }
              });
  
              if (deleteResponse.ok) {
                console.log('Event deleted successfully!');
                eventDeleted = true;
                break; //stop after the event is deleted
              } else {
                const errorData = await deleteResponse.json();
                throw new Error(errorData.error.message || 'Failed to delete event');
              }
            }
          }
  
          if (!eventDeleted) {
            throw new Error('Event not found in any calendar');
          }
  
          resolve(true);
        } catch (error) {
          console.error('Error deleting calendar event:', error);
          reject(error);
        }
      });
    });
  }

  export { fetchCalendarEvents, deleteCalendarEvent, createCalendarEvent };