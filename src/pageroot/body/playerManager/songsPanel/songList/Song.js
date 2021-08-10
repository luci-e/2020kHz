class Song extends HTMLDivElement {
    songTemplate = window.document.getElementById('songTemplate');
    file;
    tag;
    songTitle = 'NoTitle';
    songArtist = 'NoArtist';

    constructor() {
        super();
    }

    connectedCallback() {
        this.attachShadow({ mode: 'open' });
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
            let sourceElement = event.path[0];
            if (sourceElement.type == 'button') {
                this.dispatchEvent(new CustomEvent('songExcludedEvent', {
                    bubbles: true,
                    detail: {
                        song: this
                    }
                }));
                $(sourceElement).toggleClass('included excluded');
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

    exclude(){
        $(this.shadowRoot.getElementById('excludeSongButton')).toggleClass('included excluded');
    }
}

customElements.define('song-item', Song, { extends: "div" });