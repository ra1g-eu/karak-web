import {rotatePreview} from "./uiManager.js";

/**
 * Shows a confirmation modal with custom title, message, and callbacks.
 * @param {string} title - Modal title
 * @param {string} message - Modal message
 * @param {Function} onConfirm - Callback when "Confirm" is clicked
 * @param {Function} [onCancel] - Optional callback when "Cancel" is clicked
 */
export function showConfirmModal(title, message, onConfirm, onCancel = null) {
    const modal = document.getElementById('confirmationModal');
    const modalTitle = document.getElementById('confirmationModalTitle');
    const modalMessage = document.getElementById('confirmationModalMessage');
    const confirmBtn = document.getElementById('confirmationModalConfirmYes');
    const cancelBtn = document.getElementById('confirmationModalConfirmNo');

    // Update modal content
    modalTitle.textContent = title;
    modalMessage.textContent = message;

    // Define button handlers
    const confirmHandler = () => {
        modal.close();
        if (typeof onConfirm === 'function') onConfirm();
    };

    const cancelHandler = () => {
        modal.close();
        if (typeof onCancel === 'function') onCancel();
    };

    // Attach handlers
    confirmBtn.addEventListener('click', confirmHandler);
    cancelBtn.addEventListener('click', cancelHandler);

    // Show modal
    modal.showModal();

    // Clean up handlers after modal closes
    modal.addEventListener('close', () => {
        confirmBtn.removeEventListener('click', confirmHandler);
        cancelBtn.removeEventListener('click', cancelHandler);
    }, {once: true});
}

/**
 * Shows a place tile modal with callbacks.
 * @param {Function} onConfirm - Callback when "Confirm" is clicked
 * @param {Function} [onCancel] - Optional callback when "Cancel" is clicked
 */
export function showPlaceTileModal(onConfirm, onCancel = null) {
    const modal = document.getElementById('tileModal');
    const confirmBtn = document.getElementById('confirmPlacement');
    const cancelBtn = document.getElementById('cancelPlacement');

    // Define button handlers
    const confirmHandler = () => {
        modal.close();
        if (typeof onConfirm === 'function') onConfirm();
    };

    const cancelHandler = () => {
        modal.close();
        if (typeof onCancel === 'function') onCancel();
    };

    // Attach handlers
    confirmBtn.addEventListener('click', confirmHandler);
    cancelBtn.addEventListener('click', cancelHandler);

    // Show modal
    modal.showModal();

    // Clean up handlers after modal closes
    modal.addEventListener('close', () => {
        confirmBtn.removeEventListener('click', confirmHandler);
        cancelBtn.removeEventListener('click', cancelHandler);
    }, {once: true});
}

/**
 * Shows information modal with custom title, message
 * @param {string} title - Modal title
 * @param {string} message - Modal message
 */
export function showInfoModal(title, message) {
    const modal = document.getElementById('infoModal');
    const modalTitle = document.getElementById('infoModalTitle');
    const modalMessage = document.getElementById('infoModalMessage');
    const confirmBtn = document.getElementById('infoModalDismiss');

    // Update modal content
    modalTitle.textContent = title;
    modalMessage.innerHTML = message;

    // Define button handlers
    const confirmHandler = () => {
        modal.close();
    };

    // Attach handlers
    confirmBtn.addEventListener('click', confirmHandler);

    // Show modal
    modal.showModal();

    // Clean up handlers after modal closes
    modal.addEventListener('close', () => {
        confirmBtn.removeEventListener('click', confirmHandler);
    }, {once: true});
}

/**
 * Shows information modal with custom title, message
 * @param {string} title - Modal title
 * @param {string} message - Modal message
 * @param {Function} [onItemDelete] - Optional callback when "Delete" is clicked
 */
export function showInventoryItemDetail(title, message, onItemDelete = null) {
    const modal = document.getElementById('invItemModal');
    const modalTitle = document.getElementById('invItemModalTitle');
    const modalMessage = document.getElementById('invItemModalMessage');
    const confirmBtn = document.getElementById('invItemModalDismiss');
    const deleteItemBtn = document.getElementById('invItemModalDelete');

    // Update modal content
    modalTitle.textContent = title;
    modalMessage.innerHTML = message;

    // Define button handlers
    const confirmHandler = () => {
        modal.close();
    };

    const onItemDeleteHandler = () => {
        modal.close();
        if (typeof onItemDelete === 'function') onItemDelete();
    };

    // Attach handlers
    confirmBtn.addEventListener('click', confirmHandler);
    deleteItemBtn.addEventListener('click', onItemDeleteHandler);

    // Show modal
    modal.showModal();

    // Clean up handlers after modal closes
    modal.addEventListener('close', () => {
        confirmBtn.removeEventListener('click', confirmHandler);
        deleteItemBtn.removeEventListener('click', onItemDeleteHandler);
    }, {once: true});
}

/**
 * Shows a confirmation modal and returns a Promise that resolves with true (confirm) or false (cancel).
 * @param {string} title - Modal title
 * @param {string} message - Modal message
 * @returns {Promise<boolean>} Resolves with true if confirmed, false if canceled
 */
export async function awaitPlayerDecision(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmationModal');
        const modalTitle = document.getElementById('confirmationModalTitle');
        const modalMessage = document.getElementById('confirmationModalMessage');
        const confirmBtn = document.getElementById('confirmationModalConfirmYes');
        const cancelBtn = document.getElementById('confirmationModalConfirmNo');

        // Update modal content
        modalTitle.textContent = title;
        modalMessage.textContent = message;

        // Define handlers
        const confirmHandler = () => {
            modal.close();
            resolve(true);
        };

        const cancelHandler = () => {
            modal.close();
            resolve(false);
        };

        // Attach handlers
        confirmBtn.addEventListener('click', confirmHandler);
        cancelBtn.addEventListener('click', cancelHandler);

        // Clean up after modal closes
        modal.addEventListener('close', () => {
            confirmBtn.removeEventListener('click', confirmHandler);
            cancelBtn.removeEventListener('click', cancelHandler);
        }, { once: true });

        // Show modal
        modal.showModal();
    });
}

/**
 * Shows a dropdown anchored to an element and returns a Promise resolved with true/false.
 * @param {HTMLElement} anchorElement - Element to anchor the dropdown to
 * @param {string} title - Modal title
 * @param {string} message - Modal message
 * @returns {Promise<boolean>} Resolves with true if confirmed, false if canceled
 */
export async function awaitPlayerDecisionDropdown(anchorElement, title, message) {
    return new Promise((resolve) => {
        // Create dropdown container
        const dropdown = document.createElement('div');
        dropdown.className = 'dropdown dropdown-open dropdown-start';
        dropdown.style.position = 'absolute';

        // Calculate position relative to anchor
        const rect = anchorElement.getBoundingClientRect();
        dropdown.style.left = `${rect.left + window.scrollX}px`;
        dropdown.style.top = `${rect.bottom + window.scrollY}px`;

        // Create dropdown content
        dropdown.innerHTML = `
            <div tabindex="0" class="h-0 w-0 outline-none"></div>
            <div class="dropdown-content bg-base-300 p-4 shadow-lg rounded-box w-64 mt-2">
                <p class="mb-4 text-sm">${message}</p>
                <div class="flex justify-between gap-2">
                    <button id="dropdownConfirm" class="btn btn-success btn-sm flex-1">
                        Confirm
                    </button>
                    <button id="dropdownCancel" class="btn btn-error btn-sm flex-1">
                        Cancel
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(dropdown);

        // Get button references
        const confirmBtn = dropdown.querySelector('#dropdownConfirm');
        const cancelBtn = dropdown.querySelector('#dropdownCancel');

        // Define handlers
        const confirmHandler = () => {
            closeDropdown();
            resolve(true);
        };

        const cancelHandler = () => {
            closeDropdown();
            resolve(false);
        };

        // Attach handlers
        confirmBtn.addEventListener('click', confirmHandler);
        cancelBtn.addEventListener('click', cancelHandler);

        // Prevent auto-close on outside click
        dropdown.addEventListener('close', (e) => {
            e.preventDefault();
        });

        // Cleanup function
        function closeDropdown() {
            confirmBtn.removeEventListener('click', confirmHandler);
            cancelBtn.removeEventListener('click', cancelHandler);
            dropdown.remove();
        }
    });
}