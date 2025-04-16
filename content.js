const storage = JSON.parse(localStorage.getItem('ytMarkers')) || {};

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

// Format seconds into "mm:ss"
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Convert a formatted time "mm:ss" back to seconds.
function timeToSeconds(timeStr) {
  const parts = timeStr.split(':');
  return parts.length === 2 ? parseInt(parts[0]) * 60 + parseInt(parts[1]) : 0;
}

// Update storage and all note editors (both inline and tooltip)
// that share the same noteId with the new time and content.
function updateAllNoteEditors(noteId, newTime, newContent) {
  storage[noteId] = { time: newTime, content: newContent };
  localStorage.setItem('ytMarkers', JSON.stringify(storage));
  const editors = document.querySelectorAll(`[data-note-id="${noteId}"]`);
  editors.forEach(container => {
    const noteEditor = container.querySelector('.note-editor');
    if (noteEditor) {
      noteEditor.innerHTML = newContent;
    }
    const timeSpan = container.querySelector('.note-time');
    if (timeSpan) {
      timeSpan.textContent = newTime;
    }
  });
}

// --------------------------------------------------------------------------
// Create Note Editor Component
// --------------------------------------------------------------------------
// This function creates an interactive note editor element.
// It is used for both the inline (savedNotes) and marker tooltip versions.
// The parameter 'isTooltip' indicates if the element is for a marker tooltip.
function createNoteEditor(noteId, time, content, isTooltip) {
  const container = document.createElement('div');
  container.dataset.noteId = noteId;
  
  if (isTooltip) {
    container.className = 'ytp-marker-tooltip note-container';
    container.style.display = 'block';
    // Prevent events in the tooltip from bubbling.
    container.addEventListener('click', e => e.stopPropagation());
    container.addEventListener('mousedown', e => e.stopPropagation());
  } else {
    container.className = 'note-container inline-editing';
  }
  
  // --- Header: Time label and formatting toolbar ---
  const header = document.createElement('div');
  header.className = 'note-header';
  
  const timeSpan = document.createElement('span');
  timeSpan.className = 'note-time';
  timeSpan.textContent = time;
  
  // Toolbar with formatting buttons and a Styles dropdown.
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
  
  const optionNormal = document.createElement('div');
  optionNormal.textContent = 'Normal';
  const optionQuote = document.createElement('div');
  optionQuote.textContent = 'Quote';
  const optionHeading4 = document.createElement('div');
  optionHeading4.textContent = 'Heading 4';
  
  stylesDropdown.appendChild(optionNormal);
  stylesDropdown.appendChild(optionQuote);
  stylesDropdown.appendChild(optionHeading4);
  
  toolbar.appendChild(stylesBtn);
  toolbar.appendChild(boldBtn);
  toolbar.appendChild(italicBtn);
  toolbar.appendChild(listBtn);
  toolbar.appendChild(codeBtn);
  toolbar.appendChild(charCount);
  toolbar.appendChild(stylesDropdown);
  
  // Prevent toolbar buttons from stealing focus.
  [stylesBtn, boldBtn, italicBtn, listBtn, codeBtn].forEach(btn => {
    btn.addEventListener('mousedown', e => e.preventDefault());
  });
  
  stylesBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    stylesDropdown.style.display = (stylesDropdown.style.display === 'none') ? 'block' : 'none';
  });
  
  optionNormal.addEventListener('click', (e) => {
    e.stopPropagation();
    document.execCommand('formatBlock', false, 'p');
    stylesDropdown.style.display = 'none';
    noteEditor.focus();
  });
  optionQuote.addEventListener('click', (e) => {
    e.stopPropagation();
    document.execCommand('formatBlock', false, 'blockquote');
    stylesDropdown.style.display = 'none';
    noteEditor.focus();
  });
  optionHeading4.addEventListener('click', (e) => {
    e.stopPropagation();
    document.execCommand('formatBlock', false, 'h4');
    stylesDropdown.style.display = 'none';
    noteEditor.focus();
  });
  
  header.appendChild(timeSpan);
  header.appendChild(toolbar);
  container.appendChild(header);
  
  // --- Note Editor (contenteditable) ---
  const noteEditor = document.createElement('div');
  noteEditor.className = 'note-editor';
  noteEditor.setAttribute('contenteditable', 'true');
  noteEditor.setAttribute('spellcheck', 'false');
  noteEditor.style.outline = 'none';
  noteEditor.innerHTML = content;
  container.appendChild(noteEditor);
  
  // Stop propagation of mouse and key events inside the editor.
  ['mousedown', 'mouseup', 'click'].forEach(evt => {
    noteEditor.addEventListener(evt, e => e.stopPropagation());
  });
  noteEditor.addEventListener('keydown', e => e.stopPropagation(), true);
  noteEditor.addEventListener('keyup', e => e.stopPropagation(), true);
  noteEditor.addEventListener('input', () => {
    charCount.textContent = noteEditor.innerText.length;
  });
  
  // --- Action Buttons: Cancel and Save note ---
  const actions = document.createElement('div');
  actions.className = 'note-actions';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'note-btn note-cancel';
  cancelBtn.textContent = 'Cancel';
  
  const saveBtn = document.createElement('button');
  saveBtn.className = 'note-btn note-save';
  saveBtn.textContent = 'Save note';
  
  actions.appendChild(cancelBtn);
  actions.appendChild(saveBtn);
  container.appendChild(actions);
  
  // Cancel: For tooltip, simply hide editor; for inline, revert or remove.
  cancelBtn.addEventListener('click', () => {
    if (container.classList.contains('ytp-marker-tooltip')) {
      // For tooltip, revert if saved content exists and then hide.
      if (storage[noteId]) {
        noteEditor.innerHTML = storage[noteId].content;
      }
      container.style.display = 'none';
    } else {
      // Inline: revert if note was saved; otherwise, remove the editor.
      if (storage[noteId]) {
        noteEditor.innerHTML = storage[noteId].content;
      } else {
        container.remove();
      }
    }
  });
  
  // Save: Validate content, update all editors, and handle view transformation.
  saveBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const newContent = noteEditor.innerHTML.trim();
    if (newContent === "") {
      alert("Note cannot be empty");
      return;
    }
    updateAllNoteEditors(noteId, time, newContent);
    
    // If this editor is inline (savedNotes), replace it with a final view note.
    if (container.classList.contains('inline-editing')) {
      const finalView = window.createNoteView(newContent, time, noteId);
      container.parentNode.replaceChild(finalView, container);
    }
    // If this editor is from a tooltip, hide the tooltip and ensure the note appears
    // in the savedNotes container.
    if (container.classList.contains('ytp-marker-tooltip')) {
      container.style.display = 'none';
      const savedNotesContainer = document.getElementById('savedNotes');
      let inlineNote = savedNotesContainer.querySelector(`[data-note-id="${noteId}"]`);
      if (!inlineNote) {
        const finalView = window.createNoteView(newContent, time, noteId);
        savedNotesContainer.appendChild(finalView);
      }
    }
  });
  
  return container;
}

// --------------------------------------------------------------------------
// Create Marker for Note (Tooltip Version)
// --------------------------------------------------------------------------
function createMarkerForNote(noteId, time, initialContent) {
  const video = document.querySelector('video');
  if (!video) return;
  const progressBar = document.querySelector('.ytp-progress-bar');
  const marker = document.createElement('div');
  marker.className = 'ytp-marker';
  marker.dataset.noteId = noteId;
  marker.style.left = `calc(${(timeToSeconds(time) / video.duration) * 100}% - 1.5px)`;
  
  // Create the tooltip editor attached to the marker.
  const tooltip = createNoteEditor(noteId, time, initialContent, true);
  marker.appendChild(tooltip);
  
  // Toggle tooltip display on marker interactions.
  let isActive = false;
  marker.addEventListener('click', (e) => {
    e.stopPropagation();
    isActive = !isActive;
    if (isActive) {
      tooltip.style.display = 'block';
      tooltip.querySelector('.note-editor').focus();
    } else {
      tooltip.style.display = 'none';
    }
  });
  marker.addEventListener('mouseenter', () => {
    tooltip.style.display = 'block';
  });
  marker.addEventListener('mouseleave', () => {
    if (!isActive) tooltip.style.display = 'none';
  });
  
  progressBar.appendChild(marker);
  return marker;
}

// --------------------------------------------------------------------------
// Inject Custom UI Toolbar & Inline Note Creation (Single Instance)
// --------------------------------------------------------------------------
(function injectUIToolbar() {
  function createUI() {
    const target = document.querySelector('.watch-active-metadata.style-scope.ytd-watch-flexy');
    if (!target) return setTimeout(createUI, 1000);
    
    const container = document.createElement('div');
    container.className = 'custom-ui-toolbar';
    
    // Only one toolbar instance is inserted.
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
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = toggle.nextElementSibling;
        container.querySelectorAll('.dropdown-menu').forEach(m => {
          if (m !== menu) m.style.display = 'none';
        });
        menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
      });
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.dropdown')) {
        container.querySelectorAll('.dropdown-menu').forEach(menu => {
          menu.style.display = 'none';
        });
      }
    });
    
    // SavedNotes container will hold the final view notes.
    const savedNotesContainer = document.createElement('div');
    savedNotesContainer.id = 'savedNotes';
    container.parentNode.insertBefore(savedNotesContainer, container.nextSibling);
    
    // "Create a new note" button event.
    const createNoteButton = container.querySelector('#createNoteButton');
    createNoteButton.addEventListener('click', () => {
      const video = document.querySelector('video');
      if (!video) return;
      const currentTime = video.currentTime;
      const currentTimeFormatted = formatTime(currentTime);
      const noteId = Date.now().toString(); // unique identifier
      
      // Create an inline note editor.
      const inlineNote = createNoteEditor(noteId, currentTimeFormatted, "", false);
      savedNotesContainer.insertBefore(inlineNote, savedNotesContainer.firstChild);
      
      // Create a corresponding marker with tooltip editor.
      createMarkerForNote(noteId, currentTimeFormatted, "");
    });
    
    // Global view note creation function for final (non-editable) note view.
    window.createNoteView = function(noteContent, noteTime, noteId) {
      const container = document.createElement('div');
      container.className = 'note-container';
      if (noteId) {
        container.dataset.noteId = noteId;
      }
      
      // Header with time and action buttons.
      const header = document.createElement('div');
      header.className = 'note-header';
      
      const timeSpan = document.createElement('span');
      timeSpan.className = 'note-time';
      timeSpan.textContent = noteTime || '00:00';
      header.appendChild(timeSpan);
      
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'note-actions';
      
      // Edit button: switch the view to an inline editable note.
      const editBtn = document.createElement('button');
      editBtn.className = 'note-btn note-edit';
      editBtn.innerHTML = '✏️';
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const inlineNoteEditor = createNoteEditor(noteId, noteTime, noteContent, false);
        container.parentNode.replaceChild(inlineNoteEditor, container);
      });
      actionsDiv.appendChild(editBtn);
      
      // Delete button: remove all note elements and markers with the same noteId.
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'note-btn note-delete';
      deleteBtn.innerHTML = '🗑️';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = container.dataset.noteId;
        if (id) {
          // Remove all elements (inline views, tooltips, etc.) with this noteId.
          const allElems = document.querySelectorAll(`[data-note-id="${id}"]`);
          allElems.forEach(el => el.remove());
          // Remove any markers with this noteId.
          const markers = document.querySelectorAll(`.ytp-marker[data-note-id="${id}"]`);
          markers.forEach(el => el.remove());
          // Remove from storage.
          delete storage[id];
          localStorage.setItem('ytMarkers', JSON.stringify(storage));
        }
      });
      actionsDiv.appendChild(deleteBtn);
      
      header.appendChild(actionsDiv);
      container.appendChild(header);
      
      // Content section.
      const contentDiv = document.createElement('div');
      contentDiv.className = 'note-content';
      
      const headingEl = document.createElement('h3');
      headingEl.className = 'note-title';
      headingEl.textContent = 'Lecture Title';
      contentDiv.appendChild(headingEl);
      
      const subheadingEl = document.createElement('p');
      subheadingEl.className = 'note-subtitle';
      subheadingEl.textContent = 'Subheading details';
      contentDiv.appendChild(subheadingEl);
      
      const bodyDiv = document.createElement('div');
      bodyDiv.className = 'note-body';
      bodyDiv.innerHTML = noteContent;
      contentDiv.appendChild(bodyDiv);
      
      container.appendChild(contentDiv);
      return container;
    };
  }
  
  createUI();
})();

// --------------------------------------------------------------------------
// Existing Marker Button in YouTube Controls
// --------------------------------------------------------------------------
(function() {
  const markerButton = document.createElement('button');
  markerButton.className = 'ytp-button custom-marker-button';
  markerButton.title = 'Add timestamp marker';
  markerButton.innerHTML = `<svg viewBox="0 0 24 24"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>`;
  
  markerButton.addEventListener('click', () => {
    const video = document.querySelector('video');
    if (!video) return;
    const currentTime = video.currentTime;
    const currentTimeFormatted = formatTime(currentTime);
    const noteId = Date.now().toString();
    createMarkerForNote(noteId, currentTimeFormatted, "");
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
  setInterval(addButtonToControls, 1000);
})();

// --------------------------------------------------------------------------
// Initialize Extension on Page Load
// --------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", function() {
  console.log("YouTube Progress Bar Tools initialized");
});
