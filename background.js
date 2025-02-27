// when extension is opened
chrome.runtime.onInstalled.addListener(() => {
    console.log('Task Managing Pet extension installed');
  });
  
  // change identity
  chrome.identity.onSignInChanged.addListener((account, signedIn) => {
    console.log('Sign in state changed:', signedIn);
  });
  
  // authenticate user & send updated token
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "authenticate") {
      authenticateUser().then(token => {
        sendResponse({token: token});
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