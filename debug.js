document.addEventListener('DOMContentLoaded', function() {
    console.log("Debug functionality initialized");
    
    // Debug toggle button functionality
    const debugToggle = document.getElementById('debug-toggle');
    const debugPanel = document.getElementById('debug-panel');
    
    if (debugToggle && debugPanel) {
        // Show debug panel when toggle button is clicked
        debugToggle.onclick = function() {
            debugPanel.classList.remove('hidden'); // Use classList to control visibility
            debugToggle.classList.add('hidden');   // Use classList to control visibility
            console.log("Debug panel opened");
        };
        
        // Hide debug panel button
        const hideDebug = document.getElementById('hide-debug');
        if (hideDebug) {
            hideDebug.onclick = function() {
                debugPanel.classList.add('hidden');   // Use classList to control visibility
                debugToggle.classList.remove('hidden'); // Use classList to control visibility
                console.log("Debug panel closed");
            };
        }
    } else {
        console.error("Debug toggle or panel not found");
    }
    
    // Debug logging function
    window.debug = {
        log: function(message) {
            console.log(message);
            const debugLog = document.getElementById('debug-log');
            if (debugLog) {
                const time = new Date().toLocaleTimeString();
                const entry = document.createElement('div');
                // Inline style for span is kept as it's dynamic content with specific color.
                entry.innerHTML = `<span style="color:#f59e0b">[${time}]</span> ${message}`;
                debugLog.appendChild(entry);
                debugLog.scrollTop = debugLog.scrollHeight;
            }
        },
        clear: function() {
            const debugLog = document.getElementById('debug-log');
            if (debugLog) {
                debugLog.innerHTML = '';
            }
        }
    };
    
    // Debug buttons functionality
    document.getElementById('check-inventory')?.addEventListener('click', function() {
        const items = document.querySelectorAll('.inventory-item');
        window.debug.log(`Found ${items.length} inventory items`);
        
        items.forEach((item, index) => {
            window.debug.log(`Item ${index + 1}: ID=${item.id}, Description=${item.getAttribute('data-description')}`);
        });
    });
    
    document.getElementById('force-tooltip')?.addEventListener('click', function() {
        const items = document.querySelectorAll('.inventory-item');
        if (items.length > 0) {
            const firstItem = items[0];
            const desc = firstItem.getAttribute('data-description');
            
            window.debug.log(`Forcing tooltip for first item: ${firstItem.id}`);
            if (desc) {
                window.debug.log(`Description: ${desc}`);
                
                // Get tooltip element
                let tooltip = document.getElementById('item-tooltip');
                if (!tooltip) {
                    tooltip = document.createElement('div');
                    tooltip.id = 'item-tooltip';
                    // These styles are for a dynamically created element for testing,
                    // keeping them inline is acceptable for this debug feature.
                    tooltip.style.position = 'fixed';
                    tooltip.style.zIndex = '10000';
                    tooltip.style.backgroundColor = '#1e293b';
                    tooltip.style.color = 'white';
                    tooltip.style.padding = '10px';
                    tooltip.style.borderRadius = '6px';
                    tooltip.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
                    tooltip.style.maxWidth = '250px';
                    tooltip.style.border = '1px solid #f59e0b';
                    // A new tooltip should also start hidden if it's meant to use the class
                    tooltip.classList.add('hidden'); 
                    document.body.appendChild(tooltip);
                }
                
                // Update tooltip
                tooltip.textContent = desc;
                tooltip.classList.remove('hidden'); // Use classList to control visibility
                
                // Position tooltip (positioning styles remain inline as they are dynamic)
                const rect = firstItem.getBoundingClientRect();
                tooltip.style.top = (rect.top - tooltip.offsetHeight - 10) + 'px'; 
                tooltip.style.left = (rect.left + (rect.width / 2)) + 'px';
                tooltip.style.transform = 'translateX(-50%)';
                
                setTimeout(() => {
                    tooltip.classList.add('hidden'); // Use classList to control visibility
                    window.debug.log('Forced tooltip hidden');
                }, 3000);
            } else {
                window.debug.log('ERROR: No description found on item');
            }
        } else {
            window.debug.log('ERROR: No inventory items found');
        }
    });
    
    document.getElementById('clear-log')?.addEventListener('click', function() {
        window.debug.clear();
        window.debug.log('Log cleared');
    });
    
    window.debug.log('Debug panel ready');
});
