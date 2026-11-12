/**
 * The editor demo: mounts the editor with a sample song.
 *
 *   ?song=<name>   which song in demo/songs/ to open
 *   ?save=0        no save callback, so no Save button (like ukegeeks.org)
 *
 * The editor holds one song per page, so picking another song reloads the page.
 */
(async () => {
  const params = new URLSearchParams(location.search);
  const withSave = params.get('save') !== '0';

  const songs = await (await fetch('songs.json')).json();
  const current = songs.find((s) => s.name === params.get('song')) || songs.find((s) => s.name === 'space-oddity-bowie') || songs[0];
  const song = await (await fetch(`songs/${encodeURIComponent(current.file)}`)).text();

  // demo controls
  const picker = document.getElementById('demoSong');
  for (const s of songs) {
    picker.add(new Option(s.name, s.name, false, s === current));
  }
  const saveBox = document.getElementById('demoSave');
  saveBox.checked = withSave;
  const reload = () => {
    const next = new URLSearchParams({ song: picker.value });
    if (!saveBox.checked) next.set('save', '0');
    location.search = next.toString();
  };
  picker.addEventListener('change', reload);
  saveBox.addEventListener('change', reload);
  const log = document.getElementById('demoLog');

  // the editor
  const editor = ugsEditorPlus.songAmatic.mount(document.getElementById('songEditor'), {
    song,
    // the Ace extension's dist/ folder (the default is "ace/" next to ugsEditorPlus.min.js)
    aceUrl: 'vendor/ace/',
    save: withSave
      ? async (text) => {
        // a real host would write the file or post it to a server here
        await new Promise((resolve) => setTimeout(resolve, 600));
        console.log('[demo] save()', text);
        log.textContent = `save() got ${text.split('\n').length} lines at ${new Date().toLocaleTimeString()}`;
        return 'Saved (demo: nothing was written).';
      }
      : undefined,
    // a real host would mark the song as having unsaved changes here
    onChange: (text) => {
      log.textContent = `onChange() got ${text.split('\n').length} lines at ${new Date().toLocaleTimeString()}`;
    },
  });

  window.demoEditor = editor; // try demoEditor.getSong() or demoEditor.save() in the console
})();
