// content.js
const storage = JSON.parse(localStorage.getItem('ytMarkers')) || {};

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function timeToSeconds(timeStr) {
  const parts = timeStr.split(':');
  return parts.length === 2
    ? parseInt(parts[0]) * 60 + parseInt(parts[1])
    : 0;
}

function updateAllNoteEditors(noteId, newTime, newContent) {
  storage[noteId] = { time: newTime, content: newContent };
  localStorage.setItem('ytMarkers', JSON.stringify(storage));

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

// Update the styles dropdown creation in createNoteEditor
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
      // Add additional quote formatting
      document.execCommand('formatBlock', false, block);
      document.execCommand('foreColor', false, '#64748b');
      document.execCommand('fontSize', false, '4');
    } 
    else if (text === 'Heading 4') {
      block = 'h4';
      // Add heading-specific formatting
      document.execCommand('formatBlock', false, block);
      document.execCommand('fontSize', false, '5');
      document.execCommand('foreColor', false, '#1e293b');
    } 
    else {
      // Reset to normal
      document.execCommand('formatBlock', false, 'p');
      document.execCommand('removeFormat');
    }

    stylesDropdown.style.display = 'none';
    noteEditor.focus();
  });
  
  stylesDropdown.appendChild(opt);
});

// Update the stylesBtn event listener to properly position dropdown
stylesBtn.addEventListener('click', e => {
  e.stopPropagation();
  const rect = stylesBtn.getBoundingClientRect();
  stylesDropdown.style.display = 
    stylesDropdown.style.display === 'none' ? 'block' : 'none';
  
  // Position dropdown relative to button
  stylesDropdown.style.left = '0';
  stylesDropdown.style.top = `${rect.height + 5}px`;
});





  // ——— Wire up formatting:
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
// In the createNoteEditor function, update the list button event listener:
  listBtn.addEventListener('click', e => {
    e.stopPropagation();
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    // Save current selection
    const range = selection.getRangeAt(0);
    
    // Execute list command
    document.execCommand('insertUnorderedList', false, null);

    // Restore selection and focus
    selection.removeAllRanges();
    selection.addRange(range);
    noteEditor.focus();
    
    // Force redraw for immediate visual feedback
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

// Update the noteEditor keydown handler in createNoteEditor
noteEditor.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const parentBlock = range.commonAncestorContainer.closest('blockquote, h4, p');
    
    // Check if we're in a formatted block
    if (parentBlock?.closest('blockquote, h4')) {
      e.preventDefault();
      
      // Create new paragraph after formatted block
      const formattedBlock = parentBlock.closest('blockquote, h4');
      const newParagraph = document.createElement('p');
      newParagraph.innerHTML = '<br>';
      
      // Insert after formatted block
      formattedBlock.parentNode.insertBefore(newParagraph, formattedBlock.nextSibling);
      
      // Move cursor
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
      if (storage[noteId]) noteEditor.innerHTML = storage[noteId].content;
      container.style.display = 'none';
    } else {
      if (storage[noteId]) noteEditor.innerHTML = storage[noteId].content;
      else container.remove();
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
    updateAllNoteEditors(noteId, time, newContent);

    if (container.classList.contains('inline-editing')) {
      const finalView = window.createNoteView(newContent, time, noteId);
      container.parentNode.replaceChild(finalView, container);
    }
    if (container.classList.contains('ytp-marker-tooltip')) {
      container.style.display = 'none';
      const savedNotes = document.getElementById('savedNotes');
      if (!savedNotes.querySelector(`[data-note-id="${noteId}"]`)) {
        savedNotes.appendChild(window.createNoteView(newContent, time, noteId));
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
function createMarkerForNote(noteId, time, initialContent) {
  const video = document.querySelector('video');
  if (!video) return;
  const progressBar = document.querySelector('.ytp-progress-bar');

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

  // Add the marker, then immediately simulate a click
  progressBar.appendChild(marker);
  marker.click();  // ← uses your marker’s own click logic to open the tooltip

  return marker;
}




// --------------------------------------------------------------------------
// Inject UI Toolbar & Inline Note Creation
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

    const savedNotesContainer = document.createElement('div');
    savedNotesContainer.id = 'savedNotes';
    container.parentNode.insertBefore(savedNotesContainer, container.nextSibling);

    document.getElementById('createNoteButton').addEventListener('click', () => {
      const video = document.querySelector('video');
      if (!video) return;
      const t = video.currentTime;
      const timeFormatted = formatTime(t);
      const noteId = Date.now().toString();
      const inline = createNoteEditor(noteId, timeFormatted, '', false);
      savedNotesContainer.insertBefore(inline, savedNotesContainer.firstChild);
      createMarkerForNote(noteId, timeFormatted, '');
    });

    // Final view (non-editable) uses .saved-note-container
    window.createNoteView = function(noteContent, noteTime, noteId) {
      const container = document.createElement('div');
      container.className = 'saved-note-container';
      container.dataset.noteId = noteId; // Always set the ID

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
        const currentData = storage[noteId] || { time: '00:00', content: '' };
        const editor = createNoteEditor(
          noteId, 
          currentData.time,  // Use storage time
          currentData.content,  // Use storage content
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
        const all = document.querySelectorAll(`[data-note-id="${noteId}"]`);
        all.forEach(el => el.remove());
        delete storage[noteId];
        localStorage.setItem('ytMarkers', JSON.stringify(storage));
      });
      actionsDiv.appendChild(deleteBtn);

      header.appendChild(actionsDiv);
      container.appendChild(header);

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
      bodyDiv.innerHTML = noteContent || '<br>'; 
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

// Modify the marker button click handler in the "Existing Marker Button" section
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
    const savedNote = window.createNoteView('', tf, noteId);
    savedNotesContainer.insertBefore(savedNote, savedNotesContainer.firstChild);
  }
  
  // Initialize empty entry in storage
  storage[noteId] = { time: tf, content: '' };
  localStorage.setItem('ytMarkers', JSON.stringify(storage));
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
// Initialize on Page Load
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () =>
  console.log('YouTube Progress Bar Tools initialized')
);
