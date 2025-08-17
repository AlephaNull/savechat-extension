// SaveChat Debug Script
// Run this in the browser console on ChatGPT to debug the extension

console.log('=== SaveChat Debug Script ===');

// Check if extension is loaded
console.log('1. Checking if SaveChat extension is loaded...');
if (typeof window.SaveChatDetection !== 'undefined') {
  console.log('✅ SaveChat modules are loaded');
} else {
  console.log('❌ SaveChat modules are NOT loaded');
}

// Check if instance exists
console.log('2. Checking if SaveChat instance exists...');
if (window.saveChatInstance) {
  console.log('✅ SaveChat instance exists');
} else {
  console.log('❌ SaveChat instance does not exist');
}

// Check current URL
console.log('3. Current URL:', window.location.href);

// Check for ChatGPT response elements
console.log('4. Looking for ChatGPT response elements...');
const responseSelectors = [
  'div[data-message-author-role="assistant"]',
  '[data-message-author-role="assistant"]',
  '.group.w-full.text-gray-800.dark\\:text-gray-100[data-message-author-role="assistant"]',
  '.flex.flex-col.items-center.text-base[data-message-author-role="assistant"]'
];

responseSelectors.forEach(selector => {
  const elements = document.querySelectorAll(selector);
  console.log(`Selector "${selector}": ${elements.length} elements found`);
  if (elements.length > 0) {
    console.log('First element:', elements[0]);
  }
});

// Check for action trays
console.log('5. Looking for action trays...');
const actionTraySelectors = [
  '[data-testid="message-actions"]',
  '[data-testid="message-actions-toolbar"]',
  '.flex.items-center.justify-end.gap-1',
  '.flex.items-center.justify-end.gap-2'
];

actionTraySelectors.forEach(selector => {
  const elements = document.querySelectorAll(selector);
  console.log(`Action tray selector "${selector}": ${elements.length} elements found`);
  if (elements.length > 0) {
    console.log('First action tray:', elements[0]);
  }
});

// Check for existing save buttons
console.log('6. Checking for existing save buttons...');
const saveButtons = document.querySelectorAll('.savechat-button');
console.log(`Found ${saveButtons.length} existing save buttons`);

// Try to manually trigger the extension
console.log('7. Attempting to manually trigger SaveChat...');
if (window.triggerSaveChat) {
  window.triggerSaveChat();
  console.log('✅ Manual trigger called');
} else {
  console.log('❌ Manual trigger function not available');
}

console.log('=== Debug complete ===');
console.log('Check the console for any error messages above.'); 