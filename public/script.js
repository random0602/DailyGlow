const API_URL = 'http://localhost:3000/tasks';

// --- 1. GLOBAL THEME CHECK (Runs on every page) ---
document.addEventListener("DOMContentLoaded", () => {
    // Check if the user previously chose dark mode
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        
        // If we are on the settings page, make sure the toggle looks "on"
        const toggle = document.getElementById('darkModeToggle');
        if (toggle) toggle.checked = true;
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // 1. Set Date
    const date = new Date();
    document.getElementById('currentDate').textContent = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    document.getElementById('calendar-month').textContent = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // 2. Load Data
    fetchTasks();
    generateCalendar();
});

// --- TASK LOGIC ---

async function fetchTasks() {
    const response = await fetch(API_URL);
    const tasks = await response.json();
    renderTasks(tasks);
    updateStats(tasks);
}

function renderTasks(tasks) {
    const list = document.getElementById('taskList');
    list.innerHTML = ''; 

    tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-item ${task.isCompleted ? 'completed' : ''}`;
        li.innerHTML = `
            <span style="cursor:pointer; flex-grow:1;" onclick="toggleTask(${task.id}, ${!task.isCompleted})">
                ${task.title}
            </span>
            <i class="fas fa-trash" style="color:#ffb3b3; cursor:pointer;" onclick="deleteTask(${task.id})"></i>
        `;
        list.appendChild(li);
    });
}

function updateStats(tasks) {
    const total = tasks.length;
    const completed = tasks.filter(t => t.isCompleted).length;
    const pending = total - completed;

    document.getElementById('total-count').textContent = total;
    document.getElementById('done-count').textContent = completed;
    document.getElementById('pending-count').textContent = pending;
}

// --- CALENDAR LOGIC ---

function generateCalendar() {
    const grid = document.getElementById('calendar-grid');
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    
    // Simple 1-30(31) loop
    for (let i = 1; i <= daysInMonth; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-day';
        div.textContent = i;
        
        if (i === today.getDate()) {
            div.classList.add('today');
        }
        grid.appendChild(div);
    }
}

// --- API ACTIONS ---

async function addTask() {
    const input = document.getElementById('taskInput');
    if (!input.value.trim()) return;

    await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: input.value }),
    });
    input.value = '';
    fetchTasks();
}

async function toggleTask(id, isCompleted) {
    await fetch(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted }),
    });
    fetchTasks();
}

async function deleteTask(id) {
    await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    fetchTasks();
}

// --- FULL CALENDAR LOGIC ---

let currentCalDate = new Date();
let allTasksCache = []; 
let selectedDateString = ""; // Stores "2023-10-25" when you click a day

async function initFullCalendar() {
    await refreshCalendarData();
}

async function refreshCalendarData() {
    const response = await fetch(API_URL);
    allTasksCache = await response.json();
    renderFullCalendar();
    
    // If a day is currently open, refresh its list too
    if (selectedDateString) {
        const [year, month, day] = selectedDateString.split('-').map(Number);
        // We pass the date parts manually to filter correctly
        showDayDetails(day, month - 1, year); 
    }
}

function changeMonth(step) {
    currentCalDate.setMonth(currentCalDate.getMonth() + step);
    refreshCalendarData(); // Refresh data and re-render
}

function renderFullCalendar() {
    const grid = document.getElementById('full-calendar-grid');
    const title = document.getElementById('month-year-display');
    
    // Safety check
    if (!grid || !title) return;

    grid.innerHTML = '';

    title.textContent = currentCalDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const year = currentCalDate.getFullYear();
    const month = currentCalDate.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay(); 
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 👇 THIS LOOP ADDS THE EMPTY SLOTS (Make sure this is present)
    for (let i = 0; i < firstDayIndex; i++) {
        const blank = document.createElement('div');
        blank.className = 'day-cell empty';
        grid.appendChild(blank);
    }

    // 2. Actual Days (Rest of your existing code below is fine...)
    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div');
        cell.className = 'day-cell';
        cell.innerHTML = `<span>${day}</span>`;
        
        // Format date as YYYY-MM-DD to match database
        // We padStart to ensure "5" becomes "05"
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // Check if it's today
        const today = new Date();
        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            cell.classList.add('today');
        }

        // Find tasks for this SPECIFIC scheduled date
        const tasksForDay = allTasksCache.filter(t => t.scheduledDate === dateStr);

        // Add dots
        if (tasksForDay.length > 0) {
            const dots = document.createElement('div');
            tasksForDay.forEach(t => {
                const dot = document.createElement('span');
                dot.className = 'task-dot';
                // Green dot for completed, Pink for pending
                dot.style.backgroundColor = t.isCompleted ? '#a2e8dd' : '#E75480';
                dots.appendChild(dot);
            });
            cell.appendChild(dots);
        }

        // Click Event
        cell.onclick = () => {
            selectedDateString = dateStr; // Remember which day was clicked
            showDayDetails(day, month, year);
        };
        
        grid.appendChild(cell);
    }
}

function showDayDetails(day, month, year) {
    const panel = document.getElementById('day-details');
    const title = document.getElementById('selected-date-title');
    const list = document.getElementById('day-task-list');

    panel.style.display = 'block';
    
    // Title
    const dateObj = new Date(year, month, day);
    title.textContent = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    // Filter tasks
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const tasks = allTasksCache.filter(t => t.scheduledDate === dateStr);

    list.innerHTML = '';
    
    if (tasks.length === 0) {
        list.innerHTML = '<p style="color:#999; font-style:italic;">No plans yet. Add one above! ✨</p>';
    } else {
        tasks.forEach(task => {
            const li = document.createElement('li');
            li.style.cssText = "display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;";
            
            li.innerHTML = `
                <span onclick="toggleTask(${task.id}, ${!task.isCompleted})" 
                      style="cursor:pointer; text-decoration: ${task.isCompleted ? 'line-through' : 'none'}; color: ${task.isCompleted ? '#ccc' : '#555'}">
                    ${task.title}
                </span>
                <i class="fas fa-trash" style="color:#ffb3b3; cursor:pointer;" onclick="deleteTask(${task.id})"></i>
            `;
            list.appendChild(li);
        });
    }
}

// 👇 NEW FUNCTION: Save a scheduled task
async function addScheduledTask() {
    const input = document.getElementById('scheduledTaskInput');
    const title = input.value.trim();
    
    if (!title || !selectedDateString) return;

    await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            title: title, 
            scheduledDate: selectedDateString // We send the date!
        }),
    });

    input.value = '';
    refreshCalendarData(); // Reload the calendar to show the new dot
}

// --- SHARED ACTIONS (Works on both pages) ---

async function toggleTask(id, isCompleted) {
    await fetch(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted }),
    });

    // Smart Refresh: Checks which page you are on
    if (document.getElementById('full-calendar-grid')) {
        refreshCalendarData(); // Update Calendar (change dot color)
    } else {
        fetchTasks(); // Update Dashboard
    }
}

async function deleteTask(id) {
    // 1. Ask for confirmation
    if(!confirm("Are you sure you want to delete this?")) return;

    // 2. Delete from Database
    await fetch(`${API_URL}/${id}`, { method: 'DELETE' });

    // 3. Smart Refresh
    if (document.getElementById('full-calendar-grid')) {
        // If we are on the Calendar Page
        refreshCalendarData(); 
    } else {
        // If we are on the Dashboard Page
        fetchTasks();
    }
}

function closeDetails() {
    document.getElementById('day-details').style.display = 'none';
    selectedDateString = "";
}

// --- CUSTOM NOTIFICATION & MODAL LOGIC ---

let taskToDeleteId = null; // Store ID temporarily

// 1. Show the "Are you sure?" Modal
function deleteTask(id) {
    taskToDeleteId = id; // Remember which task to delete
    document.getElementById('confirm-modal').style.display = 'flex';
}

// REPLACE your existing confirmDeleteAction function with this:

async function confirmDeleteAction() {
    if (!taskToDeleteId) return;

    // 1. Call API to delete
    await fetch(`${API_URL}/${taskToDeleteId}`, { method: 'DELETE' });

    // 2. Close Modal
    closeModal();

    // 3. Show Success Toast
    showToast("Task deleted successfully! 🗑️");

    // 4. SMART REFRESH: Check which page we are on
    const calendarGrid = document.getElementById('full-calendar-grid');

    if (calendarGrid) {
        // We are on the Calendar Page
        refreshCalendarData(); 
        document.getElementById('day-details').style.display = 'none'; // Close the side panel
    } else {
        // We are on the Dashboard Page
        fetchTasks(); // Refresh the main list
        
        // Also update the stats numbers (Total, To Do, Done)
        const response = await fetch(API_URL);
        const tasks = await response.json();
        updateStats(tasks);
    }
}

// 3. Close the Modal
function closeModal() {
    document.getElementById('confirm-modal').style.display = 'none';
    taskToDeleteId = null;
}

// 4. Show Toast Notification
function showToast(message) {
    const container = document.getElementById('notification-container');
    
    // Create element
    const notif = document.createElement('div');
    notif.className = 'notification';
    notif.innerHTML = `<span>✨</span> ${message}`;

    container.appendChild(notif);

    // Remove after 3 seconds
    setTimeout(() => {
        notif.style.opacity = '0';
        setTimeout(() => notif.remove(), 500);
    }, 3000);
}

// --- MOOD TRACKER LOGIC ---

let selectedEmoji = "";

function selectMood(emoji) {
    selectedEmoji = emoji;
    
    // Visual update: Highlight the selected emoji
    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.classList.remove('selected');
        if(btn.textContent === emoji) btn.classList.add('selected');
    });
}

async function saveMood() {
    // 1. Validation
    if (!selectedEmoji) return showToast("Please select an emoji first! 🌸");

    const noteInput = document.getElementById('moodNote');
    const note = noteInput.value;

    try {
        // 2. Save to Server
        await fetch(`${API_URL.replace('/tasks', '/moods')}`, { // Smart URL switch
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emoji: selectedEmoji, note }),
        });

        // 3. Clear Inputs
        noteInput.value = '';
        selectedEmoji = "";
        document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
        
        showToast("Mood logged! ✨");

        // 4. INSTANT REFRESH: This updates the list immediately
        await fetchMoods(); 

    } catch (error) {
        console.error(error);
        showToast("Error saving mood");
    }
}

async function fetchMoods() {
    const container = document.getElementById('mood-history');
    if(!container) return; // Stop if we aren't on the moods page

    try {
        // 1. Get latest list from server
        // Note: We use .replace to switch from /tasks to /moods API
        const res = await fetch(`${API_URL.replace('/tasks', '/moods')}`);
        const moods = await res.json();
        
        // 2. Clear the current list
        container.innerHTML = '';
        
        // 3. Re-draw everything (Newest first)
        moods.forEach(mood => {
            // Format the date nicely (e.g., "Oct 25, 10:30 AM")
            const date = new Date(mood.date).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'
            });

            const div = document.createElement('div');
            div.className = 'mood-card';
            
            // Add a little animation so new items "pop" in
            div.style.animation = "fadeIn 0.5s ease-out";
            
            div.innerHTML = `
                <span class="emoji">${mood.emoji}</span>
                <span class="date">${date}</span>
                <span class="note">"${mood.note || 'No note'}"</span>
                <button onclick="deleteMood(${mood.id})" class="delete-btn" style="color:#ffb3b3; margin-top:10px; cursor:pointer; background:none; border:none;">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            container.appendChild(div);
        });
    } catch (error) {
        console.error("Could not fetch moods:", error);
    }
}

// Add this if you want to be able to delete moods too!
async function deleteMood(id) {
    if(!confirm("Remove this mood entry?")) return;
    
    await fetch(`${API_URL.replace('/tasks', '/moods')}/${id}`, { method: 'DELETE' });
    fetchMoods(); // Refresh list immediately after delete
}

// --- MOOD DELETE LOGIC ---

let moodToDeleteId = null; // Temporary storage

// 1. Trigger the Modal
function deleteMood(id) {
    moodToDeleteId = id; // Remember which mood to delete
    document.getElementById('confirm-modal').style.display = 'flex';
}

// 2. Confirm Action (Clicked "Yes")
async function confirmDeleteMood() {
    if (!moodToDeleteId) return;

    // Call API (Notice we use /moods here, not /tasks)
    await fetch(`${API_URL.replace('/tasks', '/moods')}/${moodToDeleteId}`, { 
        method: 'DELETE' 
    });

    // Close Modal
    closeModal();

    // Show Success Toast
    showToast("Mood entry removed! 🌸");

    // Refresh the list instantly
    fetchMoods();
}

// Ensure closeModal works for this page too
function closeModal() {
    const modal = document.getElementById('confirm-modal');
    if (modal) modal.style.display = 'none';
    moodToDeleteId = null;
}

// --- SETTINGS LOGIC ---

// 1. Toggle Dark Mode
function toggleDarkMode() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    
    // Save preference to browser memory
    if (body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }
}

// 2. Load Theme on Startup (Add this to your DOMContentLoaded event)
// You can add this line inside the existing 'DOMContentLoaded' listener at the top of the file:
// if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');


// 3. Delete Account Logic
function confirmDeleteAccount() {
    document.getElementById('confirm-modal').style.display = 'flex';
}

async function deleteAccount() {
    try {
        // We need an endpoint for deleting the user.
        // Since we didn't create a specific "Delete Me" endpoint yet, 
        // we can use the User ID from the token (requires backend update)
        // OR simpler for now: Just delete the local token to simulate "Logout/Delete"
        
        // *backend update required for real deletion* - see below phase 4
        
        const token = localStorage.getItem('token');
        // Decode token to get ID (simple generic way)
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.sub;

        await fetch(`http://localhost:3000/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        localStorage.clear(); // Wipe everything
        window.location.href = '/index.html'; // Kick to login
        
    } catch (error) {
        alert("Error deleting account. Please try again.");
    }
}