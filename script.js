// TaskFlow - Vanilla JavaScript Kanban Board
class TaskFlowApp {
    constructor() {
        this.lists = [];
        this.tasks = [];
        this.actionHistory = [];
        this.currentId = 1;
        this.draggedTask = null;
        this.currentModal = null;
        this.saveTimeout = null;

        this.init();
    }

    init() {
        this.loadFromStorage();
        this.setupEventListeners();
        this.render();
    }

    // Local Storage Management
    loadFromStorage() {
        const savedData = localStorage.getItem('taskflow-data');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                this.lists = data.lists || [];
                this.tasks = data.tasks || [];
                this.actionHistory = data.actionHistory || [];
                this.currentId = data.currentId || 1;
            } catch (error) {
                console.error('Failed to load data from storage:', error);
                this.initializeDefaultData();
            }
        } else {
            this.initializeDefaultData();
        }
    }

    saveToStorage() {
        const data = {
            lists: this.lists,
            tasks: this.tasks,
            actionHistory: this.actionHistory,
            currentId: this.currentId
        };
        localStorage.setItem('taskflow-data', JSON.stringify(data));
    }

    initializeDefaultData() {
        // Create default lists
        this.lists = [
            { id: 1, title: "To Do", position: 0 },
            { id: 2, title: "In Progress", position: 1 },
            { id: 3, title: "Done", position: 2 }
        ];

        // Create default tasks
        this.tasks = [
            {
                id: 1,
                title: "Design new landing page",
                description: "Create wireframes and mockups for the new homepage design",
                done: false,
                position: 0,
                listId: 1,
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                title: "Set up development environment",
                description: "Install necessary tools and configure workspace",
                done: false,
                position: 1,
                listId: 1,
                createdAt: new Date().toISOString()
            },
            {
                id: 3,
                title: "Implement drag and drop functionality",
                description: "Add HTML5 drag and drop API for task management",
                done: false,
                position: 0,
                listId: 2,
                createdAt: new Date().toISOString()
            },
            {
                id: 4,
                title: "Project planning and requirements",
                description: "Define project scope and technical requirements",
                done: true,
                position: 0,
                listId: 3,
                createdAt: new Date().toISOString()
            }
        ];

        this.currentId = 5;
        this.saveToStorage();
    }

    // Event Listeners
    setupEventListeners() {
        // Header buttons
        document.getElementById('undoBtn').addEventListener('click', () => this.undoLastAction());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportBoard());
        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
        document.getElementById('fileInput').addEventListener('change', (e) => this.importBoard(e));

        // Add list button
        document.getElementById('addListBtn').addEventListener('click', () => this.showAddListForm());

        // Modal events
        document.getElementById('modalCloseBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('taskModal').addEventListener('click', (e) => {
            if (e.target.id === 'taskModal') this.closeModal();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                this.undoLastAction();
            }
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });

        // Modal auto-save
        document.getElementById('modalTaskTitle').addEventListener('input', () => this.scheduleAutoSave());
        document.getElementById('modalTaskDescription').addEventListener('input', () => this.scheduleAutoSave());

        // Modal actions
        document.getElementById('toggleDoneBtn').addEventListener('click', () => this.toggleTaskDone());
        document.getElementById('deleteTaskBtn').addEventListener('click', () => this.deleteTaskFromModal());
    }

    // Rendering
    render() {
        this.renderBoard();
        this.updateUndoButton();
    }

    renderBoard() {
        const container = document.getElementById('boardContainer');
        container.innerHTML = '';

        this.lists
            .sort((a, b) => a.position - b.position)
            .forEach(list => {
                const listElement = this.createListElement(list);
                container.appendChild(listElement);
            });
    }

    createListElement(list) {
        const listTasks = this.tasks
            .filter(task => task.listId === list.id)
            .sort((a, b) => a.position - b.position);

        const listEl = document.createElement('div');
        listEl.className = 'task-list';
        listEl.innerHTML = `
            <div class="list-header">
                <input type="text" class="list-title" value="${list.title}" data-list-id="${list.id}">
                <button class="delete-list-btn" data-list-id="${list.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3,6 5,6 21,6"></polyline>
                        <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"></path>
                    </svg>
                </button>
            </div>
            <div class="task-container" data-list-id="${list.id}">
                ${listTasks.map(task => this.createTaskHTML(task)).join('')}
            </div>
            <div class="add-task-section">
                <button class="add-card-btn" data-list-id="${list.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add a card
                </button>
            </div>
        `;

        // Add event listeners
        this.setupListEventListeners(listEl, list);

        return listEl;
    }

    createTaskHTML(task) {
        const truncatedDescription = task.description && task.description.length > 100 
            ? task.description.substring(0, 100) + '...' 
            : task.description;

        return `
            <div class="task-card ${task.done ? 'done' : ''}" 
                 data-task-id="${task.id}" 
                 data-list-id="${task.listId}"
                 draggable="true">
                <div class="task-content">
                    <span class="task-title ${task.done ? 'done' : ''}">${task.title}</span>
                    ${task.done ? '<svg class="task-done-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"></polyline></svg>' : ''}
                </div>
                ${truncatedDescription ? `<p class="task-description">${truncatedDescription}</p>` : ''}
            </div>
        `;
    }

    setupListEventListeners(listEl, list) {
        // List title editing
        const titleInput = listEl.querySelector('.list-title');
        titleInput.addEventListener('focus', () => titleInput.classList.add('editing'));
        titleInput.addEventListener('blur', () => {
            titleInput.classList.remove('editing');
            this.updateListTitle(list.id, titleInput.value);
        });
        titleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') titleInput.blur();
            if (e.key === 'Escape') {
                titleInput.value = list.title;
                titleInput.blur();
            }
        });

        // Delete list
        listEl.querySelector('.delete-list-btn').addEventListener('click', () => {
            this.deleteList(list.id);
        });

        // Add task
        listEl.querySelector('.add-card-btn').addEventListener('click', (e) => {
            this.showAddTaskForm(e.target);
        });

        // Task interactions
        const taskContainer = listEl.querySelector('.task-container');
        
        // Drag and drop
        taskContainer.addEventListener('dragover', (e) => this.handleDragOver(e));
        taskContainer.addEventListener('dragenter', (e) => this.handleDragEnter(e));
        taskContainer.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        taskContainer.addEventListener('drop', (e) => this.handleDrop(e));

        // Task cards
        listEl.querySelectorAll('.task-card').forEach(taskCard => {
            taskCard.addEventListener('click', () => {
                const taskId = parseInt(taskCard.dataset.taskId);
                this.openTaskModal(taskId);
            });

            taskCard.addEventListener('dragstart', (e) => this.handleDragStart(e));
            taskCard.addEventListener('dragend', () => this.handleDragEnd());
        });
    }

    // List Management
    showAddListForm() {
        const container = document.getElementById('addListContainer');
        container.innerHTML = `
            <div class="add-list-form">
                <input type="text" class="add-list-input" placeholder="Enter list title..." autofocus>
                <div class="add-list-actions">
                    <button class="add-list-submit">Add List</button>
                    <button class="add-list-cancel">Cancel</button>
                </div>
            </div>
        `;

        const input = container.querySelector('.add-list-input');
        const submitBtn = container.querySelector('.add-list-submit');
        const cancelBtn = container.querySelector('.add-list-cancel');

        const handleSubmit = () => {
            const title = input.value.trim();
            if (title) {
                this.createList(title);
                this.hideAddListForm();
            }
        };

        const handleCancel = () => {
            this.hideAddListForm();
        };

        submitBtn.addEventListener('click', handleSubmit);
        cancelBtn.addEventListener('click', handleCancel);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') handleCancel();
        });
    }

    hideAddListForm() {
        const container = document.getElementById('addListContainer');
        container.innerHTML = `
            <button class="add-list-btn" id="addListBtn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add another list
            </button>
        `;
        document.getElementById('addListBtn').addEventListener('click', () => this.showAddListForm());
    }

    createList(title) {
        const list = {
            id: this.currentId++,
            title,
            position: this.lists.length
        };
        this.lists.push(list);
        this.addToHistory('addList', { list });
        this.saveToStorage();
        this.render();
        this.showToast('List created', 'New list has been added to your board.', 'success');
    }

    updateListTitle(listId, newTitle) {
        const list = this.lists.find(l => l.id === listId);
        if (list && list.title !== newTitle.trim() && newTitle.trim()) {
            const oldTitle = list.title;
            list.title = newTitle.trim();
            this.addToHistory('updateList', { listId, oldTitle, newTitle: list.title });
            this.saveToStorage();
            this.showToast('List updated', 'List title has been updated.', 'success');
        }
    }

    deleteList(listId) {
        const list = this.lists.find(l => l.id === listId);
        const listTasks = this.tasks.filter(t => t.listId === listId);
        
        if (listTasks.length > 0) {
            if (!confirm(`Delete "${list.title}" and all its tasks?`)) return;
        }

        this.lists = this.lists.filter(l => l.id !== listId);
        this.tasks = this.tasks.filter(t => t.listId !== listId);
        this.addToHistory('deleteList', { list, tasks: listTasks });
        this.saveToStorage();
        this.render();
        this.showToast('List deleted', 'List and all its tasks have been deleted.', 'success');
    }

    // Task Management
    showAddTaskForm(button) {
        const listId = parseInt(button.dataset.listId);
        const addSection = button.parentElement;
        
        addSection.innerHTML = `
            <input type="text" class="add-task-input" placeholder="Enter task title..." autofocus>
            <div class="add-task-actions">
                <button class="add-task-btn">Add Task</button>
                <button class="cancel-btn">Cancel</button>
            </div>
        `;

        const input = addSection.querySelector('.add-task-input');
        const submitBtn = addSection.querySelector('.add-task-btn');
        const cancelBtn = addSection.querySelector('.cancel-btn');

        const handleSubmit = () => {
            const title = input.value.trim();
            if (title) {
                this.createTask(title, listId);
                this.hideAddTaskForm(addSection, listId);
            }
        };

        const handleCancel = () => {
            this.hideAddTaskForm(addSection, listId);
        };

        submitBtn.addEventListener('click', handleSubmit);
        cancelBtn.addEventListener('click', handleCancel);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') handleCancel();
        });
    }

    hideAddTaskForm(addSection, listId) {
        addSection.innerHTML = `
            <button class="add-card-btn" data-list-id="${listId}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add a card
            </button>
        `;
        addSection.querySelector('.add-card-btn').addEventListener('click', (e) => {
            this.showAddTaskForm(e.target);
        });
    }

    createTask(title, listId) {
        const listTasks = this.tasks.filter(t => t.listId === listId);
        const task = {
            id: this.currentId++,
            title,
            description: '',
            done: false,
            position: listTasks.length,
            listId,
            createdAt: new Date().toISOString()
        };
        this.tasks.push(task);
        this.addToHistory('addTask', { task });
        this.saveToStorage();
        this.render();
        this.showToast('Task created', 'New task has been added to the list.', 'success');
    }

    updateTask(taskId, updates) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            const oldTask = { ...task };
            Object.assign(task, updates);
            this.addToHistory('updateTask', { taskId, oldTask, updates });
            this.saveToStorage();
            this.render();
        }
    }

    deleteTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.addToHistory('deleteTask', { task });
            this.saveToStorage();
            this.render();
            this.showToast('Task deleted', 'Task has been permanently deleted.', 'success');
        }
    }

    // Drag and Drop
    handleDragStart(e) {
        const taskId = parseInt(e.target.dataset.taskId);
        this.draggedTask = this.tasks.find(t => t.id === taskId);
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', '');
    }

    handleDragEnd() {
        document.querySelectorAll('.task-card').forEach(card => {
            card.classList.remove('dragging');
        });
        document.querySelectorAll('.task-container').forEach(container => {
            container.classList.remove('drag-over');
        });
        this.draggedTask = null;
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    handleDragEnter(e) {
        e.preventDefault();
        const targetListId = parseInt(e.currentTarget.dataset.listId);
        if (this.draggedTask && this.draggedTask.listId !== targetListId) {
            e.currentTarget.classList.add('drag-over');
        }
    }

    handleDragLeave(e) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            e.currentTarget.classList.remove('drag-over');
        }
    }

    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        const targetListId = parseInt(e.currentTarget.dataset.listId);
        
        if (this.draggedTask && this.draggedTask.listId !== targetListId) {
            const oldListId = this.draggedTask.listId;
            const oldPosition = this.draggedTask.position;
            
            // Update task
            this.draggedTask.listId = targetListId;
            this.draggedTask.position = this.tasks.filter(t => t.listId === targetListId).length;
            
            this.addToHistory('moveTask', {
                taskId: this.draggedTask.id,
                oldListId,
                newListId: targetListId,
                oldPosition,
                newPosition: this.draggedTask.position
            });
            
            this.saveToStorage();
            this.render();
            this.showToast('Task moved', 'Task has been moved to another list.', 'success');
        }
    }

    // Modal Management
    openTaskModal(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        const list = this.lists.find(l => l.id === task.listId);
        
        if (!task || !list) return;
        
        this.currentModal = task;
        
        document.getElementById('modalTaskTitle').value = task.title;
        document.getElementById('modalTaskDescription').value = task.description || '';
        document.getElementById('modalListTitle').textContent = list.title;
        
        const toggleBtn = document.getElementById('toggleDoneBtn');
        if (task.done) {
            toggleBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 7v6h6"></path>
                    <path d="m21 17-3-3-3 3"></path>
                    <path d="M21 7.9A9 9 0 0 0 12 3C7.5 3 4 6.5 4 12"></path>
                </svg>
                Mark Undone
            `;
            toggleBtn.className = 'action-btn done-btn undone';
        } else {
            toggleBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20,6 9,17 4,12"></polyline>
                </svg>
                Mark Done
            `;
            toggleBtn.className = 'action-btn done-btn';
        }
        
        document.getElementById('taskModal').style.display = 'flex';
    }

    closeModal() {
        document.getElementById('taskModal').style.display = 'none';
        this.currentModal = null;
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
    }

    scheduleAutoSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        document.getElementById('savingIndicator').style.display = 'block';
        
        this.saveTimeout = setTimeout(() => {
            this.saveModalChanges();
            document.getElementById('savingIndicator').style.display = 'none';
        }, 1000);
    }

    saveModalChanges() {
        if (!this.currentModal) return;
        
        const title = document.getElementById('modalTaskTitle').value.trim();
        const description = document.getElementById('modalTaskDescription').value.trim();
        
        if (title !== this.currentModal.title || description !== (this.currentModal.description || '')) {
            this.updateTask(this.currentModal.id, {
                title: title || this.currentModal.title,
                description
            });
            this.currentModal.title = title || this.currentModal.title;
            this.currentModal.description = description;
        }
    }

    toggleTaskDone() {
        if (!this.currentModal) return;
        
        this.updateTask(this.currentModal.id, { done: !this.currentModal.done });
        this.currentModal.done = !this.currentModal.done;
        
        const message = this.currentModal.done ? 'Task marked as done' : 'Task marked as undone';
        const description = `Task has been ${this.currentModal.done ? 'marked' : 'unmarked'} as completed.`;
        this.showToast(message, description, 'success');
        
        // Update button
        const toggleBtn = document.getElementById('toggleDoneBtn');
        if (this.currentModal.done) {
            toggleBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 7v6h6"></path>
                    <path d="m21 17-3-3-3 3"></path>
                    <path d="M21 7.9A9 9 0 0 0 12 3C7.5 3 4 6.5 4 12"></path>
                </svg>
                Mark Undone
            `;
            toggleBtn.className = 'action-btn done-btn undone';
        } else {
            toggleBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20,6 9,17 4,12"></polyline>
                </svg>
                Mark Done
            `;
            toggleBtn.className = 'action-btn done-btn';
        }
    }

    deleteTaskFromModal() {
        if (!this.currentModal) return;
        
        if (confirm('Are you sure you want to delete this task?')) {
            this.deleteTask(this.currentModal.id);
            this.closeModal();
        }
    }

    // History and Undo
    addToHistory(action, data) {
        this.actionHistory.push({
            id: Date.now().toString(),
            action,
            data,
            timestamp: Date.now()
        });
        
        // Keep only last 50 actions
        if (this.actionHistory.length > 50) {
            this.actionHistory = this.actionHistory.slice(-50);
        }
        
        this.updateUndoButton();
    }

    updateUndoButton() {
        const undoBtn = document.getElementById('undoBtn');
        undoBtn.disabled = this.actionHistory.length === 0;
    }

    undoLastAction() {
        if (this.actionHistory.length === 0) return;
        
        const lastAction = this.actionHistory.pop();
        
        try {
            switch (lastAction.action) {
                case 'addList':
                    this.lists = this.lists.filter(l => l.id !== lastAction.data.list.id);
                    break;
                case 'deleteList':
                    this.lists.push(lastAction.data.list);
                    this.tasks.push(...lastAction.data.tasks);
                    break;
                case 'addTask':
                    this.tasks = this.tasks.filter(t => t.id !== lastAction.data.task.id);
                    break;
                case 'deleteTask':
                    this.tasks.push(lastAction.data.task);
                    break;
                case 'updateTask':
                    const task = this.tasks.find(t => t.id === lastAction.data.taskId);
                    if (task) Object.assign(task, lastAction.data.oldTask);
                    break;
                case 'moveTask':
                    const movedTask = this.tasks.find(t => t.id === lastAction.data.taskId);
                    if (movedTask) {
                        movedTask.listId = lastAction.data.oldListId;
                        movedTask.position = lastAction.data.oldPosition;
                    }
                    break;
            }
            
            this.saveToStorage();
            this.render();
            this.showToast('Action undone', 'Last action has been undone.', 'success');
            
        } catch (error) {
            console.error('Failed to undo action:', error);
            this.showToast('Undo failed', 'Failed to undo the last action.', 'error');
        }
    }

    // Import/Export
    exportBoard() {
        const data = {
            lists: this.lists,
            tasks: this.tasks,
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `taskflow-board-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.showToast('Board exported', 'Your board data has been downloaded as JSON file.', 'success');
    }

    importBoard(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                if (importedData.lists && importedData.tasks && Array.isArray(importedData.lists) && Array.isArray(importedData.tasks)) {
                    if (confirm('This will replace your current board. Are you sure?')) {
                        this.lists = importedData.lists;
                        this.tasks = importedData.tasks;
                        this.actionHistory = [];
                        this.currentId = Math.max(...this.lists.map(l => l.id), ...this.tasks.map(t => t.id)) + 1;
                        this.saveToStorage();
                        this.render();
                        this.showToast('Board imported', 'Your board has been successfully imported.', 'success');
                    }
                } else {
                    throw new Error('Invalid file format');
                }
            } catch (error) {
                console.error('Import failed:', error);
                this.showToast('Import failed', 'Failed to import board. Please check the file format.', 'error');
            }
        };
        
        reader.onerror = () => {
            this.showToast('Import failed', 'Failed to read the file.', 'error');
        };
        
        reader.readAsText(file);
        event.target.value = '';
    }

    // Toast Notifications
    showToast(title, description, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-title">${title}</div>
            <div class="toast-description">${description}</div>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 4000);
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new TaskFlowApp();
});