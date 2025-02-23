// debug.js

let lineAdjust = ' \n';
let showErrorsOnly = false; // isVerbose; // Set to true to show only errors

// Override console.log
const originalLog = console.log;
console.log = function(...args) {
    if (isDebugMode) {; // Only log if isDebugMode is true
        originalLog.apply(console, args);
        if (!showErrorsOnly) {
            alert('Console: ' + args.join(' '));
        }
    }
};

// Override console.debug
const originalDebug = console.debug;
console.debug = function(...args) {
    if (isDebugMode) {
        originalDebug.apply(console, args); 
        alert('Error: ' + args.join(' '));
    }
};

// Override console.error
const originalError = console.error;
console.error = function(...args) {
    if (isDebugMode) {
        originalError.apply(console, args);
        if (!showErrorsOnly || args.length > 0) { // Always show errors
            alert('Error: ' + args.join(' '));
        }
    }
};

// Function to handle errors
function handleErrors(error) {
    if (isDebugMode && error && !(error instanceof ReferenceError) && !(error instanceof SyntaxError)) {
        alert('Caught Exception: ' + error.name + lineAdjust + error.message + lineAdjust + error.stack);
    }
}

// Override global error handling
window.onerror = function(message, source, lineno, colno, error) {
    if (isDebugMode) {
        handleErrors(error);
        alert('Global Exception: ' + error.name + lineAdjust + error.message + lineAdjust + error.stack);
    }
};
