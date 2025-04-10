async function fetchToDoList() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['authToken'], async function(result) {
      if (!result.authToken) {
        window.location.href = 'signinpage.html';
        reject(new Error('Not authenticated'));
        return;
      }

      try {     
        // get the list of all calendars
        const todoURL = `https://www.googleapis.com/tasks/v1/users/@me/lists`;
        const todoResponse = await fetch(todoURL, {
          headers: {
            'Authorization': `Bearer ${result.authToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!todoResponse.ok) {
          throw new Error('Failed to fetch task list');
        }

        const listsData = await todoResponse.json();

        //if no lists available, return empty array
        if (!listsData.items || listsData.items.length === 0) {
            resolve([]);
            return;
        }
          
        //use the first list (usually default)
        const defaultListId = listsData.items[0].id;

        // now fetch tasks from the default list
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


  async function getTaskSummary() {
    try {
      const tasks = await fetchToDoList();
      
      const completedTasks = tasks ? tasks.filter(task => task.status === 'completed').length : 0;
      const totalTasks = tasks ? tasks.length : 0;
      const completedPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
      const summary = `You have ${totalTasks - completedTasks} tasks left to complete!`;
      return summary;
    } catch (error) {
      console.error('Error loading tasks:', error);
      return "Error loading tasks!";
    }
  }

export { getTaskSummary, updateTaskStatus, fetchToDoList, addTaskToList, deleteTask };
  