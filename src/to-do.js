
async function fetchToDoList() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['authToken'], async function(result) {
        if (!result.authToken) {
          window.location.href = 'signinpage.html';
          reject(new Error('Not authenticated'));
          return;
        }
  
        try {     
  
          // 1. Get the list of all calendars
          const todoURL = `https://www.googleapis.com/tasks/v1/users/@me/lists`;
          const todoResponse = await fetch(todoURL, {
            headers: {
              'Authorization': `Bearer ${result.authToken}`,
              'Content-Type': 'application/json'
            }
          });
  
          if (!todoResponse.ok) {
            // window.location.href = 'signinpage.html';
            throw new Error('Failed to fetch task list');
          }
  
          const listsData = await todoResponse.json();
  
  
          // If no lists available, return empty array
            if (!listsData.items || listsData.items.length === 0) {
                resolve([]);
                return;
            }
            
            // Use the first list (usually default)
            const defaultListId = listsData.items[0].id;

                // 2. Now fetch tasks from the default list
            const tasksURL = `https://www.googleapis.com/tasks/v1/lists/${defaultListId}/tasks`;
            const tasksResponse = await fetch(tasksURL, {
            headers: {
                'Authorization': `Bearer ${result.authToken}`,
                'Content-Type': 'application/json'
            }
            });

            if (!tasksResponse.ok) {
            throw new Error('Failed to fetch tasks');
            }

            const tasksData = await tasksResponse.json();
            resolve(tasksData.items || []);
        
        } catch (error) {
          console.error('Error fetching calendar events:', error);
          reject(error);
        }
      });
    });
}

  async function addTaskToList(taskDetails) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['authToken'], async function(result) {
          if (!result.authToken) {
            window.location.href = 'signinpage.html';
            reject(new Error('Not authenticated'));
            return;
          }
  
    try {
        const listsURL = 'https://www.googleapis.com/tasks/v1/users/@me/lists';
        const listsResponse = await fetch(listsURL, {
          headers: {
            'Authorization': `Bearer ${result.authToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!listsResponse.ok) {
          throw new Error('Failed to fetch task lists');
        }

        const listsData = await listsResponse.json();
        
        // If no lists available, create a new one
        let taskListId;
        if (!listsData.items || listsData.items.length === 0) {
          // Create a new task list
          const createListResponse = await fetch('https://www.googleapis.com/tasks/v1/users/@me/lists', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${result.authToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              title: 'My Tasks'
            })
          });
          
          if (!createListResponse.ok) {
            throw new Error('Failed to create task list');
          }
          
          const newList = await createListResponse.json();
          taskListId = newList.id;
        } else {
          // Use the first list (usually default)
          taskListId = listsData.items[0].id;
        }

        // Now add the task to the list
        const addTaskURL = `https://www.googleapis.com/tasks/v1/lists/${taskListId}/tasks`;
        
        const taskResponse = await fetch(addTaskURL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${result.authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: taskDetails.title,
            notes: taskDetails.description || '',
            due: taskDetails.dueDate || null
          })
        });
        
        if (!taskResponse.ok) {
          const errorData = await taskResponse.json();
          console.error('Task API error:', errorData);
          throw new Error('Failed to add task');
        }
        
        const taskData = await taskResponse.json();
        console.log('Task added successfully:', taskData);
        resolve(taskData);
    } catch (err) {
      console.error('Error adding task:', err);
    }
    });
});
  }


  function renderTasks(tasks) {
    const taskContainer = document.getElementById('to-do-list');
    taskContainer.innerHTML = ''; // Clear the container
    
    if (!tasks || tasks.length === 0) {
      taskContainer.innerHTML = '<p>No tasks to display</p>';
      return;
    }
  
    tasks.forEach(task => {
      const taskElement = document.createElement('div');
      taskElement.className = 'task-item';
      
      // Create the checkbox
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'task-checkbox';
      checkbox.checked = task.status === 'completed';
      checkbox.addEventListener('change', async () => {
        await updateTaskStatus(task.id, checkbox.checked ? 'completed' : 'needsAction');
        // No need to reload tasks here as we're visually updating already
      });
      
      taskElement.innerHTML = `
        <div class="task-content">
          <div class="to-do-item ${task.status === 'completed' ? 'completed' : ''}">${task.title}</div>
        <button class="delete-task-button" data-task-id="${task.id}">×</button>
        </div>
      `;
      
      // Insert checkbox at the beginning
      taskElement.insertBefore(checkbox, taskElement.firstChild);
      
      // Add delete event listener
      taskElement.querySelector('.delete-task-button').addEventListener('click', async () => {
        await deleteTask(task.id);
        loadTasks(); // Reload tasks after deletion
      });
      
      taskContainer.appendChild(taskElement);
    });
  }

  async function deleteTask(taskId) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['authToken'], async function(result) {
        if (!result.authToken) {
          window.location.href = 'signinpage.html';
          reject(new Error('Not authenticated'));
          return;
        }
  
        try {
          // First get the default task list ID
          const listsURL = 'https://www.googleapis.com/tasks/v1/users/@me/lists';
          const listsResponse = await fetch(listsURL, {
            headers: {
              'Authorization': `Bearer ${result.authToken}`,
              'Content-Type': 'application/json'
            }
          });
  
          if (!listsResponse.ok) {
            throw new Error('Failed to fetch task lists');
          }
  
          const listsData = await listsResponse.json();
          
          if (!listsData.items || listsData.items.length === 0) {
            throw new Error('No task lists found');
          }
          
          // Use the first list (usually default)
          const taskListId = listsData.items[0].id;
          
          // Delete the task
          const deleteURL = `https://www.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`;
          const deleteResponse = await fetch(deleteURL, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${result.authToken}`,
              'Content-Type': 'application/json'
            }
          });
  
          if (!deleteResponse.ok) {
            throw new Error('Failed to delete task');
          }
  
          resolve();
        } catch (error) {
          console.error('Error deleting task:', error);
          reject(error);
        }
      });
    });
  }

  async function updateTaskStatus(taskId, status) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['authToken'], async function(result) {
        if (!result.authToken) {
          window.location.href = 'signinpage.html';
          reject(new Error('Not authenticated'));
          return;
        }
  
        try {
          // First get the default task list ID
          const listsURL = 'https://www.googleapis.com/tasks/v1/users/@me/lists';
          const listsResponse = await fetch(listsURL, {
            headers: {
              'Authorization': `Bearer ${result.authToken}`,
              'Content-Type': 'application/json'
            }
          });
  
          if (!listsResponse.ok) {
            throw new Error('Failed to fetch task lists');
          }
  
          const listsData = await listsResponse.json();
          
          if (!listsData.items || listsData.items.length === 0) {
            throw new Error('No task lists found');
          }
          
          // Use the first list (usually default)
          const taskListId = listsData.items[0].id;
          
          // First get the current task data
          const getTaskURL = `https://www.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`;
          const getTaskResponse = await fetch(getTaskURL, {
            headers: {
              'Authorization': `Bearer ${result.authToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!getTaskResponse.ok) {
            throw new Error('Failed to fetch task details');
          }
          
          const taskData = await getTaskResponse.json();
          
          // Update the task status
          const updateURL = `https://www.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`;
          const updateResponse = await fetch(updateURL, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${result.authToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ...taskData,
              status: status
            })
          });
  
          if (!updateResponse.ok) {
            throw new Error('Failed to update task status');
          }
  
          resolve(await updateResponse.json());
        } catch (error) {
          console.error('Error updating task:', error);
          reject(error);
        }
      });
    });
  }
  
  // Function to load all tasks and render them
  async function loadTasks() {
    try {
      const tasks = await fetchToDoList();
      renderTasks(tasks);
      
      // Update pet message based on tasks
      const petSpeech = document.getElementById('pet-speech');
      if (petSpeech) {
        const completedTasks = tasks ? tasks.filter(task => task.status === 'completed').length : 0;
        const totalTasks = tasks ? tasks.length : 0;
        
        if (totalTasks === 0) {
          changePetMessage("Your to-do list is empty. Add some tasks!");
        } else if (completedTasks === totalTasks) {
          changePetMessage("Amazing! You've completed all your tasks!");
        } else {
          changePetMessage(`You have ${totalTasks - completedTasks} tasks left to complete!`);
        }
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      document.getElementById('to-do-list').innerHTML = `<p class="error-message">Error loading tasks: ${error.message}</p>`;
    }
  }
  
  // Helper function to change pet message if it exists
  function changePetMessage(message) {
    const petSpeech = document.getElementById('pet-speech');
    if (petSpeech) {
      petSpeech.textContent = message;
      petSpeech.classList.add('bounce');
      
      setTimeout(() => {
        petSpeech.classList.remove('bounce');
      }, 1000);
    }
  }
  
  // Initialize to-do list when the document is loaded
  document.addEventListener('DOMContentLoaded', function() {
    const addTaskForm = document.getElementById('add-task-form');
    
    if (addTaskForm) {
      addTaskForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const taskDetails = {
          title: document.getElementById('to-do-item').value       };
        
        try {
          await addTaskToList(taskDetails);
          document.getElementById('to-do-item').value = ''; // Clear the input
          changePetMessage("Task added successfully!");
          loadTasks(); // Reload tasks
        } catch (error) {
          console.error('Error adding task:', error);
          changePetMessage("Oops! I couldn't add your task.");
        }
      });
    }
    
    // Check authentication and load tasks
    chrome.storage.local.get(['authToken'], function(result) {
      if (!result.authToken) {
        window.location.href = 'signinpage.html';
        return;
      }
      
      loadTasks();
    });
  });
  
  