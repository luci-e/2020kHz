class Player extends HTMLDivElement {
    playerTemplate = window.document.getElementById('playerTemplate');

    // currentSong is the Song object, while playingSong is the Audio node
    currentSong;

    playingSong;
    playingSongImage;
    playingSongArtist;
    playingSongTitle;

    turntable;
    movementInProgress = false;
    lastRadians;
    currentRadians = 0;

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
            this.turntable = this.shadowRoot.getElementById('turntable');

            this.playingSong.addEventListener('ended',
                () => {
                    this.dispatchEvent(new Event('songEnded', { bubbles: true }))
                }
            );

            this.playingSong.addEventListener('play',
                () => {
                    let playPauseButton = this.shadowRoot.getElementById('playPauseButton');
                    playPauseButton.classList.replace('playButton', 'pauseButton');
                }
            );

            this.playingSong.addEventListener('pause',
                () => {
                    let playPauseButton = this.shadowRoot.getElementById('playPauseButton');
                    playPauseButton.classList.replace('pauseButton', 'playButton');
                }
            );

            this.playingSong.addEventListener('timeupdate', this.updateTurntable.bind(this));

            this.shadowRoot.getElementById('historyButton').addEventListener('click',
                (event) => {
                    event.stopPropagation();
                    this.dispatchEvent(new Event('previousInHistory', { bubbles: true }));
                }
            );

            this.shadowRoot.getElementById('previousTrackButton').addEventListener('click',
                (event) => {
                    event.stopPropagation();
                    this.dispatchEvent(new Event('previousTrack', { bubbles: true }));
                }
            );

            this.shadowRoot.getElementById('nextTrackButton').addEventListener('click',
                (event) => {
                    event.stopPropagation();
                    this.dispatchEvent(new Event('nextTrack', { bubbles: true }));
                }
            );

            this.shadowRoot.getElementById('playPauseButton').addEventListener('click',
                (event) => {
                    event.stopPropagation();
                    if (this.playingSong.paused) {
                        this.playingSong.play();
                    } else {
                        this.playingSong.pause();
                    }
                }
            );

            this.turntable.addEventListener('mousedown', (event) => {
                event.preventDefault();
                this.movementInProgress = true;
                this.lastRadians = this.getPointerRadians(event);
                $(this.turntable).css('transition', 'transform 0s linear');
            });

            document.addEventListener('mouseup', () => {
                this.movementInProgress = false;
                $(this.turntable).css('transition', 'transform .2s linear');
            });

            this.turntable.addEventListener('touchstart', (event) => {
                event.preventDefault();
                this.movementInProgress = true;
                this.lastRadians = this.getPointerRadians(event);
                $(this.turntable).css('transition', 'transform 0s linear');
            });

            document.addEventListener('touchend', () => {
                this.movementInProgress = false;
                $(this.turntable).css('transition', 'transform .2s linear');
            });

            document.addEventListener('mousemove', this.pointerMovement.bind(this));
            document.addEventListener('touchmove', this.pointerMovement.bind(this));
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

    async updateTurntable(event) {
        let rotation = 2 * Math.PI * event.target.currentTime / event.target.duration;
        this.turntable.style.transform = `rotate(${rotation}rad)`;
    }

    getPointerRadians(event) {
        let img = $(this.turntable);
        let offset = img.offset();
        let center_x = (offset.left) + (img.width() / 2);
        let center_y = (offset.top) + (img.height() / 2);
        let pointer_x = 0;
        let pointer_y = 0;

        if(event instanceof TouchEvent){
            pointer_x = event.changedTouches[0].pageX;
            pointer_y = event.changedTouches[0].pageY;
        }else{
            pointer_x = event.pageX;
            pointer_y = event.pageY;
        }


        let radians = Math.atan2(center_y - pointer_y, pointer_x - center_x);

        radians = radians < 0 ? radians + 2 * Math.PI : radians;

        return radians;
    }

    async pointerMovement(event) {
        if (this.movementInProgress) {
            event.preventDefault();
            let img = $(this.turntable);
            let radians = this.getPointerRadians(event);

            this.currentRadians = this.currentRadians - (radians - this.lastRadians) + (2 * Math.PI);
            this.currentRadians %= (2 * Math.PI);
            this.lastRadians = radians;

            img.css('transform', `rotate(${this.currentRadians}rad)`);

            let newTime = this.currentRadians * this.playingSong.duration / (2 * Math.PI);
            this.playingSong.currentTime = newTime;

        }
    }

}

customElements.define('player-panel', Player, { extends: 'div' });
