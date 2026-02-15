const API_URL = '/tasks';

document.addEventListener("DOMContentLoaded", () => {
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        
        const toggle = document.getElementById('darkModeToggle');
        if (toggle) toggle.checked = true;
    }
});

document.addEventListener('DOMContentLoaded', () => {
    
    const date = new Date();
    document.getElementById('currentDate').textContent = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    document.getElementById('calendar-month').textContent = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    fetchTasks();
    generateCalendar();
});

// --- TASK LOGIC ---

async function fetchTasks() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    const response = await fetch(`${API_URL}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`, 
            'Content-Type': 'application/json'
        }
    });

    if (response.ok) {
        const tasks = await response.json();
        renderTasks(tasks);
        renderCalendar(currentDate);
    } else {
        console.error("Failed to fetch tasks");
    }
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
    const taskInput = document.getElementById('taskInput');
    const title = taskInput.value;
    const token = localStorage.getItem('token');

    if (!title) return;

    const response = await fetch(`${API_URL}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
    });

    if (response.ok) {
        taskInput.value = '';
        fetchTasks();
    } else {
        alert("Failed to add task. Please login again.");
    }
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
let selectedDateString = "";

async function initFullCalendar() {
    await refreshCalendarData();
}

async function refreshCalendarData() {
    const response = await fetch(API_URL);
    allTasksCache = await response.json();
    renderFullCalendar();
    
    if (selectedDateString) {
        const [year, month, day] = selectedDateString.split('-').map(Number);
        
        showDayDetails(day, month - 1, year); 
    }
}

function changeMonth(step) {
    currentCalDate.setMonth(currentCalDate.getMonth() + step);
    refreshCalendarData();
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

        const tasksForDay = allTasksCache.filter(t => t.scheduledDate === dateStr);

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

        // Click Event
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

async function addScheduledTask() {
    const input = document.getElementById('scheduledTaskInput');
    const title = input.value.trim();
    
    if (!title || !selectedDateString) return;

    await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            title: title, 
            scheduledDate: selectedDateString 
        }),
    });

    input.value = '';
    refreshCalendarData(); 
}

async function toggleTask(id, isCompleted) {
    await fetch(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted }),
    });

    if (document.getElementById('full-calendar-grid')) {
        refreshCalendarData(); 
    } else {
        fetchTasks(); 
    }
}

async function deleteTask(id) {
    
    if(!confirm("Are you sure you want to delete this?")) return;

    await fetch(`${API_URL}/${id}`, { method: 'DELETE' });

    if (document.getElementById('full-calendar-grid')) {

        refreshCalendarData(); 
    } else {

        fetchTasks();
    }
}

function closeDetails() {
    document.getElementById('day-details').style.display = 'none';
    selectedDateString = "";
}

// --- CUSTOM NOTIFICATION & MODAL LOGIC ---

let taskToDeleteId = null; 

function deleteTask(id) {
    taskToDeleteId = id;
    document.getElementById('confirm-modal').style.display = 'flex';
}

async function confirmDeleteAction() {
    if (!taskToDeleteId) return;

    await fetch(`${API_URL}/${taskToDeleteId}`, { method: 'DELETE' });

    closeModal();

    showToast("Task deleted successfully! 🗑️");

    const calendarGrid = document.getElementById('full-calendar-grid');

    if (calendarGrid) {
        
        refreshCalendarData(); 
        document.getElementById('day-details').style.display = 'none'; 
    } else {
        fetchTasks(); 
        
        const response = await fetch(API_URL);
        const tasks = await response.json();
        updateStats(tasks);
    }
}

function closeModal() {
    document.getElementById('confirm-modal').style.display = 'none';
    taskToDeleteId = null;
}

function showToast(message) {
    const container = document.getElementById('notification-container');
    
    const notif = document.createElement('div');
    notif.className = 'notification';
    notif.innerHTML = `<span>✨</span> ${message}`;

    container.appendChild(notif);

    setTimeout(() => {
        notif.style.opacity = '0';
        setTimeout(() => notif.remove(), 500);
    }, 3000);
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
    if (!selectedEmoji) return showToast("Please select an emoji first! 🌸");

    const noteInput = document.getElementById('moodNote');
    const note = noteInput.value;

    try {
        await fetch(`${API_URL.replace('/tasks', '/moods')}`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emoji: selectedEmoji, note }),
        });

        noteInput.value = '';
        selectedEmoji = "";
        document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
        
        showToast("Mood logged! ✨");

        await fetchMoods(); 

    } catch (error) {
        console.error(error);
        showToast("Error saving mood");
    }
}

async function fetchMoods() {
    const container = document.getElementById('mood-history');
    if(!container) return;

    try {
        const res = await fetch(`${API_URL.replace('/tasks', '/moods')}`);
        const moods = await res.json();
        
        container.innerHTML = '';
        
        moods.forEach(mood => {
            const date = new Date(mood.date).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'
            });

            const div = document.createElement('div');
            div.className = 'mood-card';
            
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

async function deleteMood(id) {
    if(!confirm("Remove this mood entry?")) return;
    
    await fetch(`${API_URL.replace('/tasks', '/moods')}/${id}`, { method: 'DELETE' });
    fetchMoods(); 
}

// --- MOOD DELETE LOGIC ---

let moodToDeleteId = null; 

function deleteMood(id) {
    moodToDeleteId = id;
    document.getElementById('confirm-modal').style.display = 'flex';
}

async function confirmDeleteMood() {
    if (!moodToDeleteId) return;

    await fetch(`${API_URL.replace('/tasks', '/moods')}/${moodToDeleteId}`, { 
        method: 'DELETE' 
    });

    closeModal();

    showToast("Mood entry removed! 🌸");

    fetchMoods();
}

function closeModal() {
    const modal = document.getElementById('confirm-modal');
    if (modal) modal.style.display = 'none';
    moodToDeleteId = null;
}

// --- SETTINGS LOGIC ---

function toggleDarkMode() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    
    if (body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }
}

function confirmDeleteAccount() {
    document.getElementById('confirm-modal').style.display = 'flex';
}

async function deleteAccount() {
    try {
        
        const token = localStorage.getItem('token');
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.sub;

        await fetch(`/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        localStorage.clear(); 
        window.location.href = '/index.html';
        
    } catch (error) {
        alert("Error deleting account. Please try again.");
    }
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = '/index.html';
}