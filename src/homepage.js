import {getTaskSummary, updateTaskStatus, fetchToDoList, addTaskToList, deleteTask } from "./to-do.js";
import {fetchCalendarEvents, deleteCalendarEvent, createCalendarEvent} from "./calendar-api.js";


const eventsContainer = document.getElementById('events-container');
const addEventForm = document.getElementById('add-event-form');
const addEventButton = document.getElementById('add-event-button');
const signOutButton = document.getElementById('sign-out-button');
const petSpeech = document.getElementById('pet-speech');
const summaryText = document.getElementById('summary-text');
const currDate = document.getElementById('date-display');
const addTaskForm = document.getElementById('add-task-form');
const toDoList = document.getElementById('to-do-list');
const loaderContent = document.getElementById('loader-content');
const appContent = document.getElementById('app-content');
const loadingText = document.getElementById('loading-text');
const taskTitleInput = document.getElementById('to-do-item');

let eventsSummaryData = null;
let tasksSummaryData = null;

//updates summary
function updateSummary() {
  let summary = "";
  if (eventsSummaryData) {
    summary += `You've completed ${eventsSummaryData.completedEvents} out of ${eventsSummaryData.totalEvents} event${eventsSummaryData.totalEvents > 1 ? 's' : ''} today (${eventsSummaryData.completedPercentage}% completed).`;
  }
  if (tasksSummaryData) {
    summary += '\n' + tasksSummaryData;
  }
  summaryText.textContent = summary;
}

//not working
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
//not working
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
//changes pet message
function changePetMessage(message) {
  petSpeech.textContent = message;
  petSpeech.classList.add('bounce');
  setTimeout(() => {
    petSpeech.classList.remove('bounce');
  }, 10000000);
}

//TASKS__________________________________________________________________________
//pulls todolist from localstorage and displays it
//loads tasks
async function loadTasks() {
  try {
    const tasks = await fetchToDoList();
    renderTasks(tasks);
  } catch (error) {
    console.error('Error loading tasks:', error);
    document.getElementById('to-do-list').innerHTML = `<p class="error-message">Error loading tasks: ${error.message}</p>`;
  }
}

function renderTasks(tasks) {
  if (!toDoList) return;
  
  if (!tasks) {
    tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
  }
  
  
  const taskContainer = document.getElementById('to-do-list');
  taskContainer.innerHTML = ''; 
  
  if (!tasks || tasks.length === 0) {
    taskContainer.innerHTML = '<p>No tasks to display</p>';
    return;
  }

  tasks.forEach(task => {
    const taskElement = document.createElement('div');
    taskElement.className = 'task-item';
    
    //create the checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-checkbox';
    checkbox.checked = task.status === 'completed';
    checkbox.addEventListener('change', async () => {
      await updateTaskStatus(task.id, checkbox.checked ? 'completed' : 'needsAction');
      loadTasks();
    });
    
    taskElement.innerHTML = `
      <div class="task-content">
        <div class="to-do-item ${task.status === 'completed' ? 'completed' : ''}">${task.title}</div>
      <button class="delete-task-button" data-task-id="${task.id}">×</button>
      </div>
    `;
    
    //insert checkbox at the beginning
    taskElement.insertBefore(checkbox, taskElement.firstChild);
    taskContainer.appendChild(taskElement);
    
    //add delete event listener
    taskElement.querySelector('.delete-task-button').addEventListener('click', async () => {
      await handleDeleteTask(task.id);
      loadTasks();
    });
    
  });
  
  //update tasks summary during rendering
  getTaskSummary().then((summary) => {
    tasksSummaryData = summary;
    updateSummary();
  });
}
async function handleDeleteTask(taskId) {    
  try {
    showLoader();
    await deleteTask(taskId);
    changePetMessage("Task removed successfully!");
    await loadTasks(); 
  } catch (error) {
    console.error('Error deleting task:', error);
    changePetMessage("Oops! I couldn't delete that task.");
  } finally {
    hideLoader();
  }
}
if (addTaskForm) {
  addTaskForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!taskTitleInput) {
      console.error('Task title input not found');
      changePetMessage("Oops! Something went wrong with the form.");
      return;
    }
    
    const taskTitle = taskTitleInput.value.trim();
    if (taskTitle) {
      try {
        await addTaskToList({ title: taskTitle }); 
        taskTitleInput.value = ''; 
        loadTasks(); 
      } catch (error) {
        console.error('Error adding task:', error);
        changePetMessage("Oops! I couldn't add your task.");
      }
    }
  });
}
//EVENTS_________________________________________________________________________
//helps summarize the information for summary of events
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

//load calendar events and update events summary
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

//store events summary and render events
function renderEvents(events) {
  if (!eventsContainer) return;

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

    eventElement.querySelector('.delete-button').addEventListener('click', async () => {
      await handleDeleteEvent(event.id); 
    });
  });
  
  eventsSummaryData = getEventSummary(events);
  
  //display curr date
  const date = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  currDate.textContent = formatter.format(date);
  
  updateSummary();
}

async function handleDeleteEvent(eventId) {    
  if (!eventId) {
    console.error('Attempted to delete event with null or undefined ID');
    changePetMessage("Oops! Can't identify the event to delete.");
    return;
  }
  
  console.log('Attempting to delete event with ID:', eventId);
  
  try {
    showLoader();
    await deleteCalendarEvent(eventId);
    console.log('Event deletion API call succeeded for ID:', eventId);
    changePetMessage("Event removed successfully!");
    await loadEvents(); 
  } catch (error) {
    console.error(`Error deleting event with ID ${eventId}:`, error);
    changePetMessage("Oops! I couldn't delete that event.");
  } finally {
    hideLoader();
  }
}




document.addEventListener('DOMContentLoaded', function() { 
  //update summary every 30 secs 
  setInterval(updateSummary, 30000);

  //check authentication
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
  });
  
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
  
  //event form toggle and submission for adding events
  if (addEventButton) {
    addEventButton.addEventListener('click', function() {
      if (addEventForm.classList.contains('hidden')) {
        addEventForm.classList.remove('hidden');
      } else {
        addEventForm.classList.add('hidden');
      }
    });
  }

  //handles event form submission
  if (addEventForm) {
    addEventForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const eventTitle = document.getElementById('event-title');
      const eventDate = document.getElementById('event-date');
      const eventTime = document.getElementById('event-time');
      const eventDuration = document.getElementById('event-duration');
      
      if (!eventTitle || !eventDate || !eventTime || !eventDuration) {
        console.error('Event form elements not found');
        return;
      }
      
      const eventDetails = {
        title: eventTitle.value,
        date: eventDate.value,
        time: eventTime.value,
        duration: eventDuration.value
      };
      
      try {
        showLoader();
        await createCalendarEvent(eventDetails);
        addEventForm.reset();
        addEventForm.classList.add('hidden');
        changePetMessage("Great! I've added your new event!");
        await loadEvents();
      } catch (error) {
        console.error('Error creating event:', error);
        changePetMessage("Oops! I couldn't create your event.");
      } finally {
        hideLoader();
      }
    });
  }
  
  //sign out
  signOutButton.addEventListener('click', function() {
    chrome.storage.local.remove(['authToken'], function() {
      window.location.href = 'signinpage.html';
    });
  });
});
