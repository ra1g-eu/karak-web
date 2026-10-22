export function getOppositeDirection(dir) {
    const opposites = {
        north: 'south',
        south: 'north',
        east: 'west',
        west: 'east'
    };
    return opposites[dir] || dir;
}

export function rotateDirection(dir, rotations) {
    const directions = ['north', 'east', 'south', 'west'];
    const idx = directions.indexOf(dir);
    if (idx === -1) return dir;
    return directions[(idx + rotations) % 4];
}

export function logEvent(message) {
    const logList = elementId('logEntries');
    const listItem = document.createElement('li');
    listItem.className = 'log-entry bg-base-100 p-2 rounded-md';

    const now = new Date();
    const timestamp = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });

    listItem.innerHTML = `
                <div class="flex align-middle">
                    <span class="text-yellow-500 font-mono w-24">[${timestamp}]</span>
                    <span class="">${message}</span>
                </div>
            `;

    logList.appendChild(listItem);
    logList.scrollTop = logList.scrollHeight;
}

export function elementId(id) {
    return document.getElementById(id);
}

export function elementsByClass(className) {
    return document.querySelectorAll(className);
}