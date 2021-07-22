class Player extends HTMLDivElement {
    playerTemplate = window.document.getElementById('playerTemplate');

    // currentSong is the Song object, while playingSong is the Audio node
    currentSong;

    playingSong;
    playingSongImage;
    playingSongArtist;
    playingSongTitle;

    constructor() {
        super();
    }

    connectedCallback() {
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.append(this.playerTemplate.content.cloneNode(true));

        window.addEventListener('load', () => {
            this.playingSong = document.getElementById('playingSong');
            this.playingSongImage = document.getElementById('playingSongImage');
            this.playingSongArtist = document.getElementById('playingSongArtist');
            this.playingSongTitle = document.getElementById('playingSongTitle');

            this.playingSong.addEventListener('ended',
                () => {
                    this.dispatchEvent(new Event('songEnded', { bubbles: true }))
                }
            );

            document.getElementById('previousTrackButton').addEventListener('click',
                (event) => {
                    event.stopPropagation();
                    this.dispatchEvent(new Event('previousTrack', { bubbles: true }));
                }
            );

            document.getElementById('nextTrackButton').addEventListener('click',
                (event) => {
                    event.stopPropagation();
                    this.dispatchEvent(new Event('nextTrack', { bubbles: true }));
                }
            );

        })

    }

    async playSong(song) {
        const filler = {
            TIT2: (titleData) => {
                this.playingSongTitle.innerText = titleData.Data;
            },

            TPE1: (artistData) => {
                this.playingSongArtist.innerText = artistData.Data;
            },

            APIC: (imageData) => {
                this.playingSongImage.src = URL.createObjectURL(imageData.Data);
                URL.revokeObjectURL(imageData.Data);
            }
        }

        if (song != this.currentSong) {
            for (let frame of Object.values(song.tag.Frames)) {
                if (frame.ID in filler) {
                    filler[frame.ID](frame);
                }
            }

            let trackURL = URL.createObjectURL(song.file);
            this.playingSong.src = trackURL;
            this.playingSong.play();

            this.currentSong = song;
            URL.revokeObjectURL(song.file);
        } else {
            this.playingSong.play();
        }
    }
}

customElements.define('player-panel', Player, { extends: 'div' });
