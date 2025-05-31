# YouTube Notes Extension

A powerful Chrome extension that allows you to take notes and create markers while watching YouTube videos. Perfect for students, researchers, and anyone who wants to keep track of important moments in videos.

## Features

- 📝 **Rich Text Editor**: Create and edit notes with formatting options including:
  - Bold, italic, and code formatting
  - Bullet points
  - Different text styles (Normal, Quote, Heading 4)
  - Character count

- ⏱️ **Timestamp Markers**: 
  - Add markers directly on the video progress bar
  - Click markers to view/edit associated notes
  - Hover over markers to preview notes

- 🎯 **Multiple Note Creation Methods**:
  - Create notes from the custom toolbar
  - Add markers using the video player controls
  - Edit existing notes at any time

- 💾 **Persistent Storage**:
  - Notes are automatically saved to local storage
  - Notes persist between browser sessions
  - Each note includes video title and timestamp

- 🎨 **User-Friendly Interface**:
  - Clean and intuitive design
  - Easy-to-use toolbar
  - Responsive note editor
  - Sort notes by most recent or oldest
  - Filter notes by all lectures or current lecture

## Installation

1. Clone this repository:
```bash
git clone [your-repository-url]
```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" in the top right corner

4. Click "Load unpacked" and select the extension directory

## Usage

1. Navigate to any YouTube video

2. You'll see a new toolbar below the video with options to:
   - Create new notes
   - Filter notes
   - Sort notes

3. To create a note:
   - Click the "Create a new note" button, or
   - Use the marker button in the video controls
   - The note will be created at the current video timestamp

4. To edit a note:
   - Click the edit (✏️) button on any saved note
   - Make your changes
   - Click "Save note" to update

5. To delete a note:
   - Click the delete (🗑️) button on any saved note

## Development

The extension is built using vanilla JavaScript and integrates with YouTube's interface. Key components include:

- `content.js`: Main extension logic
- Local storage for note persistence
- YouTube player API integration

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[Your chosen license]

## Support

If you encounter any issues or have suggestions, please open an issue in the repository.
