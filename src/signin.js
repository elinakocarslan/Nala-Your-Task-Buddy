
// loads everything, if already signed in redirect to home page
document.addEventListener('DOMContentLoaded', function() {
  chrome.storage.local.get(['authToken'], function(result) {
    if (result.authToken) {
      statusMessage.textContent = "Already signed in. Redirecting...";
      redirectToHomepage();
    }
  });
  const signInButton = document.getElementById('sign-in-button');
  const statusMessage = document.getElementById('status-message');
  // handling button click
  signInButton.addEventListener('click', function() {
    signInButton.disabled = true;
    statusMessage.textContent = "Signing in...";

    // send message to background script to authenticate
    chrome.runtime.sendMessage({action: "authenticate"}, function(response) {
      if (response && response.token) {
        // store the token
        chrome.storage.local.set({authToken: response.token}, function() {
          statusMessage.textContent = "Sign in successful!";
          redirectToHomepage();
        });
      } else {
        signInButton.disabled = false;
        statusMessage.textContent = "Sign in failed: " + (response.error || "Unknown error");
      }
    });
  });
  
  // set window to home screen
  function redirectToHomepage() {
    setTimeout(() => {
      window.location.href = "homepage.html";
    }, 0);
  }
});