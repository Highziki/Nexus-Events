// General Utils

function formatCurrency(koboAmount) {
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(koboAmount / 100);
}

function getSafeImagePath(imagePath) {
    if (!imagePath) return '';
    if (imagePath.startsWith('http') || imagePath.startsWith('//') || imagePath.startsWith('data:')) {
        return imagePath;
    }
    return imagePath.startsWith('/') ? imagePath : '/' + imagePath;
}

function formatEventDate(dateStr) {
    if (!dateStr) return '';
    let d;
    // Handle DD/MM/YYYY
    if (dateStr.includes('/') && dateStr.split('/').length === 3) {
        const [day, month, year] = dateStr.split('/');
        d = new Date(year, parseInt(month) - 1, day);
    } 
    // Handle YYYY-MM-DD
    else if (dateStr.includes('-') && dateStr.split('-').length === 3) {
        const [year, month, day] = dateStr.split('-');
        d = new Date(year, parseInt(month) - 1, day);
    } else {
        d = new Date(dateStr);
    }
    
    if (isNaN(d.getTime())) return dateStr;
    
    return d.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// Fetch events from Backend API
async function loadEventsData() {
    try {
        const response = await fetch('/api/events');
        const data = await response.json();
        window.events = data; 
        return data;
    } catch (err) {
        console.error('Failed to load events', err);
        return [];
    }
}

// Load a single event from API
async function loadSingleEvent(id) {
    try {
        const response = await fetch(`/api/events/${id}`);
        if (!response.ok) return null;
        return await response.json();
    } catch (err) {
        console.error('Failed to load event', err);
        return null;
    }
}

async function renderEvents(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `<div class="text-white">Loading events...</div>`;
    
    const events = await loadEventsData();

    if (!events || events.length === 0) {
        container.innerHTML = `<p class="text-nexus-light">No events found.</p>`;
        return;
    }

    container.innerHTML = events.map(event => `
        <div class="glass rounded-2xl overflow-hidden group hover:border-nexus-primary/50 transition-all duration-300 flex flex-col h-full transform hover:-translate-y-1">
            <div class="relative h-48 overflow-hidden">
                <img src="${getSafeImagePath(event.image)}" alt="${event.name}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110">
                <div class="absolute top-4 right-4 bg-nexus-dark/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-nexus-primary border border-nexus-primary/30">
                    ${event.capacity - event.soldTickets} Left
                </div>
            </div>
            <div class="p-6 flex flex-col flex-grow">
                <div class="text-sm text-nexus-secondary font-medium mb-2">${formatEventDate(event.date)}</div>
                <h3 class="text-xl font-display font-bold text-white mb-2 leading-tight">${event.name}</h3>
                <p class="text-nexus-light/80 text-sm mb-4 flex-grow line-clamp-2">${event.description}</p>
                
                <div class="flex justify-between items-center mt-auto pt-4 border-t border-white/10">
                    <div class="text-lg font-bold text-white">${formatCurrency(event.price)}</div>
                    <a href="/events/${event.slug}" class="text-sm font-semibold text-nexus-dark bg-nexus-primary px-4 py-2 rounded shadow hover:bg-white transition-colors duration-300">
                        View Details
                    </a>
                </div>
            </div>
        </div>
    `).join('');
}

async function renderEventDetails() {
    const slug = window.location.pathname.split('/').filter(Boolean).pop();

    const container = document.getElementById('eventDetailsContainer');
    if (!container) return;

    container.innerHTML = `<div class="text-white text-center py-20 animate-pulse">Loading...</div>`;
    const event = await loadSingleEvent(slug);

    if (!event) {
        container.innerHTML = `
            <div class="text-center py-20 animate-fade-in-up">
                <div class="text-5xl mb-4">🎫</div>
                <h2 class="text-3xl font-display text-white mb-4">Event Not Found</h2>
                <a href="/" class="text-nexus-primary hover:text-white transition-colors">Return Home</a>
            </div>
        `;
        return;
    }

    window.currentEvent = event;
    document.title = `${event.name} | Nexus Events`;
    
    container.innerHTML = `
        <div class="glass rounded-3xl overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-0 border-white/10">
            <div class="relative h-64 lg:h-auto">
                <img src="${getSafeImagePath(event.image)}" alt="${event.name}" class="absolute inset-0 w-full h-full object-cover">
                <div class="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-nexus-dark to-transparent opacity-90"></div>
                <div class="absolute bottom-6 left-6 lg:bottom-10 lg:left-10 z-10">
                    <div class="inline-block px-3 py-1 bg-nexus-primary/20 border border-nexus-primary/50 text-nexus-primary rounded-full text-xs font-bold uppercase tracking-wide mb-3">
                        Featured Event
                    </div>
                    <h1 class="text-4xl lg:text-5xl font-display font-bold text-white leading-tight">${event.name}</h1>
                </div>
            </div>
            
            <div class="p-8 lg:p-12 flex flex-col justify-center">
                <div class="space-y-6 mb-8">
                    <div class="flex items-start gap-4">
                        <div class="mt-1 text-nexus-secondary">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        </div>
                        <div>
                            <div class="text-sm text-nexus-light/60 font-medium uppercase tracking-wider">Date & Time</div>
                            <div class="text-lg text-white font-medium">${formatEventDate(event.date)}</div>
                            <div class="text-nexus-light">${event.time}</div>
                        </div>
                    </div>
                    
                    <div class="flex items-start gap-4">
                        <div class="mt-1 text-nexus-secondary">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        </div>
                        <div>
                            <div class="text-sm text-nexus-light/60 font-medium uppercase tracking-wider">Location</div>
                            <div class="text-lg text-white font-medium">${event.location}</div>
                        </div>
                    </div>
                </div>

                <div class="prose prose-invert max-w-none text-nexus-light mb-8">
                    <p>${event.description}</p>
                </div>

                <div class="bg-nexus-dark/50 p-6 rounded-2xl border border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6 mt-auto">
                    <div>
                        <div class="text-sm text-nexus-light/60 font-medium uppercase tracking-wider mb-1">Price per ticket</div>
                        <div class="text-3xl font-display font-bold text-white">${formatCurrency(event.price)}</div>
                    </div>
                    <button onclick="openCheckoutModal()" class="w-full sm:w-auto bg-nexus-primary text-nexus-dark px-10 py-4 rounded-xl font-bold text-lg hover:bg-white transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(102,252,241,0.3)]">
                        Buy Ticket
                    </button>
                </div>
            </div>
        </div>
    `;
}

function openCheckoutModal() {
    const modal = document.getElementById('checkoutModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeCheckoutModal() {
    const modal = document.getElementById('checkoutModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

async function startPaymentProcess(e) {
    e.preventDefault();
    const event = window.currentEvent;
    const form = document.getElementById('checkoutForm');
    const submitBtn = document.getElementById('submitBtn');
    
    const email = form.email.value;
    const name = form.fullName.value;
    
    submitBtn.innerText = "Initializing...";
    submitBtn.disabled = true;

    try {
        const response = await fetch('/api/payment/initialize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                name,
                eventId: event._id
            })
        });

        const data = await response.json();
        
        if (response.ok && data.authorization_url) {
            window.location.href = data.authorization_url;
        } else {
            nexusNotify(data.error || 'Failed to initialize payment', 'error');
            submitBtn.innerText = "Pay with Paystack";
            submitBtn.disabled = false;
        }
    } catch (err) {
        console.error(err);
        nexusNotify('A network error occurred while connecting to the payment server.', 'error');
        submitBtn.innerText = "Pay with Paystack";
        submitBtn.disabled = false;
    }
}
