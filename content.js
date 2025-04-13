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

// Given a noteId, update all note editors (both inline and marker tooltip)
// with the new time and content.
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
// This function creates the interactive note editor element. It is used
// both for the inline (savedNotes) version and for the marker tooltip version.
// The 'isTooltip' flag indicates if the element is for a marker tooltip.
function createNoteEditor(noteId, time, content, isTooltip) {
  const container = document.createElement('div');
  container.dataset.noteId = noteId;
  if (isTooltip) {
    container.className = 'ytp-marker-tooltip note-container';
    container.style.display = 'block';
  } else {
    container.className = 'note-container inline-editing';
  }
  
  // Header with time and formatting toolbar
  const header = document.createElement('div');
  header.className = 'note-header';
  
  const timeSpan = document.createElement('span');
  timeSpan.className = 'note-time';
  timeSpan.textContent = time;
  
  // Toolbar with formatting buttons and a Styles dropdown
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
  
  // Contenteditable note editor
  const noteEditor = document.createElement('div');
  noteEditor.className = 'note-editor';
  noteEditor.setAttribute('contenteditable', 'true');
  noteEditor.setAttribute('spellcheck', 'false');
  noteEditor.style.outline = 'none';
  noteEditor.innerHTML = content;
  container.appendChild(noteEditor);
  
  // Prevent propagation of events (so YouTube shortcuts are not triggered)
  ['mousedown', 'mouseup', 'click'].forEach(evt => {
    noteEditor.addEventListener(evt, (e) => e.stopPropagation());
  });
  noteEditor.addEventListener('keydown', e => e.stopPropagation(), true);
  noteEditor.addEventListener('keyup', e => e.stopPropagation(), true);
  noteEditor.addEventListener('input', () => {
    charCount.textContent = noteEditor.innerText.length;
  });
  
  // Action buttons: Cancel and Save note.
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
  
  // Cancel: If the note already exists (in storage), revert changes; otherwise, remove editor.
  cancelBtn.addEventListener('click', () => {
    if (storage[noteId]) {
      noteEditor.innerHTML = storage[noteId].content;
    } else {
      container.remove();
    }
  });
  
  // Save: Validate non-empty content and update all editors sharing the same noteId.
  saveBtn.addEventListener('click', () => {
    const newContent = noteEditor.innerHTML.trim();
    if (newContent === "") {
      alert("Note cannot be empty");
      return;
    }
    updateAllNoteEditors(noteId, time, newContent);
  });
  
  return container;
}

// --------------------------------------------------------------------------
// Create Marker for Note
// --------------------------------------------------------------------------
function createMarkerForNote(noteId, time, initialContent) {
  const video = document.querySelector('video');
  if (!video) return;
  const progressBar = document.querySelector('.ytp-progress-bar');
  const marker = document.createElement('div');
  marker.className = 'ytp-marker';
  marker.dataset.noteId = noteId;
  // Position marker based on time (converted to seconds and expressed as a percentage)
  marker.style.left = `calc(${(timeToSeconds(time) / video.duration) * 100}% - 1.5px)`;
  
  // Create the tooltip interactive note editor attached to the marker.
  const tooltip = createNoteEditor(noteId, time, initialContent, true);
  marker.appendChild(tooltip);
  
  // Toggle the display of the tooltip on marker interactions.
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
// Custom UI Toolbar and Inline Note Creation (SavedNotes)
// --------------------------------------------------------------------------
(function injectUIToolbar() {
  function createUI() {
    const target = document.querySelector('.watch-active-metadata.style-scope.ytd-watch-flexy');
    if (!target) return setTimeout(createUI, 1000);
    
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
    
    // Saved notes container (for inline note editors)
    const savedNotesContainer = document.createElement('div');
    savedNotesContainer.id = 'savedNotes';
    container.parentNode.insertBefore(savedNotesContainer, container.nextSibling);
    
    // "Create a new note" button event
    const createNoteButton = container.querySelector('#createNoteButton');
    createNoteButton.addEventListener('click', () => {
      const video = document.querySelector('video');
      if (!video) return;
      const currentTimeSeconds = video.currentTime;
      const currentTimeFormatted = formatTime(currentTimeSeconds);
      const noteId = Date.now().toString(); // unique identifier
      
      // Create inline note editor and add to savedNotes
      const inlineNote = createNoteEditor(noteId, currentTimeFormatted, "", false);
      if (savedNotesContainer.firstChild) {
        savedNotesContainer.insertBefore(inlineNote, savedNotesContainer.firstChild);
      } else {
        savedNotesContainer.appendChild(inlineNote);
      }
      
      // Create corresponding marker with tooltip editor
      createMarkerForNote(noteId, currentTimeFormatted, "");
    });
  }
  
  createUI();
})();

// --------------------------------------------------------------------------
// Existing Marker Button on YouTube Controls
// --------------------------------------------------------------------------
(function() {
  const markerButton = document.createElement('button');
  markerButton.className = 'ytp-button custom-marker-button';
  markerButton.title = 'Add timestamp marker';
  markerButton.innerHTML = `<svg viewBox="0 0 24 24"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>`;
  
  markerButton.addEventListener('click', () => {
    const video = document.querySelector('video');
    if (!video) return;
    const currentTimeSeconds = video.currentTime;
    const currentTimeFormatted = formatTime(currentTimeSeconds);
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


// ********** Injection for Custom UI Toolbar and Inline Note Creation **********
(function() {
    // Creates an inline note editor (for the custom UI toolbar).
    function createInlineEditableNote() {
       const noteContainer = document.createElement('div');
       noteContainer.className = 'note-container inline-editing';
       
       // --- Header: Dynamic Time and Formatting Toolbar ---
       const header = document.createElement('div');
       header.className = 'note-header';
       
       const timeSpan = document.createElement('span');
       timeSpan.className = 'note-time';
       const video = document.querySelector('video');
       const currentTime = video ? video.currentTime : 0;
       timeSpan.textContent = formatTime(currentTime);
       header.appendChild(timeSpan);
       
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
       charCount.textContent = '0';
       
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
           editor.focus();
       });
       optionQuote.addEventListener('click', (e) => {
           e.stopPropagation();
           document.execCommand('formatBlock', false, 'blockquote');
           stylesDropdown.style.display = 'none';
           editor.focus();
       });
       optionHeading4.addEventListener('click', (e) => {
           e.stopPropagation();
           document.execCommand('formatBlock', false, 'h4');
           stylesDropdown.style.display = 'none';
           editor.focus();
       });
       
       header.appendChild(toolbar);
       noteContainer.appendChild(header);
       
       // --- Editable Note Area ---
       const editor = document.createElement('div');
       editor.className = 'note-editor';
       editor.setAttribute('contenteditable', 'true');
       editor.setAttribute('spellcheck', 'false');
       editor.style.outline = 'none';
       noteContainer.appendChild(editor);
       
       editor.addEventListener('keydown', e => e.stopPropagation(), true);
       editor.addEventListener('keyup', e => e.stopPropagation(), true);
       
       editor.addEventListener('input', () => {
           charCount.textContent = editor.innerText.length;
       });
       
       // --- Action Buttons ---
       const actionsDiv = document.createElement('div');
       actionsDiv.className = 'note-edit-actions';
       
       const cancelBtn = document.createElement('button');
       cancelBtn.className = 'note-btn note-cancel';
       cancelBtn.textContent = 'Cancel';
       
       const saveBtn = document.createElement('button');
       saveBtn.className = 'note-btn note-save';
       saveBtn.textContent = 'Save note';
       
       actionsDiv.appendChild(cancelBtn);
       actionsDiv.appendChild(saveBtn);
       noteContainer.appendChild(actionsDiv);
       
       cancelBtn.addEventListener('click', () => {
           noteContainer.remove();
       });
       
       return noteContainer;
    }
    
    function injectUIToolbar() {
      const target = document.querySelector('.watch-active-metadata.style-scope.ytd-watch-flexy');
      if (!target) {
        return setTimeout(injectUIToolbar, 1000);
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
      
      const savedNotesContainer = document.createElement('div');
      savedNotesContainer.id = 'savedNotes';
      container.parentNode.insertBefore(savedNotesContainer, container.nextSibling);
      
      const createNoteButton = container.querySelector('#createNoteButton');
      createNoteButton.addEventListener('click', () => {
          const video = document.querySelector('video');
          if (!video) return;
          const currentTime = video.currentTime;
          
          // Create a marker on the progress bar.
          const marker = document.createElement('div');
          marker.className = 'ytp-marker';
          marker.style.left = `calc(${(currentTime / video.duration) * 100}% - 1.5px)`;
          const progressBar = document.querySelector('.ytp-progress-bar');
          progressBar.appendChild(marker);
          
          // Create an inline editable note.
          const newEditableNote = createInlineEditableNote();
          const headerTime = newEditableNote.querySelector('.note-time');
          headerTime.textContent = formatTime(currentTime);
          
          // Link marker and note with a unique id.
          const uniqueId = Date.now();
          newEditableNote.dataset.noteId = uniqueId;
          marker.dataset.noteId = uniqueId;
          
          if (savedNotesContainer.firstChild) {
              savedNotesContainer.insertBefore(newEditableNote, savedNotesContainer.firstChild);
          } else {
              savedNotesContainer.appendChild(newEditableNote);
          }
          
          // On save, update storage, replace inline note with full view note,
          // and update the marker’s tooltip with a full note view.
          const saveButton = newEditableNote.querySelector('.note-save');
          saveButton.addEventListener('click', () => {
              const noteEditor = newEditableNote.querySelector('.note-editor');
              const noteContent = noteEditor.innerHTML.trim();
              if (noteContent === '') {
                  alert('Note cannot be empty');
                  return;
              }
              storage[headerTime.textContent] = noteContent;
              localStorage.setItem('ytMarkers', JSON.stringify(storage));
              
              // Create full note view for savedNotes.
              const viewNote = window.createNoteView(noteContent, headerTime.textContent);
              newEditableNote.parentNode.replaceChild(viewNote, newEditableNote);
              
              // Update the marker's tooltip to show the full note view.
              let tooltip = marker.querySelector('.ytp-marker-tooltip');
              if (!tooltip) {
                  tooltip = document.createElement('div');
                  tooltip.className = 'ytp-marker-tooltip note-container';
                  marker.appendChild(tooltip);
              }
              tooltip.innerHTML = '';
              tooltip.appendChild(window.createNoteView(noteContent, headerTime.textContent));
          });
      });
      
      // Global view note creation function.
      window.createNoteView = function(noteContent, noteTime) {
           const container = document.createElement('div');
           container.className = 'note-container';
           
           // Header with time and action buttons.
           const header = document.createElement('div');
           header.className = 'note-header';
           
           const timeSpan = document.createElement('span');
           timeSpan.className = 'note-time';
           timeSpan.textContent = noteTime || '3:05';
           header.appendChild(timeSpan);
           
           const actionsDiv = document.createElement('div');
           actionsDiv.className = 'note-actions';
           
           const editBtn = document.createElement('button');
           editBtn.className = 'note-btn note-edit';
           editBtn.innerHTML = '✏️';
           editBtn.addEventListener('click', (e) => {
               e.stopPropagation();
               const inlineNote = createInlineEditableNote();
               inlineNote.querySelector('.note-editor').innerHTML = noteContent;
               inlineNote.querySelector('.note-time').textContent = noteTime;
               container.parentNode.replaceChild(inlineNote, container);
           });
           actionsDiv.appendChild(editBtn);
           
           const deleteBtn = document.createElement('button');
           deleteBtn.className = 'note-btn note-delete';
           deleteBtn.innerHTML = '🗑️';
           deleteBtn.addEventListener('click', (e) => {
               e.stopPropagation();
               container.remove();
           });
           actionsDiv.appendChild(deleteBtn);
           
           header.appendChild(actionsDiv);
           container.appendChild(header);
           
           // Content section with note details.
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
    
    injectUIToolbar();
})();
