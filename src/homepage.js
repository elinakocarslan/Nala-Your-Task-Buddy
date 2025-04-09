import {getTaskSummary } from "./to-do.js";
import {fetchCalendarEvents, deleteCalendarEvent, createCalendarEvent} from "./calendar-api.js";


const eventsContainer = document.getElementById('events-container');
const addEventForm = document.getElementById('add-event-form');
const addEventButton = document.getElementById('add-event-button');
const signOutButton = document.getElementById('sign-out-button');
const petSpeech = document.getElementById('pet-speech');
const summaryText = document.getElementById('summary-text');
const currDate = document.getElementById('date-display');
const addTaskForm = document.getElementById('add-task-form');
const taskTitleInput = document.getElementById('task-title');
const toDoList = document.getElementById('to-do-list');
const loaderContent = document.getElementById('loader-content');
const appContent = document.getElementById('app-content');
const loadingText = document.getElementById('loading-text');

let eventsSummaryData = null;
let tasksSummaryData = null;

function updateSummary() {
  let summary = "";
  if (eventsSummaryData) {
    summary += `You've completed ${eventsSummaryData.completedEvents} out of ${eventsSummaryData.totalEvents} event${eventsSummaryData.totalEvents > 1 ? 's' : ''} today (${eventsSummaryData.completedPercentage}% completed).`;
  }
  if (tasksSummaryData) {
    // summary += `\nYou've completed ${tasksSummaryData.completedTasks} out of ${tasksSummaryData.totalTasks} task${tasksSummaryData.totalTasks > 1 ? 's' : ''} (${tasksSummaryData.completedPercentage}% completed).`;
    summary += '\n' + tasksSummaryData;
  }
  summaryText.textContent = summary;
}

// Existing loader functions...
function showLoader() {
  if (loaderContent) {
    loaderContent.classList.add('show-loader');
    loaderContent.classList.remove('hide-loader');
  }
  if (appContent) {
    appContent.classList.add('hide-content');
    appContent.classList.remove('show-content');
  }
  console.log('Loader shown');
  let index = 0;
  const typingSpeed = 200; 
  const text = "Loading..."; 
  loadingText.textContent = '';

  function typeText() {
    if (index < text.length) {
      loadingText.textContent += text.charAt(index);
      index++;
      setTimeout(typeText, typingSpeed); 
    }
  }
  typeText();
}

function hideLoader() {
  if (loaderContent) {
    loaderContent.classList.add('hide-loader');
    loaderContent.classList.remove('show-loader');
  }
  if (appContent) {
    appContent.classList.add('show-content');
    appContent.classList.remove('hide-content');
  }
  console.log('Loader hidden');
}

// Helper function to compute events summary
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
      summary.completedEvents++;
      summary.pastEvents.push(event);
    } else {
      summary.pendingEvents++;
      summary.upcomingEvents.push(event);
    }
  });
  
  summary.completedPercentage = events.length > 0 ? 
    Math.round((summary.completedEvents / events.length) * 100) : 0;
  
  return summary;
}

function renderTasks() {
  if (!toDoList) return;
  const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
  toDoList.innerHTML = '';
  
  if (tasks.length === 0) {
    toDoList.innerHTML = '<p>No tasks to display</p>';
  } else {
    tasks.forEach(task => {
      const taskElement = document.createElement('div');
      taskElement.className = 'task-item';
      
      // Checkbox for task completion
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'task-checkbox';
      checkbox.checked = task.completed;
      checkbox.addEventListener('change', () => toggleTaskCompletion(task.id));
      
      // Task content element
      const taskContent = document.createElement('div');
      taskContent.className = 'task-content';
      
      const taskTitleDiv = document.createElement('div');
      taskTitleDiv.className = `task-title ${task.completed ? 'completed' : ''}`;
      taskTitleDiv.textContent = task.title;
      taskContent.appendChild(taskTitleDiv);
      
      // Delete button for task
      const deleteButton = document.createElement('button');
      deleteButton.className = 'delete-task-button';
      deleteButton.textContent = 'x';
      deleteButton.addEventListener('click', () => deleteTask(task.id));
      
      taskElement.appendChild(checkbox);
      taskElement.appendChild(taskContent);
      taskElement.appendChild(deleteButton);
      toDoList.appendChild(taskElement);
    });
  }
  
  // Calculate and store tasks summary then update overall summary text
  getTaskSummary().then((summary) => {
    tasksSummaryData = summary;
    updateSummary();
  });
}

function changePetMessage(message) {
  petSpeech.textContent = message;
  petSpeech.classList.add('bounce');
  setTimeout(() => {
    petSpeech.classList.remove('bounce');
  }, 10000000);
}

// Load calendar events and update events summary
async function loadEvents() {
  try {
    showLoader();
    const events = await fetchCalendarEvents();
    
    if (events.length === 0) {
      changePetMessage("Your day is clear! Want to add something?");
    } else {
      renderEvents(events);
      changePetMessage(`You have ${events.length} event${events.length > 1 ? 's' : ''} today!`);
    }
    return events;
  } catch (error) {
    console.error('Error loading events:', error);
    if (error.status === 401) {
      changePetMessage("Hmm, I need you to sign in again.");
      window.location.href = 'signinpage.html';
    }
    throw error;
  } finally {
    hideLoader();
  }
}

function loadTasks() {
  try {
    showLoader(); 
    renderTasks();
    return Promise.resolve();
  } catch (error) {
    console.error('Error loading tasks:', error);
    throw error;
  } finally {
    hideLoader();
  }
}

// Modified renderEvents to store events summary and update overall summary text
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
  
  // Get events summary and update global variable
  eventsSummaryData = getEventSummary(events);
  
  // Display current date
  const date = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  currDate.textContent = formatter.format(date);
  
  // Add delete event listeners
  document.querySelectorAll('.delete-button').forEach(button => {
    button.addEventListener('click', handleDeleteEvent);
  });
  
  // Update overall summary text (this will include tasks summary if available)
  updateSummary();
}
async function handleDeleteEvent(e) {    
  const eventId = e.target.getAttribute('data-event-id');  
  try {
    showLoader();
    await deleteCalendarEvent(eventId);
    changePetMessage("Task removed successfully!");
    await loadEvents();
  } catch (error) {
    console.error('Error deleting event:', error);
    changePetMessage("Oops! I couldn't delete that task.");
  } finally {
    hideLoader();
  }
}





document.addEventListener('DOMContentLoaded', function() {  
  setInterval(updateSummary, 30000);

  // Check authentication
  chrome.storage.local.get(['authToken'], function(result) {
    showLoader();

    if (!result.authToken) {
      window.location.href = 'signinpage.html';
      return;
    } else {
      loadEvents();
      loadTasks();
      hideLoader();
    }

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

  // function addTask(title) {
  //   let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
  //   const newTask = {
  //     id: Date.now().toString(),
  //     title: title,
  //     completed: false,
  //     createdAt: new Date().toISOString()
  //   };
  //   tasks.push(newTask);
  //   localStorage.setItem('tasks', JSON.stringify(tasks));
  //   renderTasks();
  //   updateSummary();
  // }
  
  // function deleteTask(taskId) {
  //   let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
  //   tasks = tasks.filter(task => task.id !== taskId);
  //   localStorage.setItem('tasks', JSON.stringify(tasks));
  //   renderTasks();
  // }
  
  // function toggleTaskCompletion(taskId) {
  //   let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
  //   tasks = tasks.map(task => {
  //     if (task.id === taskId) {
  //       return { ...task, completed: !task.completed };
  //     }
  //     return task;
  //   });
  //   localStorage.setItem('tasks', JSON.stringify(tasks));
  //   renderTasks();
  // }
  
  // Modified renderTasks function that also updates tasks summary
  
  // Pet animations and messages
  const petMessages = [
    "Don't forget to take breaks!",
    "You're doing great today!",
    "Remember to drink water!",
    "One task at a time, you got it!",
    "Your schedule is looking good!"
  ];
  
  setInterval(() => {
    const randomIndex = Math.floor(Math.random() * petMessages.length);
    changePetMessage(petMessages[randomIndex]);
  }, 30000);
  
  
  // Event form toggle and submission for adding events
  addEventButton.addEventListener('click', function() {
    if (addEventForm.classList.contains('hidden')) {
      addEventForm.classList.remove('hidden');
    } else {
      addEventForm.classList.add('hidden');
    }
  });
  
  addEventForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const eventDetails = {
      title: document.getElementById('event-title').value,
      date: document.getElementById('event-date').value,
      time: document.getElementById('event-time').value,
      duration: document.getElementById('event-duration').value
    };
    
    try {
      showLoader();
      await createCalendarEvent(eventDetails);
      addEventForm.reset();
      addEventForm.classList.add('hidden');
      changePetMessage("Great! I've added your new task!");
      await loadEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      changePetMessage("Oops! I couldn't create your event.");
    } finally {
      hideLoader();
    }
  });

  
  // Sign out
  signOutButton.addEventListener('click', function() {
    chrome.storage.local.remove(['authToken'], function() {
      window.location.href = 'signinpage.html';
    });
  });
});
