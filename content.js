const storage = JSON.parse(localStorage.getItem('ytMarkers')) || {};

// Helper function to format seconds into "mm:ss"
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

(function() {
    // ********** Marker Functionality (unchanged except for note-save event) **********
    let markers = [];
    
    function createTooltip(marker, currentTime) {
        // Create the main container for the note interface in the tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'ytp-marker-tooltip note-container';
    
        // Block mouse events that originate outside the note editor or toolbar.
        ['mousedown', 'mouseup', 'click', 'mouseenter', 'mouseover'].forEach(evt => {
            tooltip.addEventListener(evt, function(e) {
                if (!e.target.closest('.note-editor') && !e.target.closest('.note-toolbar')) {
                    e.stopPropagation();
                    e.preventDefault();
                }
            }, true);
        });
    
        // ----- Header / Top Bar -----
        const header = document.createElement('div');
        header.className = 'note-header';
        
        // Left: Display current video time.
        const timeSpan = document.createElement('span');
        timeSpan.className = 'note-time';
        timeSpan.textContent = formatTime(currentTime);
        
        // Right: Toolbar for text formatting.
        const toolbar = document.createElement('div');
        toolbar.className = 'note-toolbar';
        
        // Create a "Styles" button with dropdown.
        const stylesBtn = document.createElement('button');
        stylesBtn.className = 'note-btn note-styles';
        stylesBtn.textContent = 'Styles ▼';
        
        // Create Bold, Italic, List, and Code buttons.
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
        
        // Character count display.
        const charCount = document.createElement('span');
        charCount.className = 'note-char-count';
        charCount.textContent = storage[currentTime] ? storage[currentTime].length : '999';
        
        // Create dropdown for Styles.
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
        
        // Append formatting buttons and dropdown to toolbar.
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
    
        // ----- Note-Taking Editor (Contenteditable) -----
        const noteEditor = document.createElement('div');
        noteEditor.className = 'note-editor';
        noteEditor.setAttribute('contenteditable', 'true');
        noteEditor.setAttribute('spellcheck', 'false');
        noteEditor.style.outline = 'none';
        noteEditor.style.fontFamily = 'Arial, sans-serif';
        noteEditor.style.fontSize = '14px';
        if (storage[currentTime]) {
            noteEditor.innerHTML = storage[currentTime];
        }
        
        // Allow events inside noteEditor.
        ['mousedown', 'mouseup', 'click'].forEach(evt => {
            noteEditor.addEventListener(evt, function(e) {
                e.stopPropagation();
            }, false);
        });
    
        // Prevent key events from propagating to YouTube shortcuts.
        noteEditor.addEventListener('keydown', e => e.stopPropagation(), true);
        noteEditor.addEventListener('keyup', e => e.stopPropagation(), true);
        
        // Update character count on input.
        noteEditor.addEventListener('input', () => {
            charCount.textContent = noteEditor.innerText.length;
        });
        
        // ----- Toolbar Functionality -----
        boldBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.execCommand('bold', false, null);
            noteEditor.focus();
        });
        
        italicBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.execCommand('italic', false, null);
            noteEditor.focus();
        });
        
        listBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            noteEditor.focus();
            let sel = window.getSelection();
            if (sel.rangeCount === 0 || !sel.getRangeAt(0).commonAncestorContainer.closest('.note-editor')) {
                let range = document.createRange();
                range.selectNodeContents(noteEditor);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            }
            document.execCommand('insertUnorderedList', false, null);
            noteEditor.focus();
        });
        
        codeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            let sel = window.getSelection();
            if (sel && !sel.isCollapsed && sel.rangeCount > 0 && sel.getRangeAt(0).commonAncestorContainer.closest('.note-editor')) {
                let selectedText = sel.toString();
                document.execCommand('insertHTML', false, `<code>${selectedText}</code>`);
            } else {
                document.execCommand('insertHTML', false, '<p><code>&nbsp; let your = "name"; block for code</code></p>');
            }
            noteEditor.focus();
        });
        
        // Toggle dropdown on Styles button click.
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
        
        // Assemble header.
        header.appendChild(timeSpan);
        header.appendChild(toolbar);
    
        // ----- Action Buttons -----
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
        
        // Save note from tooltip: store to localStorage and add the view-mode note to savedNotes.
        saveBtn.addEventListener('click', () => {
            storage[currentTime] = noteEditor.innerHTML;
            localStorage.setItem('ytMarkers', JSON.stringify(storage));
            console.log('Note saved for time', currentTime);
            
            const savedNotesContainer = document.getElementById('savedNotes');
            if (savedNotesContainer && window.createNoteView) {
                const savedNote = window.createNoteView(noteEditor.innerHTML, formatTime(currentTime));
                // Prepend new note so the newest appears at the top.
                if (savedNotesContainer.firstChild) {
                    savedNotesContainer.insertBefore(savedNote, savedNotesContainer.firstChild);
                } else {
                    savedNotesContainer.appendChild(savedNote);
                }
            }
            tooltip.style.display = 'none';
            marker.classList.remove('active');
        });
        
        cancelBtn.addEventListener('click', () => {
            noteEditor.innerHTML = '';
            charCount.textContent = '0';
            console.log('Note cancelled for time', currentTime);
        });
        
        // ----- Assemble Tooltip -----
        tooltip.appendChild(header);
        tooltip.appendChild(noteEditor);
        tooltip.appendChild(actions);
        
        let isClicked = false;
        marker.addEventListener('click', (e) => {
            e.stopPropagation();
            isClicked = !isClicked;
            marker.classList.toggle('active', isClicked);
            if (isClicked) {
                tooltip.style.display = 'block';
                noteEditor.focus();
            }
        });
        
        document.addEventListener('click', (e) => {
            if (!marker.contains(e.target)) {
                isClicked = false;
                marker.classList.remove('active');
                tooltip.style.display = 'none';
            }
        });
        
        marker.addEventListener('mouseenter', () => {
            tooltip.style.display = 'block';
        });
        marker.addEventListener('mouseleave', () => {
            if (!isClicked) tooltip.style.display = 'none';
        });
        
        return tooltip;
    }
    
    
    function createMarker(currentTime) {
        const video = document.querySelector('video');
        const progressBar = document.querySelector('.ytp-progress-bar');
        
        const marker = document.createElement('div');
        marker.className = 'ytp-marker';
        marker.style.left = `calc(${(currentTime / video.duration) * 100}% - 1.5px)`;
        
        const tooltip = createTooltip(marker, currentTime);
        marker.appendChild(tooltip);
        
        markers.push({
            element: marker,
            time: currentTime
        });
        
        progressBar.appendChild(marker);
    }
    
    const markerButton = document.createElement('button');
    markerButton.className = 'ytp-button custom-marker-button';
    markerButton.title = 'Add timestamp marker';
    markerButton.innerHTML = `<svg viewBox="0 0 24 24"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>`;
    
    markerButton.addEventListener('click', () => {
        const video = document.querySelector('video');
        if (!video) return;
        createMarker(video.currentTime);
    });
    
    const addButtonToControls = () => {
        const controls = document.querySelector('.ytp-left-controls');
        if (controls && !controls.querySelector('.custom-marker-button')) {
            controls.appendChild(markerButton);
        } else if (!controls) {
            setTimeout(addButtonToControls, 500);
        }
    };
    
    addButtonToControls();
    setInterval(addButtonToControls, 1000);
})();

// ********** Injection for Custom UI Toolbar and Inline Note Creation **********
(function() {
    // Function to create a new inline editable note inserted into savedNotes.
    function createInlineEditableNote() {
       const noteContainer = document.createElement('div');
       // This inline-editing note should resemble the tooltip note-container;
       // we add the class "inline-editing" and later override width via CSS.
       noteContainer.className = 'note-container inline-editing';
       
       // Header with static time label.
       const header = document.createElement('div');
       header.className = 'note-header';
       const timeSpan = document.createElement('span');
       timeSpan.className = 'note-time';
       timeSpan.textContent = '6:14';
       header.appendChild(timeSpan);
       noteContainer.appendChild(header);
       
       // Editable note area.
       const editor = document.createElement('div');
       editor.className = 'note-editor';
       editor.setAttribute('contenteditable', 'true');
       noteContainer.appendChild(editor);
       
       // Action buttons: Cancel and Save.
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
       
       // Cancel removes the note.
       cancelBtn.addEventListener('click', () => {
           noteContainer.remove();
       });
       
       // Save converts the inline editable note into a view-mode note.
       saveBtn.addEventListener('click', () => {
           const content = editor.innerHTML.trim();
           if (content === '') {
               alert('Note cannot be empty');
               return;
           }
           const viewNote = window.createNoteView(content, timeSpan.textContent);
           // Prepend new note: replace inline editable note with view-mode note.
           noteContainer.parentNode.replaceChild(viewNote, noteContainer);
       });
       
       return noteContainer;
    }
    
    function injectUIToolbar() {
      const target = document.querySelector('.watch-active-metadata.style-scope.ytd-watch-flexy');
      if (!target) {
        return setTimeout(injectUIToolbar, 1000);
      }
      
      // Create custom toolbar container.
      const container = document.createElement('div');
      container.className = 'custom-ui-toolbar';
      
      container.innerHTML = `
        <button id="createNoteButton" class="main-button">Create a new note at 6:14</button>
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
      
      // Dropdown toggle handlers.
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
      
      // Inject the saved notes container immediately after the toolbar.
      const savedNotesContainer = document.createElement('div');
      savedNotesContainer.id = 'savedNotes';
      container.parentNode.insertBefore(savedNotesContainer, container.nextSibling);
      
      // When createNoteButton is clicked, insert a new inline editable note at the top.
      const createNoteButton = container.querySelector('#createNoteButton');
      createNoteButton.addEventListener('click', () => {
          const newEditableNote = createInlineEditableNote();
          if (savedNotesContainer.firstChild) {
              savedNotesContainer.insertBefore(newEditableNote, savedNotesContainer.firstChild);
          } else {
              savedNotesContainer.appendChild(newEditableNote);
          }
      });
      
      // Export createNoteView globally for reuse by marker tooltips.
      window.createNoteView = function(noteContent, noteTime) {
           const container = document.createElement('div');
           container.className = 'note-container';
           
           // Header with time label and Edit/Delete buttons.
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
           
           // Content section with heading, subheading and note body.
           const contentDiv = document.createElement('div');
           contentDiv.className = 'note-content';
           
           const headingEl = document.createElement('h3');
           headingEl.className = 'note-title';
           headingEl.textContent = '11. Day 11 – Beginner – The Blackjack Capstone Project';
           contentDiv.appendChild(headingEl);
           
           const subheadingEl = document.createElement('p');
           subheadingEl.className = 'note-subtitle';
           subheadingEl.textContent = '79. Blackjack Program Requirements and Game Rules';
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
