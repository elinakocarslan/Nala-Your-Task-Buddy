import {fetchCalendarEvents} from "./src/calendar-api.js";

// service worker activation
self.addEventListener('install', (event) => {
  console.log('Service worker installing...');
  //force activation without waiting for existing instances to close
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service worker activated');
  //take control of all clients immediately
  event.waitUntil(clients.claim());
  // initialize events on activation
  loadEvents();
});

// handle identity changes
chrome.identity.onSignInChanged.addListener((account, signedIn) => {
  console.log('Sign-in state changed:', signedIn);
  if (signedIn) {
    // reload events when user signs in
    loadEvents();
  }
});

// authenticate user & send updated token
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "authenticate") {
    authenticateUser().then(token => {
      // store the token for later use
      chrome.storage.local.set({authToken: token}, () => {
        console.log('Token stored');
        loadEvents(); // load events after authentication
      });
      sendResponse({token: token});
    }).catch(error => {
      sendResponse({error: error.message});
    });
    return true; // ensure asynchronous response
  } else if (request.action === "loadEvents") {
    loadEvents().then(() => {
      sendResponse({success: true});
    }).catch(error => {
      sendResponse({error: error.message});
    });
    return true;
  }
});

// use chrome identity to authenticate token
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

// create notification for events
function createEventNotification(event, minutesBefore) {
  console.log(`Creating notification for ${event.summary} (${minutesBefore} minutes before)`);

  const eventTime = new Date(event.start.dateTime || event.start.date);
  
  //check if notification was already shown
  chrome.storage.local.get(['notifiedEvents'], (result) => {
    const notifiedEvents = result.notifiedEvents || {};
    const notificationId = `event-notification-${event.id}-${minutesBefore}`;
    
    //skip if this specific notification was already shown
    if (notifiedEvents[`${event.id}-${minutesBefore}`]) {
      console.log(`Notification for ${event.summary} (${minutesBefore} min) already shown`);
      return;
    }
    
    //create notification options
    let message = `${event.summary} is starting in ${minutesBefore} minutes.`;
    if (event.location) {
      message += `\nLocation: ${event.location}`;
    }
    
    //choose icon based on calendar color if available
    let iconUrl = 'assets/realNala.png';
    
    chrome.notifications.create(notificationId, {
      type: "basic",
      title: event.summary,
      iconUrl: iconUrl,
      message: message,
      priority: 2,
      requireInteraction: true, // keeps the notification until the user interacts
      buttons: [
        { title: "Dismiss" },
        { title: "Open Calendar" }
      ]
    }, (notificationId) => {
      if (chrome.runtime.lastError) {
        console.error('Notification creation failed:', chrome.runtime.lastError);
      } else {
        console.log(`Notification created with ID: ${notificationId}`);
        
        // mark this notification as shown
        notifiedEvents[`${event.id}-${minutesBefore}`] = true;
        chrome.storage.local.set({notifiedEvents: notifiedEvents});
      }
    });
  });
}

// schedule event notifications (30, 15, 5 minutes before event)
function scheduleEventNotifications(event) {
  const timesBefore = [30, 15, 5]; // times before the event to notify (in minutes)
  const eventTime = new Date(event.start.dateTime || event.start.date);
  const now = new Date();
  
  // skip past events
  if (eventTime < now) {
    return;
  }
  
  // skip all day events that started before today
  if (event.start.date && !event.start.dateTime) {
    const startDate = new Date(event.start.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (startDate < today) {
      return;
    }
  }
    
  timesBefore.forEach(minutesBefore => {
    const notificationTime = new Date(eventTime.getTime() - (minutesBefore * 60 * 1000));
    const timeDifference = notificationTime.getTime() - Date.now();
    
    // only schedule if the notification time is in the future
    if (timeDifference > 0) {
      console.log(`Scheduling notification for event: ${event.summary} (${minutesBefore} min) at ${notificationTime}`);
      const alarmName = `event-notification-${event.id}-${minutesBefore}`;
      
      // clear any existing alarm with the same name
      chrome.alarms.clear(alarmName, () => {
        // create a new alarm
        chrome.alarms.create(alarmName, {
          when: notificationTime.getTime()
        });
        console.log(`Alarm created: ${alarmName} for ${notificationTime}`);
      });
      
      // store event data in local storage for when the alarm fires
      chrome.storage.local.get(['scheduledEvents'], (result) => {
        const scheduledEvents = result.scheduledEvents || {};
        scheduledEvents[alarmName] = {
          id: event.id,
          summary: event.summary,
          location: event.location || '',
          start: event.start,
          end: event.end,
          minutesBefore: minutesBefore,
          calendarName: event.calendarName || '',
          calendarColor: event.calendarColor || '#4285F4'
        };
        chrome.storage.local.set({scheduledEvents: scheduledEvents});
      });
    }
  });
}

// listen for alarms
chrome.alarms.onAlarm.addListener(function(alarm) {
  console.log(`Alarm triggered: ${alarm.name}`);
  
  if (alarm.name === 'refresh-events') {
    console.log('Refreshing events...');
    loadEvents();
    return;
  }
  
  const parts = alarm.name.split('-');
  if (parts.length >= 4 && parts[0] === "event" && parts[1] === "notification") {
    const eventId = parts[2]; // extract the event ID
    const minutesBefore = parseInt(parts[3]); // extract the time before the event
    
    console.log(`Processing alarm for event ID: ${eventId}, ${minutesBefore} minutes before`);
    
    // first try to get event from storage (faster and more reliable)
    chrome.storage.local.get(['scheduledEvents'], (result) => {
      const scheduledEvents = result.scheduledEvents || {};
      const eventData = scheduledEvents[alarm.name];
      
      if (eventData) {
        // we have the event data cached
        createEventNotification({
          id: eventData.id,
          summary: eventData.summary,
          start: eventData.start
        }, eventData.minutesBefore);
        
        // remove this event from the scheduled events
        delete scheduledEvents[alarm.name];
        chrome.storage.local.set({scheduledEvents: scheduledEvents});
      } else {
        // fallback to fetching the event data from API
        getEventById(eventId).then(event => {
          if (event) {
            createEventNotification(event, minutesBefore);
          }
        }).catch(err => {
          console.error('Error fetching event:', err);
        });
      }
    });
  }
});

// fetch event by ID from all calendars
function getEventById(eventId) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['authToken'], async function(result) {
      if (!result.authToken) {
        reject(new Error('Not authenticated'));
        return;
      }

      try {
        // fetch the list of all calendars
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
          reject(new Error('No calendars found'));
          return;
        }

        // loop through each calendar to fetch events
        for (let calendar of calendarListData.items) {
          const calendarId = encodeURIComponent(calendar.id); // Properly encode the calendar ID
          
          // fetch events for this calendar
          const eventsURL = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;
          const eventsResponse = await fetch(eventsURL, {
            headers: {
              'Authorization': `Bearer ${result.authToken}`,
              'Content-Type': 'application/json'
            }
          });

          if (!eventsResponse.ok) {
            console.warn(`Failed to fetch events for calendar ${calendarId}`);
            continue; // skip this calendar and check the next one
          }

          const eventsData = await eventsResponse.json();

          // search for the event in this calendar's events
          const event = eventsData.items.find(event => event.id === eventId);
          if (event) {
            resolve(event); // event found, resolve with the event data
            return; // stop the loop once the event is found
          }
        }

        // if the event was not found in any of the calendars
        reject(new Error('Event not found in any calendar'));

      } catch (error) {
        reject(error); // reject the promise if there's an error
      }
    });
  });
}

// load events 
async function loadEvents() {
  try {
    console.log("Starting to load events...");
    // first ensure we have a valid auth token
    const token = await authenticateUser();
    chrome.storage.local.set({authToken: token}, async () => {
      console.log('Authentication token refreshed');
      
      try {
        // fetch authenticated user's events from Google Calendar API
        const events = await fetchCalendarEvents(token);
        
        if (!events || events.length === 0) {
          console.log("No events found.");
          return;
        }

        console.log(`Loaded ${events.length} events`);
        
        // clear all existing alarms except the refresh alarm
        chrome.alarms.getAll((alarms) => {
          alarms.forEach(alarm => {
            if (alarm.name !== 'refresh-events') {
              chrome.alarms.clear(alarm.name);
            }
          });
          
          // for each event, schedule notifications
          events.forEach(event => {
            scheduleEventNotifications(event);
          });
        });
      } catch (fetchError) {
        console.error('Error fetching calendar events:', fetchError);
      }
    });
  } catch (error) {
    console.error('Error in authentication process:', error);
  }
}

// start checking for upcoming events
chrome.alarms.create('refresh-events', {
  periodInMinutes: 15 // check for new events every 15 minutes
});

// make sure loadEvents gets called when the service worker starts
console.log("Service worker started, initializing events...");
loadEvents();
