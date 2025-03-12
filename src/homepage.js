// scripts/homepage.js
document.addEventListener('DOMContentLoaded', function() {
    const eventsContainer = document.getElementById('events-container');
    const addEventForm = document.getElementById('add-event-form');
    const addEventButton = document.getElementById('add-event-button');
    const signOutButton = document.getElementById('sign-out-button');
    const petImage = document.getElementById('nala-homescreen');
    const petSpeech = document.getElementById('pet-speech');
    
    // Check authentication
    chrome.storage.local.get(['authToken'], function(result) {
      if (!result.authToken) {
        window.location.href = 'signinpage.html';
        return;
      }
      
      // Load events
      loadEvents();
    });
    
    // Pet animations and messages
    const petMessages = [
      "Don't forget to take breaks!",
      "You're doing great today!",
      "Remember to drink water!",
      "One task at a time, you got this!",
      "Your schedule is looking good!"
    ];
    
    // Change pet message every 30 seconds
    setInterval(() => {
      const randomIndex = Math.floor(Math.random() * petMessages.length);
      changePetMessage(petMessages[randomIndex]);
    }, 30000);
    
    function changePetMessage(message) {
      petSpeech.textContent = message;
      petSpeech.classList.add('bounce');
      
      setTimeout(() => {
        petSpeech.classList.remove('bounce');
      }, 1000);
    }
    
    // Load calendar events
    async function loadEvents() {
      try {
        const events = await fetchCalendarEvents();
        
        if (events.length === 0) {
          eventsContainer.innerHTML = '<p class="no-events">No events scheduled for today</p>';
          changePetMessage("Your day is clear! Want to add something?");
        } else {
          renderEvents(events);
          changePetMessage(`You have ${events.length} task${events.length > 1 ? 's' : ''} today!`);
        }
      } catch (error) {
        console.error('Error loading events:', error);
        eventsContainer.innerHTML = `<p class="error-message">Error loading events: ${error.message}</p>`;
        changePetMessage("Oops! I couldn't fetch your events.");
      }
    }
    
    // Render events to the UI
    function renderEvents(events) {
      eventsContainer.innerHTML = '';
      
      events.forEach(event => {
        const eventElement = document.createElement('div');
        eventElement.className = 'event-item';
        
        const startTime = event.start.dateTime ? new Date(event.start.dateTime) : null;
        const formattedTime = startTime ? startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'All day';
        
        eventElement.innerHTML = `
          <div class="event-time">${formattedTime}</div>
          <div class="event-title">${event.summary}</div>
          <button class="delete-button" data-event-id="${event.id}">×</button>
        `;
        
        eventsContainer.appendChild(eventElement);
      });
      
      // Add event listeners to delete buttons
      const deleteButtons = document.querySelectorAll('.delete-button');
      deleteButtons.forEach(button => {
        button.addEventListener('click', handleDeleteEvent);
      });
    }

    addEventButton.addEventListener('click', function() {
        // Check if the form is currently hidden
        if (addEventForm.classList.contains('hidden')) {
            addEventForm.classList.remove('hidden'); // Show the form
        } else {
            addEventForm.classList.add('hidden'); // Hide the form
        }
    });
    
    // Handle form submission to create new event
    addEventForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const eventDetails = {
        title: document.getElementById('event-title').value,
        date: document.getElementById('event-date').value,
        time: document.getElementById('event-time').value,
        duration: document.getElementById('event-duration').value
      };
      
      try {
        await createCalendarEvent(eventDetails);
        addEventForm.reset();
        changePetMessage("Great! I've added your new task!");
        loadEvents(); // Reload events
      } catch (error) {
        console.error('Error creating event:', error);
        changePetMessage("Oops! I couldn't create your event.");
      }
    });

    async function handleDeleteEvent(e) {
      const eventId = e.target.getAttribute('data-event-id');
      
      try {
        await deleteCalendarEvent(eventId);
        changePetMessage("Task removed successfully!");
        loadEvents(); // Reload events
      } catch (error) {
        console.error('Error deleting event:', error);
        changePetMessage("Oops! I couldn't delete that task.");
      }
    }
    
    // Handle sign out
    signOutButton.addEventListener('click', function() {
      chrome.storage.local.remove(['authToken'], function() {
        window.location.href = 'signinpage.html';
      });
    });
  });