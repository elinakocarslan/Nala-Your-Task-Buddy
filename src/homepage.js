document.addEventListener('DOMContentLoaded', function() {
    const eventsContainer = document.getElementById('events-container');
    const addEventForm = document.getElementById('add-event-form');
    const addEventButton = document.getElementById('add-event-button');
    const signOutButton = document.getElementById('sign-out-button');
    const petImage = document.getElementById('nala-homescreen');
    const petSpeech = document.getElementById('pet-speech');
    const summaryText = document.getElementById('summary-text');
    const currDate = document.getElementById('date-display');
    const deleteButtons = document.querySelectorAll('.delete-button');
    const addTaskForm = document.getElementById('add-task-form');
    const taskTitleInput = document.getElementById('task-title');
    const toDoList = document.getElementById('to-do-list');
    const loader = document.getElementById('loader');
    const loaderContent = document.getElementById('loader-content');
    const appContent = document.getElementById('app-content');
    const loadingText = document.getElementById('loading-text');

    function showLoader() {
      loaderContent.style.display = 'flex'; 
      // appContent.style.display = 'none'; 
    }

    function hideLoader() {
      loaderContent.style.display = 'none'; 
      // appContent.style.display = 'flex'; 
    }
  // showLoader();
    // Check authentication
    chrome.storage.local.get(['authToken'], function(result) {
      // showLoader();

      if (!result.authToken) { // make authoken check a function
        window.location.href = 'signinpage.html';
        return;
      }
      // hideLoader();

      let index = 0;
      const typingSpeed = 200; 
      const text = "Loading..."; 
      
      loadingText.textContent = '';

      function typeText(_index, _text) {
        if (index < text.length) {
          loadingText.textContent += text.charAt(index);
          index++;
          setTimeout(typeText, typingSpeed); 
        }
      }
      typeText(index, text);
      
      // Load events
      loadEvents();
      loadTasks();

      if (addTaskForm) {
        addTaskForm.addEventListener('submit', function(e) {
          e.preventDefault();
          
          const taskTitle = taskTitleInput.value.trim();
          if (taskTitle) {
            addTask(taskTitle);
            taskTitleInput.value = '';
            
          }
        });
      }
    });

    function addTask(title) {
      let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
      
      const newTask = {
        id: Date.now().toString(),
        title: title,
        completed: false,
        createdAt: new Date().toISOString()
      };
      
      tasks.push(newTask);
      
      localStorage.setItem('tasks', JSON.stringify(tasks));
      
      renderTasks();
    }
    
    function deleteTask(taskId) {
      let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
      
      tasks = tasks.filter(task => task.id !== taskId);
      
      localStorage.setItem('tasks', JSON.stringify(tasks));
      
      renderTasks();
    }
    
    function toggleTaskCompletion(taskId) {
      // Get  tasks
      let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
      
      // Find and update the task
      tasks = tasks.map(task => {
        if (task.id === taskId) {
          return { ...task, completed: !task.completed };
        }
        return task;
      });
      
      // Save to local storage
      localStorage.setItem('tasks', JSON.stringify(tasks));
      
      // Render tasks
      renderTasks();
    }
    
    // Function to load and render tasks
    function loadTasks() {
      // showLoader(); 
      renderTasks(); // Call renderTasks after loading (this could be async if needed)
       // Hide the loader after loading tasks
    }
    
    // Function to render tasks
    function renderTasks() {
      // hideLoader();
      if (!toDoList) return;
      
      // Get tasks from local storage
      const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
      
      // Clear the container
      toDoList.innerHTML = '';
      
      if (tasks.length === 0) {
        toDoList.innerHTML = '<p>No tasks to display</p>';
        return;
      }
      tasks.forEach(task => {
        const taskElement = document.createElement('div');
        taskElement.className = 'task-item';
        
        // Create checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = task.completed;
        checkbox.addEventListener('change', () => toggleTaskCompletion(task.id));
        
        // Create task content
        const taskContent = document.createElement('div');
        taskContent.className = 'task-content';
        
        const taskTitle = document.createElement('div');
        taskTitle.className = `task-title ${task.completed ? 'completed' : ''}`;
        taskTitle.textContent = task.title;
        
        taskContent.appendChild(taskTitle);
        
        // Create delete button
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-task-button';
        deleteButton.textContent = 'x';
        deleteButton.addEventListener('click', () => deleteTask(task.id));
        
        // Assemble the task item
        taskElement.appendChild(checkbox);
        taskElement.appendChild(taskContent);
        taskElement.appendChild(deleteButton);
        
        toDoList.appendChild(taskElement);
      });
    }
    
    // Pet animations and messages
    const petMessages = [
      "Don't forget to take breaks!",
      "You're doing great today!",
      "Remember to drink water!",
      "One task at a time, you got it!",
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
      }, 10000000);
    }
    
    // Load calendar events
    async function loadEvents() {
      try {
        const events = await fetchCalendarEvents();
        
        if (events.length === 0) {
          // eventsContainer.innerHTML = '<p class="no-events">No events scheduled for today</p>';
          changePetMessage("Your day is clear! Want to add something?");
        } else {
          renderEvents(events);
          changePetMessage(`You have ${events.length} event${events.length > 1 ? 's' : ''} today!`);
        }
      } catch (error) {
        window.location.href = 'signinpage.html';
      }
    }
    //to get completed events of day
    function getEventSummary(events) {
      const now = new Date();
      
      const summary = {
        totalEvents: events.length,
        completedEvents: 0,
        pendingEvents: 0,
        completedPercentage: 0,
        upcomingEvents: [],
        pastEvents: []
      };
    
      events.forEach(event => {
        const eventEnd = new Date(event.end.dateTime || event.end.date);
        
        if (eventEnd < now) {
          // Event has passed its end time
          summary.completedEvents++;
          summary.pastEvents.push(event);
        } else {
          summary.pendingEvents++;
          summary.upcomingEvents.push(event);
        }
      });
    
      summary.completedPercentage = 
        Math.round((summary.completedEvents / summary.totalEvents) * 100);
    
      return summary;
    }
    
    
    // Render events to the UI
    function renderEvents(events) {
      eventsContainer.innerHTML = '';
      // let eventCount = events.length;

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
      let summary = getEventSummary(events);
      if (events.length === 1) {
        summaryText.textContent = `You've have completed ${summary.completedEvents} out of ${summary.totalEvents} event today. ${summary.completedPercentage}% completed.`;
      } else {
        summaryText.textContent = `You've have completed ${summary.completedEvents} out of ${summary.totalEvents} events today. ${summary.completedPercentage}% completed.`;  
      } 
      // Display current date
      const date = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      const formattedDate = formatter.format(date);
      currDate.textContent = `${formattedDate}`;
    
      // Add event listeners to delete buttons
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
        // showLoader(); 
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