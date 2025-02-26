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
    const isLink = getParams("link") === "true";

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

    // Define CSS
    const styles = {
        body: {
            margin: "0",
            padding: "0",
            overflowX: "hidden",
            height: "100vh"
        },
        frameContainer: {
            marginTop: "15px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            position: "fixed",
            bottom: "0",
            zIndex: "9999"
        },
        resizeHandle: {
            backgroundColor: "#444",
            height: "15px",
            cursor: "grab",
            width: "100%"
        },
        consoleOutput: {
            display: "flex",
            flexDirection: "column",
            fontFamily: "Arial, sans-serif",
            width: "100%",
            backgroundColor: "#282828",
            color: "white",
            padding: "10px",
            boxSizing: "border-box",
            overflowY: "scroll",
            height: "50%",
            touchAction: "auto",
        },
        consoleEntry: {
            display: "flex",
            flexDirection: "column",
            background: "rgba(255, 255, 255, 0.1)",
            padding: "10px",
            margin: "5px 0",
            borderRadius: "5px",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)"
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

        //Apply the CSS to the body
        function applyStyles(element, styleObject) {
            const proxy = new Proxy(styleObject, {
                set(target, prop, value) {
                    if (prop in element.style) {
                        element.style[prop] = value;
                    } else {
                        console.warn(`Invalid CSS property: ${prop}`);
                    }
                    return true;
                }
            });

            Object.assign(proxy, styleObject);
        };

        function modifyBody() {
            // Apply CSS to body
            applyStyles(document.body, styles.body);

            // Create the console output and resize handle dynamically
            const frameContainer = document.createElement('div');
            frameContainer.id = 'frameContainer';
            applyStyles(frameContainer, styles.frameContainer);

            const resizeHandle = document.createElement('div');
            resizeHandle.id = 'resizeHandle';
            applyStyles(resizeHandle, styles.resizeHandle);

            const outputContainer = document.createElement('div');
            outputContainer.id = 'consoleOutput';
            applyStyles(outputContainer, styles.consoleOutput);

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

            resizeHandle.addEventListener('touchstart', startResizing, {
                passive: true
            });

            // Touch events			
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
            applyStyles(entry, styles.consoleEntry);

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
                const lineDiv = document.createElement('div');
                const link = document.createElement('div');

                errorURL = message?.fileName ? message.fileName.split("?")[0] : "";
                errorLine = message?.lineNumber ?? "";
                errorColumn = message?.columnNumber ?? "";

                if (message.fileName != null) {
                    link.href = errorURL;
                    link.textContent = `${errorURL} | ${errorLine} : ${errorColumn}`;

                    link.style.color = 'royalblue';
                    link.style.cursor = 'pointer';
                    link.onclick = (e) => {
                        e.preventDefault();
                        processLink(errorURL, errorLine, errorColumn, !isLink);
                    };
                } else {
                    link.textContent = message.stack;
                };

                lineDiv.appendChild(link);

                errorStackDiv.appendChild(lineDiv);
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

        function processLink(url, line, column, openAsLink) {
            if (openAsLink) {
                window.open(`${url}#L${line}`, '_blank');
            } else {
                fetchFileContent(url, line, openAsLink);
            }
        };


        function fetchFileContent(fileUrl, errorLine, openAsLink) {
            fetch(fileUrl)
                .then(response => {
                    let contentType = response.headers.get("Content-Type");

                    if (!response.ok) {
                        throw new Error(`Failed to fetch: ${response.statusText}`);
                    }

                    // Detect file type based on Content-Type
                    if (contentType.includes("application/json")) {
                        return response.json(); // Parse as JSON
                    } else if (
                        contentType.includes("text/html") ||
                        contentType.includes("text/css") ||
                        contentType.includes("text/javascript") ||
                        contentType.includes("application/javascript")
                    ) {
                        return response.text(); // Parse as text (HTML, CSS, JS)
                    } else if (contentType.includes("image")) {
                        return response.blob(); // Handle images
                    } else {
                        return response.arrayBuffer(); // Fallback for unknown formats
                    }
                })
                .then(data => {
                    let processedContent;

                    // Process content based on type
                    if (typeof data === "object" && !(data instanceof Blob)) {
                        processedContent = JSON.stringify(data, null, 2); // Pretty-print JSON
                    } else if (data instanceof Blob) {
                        processedContent = URL.createObjectURL(data); // Convert Blob (images)
                    } else {
                        processedContent = data; // Text-based content
                    }

                    fullScreen(processedContent, errorLine);
                })
                .catch(err => console.error("Error fetching file:", err));
        };

        function fullScreen(content, errorLine) {
            const lines = content.split('\n');
            let formattedContent = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">';
            formattedContent += '<title>View Source</title>';
            formattedContent += '<style>';
            formattedContent += 'body { font-family: -moz-fixed; font-weight: normal; white-space: pre; background-color: #ffffff; color: #000000; padding: 20px; margin: 0; }';
            formattedContent += '@media (prefers-color-scheme: dark) { body { background-color: #333333; color: #ffffff; } }';
            formattedContent += 'span:not(.error), a:not(.error) { unicode-bidi: embed; }';
            formattedContent += 'span[id] { display: block; }';
            formattedContent += '#viewsource { font-family: -moz-fixed; font-weight: normal; white-space: pre; }';
            formattedContent += ':root { color-scheme: light dark; direction: ltr; }';
            formattedContent += '.line-number { color: #888; margin-right: 1ch; }';
            formattedContent += '.highlight-line { background-color: darkgoldenrod; }';
            formattedContent += '</style></head><body id="viewsource">';

            lines.forEach((line, i) => {
                const lineNumber = i + 1;
                // const lineText = escapeHtml(line);
                const highlightClass = (lineNumber === errorLine) ? 'highlight-line' : '';
                formattedContent += `<span id="L${lineNumber}"><span class="line-number">${lineNumber}</span><span class="line-content ${highlightClass}">${line}</span></span>\n`;
            });

            formattedContent += '</body></html>';
            const blob = new Blob([formattedContent], {
                type: 'text/html'
            });
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl + "#L" + errorLine, '_blank');
        }

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

        console.error(new Error("This is a thrown error!"));

    };

})();
