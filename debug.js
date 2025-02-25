// debug.js
(function() {

    // Initialize variables
    let isResizing = false;
    let lastY = 0;

    // Get URL parameters and extract "debug" parameter value
    const getParams = (() => {
        const params = new Map(
            location.search
            .slice(1)
            .split('&')
            .filter(p => p) // remove empty strings
            .map(p => {
                const [k, v] = p.split('=');
                // Only return the decoded value if it's provided; otherwise, set to false.
                return [k, v !== undefined ? decodeURIComponent(v) : false];
            })
        );
        return key => params.get(key) ?? false;
    })();

    const isDebug = getParams("debug") === "true";

    // Define both emoji and border color in a single matrix
    const consoleStyles = {
        log: {
            emoji: '🟢',
            border: '#4CAF50'
        },
        warn: {
            emoji: '🟡',
            border: '#FFEB3B'
        },
        error: {
            emoji: '🔴',
            border: '#F44336'
        },
        info: {
            emoji: '🔵',
            border: '#2196F3'
        }
    };

    // Only override console functions if isDebug is truthy
    if (isDebug) {
        try {
            // Preserve original console methods
            const originalConsoleLog = console.log;
            const originalConsoleWarn = console.warn;
            const originalConsoleError = console.error;
            const originalConsoleDebug = console.debug;

            // Queue to store messages before the DOM is ready
            let logQueue = [];
            let domReady = false;

            // Ensure the DOM is ready before calling addToConsole
            function safeAddToConsole(msg, type) {
                if (domReady) {
                    addToConsole(msg, type);
                } else {
                    logQueue.push({
                        msg,
                        type
                    });
                }
            };

            function processQueue() {
                domReady = true;
                logQueue.forEach(({
                    msg,
                    type
                }) => addToConsole(msg, type));
                logQueue = []; // Clear the queue
            };

            // Override console.log
            console.log = function(...args) {
                originalConsoleLog.apply(console, args);
                safeAddToConsole(args.join(' '), 'log');
            };

            // Override console.warn
            console.warn = function(...args) {
                originalConsoleWarn.apply(console, args);
                safeAddToConsole(args.join(' '), 'warn');
            };

            // Override console.error
            console.error = function(...args) {
                originalConsoleError.apply(console, args);
                const error = args[0];
                if (error instanceof Error) {
                    safeAddToConsole(error, 'error'); // Pass the actual Error object
                } else {
                    safeAddToConsole(String(error), 'error'); // Handle non-Error messages
                }
            };

            // Override console.info (using debug as base)
            console.info = function(...args) {
                originalConsoleDebug.apply(console, args);
                safeAddToConsole(args.join(' '), 'info');
            };

            // Override console.debug
            console.debug = function(...args) {
                originalConsoleDebug.apply(console, args);
                safeAddToConsole(args.join(' '), 'debug');
            };
        } catch (e) {
            console.error("Error setting up debug console:", e);
        };

        function modifyBody() {

            // Once the body is ready, apply styles and append content
            document.body.style.cssText = "margin: 0; padding: 0; overflow-x: hidden; height: 100vh;";

            // Create the console output and resize handle dynamically
            const frameContainer = document.createElement('div');
            frameContainer.id = 'frameContainer';
            frameContainer.style.cssText = "margin-top: 15px; display: flex; flex-direction: column; align-items: center; width: 100%; position: fixed; bottom: 0; z-index: 9999;";

            const resizeHandle = document.createElement('div');
            resizeHandle.id = 'resizeHandle';
            resizeHandle.style.cssText = "background-color: #444; height: 10px; cursor: grab; width: 100%;";

            const outputContainer = document.createElement('div');
            outputContainer.id = 'consoleOutput';
            outputContainer.style.cssText = "display: flex; flex-direction: column; font-family: Arial, sans-serif; width: 100%; background-color: #282828; color: white; padding: 10px; box-sizing: border-box; overflow-y: scroll; height: 50%;";

            frameContainer.appendChild(resizeHandle);
            frameContainer.appendChild(outputContainer);
            document.body.appendChild(frameContainer);

            // Set initial height of console output **after** it's created
            outputContainer.style.height = `${window.screen.height / 3}px`;

            // Mouse events
            resizeHandle.addEventListener('mousedown', startResizing);
            document.addEventListener('mousemove', handleResize, {
                passive: true
            });
            document.addEventListener('mouseup', stopResizing);

            // Touch events
            resizeHandle.addEventListener('touchstart', startResizing, {
                passive: true
            });
            document.addEventListener('touchmove', (e) => {
                e.preventDefault(); // Prevent pull-to-refresh
                handleResize(e);
            }, {
                passive: false
            });
            document.addEventListener('touchend', stopResizing, {
                passive: true
            });

            // Common resize logic
            function handleResize(e) {
                if (!isResizing) return;

                const clientY = e.clientY || e.touches[0].clientY; // Use touch for mobile, mouse for desktop
                const deltaY = clientY - lastY; // Track movement
                const newHeight = outputContainer.clientHeight - deltaY; // Adjust height directly
                const bodyHeight = window.screen.height;

                // Prevent resize from going out of bounds
                if (newHeight > 50 && newHeight < bodyHeight - 100) {
                    outputContainer.style.height = `${newHeight}px`;
                }
                lastY = clientY;

                // Update the position of the handle
                const newCursorPosY = clientY;
                resizeHandle.style.top = `${newCursorPosY}px`;
            };
        };

        // Set the emoji and border color from the matrix
        function addToConsole(message, type) {
            const entry = document.createElement('div');
            entry.classList.add('consoleEntry', type);
            entry.style.cssText = "display:flex;flex-direction:column;background: rgba(255, 255, 255, 0.1); padding: 10px; margin: 5px 0; border-radius: 5px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);";
            const {
                emoji,
                border
            } = consoleStyles[type] || {
                emoji: '',
                border: '#000'
            };
            entry.style.borderLeft = `5px solid ${border}`;

            const emojiElement = document.createElement('span');
            emojiElement.classList.add('emoji');
            emojiElement.textContent = emoji;

            if (type === 'error' && message instanceof Error) {
                const errorNameDiv = document.createElement('div');
                errorNameDiv.style.fontWeight = 'bold';
                errorNameDiv.appendChild(emojiElement);
                errorNameDiv.appendChild(document.createTextNode(` ${message.name}: ${message.message}`));

                const errorStackDiv = document.createElement('div');
                errorStackDiv.style.paddingLeft = '20px';
                errorStackDiv.style.whiteSpace = 'pre-line';
                errorStackDiv.style.fontSize = '0.9em';
                errorStackDiv.style.color = '#ccc';

                message.stack.split('\n').forEach(line => {
                    const regex = /(\/\/\/[^\s]+):(\d+):(\d+)/;

                    const match = regex.exec(line);

                    const lineDiv = document.createElement('div');

                    if (match) {
                        const [_, fileUrl, lineNumber, columnNumber] = match;
                        const link = document.createElement('a');
                        link.href = fileUrl;
                        link.textContent = line.trim();
                        link.style.color = 'royalblue';
                        link.style.cursor = 'pointer';
                        link.onclick = (e) => {
                            e.preventDefault();
                            processLink(fileUrl, parseInt(lineNumber, 10), parseInt(columnNumber, 10), true);
                        };
                        lineDiv.appendChild(link);
                    } else {
                        lineDiv.textContent = line.trim();
                    }

                    errorStackDiv.appendChild(lineDiv);
                });

                entry.appendChild(errorNameDiv);
                entry.appendChild(errorStackDiv);
            } else {
                const messageDiv = document.createElement('div');
                messageDiv.classList.add('console-message');
                messageDiv.appendChild(emojiElement);
                messageDiv.appendChild(document.createTextNode(` ${message}`));
                entry.appendChild(messageDiv);
            }

            document.getElementById('consoleOutput').appendChild(entry);
        };

        // Process the error stack and extract the first file URL and its error line.
        function processLink(url, line, column, openAsLink) {
            const urlRegex = /(?:https?|file):\/+([^/?#:]+\/[^/?#:]*)/;
            let processedUrl = url;
            const match = urlRegex.exec(url);
            if (match) {
                processedUrl = match[1];
            }

            if (openAsLink) {
                window.open(`${processedUrl}#L${line}`, '_blank'); // `${processedUrl}#L${line}`
            }
        };

        // Start resizing (common for mouse and touch)
        function startResizing(e) {
            isResizing = true;
            lastY = e.clientY || e.touches[0].clientY; // Capture initial position
            document.body.style.cursor = 'grabbing'; // Change cursor
        };

        // Stop resizing (common for mouse and touch)
        function stopResizing() {
            isResizing = false;
            document.body.style.cursor = 'default'; // Reset cursor
        };

        window.addEventListener("load", () => {
            modifyBody();
            processQueue();
        });

        /*
	   // Test the logging functions
	   setTimeout(() => {
		   console.log("This is a log message!");
		   console.warn("This is a warning!");
		   console.error(new Error("This is an error!"));
		   console.info("This is an informational message.");
	   }, 1000);
	   */
    };
})();
