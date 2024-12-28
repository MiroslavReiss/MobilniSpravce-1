// Pomocné funkce pro práci s API
async function api(endpoint, options = {}) {
    const response = await fetch(`api/${endpoint}.php`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
    }
    
    return response.json();
}

// Toast notifikace
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Automaticky skrýt po 3 sekundách
    setTimeout(() => {
        toast.classList.add('toast-hide');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Polling pro chat (náhrada za WebSocket)
let lastMessageId = 0;

async function pollMessages() {
    try {
        const messages = await api(`chat?since=${lastMessageId}`);
        if (messages.length > 0) {
            lastMessageId = messages[messages.length - 1].id;
            messages.forEach(appendMessage);
        }
    } catch (error) {
        console.error('Chyba při načítání zpráv:', error);
    }
}

// Spustit polling pouze na chat stránce
if (window.location.search.includes('page=chat')) {
    setInterval(pollMessages, 2000);
}

// Event handlers pro formuláře
document.addEventListener('submit', async (e) => {
    if (!e.target.matches('form[data-api]')) return;
    
    e.preventDefault();
    const form = e.target;
    const endpoint = form.dataset.api;
    
    try {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        await api(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        form.reset();
        showToast('Úspěšně uloženo');
    } catch (error) {
        showToast(error.message, 'error');
    }
});
