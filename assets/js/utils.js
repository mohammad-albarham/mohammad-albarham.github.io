/**
 * Utility function to copy text to clipboard
 * Usage: <button onclick="copyToClipboard(this)">Copy</button>
 * where the button is inside an accordion-body
 */
function copyToClipboard(button) {
  const code = button.previousElementSibling?.querySelector('code') || 
               button.closest('.accordion-body')?.querySelector('code');
  
  if (!code) {
    alert('Could not find code to copy');
    return;
  }

  const textToCopy = code.innerText;
  const textarea = document.createElement('textarea');
  textarea.value = textToCopy;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  
  // Provide user feedback
  const originalText = button.textContent;
  button.textContent = 'Copied!';
  setTimeout(() => {
    button.textContent = originalText;
  }, 2000);
}

/**
 * Initialize date display
 */
document.addEventListener('DOMContentLoaded', function() {
  const today = new Date();
  const formattedDate = today.getFullYear() + '-' +
    String(today.getMonth() + 1).padStart(2, '0') + '-' +
    String(today.getDate()).padStart(2, '0');
  
  const dateElement = document.getElementById('current-date');
  if (dateElement) {
    dateElement.textContent = formattedDate;
  }
});

/**
 * Handle contact form submission
 */
function submitForm() {
  alert('Thank you for your email!');
  return true;
}

function onHiddenIframeLoad() {
  const form = document.getElementById('gform');
  if (form) {
    form.reset();
  }
}
