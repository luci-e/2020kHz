class Song extends HTMLDivElement {
  songTemplate = window.document.getElementById('songTemplate');
  file;
  tag;
  songTitle = 'NoTitle';
  songArtist = 'NoArtist';
  score = 0;
  attached = false;

  constructor() {
    super();
  }

  get artistTitle() {
    return `${this.songArtist} ${this.songTitle}`
  }

  connectedCallback() {
    if (this.attached) return;

    this.attached = true;
    this.attachShadow({
      mode: 'open'
    });
    this.shadowRoot.append(this.songTemplate.content.cloneNode(true));

    let songName = document.createElement("span")
    songName.slot = 'songName';
    songName.innerText = this.songTitle;
    this.appendChild(songName);


    let songArtist = document.createElement("span")
    songArtist.slot = 'songArtist';
    songArtist.innerText = this.songArtist;
    this.appendChild(songArtist);

    this.addEventListener('click', (event) => {
      event.stopPropagation();
      let sourceElement = event.srcElement.shadowRoot.activeElement.id ?? 'none';
      if (sourceElement == 'excludeSongButton') {
        this.dispatchEvent(new CustomEvent('songExcludedEvent', {
          bubbles: true,
          detail: {
            song: this
          }
        }));
      } else if (sourceElement == 'listenHistoryButton') {
        this.dispatchEvent(new CustomEvent('songListenedEvent', {
          bubbles: true,
          detail: {
            song: this
          }
        }));
      } else if (sourceElement == 'enqueueSongButton') {
        this.dispatchEvent(new CustomEvent('songEnqueuedEvent', {
          bubbles: true,
          detail: {
            song: this
          }
        }));
      } else {
        this.dispatchEvent(new CustomEvent('songSelectedEvent', {
          bubbles: true,
          detail: {
            song: this
          }
        }));
      }
    })
  }

  init() {
    const formatter = {
      TIT2: (titleData) => {
        this.songTitle = titleData.Data;
      },

      TPE1: (artistData) => {
        this.songArtist = artistData.Data;
      },

      NODATADEFAULT: (fileName) => {
        this.songTitle = fileName;
      }
    }

    for (let frame of Object.values(this.tag.Frames)) {
      if (frame.ID in formatter) {
        formatter[frame.ID](frame);
      }
    }

    if (!('TIT2' in this.tag.Frames)) {
      formatter['NODATADEFAULT'](this.file.name);
    }
  }

  toggleExclude(forceState = null) {
    if (forceState ?? true) {
      $(this.shadowRoot.getElementById('excludeSongButton')).toggleClass('included excluded');
    } else {
      if (forceState) {
        $(this.shadowRoot.getElementById('excludeSongButton')).addClass('included');
        $(this.shadowRoot.getElementById('excludeSongButton')).removeClass('excluded');
      } else {
        $(this.shadowRoot.getElementById('excludeSongButton')).addClass('excluded');
        $(this.shadowRoot.getElementById('excludeSongButton')).removeClass('included');
      }
    }
  }

  toggleListenHistory(forceState = null) {
    if (forceState ?? true) {
      $(this.shadowRoot.getElementById('listenHistoryButton')).toggleClass('toListen listened');
    } else {
      if (forceState) {
        $(this.shadowRoot.getElementById('listenHistoryButton')).addClass('toListen');
        $(this.shadowRoot.getElementById('listenHistoryButton')).removeClass('listened');
      } else {
        $(this.shadowRoot.getElementById('listenHistoryButton')).addClass('listened');
        $(this.shadowRoot.getElementById('listenHistoryButton')).removeClass('toListen');
      }
    }
  }


  toggleEnqueued(forceState = null) {
    if (forceState ?? true) {
      $(this.shadowRoot.getElementById('enqueueSongButton')).toggleClass('inQueue notQueued');
    } else {
      if (forceState) {
        $(this.shadowRoot.getElementById('enqueueSongButton')).addClass('inQueue');
        $(this.shadowRoot.getElementById('enqueueSongButton')).removeClass('notQueued');
      } else {
        $(this.shadowRoot.getElementById('enqueueSongButton')).addClass('notQueued');
        $(this.shadowRoot.getElementById('enqueueSongButton')).removeClass('inQueue');
      }
    }
  }
}

customElements.define('song-item', Song, {
  extends: "div"
});
