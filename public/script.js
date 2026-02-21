const API_URL = '/tasks';
const MOODS_API_URL = '/moods';

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        const toggle = document.getElementById('darkModeToggle');
        if (toggle) toggle.checked = true;
    }

    const date = new Date();
    const currentDateEl = document.getElementById('currentDate');
    if (currentDateEl) {
        currentDateEl.textContent = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
    } else {
        if (document.getElementById('taskList')) fetchTasks();
        if (document.getElementById('full-calendar-grid')) initFullCalendar();
        if (document.getElementById('mood-history')) fetchMoods();
        if (document.getElementById('total-count')) fetchTasks();
    }
});

// --- HELPER: SECURITY HEADERS ---
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return null;
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// --- TASK LOGIC (Dashboard) ---

async function fetchTasks() {
    const headers = getAuthHeaders();
    if (!headers) return;

    try {
        const response = await fetch(API_URL, { method: 'GET', headers });
        if (response.ok) {
            const tasks = await response.json();
            if (document.getElementById('taskList')) renderTasks(tasks);
            if (document.getElementById('total-count')) updateStats(tasks);
            if (document.getElementById('calendar-grid')) generateMiniCalendar();
        }
    } catch (error) {
        console.error("Failed to fetch tasks", error);
    }
}

function renderTasks(tasks) {
    const list = document.getElementById('taskList');
    if (!list) return;
    list.innerHTML = ''; 

    tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        li.innerHTML = `
            <span style="cursor:pointer; flex-grow:1;" onclick="toggleTask(${task.id}, ${!task.completed})">
                ${task.title}
            </span>
            <i class="fas fa-trash" style="color:#ffb3b3; cursor:pointer;" onclick="deleteTask(${task.id})"></i>
        `;
        list.appendChild(li);
    });
}

function updateStats(tasks) {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;

    document.getElementById('total-count').textContent = total;
    document.getElementById('done-count').textContent = completed;
    document.getElementById('pending-count').textContent = pending;
}

async function addTask() {
    const taskInput = document.getElementById('taskInput');
    const title = taskInput.value;
    const headers = getAuthHeaders();
    if (!headers || !title) return;

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ title }),
    });

    if (response.ok) {
        taskInput.value = '';
        fetchTasks();
    } else {
        alert("Failed to add task.");
    }
}

// --- SHARED ACTIONS (Toggle/Delete) ---

async function toggleTask(id, isCompleted) {
    const headers = getAuthHeaders();
    if (!headers) return;

    await fetch(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: headers,
        body: JSON.stringify({ isCompleted }),
    });
    
    if (document.getElementById('full-calendar-grid')) {
        refreshCalendarData();
    } else {
        fetchTasks();
    }
}

async function deleteTask(id) {
    if (!confirm("Are you sure you want to delete this?")) return;
    
    const headers = getAuthHeaders();
    if (!headers) return;

    await fetch(`${API_URL}/${id}`, { method: 'DELETE', headers: headers });

    if (document.getElementById('full-calendar-grid')) {
        refreshCalendarData();
    } else {
        fetchTasks();
    }
}

// --- MINI CALENDAR (Dashboard) ---

function generateMiniCalendar() {
    const grid = document.getElementById('calendar-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    const today = new Date();
    document.getElementById('calendar-month').textContent = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    
    for (let i = 1; i <= daysInMonth; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-day';
        div.textContent = i;
        if (i === today.getDate()) div.classList.add('today');
        grid.appendChild(div);
    }
}

// --- FULL CALENDAR PAGE LOGIC ---

let currentCalDate = new Date();
let allTasksCache = []; 
let selectedDateString = "";

async function initFullCalendar() {
    await refreshCalendarData();
}

async function refreshCalendarData() {
    const headers = getAuthHeaders();
    if (!headers) return;

    const response = await fetch(API_URL, { method: 'GET', headers: headers });
    if (response.ok) {
        allTasksCache = await response.json();
        renderFullCalendar();
        
        if (selectedDateString) {
            const [year, month, day] = selectedDateString.split('-').map(Number);
            showDayDetails(day, month - 1, year); 
        }
    }
}

function changeMonth(step) {
    currentCalDate.setMonth(currentCalDate.getMonth() + step);
    renderFullCalendar();
}

function renderFullCalendar() {
    const grid = document.getElementById('full-calendar-grid');
    const title = document.getElementById('month-year-display');
    if (!grid || !title) return;

    grid.innerHTML = '';
    title.textContent = currentCalDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const year = currentCalDate.getFullYear();
    const month = currentCalDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); 
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDayIndex; i++) {
        const blank = document.createElement('div');
        blank.className = 'day-cell empty';
        grid.appendChild(blank);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div');
        cell.className = 'day-cell';
        cell.innerHTML = `<span>${day}</span>`;
        
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const today = new Date();

        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            cell.classList.add('today');
        }

        const tasksForDay = allTasksCache.filter(t => t.scheduledDate === dateStr || (t.createdAt && t.createdAt.startsWith(dateStr)));
        if (tasksForDay.length > 0) {
            const dots = document.createElement('div');
            tasksForDay.forEach(t => {
                const dot = document.createElement('span');
                dot.className = 'task-dot';
                dot.style.backgroundColor = t.isCompleted ? '#a2e8dd' : '#E75480';
                dots.appendChild(dot);
            });
            cell.appendChild(dots);
        }

        cell.onclick = () => {
            selectedDateString = dateStr;
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
    const dateObj = new Date(year, month, day);
    title.textContent = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const tasks = allTasksCache.filter(t => t.scheduledDate === dateStr || (t.createdAt && t.createdAt.startsWith(dateStr)));

    list.innerHTML = '';
    if (tasks.length === 0) {
        list.innerHTML = '<p style="color:#999; font-style:italic;">No plans yet.</p>';
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

async function addScheduledTask() {
    const input = document.getElementById('scheduledTaskInput');
    const title = input.value.trim();
    const headers = getAuthHeaders();
    
    if (!title || !selectedDateString || !headers) return;

    await fetch(API_URL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ 
            title: title, 
            scheduledDate: selectedDateString 
        }),
    });

    input.value = '';
    refreshCalendarData(); 
}

function closeDetails() {
    document.getElementById('day-details').style.display = 'none';
    selectedDateString = "";
}

// --- MOOD TRACKER LOGIC ---

let selectedEmoji = "";

function selectMood(emoji) {
    selectedEmoji = emoji;
    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.classList.remove('selected');
        if(btn.textContent === emoji) btn.classList.add('selected');
    });
}

async function saveMood() {
    if (!selectedEmoji) return alert("Please select an emoji first! 🌸");
    
    const headers = getAuthHeaders();
    if (!headers) return;

    const noteInput = document.getElementById('moodNote');
    const note = noteInput.value;

    try {
        await fetch(MOODS_API_URL, { 
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ emoji: selectedEmoji, note }),
        });

        noteInput.value = '';
        selectedEmoji = "";
        document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
        fetchMoods(); 
        
    } catch (error) {
        console.error(error);
        alert("Error saving mood");
    }
}

async function fetchMoods() {
    const container = document.getElementById('mood-history');
    if(!container) return;

    const headers = getAuthHeaders();
    if (!headers) return;

    try {
        const res = await fetch(MOODS_API_URL, { method: 'GET', headers: headers });
        if (res.ok) {
            const moods = await res.json();
            container.innerHTML = '';
            
            moods.forEach(mood => {
                const date = new Date(mood.date).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'
                });

                const div = document.createElement('div');
                div.className = 'mood-card';
                div.innerHTML = `
                    <span class="emoji">${mood.emoji}</span>
                    <span class="date">${date}</span>
                    <span class="note">"${mood.note || ''}"</span>
                    <button onclick="deleteMood(${mood.id})" class="delete-btn" style="color:#ffb3b3; background:none; border:none; cursor:pointer;">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
                container.appendChild(div);
            });
        }
    } catch (error) {
        console.error("Could not fetch moods:", error);
    }
}

async function deleteMood(id) {
    if(!confirm("Remove this mood entry?")) return;
    
    const headers = getAuthHeaders();
    if (!headers) return;

    await fetch(`${MOODS_API_URL}/${id}`, { method: 'DELETE', headers: headers });
    fetchMoods(); 
}

// --- SETTINGS & ACCOUNT ---

function toggleDarkMode() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light');
}

// 👇 ADDED: Opens the custom modal
function confirmDeleteAccount() {
    document.getElementById('confirm-modal').style.display = 'flex';
}

// 👇 ADDED: Closes the custom modal if they click Cancel
function closeModal() {
    document.getElementById('confirm-modal').style.display = 'none';
}

// 👇 UPDATED: Deletes the account (Removed the ugly default browser prompt)
async function deleteAccount() {
    const token = localStorage.getItem('token');
    const headers = getAuthHeaders();
    if (!headers) return;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.sub;

        await fetch(`/users/${userId}`, {
            method: 'DELETE',
            headers: headers
        });

        logout();
    } catch (error) {
        alert("Error deleting account.");
    }
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = '/index.html';
}