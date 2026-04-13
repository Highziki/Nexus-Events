/**
 * Nexus Global Notification System
 * Replaces standard alert() with sleek glassmorphism notifications.
 */

function nexusNotify(message, type = 'info') {
    // Create container if it doesn't exist
    let container = document.getElementById('nexus-notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'nexus-notification-container';
        container.className = 'fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3 pointer-events-none w-full max-w-sm px-4';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    
    // Type-based styles
    let borderClass = 'border-white/10';
    let textClass = 'text-white';
    let icon = 'ℹ️';

    if (type === 'success') {
        borderClass = 'border-nexus-primary/30';
        textClass = 'text-nexus-primary';
        icon = '✅';
    } else if (type === 'error') {
        borderClass = 'border-red-500/30';
        textClass = 'text-red-400';
        icon = '❌';
    }

    toast.className = `glass ${borderClass} rounded-2xl p-4 shadow-2xl flex items-center gap-3 transition-all duration-500 translate-y-[-20px] opacity-0 pointer-events-auto cursor-pointer flex items-center`;
    toast.style.backdropFilter = 'blur(12px)';
    toast.style.backgroundColor = 'rgba(31, 40, 51, 0.8)';
    
    toast.innerHTML = `
        <span class="text-xl">${icon}</span>
        <div class="flex-1">
            <p class="text-sm font-medium ${textClass}">${message}</p>
        </div>
    `;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-[-20px]', 'opacity-0');
    });

    // Auto-remove after 5 seconds
    const removeToast = () => {
        toast.classList.add('translate-y-[-20px]', 'opacity-0');
        setTimeout(() => toast.remove(), 500);
    };

    const timeoutId = setTimeout(removeToast, 5000);

    // Remove on click
    toast.onclick = () => {
        clearTimeout(timeoutId);
        removeToast();
    };
}

// Global exposure
window.nexusNotify = nexusNotify;
// Inject styles for glass if not already present
if (!document.querySelector('style#nexus-global-styles')) {
    const style = document.createElement('style');
    style.id = 'nexus-global-styles';
    style.textContent = `
        .glass {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
    `;
    document.head.appendChild(style);
}
