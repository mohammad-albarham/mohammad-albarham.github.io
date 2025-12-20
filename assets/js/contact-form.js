/**
 * Contact Form Handler - Professional Design
 * Handles Google Forms submission with custom UI
 * 
 * Features:
 * - Client-side validation with inline errors
 * - Submission via hidden iframe (Google Forms)
 * - Loading states and success/error feedback
 */

class ContactFormHandler {
  constructor(formId) {
    this.form = document.getElementById(formId);
    if (!this.form) return;
    
    this.submitButton = this.form.querySelector('.submit-btn');
    this.messageContainer = document.getElementById('messageContainer');
    this.hiddenIframe = document.getElementById('hidden_iframe');
    this.isSubmitting = false;
    
    // Field selectors (using new IDs)
    this.fields = {
      name: this.form.querySelector('#contact-name'),
      email: this.form.querySelector('#contact-email'),
      subject: this.form.querySelector('#contact-subject'),
      message: this.form.querySelector('#contact-message')
    };
    
    this.init();
  }

  init() {
    // Form submission handler
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    
    // Real-time validation on blur
    Object.values(this.fields).forEach(field => {
      if (!field) return;
      field.addEventListener('blur', () => this.validateField(field));
      field.addEventListener('input', () => this.clearFieldError(field));
    });
  }

  /**
   * Validate a single field
   */
  validateField(field) {
    const fieldGroup = field.closest('.form-field');
    let errorMessage = '';

    const value = field.value.trim();

    // Required check
    if (field.hasAttribute('required') && !value) {
      errorMessage = 'This field is required';
    } 
    // Email format check
    else if (field.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errorMessage = 'Please enter a valid email address';
      }
    }
    // Min length check for message
    else if (field.id === 'contact-message' && value && value.length < 10) {
      errorMessage = 'Please enter at least 10 characters';
    }

    if (errorMessage) {
      this.showFieldError(field, errorMessage);
      return false;
    } else {
      this.clearFieldError(field);
      return true;
    }
  }

  /**
   * Show field-level error
   */
  showFieldError(field, message) {
    const fieldGroup = field.closest('.form-field');
    const errorElement = fieldGroup.querySelector('.field-error');
    
    fieldGroup.classList.add('has-error');
    if (errorElement) {
      errorElement.textContent = message;
    }
  }

  /**
   * Clear field-level error
   */
  clearFieldError(field) {
    const fieldGroup = field.closest('.form-field');
    const errorElement = fieldGroup.querySelector('.field-error');
    
    fieldGroup.classList.remove('has-error');
    if (errorElement) {
      errorElement.textContent = '';
    }
  }

  /**
   * Validate entire form
   */
  validateForm() {
    let isValid = true;
    let firstInvalidField = null;
    
    Object.values(this.fields).forEach(field => {
      if (!field) return;
      if (!this.validateField(field)) {
        isValid = false;
        if (!firstInvalidField) {
          firstInvalidField = field;
        }
      }
    });
    
    // Focus first invalid field
    if (firstInvalidField) {
      firstInvalidField.focus();
    }
    
    return isValid;
  }

  /**
   * Handle form submission
   */
  handleSubmit(e) {
    e.preventDefault();

    // Clear previous messages
    this.hideMessage();

    // Validate form
    if (!this.validateForm()) {
      return false;
    }

    if (this.isSubmitting) return false;

    // Show loading state
    this.setLoadingState(true);
    this.isSubmitting = true;

    // Submit form to Google Forms via hidden iframe
    this.form.submit();

    // Google Forms cross-origin restrictions prevent detecting iframe load
    // So we assume success after a short delay (form submission is reliable)
    setTimeout(() => {
      this.onFormSubmitComplete();
    }, 1500);

    return true;
  }

  /**
   * Called when form submission completes
   */
  onFormSubmitComplete() {
    this.setLoadingState(false);
    this.showSuccessMessage();
    this.form.reset();
    
    // Clear all validation states
    this.form.querySelectorAll('.form-field').forEach(fieldGroup => {
      fieldGroup.classList.remove('has-error');
      const errorElement = fieldGroup.querySelector('.field-error');
      if (errorElement) errorElement.textContent = '';
    });
    
    this.isSubmitting = false;
  }

  /**
   * Show success message
   */
  showSuccessMessage() {
    const html = `
      <div class="alert alert-success" role="alert">
        <div class="alert-icon">
          <i class="bi bi-check-lg"></i>
        </div>
        <div class="alert-content">
          <strong>Message sent successfully!</strong>
          <p>Thank you for reaching out. I'll get back to you within 24-48 hours.</p>
        </div>
      </div>
    `;
    
    this.messageContainer.innerHTML = html;
    this.scrollToMessage();

    // Auto-hide after 10 seconds
    setTimeout(() => this.hideMessage(), 10000);
  }

  /**
   * Show error message
   */
  showErrorMessage(text) {
    const html = `
      <div class="alert alert-danger" role="alert">
        <div class="alert-icon">
          <i class="bi bi-exclamation-lg"></i>
        </div>
        <div class="alert-content">
          <strong>Unable to send message</strong>
          <p>${text || 'Something went wrong. Please try again or email me directly.'}</p>
        </div>
      </div>
    `;
    
    this.messageContainer.innerHTML = html;
    this.scrollToMessage();
  }

  /**
   * Scroll to message container
   */
  scrollToMessage() {
    this.messageContainer.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'nearest' 
    });
  }

  /**
   * Hide message
   */
  hideMessage() {
    this.messageContainer.innerHTML = '';
  }

  /**
   * Set loading state on submit button
   */
  setLoadingState(isLoading) {
    if (isLoading) {
      this.submitButton.disabled = true;
      this.submitButton.classList.add('loading');
    } else {
      this.submitButton.disabled = false;
      this.submitButton.classList.remove('loading');
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('gform')) {
    new ContactFormHandler('gform');
  }
});
