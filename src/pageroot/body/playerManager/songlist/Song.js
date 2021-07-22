class Song extends HTMLDivElement {
    songTemplate = window.document.getElementById('songTemplate');
    file;
    tag;
    songTitle;

    constructor() {
        super();
    }

    connectedCallback() {
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.append(this.songTemplate.content.cloneNode(true));

        const formatter = {
            TIT2: (titleData) => {
                let songName = document.createElement("span")
                songName.slot = 'songName';
                songName.innerText = titleData.Data;
                this.songTitle = titleData.Data;
                this.appendChild(songName);
            },

            TPE1: (artistData) => {
                let songArtist = document.createElement("span")
                songArtist.slot = 'songArtist';
                songArtist.innerText = artistData.Data;
                this.appendChild(songArtist);
            },

            NODATADEFAULT: (fileName) => {
                let songName = document.createElement("span")
                songName.slot = 'songName';
                songName.innerText = fileName;
                this.songTitle = fileName;

                this.appendChild(songName);
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
}

customElements.define('song-item', Song, { extends: "div" });
