// content.js with improved JSON file storage implementation

// Initialize storage - we'll use a variable to hold the data until we sync with the file
let notesData = {};
let isDataLoaded = false;

// --------------------------------------------------------------------------
// File Storage Helpers
// --------------------------------------------------------------------------

// Function to get video endpoint (identifier) from current URL
function getVideoEndpoint() {
  const url = new URL(window.location.href);
  const videoId = url.searchParams.get('v');
  return videoId || url.pathname; // Fallback to pathname if no v parameter
}

// Function to get the video title
function getVideoTitle() {
  const titleEl = document.querySelector('h1.style-scope.ytd-watch-metadata yt-formatted-string');
  return titleEl?.textContent || 'Untitled';
}

// Save notes data to JSON file via background script
function saveNotesToFile() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: "saveNotes", 
      data: notesData
    }, response => {
      if (response && response.success) {
        console.log("Notes saved to file successfully");
        resolve(response);
      } else {
        console.error("Failed to save notes to file:", response?.error);
        reject(new Error(response?.error || "Unknown error saving notes"));
      }
    });
  });
}

// Load notes data from JSON file via background script
function loadNotesFromFile() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: "loadNotes"
    }, response => {
      if (response && response.success) {
        notesData = response.data || {};
        isDataLoaded = true;
        console.log("Notes loaded from file:", notesData);
        resolve(notesData);
      } else {
        console.error("Failed to load notes:", response?.error);
        notesData = {};
        isDataLoaded = true;
        resolve({});
      }
    });
  });
}

// Initialize storage when the extension loads
function initStorage() {
  loadNotesFromFile().then((data) => {
    console.log("Notes loaded from file", data);
    renderAllNotes();
  }).catch(err => {
    console.error("Error loading notes:", err);
    notesData = {};
    isDataLoaded = true;
  });
}

// --------------------------------------------------------------------------
// Note Management Functions
// --------------------------------------------------------------------------

// Format time for display
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Convert time string to seconds
function timeToSeconds(timeStr) {
  const parts = timeStr.split(':');
  return parts.length === 2
    ? parseInt(parts[0]) * 60 + parseInt(parts[1])
    : 0;
}

// Update note data and sync with JSON file
function updateNote(noteId, newTime, newContent) {
  const endpoint = getVideoEndpoint();
  
  // Initialize endpoint if it doesn't exist
  if (!notesData[endpoint]) {
    notesData[endpoint] = {
      title: getVideoTitle(),
      notes: {}
    };
  }
  
  // Update note data
  notesData[endpoint].notes[noteId] = { 
    time: newTime, 
    content: newContent 
  };
  
  // Save to file (with error handling)
  saveNotesToFile()
    .then(() => {
      // Update DOM elements
      updateAllNoteEditors(noteId, newTime, newContent);
    })
    .catch(err => {
      console.error("Error saving note:", err);
      // Still update the UI even if save fails
      updateAllNoteEditors(noteId, newTime, newContent);
    });
}

// Delete a note
function deleteNote(noteId) {
  const endpoint = getVideoEndpoint();
  
  if (notesData[endpoint] && notesData[endpoint].notes && notesData[endpoint].notes[noteId]) {
    delete notesData[endpoint].notes[noteId];
    
    saveNotesToFile()
      .then(() => {
        // Remove DOM elements
        const elements = document.querySelectorAll(`[data-note-id="${noteId}"]`);
        elements.forEach(el => el.remove());
      })
      .catch(err => {
        console.error("Error deleting note:", err);
        // Still remove from UI even if save fails
        const elements = document.querySelectorAll(`[data-note-id="${noteId}"]`);
        elements.forEach(el => el.remove());
      });
  }
}

// Update all note editors with the same ID
function updateAllNoteEditors(noteId, newTime, newContent) {
  // Force DOM refresh before querying elements
  requestAnimationFrame(() => {
    const elements = document.querySelectorAll(`[data-note-id="${noteId}"]`);
    
    elements.forEach(container => {
      const contentHolders = container.querySelectorAll('.note-editor, .note-body');
      contentHolders.forEach(el => {
        if (el.innerHTML !== newContent) el.innerHTML = newContent;
      });
      // Update all editor instances (including nested ones)
      const editors = container.querySelectorAll('.note-editor, .note-body');
      editors.forEach(editor => {
        if (editor.innerHTML !== newContent) {
          editor.innerHTML = newContent;
        }
      });

      // Force-update time displays
      const timeElements = container.querySelectorAll('.note-time');
      timeElements.forEach(el => {
        if (el.textContent !== newTime) el.textContent = newTime;
      });

      // Special case for contenteditable elements
      const activeEditor = container.querySelector('.note-editor[contenteditable="true"]');
      if (activeEditor && activeEditor.innerHTML !== newContent) {
        const selection = window.getSelection();
        const range = document.createRange();
        activeEditor.innerHTML = newContent;
        range.selectNodeContents(activeEditor);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    });
  });
}

// Render all notes for the current video
function renderAllNotes() {
  if (!isDataLoaded) {
    console.log("Notes data not loaded yet, waiting...");
    return;
  }
  
  const endpoint = getVideoEndpoint();
  const savedNotesContainer = document.getElementById('savedNotes');
  if (!savedNotesContainer) {
    console.log("No saved notes container found, creating one...");
    return;
  }
  
  // Clear existing notes
  savedNotesContainer.innerHTML = '';
  
  // If we have notes for this video, render them
  if (notesData[endpoint] && notesData[endpoint].notes) {
    const notes = notesData[endpoint].notes;
    
    // Sort notes by time (newest first)
    const sortedNoteIds = Object.keys(notes).sort((a, b) => {
      const timeA = timeToSeconds(notes[a].time);
      const timeB = timeToSeconds(notes[b].time);
      return timeB - timeA; // Newest first
    });
    
    console.log(`Rendering ${sortedNoteIds.length} notes for video ${endpoint}`);
    
    // Create markers for each note
    sortedNoteIds.forEach(noteId => {
      const note = notes[noteId];
      
      // Create a marker on the progress bar
      createMarkerForNote(noteId, note.time, note.content, false);
      
      // Create the note in the saved notes container
      const noteView = createNoteView(note.content, note.time, noteId);
      savedNotesContainer.appendChild(noteView);
    });
  } else {
    console.log(`No notes found for video ${endpoint}`);
  }
}

// Function to position all markers based on stored time values
function positionAllMarkers() {
  const video = document.querySelector('video');
  if (!video) return;
  
  const endpoint = getVideoEndpoint();
  if (!notesData[endpoint] || !notesData[endpoint].notes) return;
  
  const notes = notesData[endpoint].notes;
  const progressBar = document.querySelector('.ytp-progress-bar');
  if (!progressBar) return;
  
  // Find all markers and position them
  Object.keys(notes).forEach(noteId => {
    const marker = progressBar.querySelector(`[data-note-id="${noteId}"]`);
    if (marker) {
      const timeInSeconds = timeToSeconds(notes[noteId].time);
      marker.style.left = `calc(${(timeInSeconds / video.duration) * 100}% - 1.5px)`;
    } else {
      // Marker doesn't exist yet, create it
      createMarkerForNote(noteId, notes[noteId].time, notes[noteId].content, false);
    }
  });
}

// --------------------------------------------------------------------------
// Create Note Editor Component
// --------------------------------------------------------------------------
function createNoteEditor(noteId, time, content, isTooltip) {
  const container = document.createElement('div');
  container.dataset.noteId = noteId;

  if (isTooltip) {
    container.className = 'ytp-marker-tooltip note-container';
    container.style.display = 'block';
    container.addEventListener('click', e => e.stopPropagation());
    container.addEventListener('mousedown', e => e.stopPropagation());
  } else {
    container.className = 'note-container inline-editing';
  }

  // --- Header: Time label and toolbar ---
  const header = document.createElement('div');
  header.className = 'note-header';

  const timeSpan = document.createElement('span');
  timeSpan.className = 'note-time';
  timeSpan.textContent = time;

  const toolbar = document.createElement('div');
  toolbar.className = 'note-toolbar';

  const stylesBtn = document.createElement('button');
  stylesBtn.className = 'note-btn note-styles';
  stylesBtn.textContent = 'Styles ▼';

  const boldBtn = document.createElement('button');
  boldBtn.className = 'note-btn note-bold';
  boldBtn.textContent = 'B';

  const italicBtn = document.createElement('button');
  italicBtn.className = 'note-btn note-italic';
  italicBtn.textContent = 'I';

  const listBtn = document.createElement('button');
  listBtn.className = 'note-btn note-list';
  listBtn.textContent = '•';

  const codeBtn = document.createElement('button');
  codeBtn.className = 'note-btn note-code';
  codeBtn.textContent = '<>';

  const charCount = document.createElement('span');
  charCount.className = 'note-char-count';
  charCount.textContent = content.length;

  const stylesDropdown = document.createElement('div');
  stylesDropdown.className = 'note-styles-dropdown';
  stylesDropdown.style.display = 'none';

  ['Normal','Quote','Heading 4'].forEach(text => {
    const opt = document.createElement('div');
    opt.textContent = text;
    opt.style.padding = '8px 12px';
    opt.style.fontSize = '14px';
    opt.style.cursor = 'pointer';
    
    opt.addEventListener('click', e => {
      e.stopPropagation();
      let block = 'p';
      
      if (text === 'Quote') {
        block = 'blockquote';
        document.execCommand('formatBlock', false, block);
        document.execCommand('foreColor', false, '#64748b');
        document.execCommand('fontSize', false, '4');
      } 
      else if (text === 'Heading 4') {
        block = 'h4';
        document.execCommand('formatBlock', false, block);
        document.execCommand('fontSize', false, '5');
        document.execCommand('foreColor', false, '#1e293b');
      } 
      else {
        document.execCommand('formatBlock', false, 'p');
        document.execCommand('removeFormat');
      }

      stylesDropdown.style.display = 'none';
      noteEditor.focus();
    });
    
    stylesDropdown.appendChild(opt);
  });

  stylesBtn.addEventListener('click', e => {
    e.stopPropagation();
    const rect = stylesBtn.getBoundingClientRect();
    stylesDropdown.style.display = 
      stylesDropdown.style.display === 'none' ? 'block' : 'none';
    
    stylesDropdown.style.left = '0';
    stylesDropdown.style.top = `${rect.height + 5}px`;
  });

  boldBtn.addEventListener('click', e => {
    e.stopPropagation();
    document.execCommand('bold', false, null);
    noteEditor.focus();
  });

  italicBtn.addEventListener('click', e => {
    e.stopPropagation();
    document.execCommand('italic', false, null);
    noteEditor.focus();
  });

  listBtn.addEventListener('click', e => {
    e.stopPropagation();
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    
    document.execCommand('insertUnorderedList', false, null);

    selection.removeAllRanges();
    selection.addRange(range);
    noteEditor.focus();
    
    noteEditor.style.display = 'none';
    noteEditor.offsetHeight; // Trigger reflow
    noteEditor.style.display = 'block';
  });

  codeBtn.addEventListener('click', e => {
    e.stopPropagation();
    document.execCommand('formatBlock', false, 'pre');
    noteEditor.focus();
  });

  [stylesBtn, boldBtn, italicBtn, listBtn, codeBtn, charCount, stylesDropdown].forEach(el => {
    toolbar.appendChild(el);
  });

  header.appendChild(timeSpan);
  header.appendChild(toolbar);
  container.appendChild(header);

  // ——— Editor Area
  const noteEditor = document.createElement('div');
  noteEditor.className = 'note-editor';
  noteEditor.contentEditable = 'true';
  noteEditor.spellcheck = false;
  noteEditor.style.outline = 'none';
  noteEditor.innerHTML = content;
  container.appendChild(noteEditor);

  ['mousedown','mouseup','click'].forEach(evt => {
    noteEditor.addEventListener(evt, e => e.stopPropagation());
  });
  ['keydown','keyup'].forEach(evt => {
    noteEditor.addEventListener(evt, e => e.stopPropagation(), true);
  });
  noteEditor.addEventListener('input', () => {
    charCount.textContent = noteEditor.innerText.length;
  });

  noteEditor.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      const parentBlock = range.commonAncestorContainer.closest('blockquote, h4, p');
      
      if (parentBlock?.closest('blockquote, h4')) {
        e.preventDefault();
        
        const formattedBlock = parentBlock.closest('blockquote, h4');
        const newParagraph = document.createElement('p');
        newParagraph.innerHTML = '<br>';
        
        formattedBlock.parentNode.insertBefore(newParagraph, formattedBlock.nextSibling);
        
        const newRange = document.createRange();
        newRange.selectNodeContents(newParagraph);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    }
  });

  // ——— Actions
  const actions = document.createElement('div');
  actions.className = 'note-actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'note-btn note-cancel';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => {
    if (container.classList.contains('ytp-marker-tooltip')) {
      const endpoint = getVideoEndpoint();
      if (notesData[endpoint]?.notes?.[noteId]) {
        noteEditor.innerHTML = notesData[endpoint].notes[noteId].content;
      }
      container.style.display = 'none';
    } else {
      const endpoint = getVideoEndpoint();
      if (notesData[endpoint]?.notes?.[noteId]) {
        noteEditor.innerHTML = notesData[endpoint].notes[noteId].content;
      } else {
        container.remove();
      }
    }
  });

  const saveBtn = document.createElement('button');
  saveBtn.className = 'note-btn note-save';
  saveBtn.textContent = 'Save note';
  saveBtn.addEventListener('click', e => {
    e.stopPropagation();
    const newContent = noteEditor.innerHTML.trim();
    if (!newContent) {
      alert('Note cannot be empty');
      return;
    }

    // Save the note to our data structure and file
    updateNote(noteId, time, newContent);

    if (container.classList.contains('inline-editing')) {
      const finalView = createNoteView(newContent, time, noteId);
      container.parentNode.replaceChild(finalView, container);
    }
    if (container.classList.contains('ytp-marker-tooltip')) {
      container.style.display = 'none';
      const savedNotes = document.getElementById('savedNotes');
      if (!savedNotes.querySelector(`[data-note-id="${noteId}"]`)) {
        savedNotes.appendChild(createNoteView(newContent, time, noteId));
      }
    }
  });

  actions.appendChild(cancelBtn);
  actions.appendChild(saveBtn);
  container.appendChild(actions);

  return container;
}

// --------------------------------------------------------------------------
// Create Marker for Note (Tooltip Version)
// --------------------------------------------------------------------------
function createMarkerForNote(noteId, time, initialContent, shouldClick = true) {
  const video = document.querySelector('video');
  if (!video) return;
  const progressBar = document.querySelector('.ytp-progress-bar');
  if (!progressBar) return;

  // Check if marker already exists
  const existingMarker = progressBar.querySelector(`[data-note-id="${noteId}"]`);
  if (existingMarker) return existingMarker;

  // Create the marker
  const marker = document.createElement('div');
  marker.className = 'ytp-marker';
  marker.dataset.noteId = noteId;
  marker.style.left = `calc(${(timeToSeconds(time) / video.duration) * 100}% - 1.5px)`;

  // Create the tooltip
  const tooltip = createNoteEditor(noteId, time, initialContent, true);
  tooltip.style.position = 'absolute';
  tooltip.style.bottom = `${progressBar.clientHeight + 12}px`;
  tooltip.style.display = 'none';
  progressBar.appendChild(tooltip);

  // Reposition tooltip so it never goes off-screen
  function positionTooltip() {
    const barW = progressBar.clientWidth;
    const tipW = tooltip.offsetWidth;
    const center = marker.offsetLeft + marker.offsetWidth / 2;
    let left = center - tipW / 2;
    left = Math.max(0, Math.min(left, barW - tipW));
    tooltip.style.left = `${left}px`;
  }

  let isActive = false, hideTimer = null;
  function clearHide() { clearTimeout(hideTimer); hideTimer = null; }
  function scheduleHide() {
    clearHide();
    hideTimer = setTimeout(() => {
      if (!marker.matches(':hover') && !tooltip.matches(':hover') && !isActive) {
        tooltip.style.display = 'none';
      }
    }, 100);
  }

  // Click toggles pin
  marker.addEventListener('click', e => {
    e.stopPropagation();
    isActive = !isActive;
    if (isActive) {
      tooltip.style.display = 'block';
      tooltip.style.visibility = 'hidden';
      positionTooltip();
      tooltip.style.visibility = '';
      tooltip.querySelector('.note-editor').focus();
    } else {
      tooltip.style.display = 'none';
    }
  });

  // Hover shows
  marker.addEventListener('mouseenter', e => {
    e.stopPropagation();
    clearHide();
    tooltip.style.display = 'block';
    tooltip.style.visibility = 'hidden';
    positionTooltip();
    tooltip.style.visibility = '';
  });

  // Hide when leaving
  marker.addEventListener('mouseleave', scheduleHide);
  tooltip.addEventListener('mouseleave', scheduleHide);

  // Cancel hide on re-enter
  marker.addEventListener('mouseenter', clearHide);
  tooltip.addEventListener('mouseenter', clearHide);

  // Hide on outside click
  document.addEventListener('click', e => {
    if (!marker.contains(e.target) && !tooltip.contains(e.target)) {
      isActive = false;
      tooltip.style.display = 'none';
    }
  });

  // Add the marker, then simulate a click if requested
  progressBar.appendChild(marker);
  if (shouldClick) {
    marker.click();  // Open the tooltip
  }

  return marker;
}

// --------------------------------------------------------------------------
// Create Note View (Final View after saving)
// --------------------------------------------------------------------------
function createNoteView(noteContent, noteTime, noteId) {
  const container = document.createElement('div');
  container.className = 'saved-note-container';
  container.dataset.noteId = noteId;

  const header = document.createElement('div');
  header.className = 'note-header';

  const timeSpan = document.createElement('span');
  timeSpan.className = 'note-time';
  timeSpan.textContent = noteTime || '00:00';
  header.appendChild(timeSpan);

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'note-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'note-btn note-edit';
  editBtn.textContent = '✏️';
  editBtn.addEventListener('click', e => {
    e.stopPropagation();
    const endpoint = getVideoEndpoint();
    const noteData = notesData[endpoint]?.notes?.[noteId] || { time: noteTime, content: '' };
    const editor = createNoteEditor(
      noteId, 
      noteData.time,
      noteData.content,
      false
    );
    container.parentNode.replaceChild(editor, container);
  });
  actionsDiv.appendChild(editBtn);

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'note-btn note-delete';
  deleteBtn.textContent = '🗑️';
  deleteBtn.addEventListener('click', e => {
    e.stopPropagation();
    deleteNote(noteId);
  });
  actionsDiv.appendChild(deleteBtn);

  header.appendChild(actionsDiv);
  container.appendChild(header);

  const contentDiv = document.createElement('div');
  contentDiv.className = 'note-content';

  const endpoint = getVideoEndpoint();
  const videoTitle = notesData[endpoint]?.title || getVideoTitle();

  const headingEl = document.createElement('h3');
  headingEl.className = 'note-title';
  headingEl.textContent = videoTitle;
  contentDiv.appendChild(headingEl);

  const subheadingEl = document.createElement('p');
  subheadingEl.className = 'note-subtitle';
  contentDiv.appendChild(subheadingEl);

  const bodyDiv = document.createElement('div');
  bodyDiv.className = 'note-body';
  bodyDiv.innerHTML = noteContent || '<br>'; 
  contentDiv.appendChild(bodyDiv);

  container.appendChild(contentDiv);
  
  // Add click event to seek to timestamp
  container.addEventListener('click', (e) => {
    if (!e.target.closest('.note-btn')) {
      const video = document.querySelector('video');
      if (video) {
        video.currentTime = timeToSeconds(noteTime);
      }
    }
  });
  
  return container;
}

// --------------------------------------------------------------------------
// Inject UI Toolbar & Inline Note Creation
// --------------------------------------------------------------------------
function injectUIToolbar() {
  function createUI() {
    const target = document.querySelector('.watch-active-metadata.style-scope.ytd-watch-flexy');
    if (!target) return setTimeout(createUI, 1000);

    // Check if UI already exists
    if (document.querySelector('.custom-ui-toolbar')) {
      return;
    }

    const container = document.createElement('div');
    container.className = 'custom-ui-toolbar';
    container.innerHTML = `
      <button id="createNoteButton" class="main-button">Create a new note</button>
      <div class="dropdown">
        <button class="dropdown-toggle">All Lectures</button>
        <div class="dropdown-menu">
          <div class="dropdown-item">All Lectures</div>
          <div class="dropdown-item">Current Lecture</div>
        </div>
      </div>
      <div class="dropdown">
        <button class="dropdown-toggle">Sort by most recent</button>
        <div class="dropdown-menu">
          <div class="dropdown-item">Sort by most recent</div>
          <div class="dropdown-item">Sort by oldest</div>
        </div>
      </div>
    `;
    target.parentNode.insertBefore(container, target.nextSibling);

    container.querySelectorAll('.dropdown-toggle').forEach(toggle => {
      toggle.addEventListener('click', e => {
        e.stopPropagation();
        const menu = toggle.nextElementSibling;
        container.querySelectorAll('.dropdown-menu').forEach(m => {
          if (m !== menu) m.style.display = 'none';
        });
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
      });
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('.dropdown')) {
        container.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
      }
    });

    // Create saved notes container if it doesn't exist
    let savedNotesContainer = document.getElementById('savedNotes');
    if (!savedNotesContainer) {
      savedNotesContainer = document.createElement('div');
      savedNotesContainer.id = 'savedNotes';
      container.parentNode.insertBefore(savedNotesContainer, container.nextSibling);
    }

    // Add click handler for the create note button
    document.getElementById('createNoteButton').addEventListener('click', () => {
      const video = document.querySelector('video');
      if (!video) return;
      const t = video.currentTime;
      const timeFormatted = formatTime(t);
      const noteId = Date.now().toString();
      const inline = createNoteEditor(noteId, timeFormatted, '', false);
      savedNotesContainer.insertBefore(inline, savedNotesContainer.firstChild);
      createMarkerForNote(noteId, timeFormatted, '');
      
      // Initialize the note in our data structure
      updateNote(noteId, timeFormatted, '');
    });

    // Re-render all notes for the current video
    renderAllNotes();
  }

  createUI();
}

// --------------------------------------------------------------------------
// Marker Button in YouTube Controls
// --------------------------------------------------------------------------
function addMarkerButton() {
  const markerButton = document.createElement('button');
  markerButton.className = 'ytp-button custom-marker-button';
  markerButton.title = 'Add timestamp marker';
  markerButton.innerHTML = `<svg viewBox="0 0 24 24"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>`;

  markerButton.addEventListener('click', () => {
    const video = document.querySelector('video');
    if (!video) return;
    const t = video.currentTime;
    const tf = formatTime(t);
    const noteId = Date.now().toString();
    
    // Create the marker and tooltip
    createMarkerForNote(noteId, tf, '');
    
    // Immediately create and insert the saved note container
    const savedNotesContainer = document.getElementById('savedNotes');
    if (savedNotesContainer) {
      const savedNote = createNoteView('', tf, noteId);
      savedNotesContainer.insertBefore(savedNote, savedNotesContainer.firstChild);
    }
    
    // Initialize empty entry in storage
    updateNote(noteId, tf, '');
  });

  function addButtonToControls() {
    const controls = document.querySelector('.ytp-left-controls');
    if (controls && !controls.querySelector('.custom-marker-button')) {
      controls.appendChild(markerButton);
    } else if (!controls) {
      setTimeout(addButtonToControls, 500);
    }
  }

  addButtonToControls();
}
