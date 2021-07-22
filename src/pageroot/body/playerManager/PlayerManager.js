class PlayerManager extends HTMLDivElement {
    playlist;
    currentPlayerMode;
    currentSongNo;

    probabilities = null;
    currentCumulative = null;

    get playerMode() {
        const mode = ['sequential', 'shuffle', 'fairshuffle']
        return mode;
    };

    constructor() {
        super();
        this.currentPlayerMode = 0;
    }

    connectedCallback() {
        window.addEventListener('load', () => {
            document.getElementById('uploadFilesButton').addEventListener('input', this.getFilesCallback.bind(this));
            document.getElementById('uploadProbsButton').addEventListener('input', this.getProbabilitiesCallback.bind(this));
            document.getElementById('modeSwitchButton').addEventListener('click', this.cycleModeCallback.bind(this));



            this.songListContainer = document.getElementById('songlist');
            this.player = document.getElementById('player');
        });

        this.addEventListener('songSelectedEvent', this.songSelectedCallback.bind(this));

        this.addEventListener('songEnded', (e) => {
            e.stopPropagation();
            this.selectNextSong();
        });

        this.addEventListener('previousTrack', (e) => {
            e.stopPropagation();
            this.selectPreviousSong();
        });

        this.addEventListener('nextTrack', (e) => {
            e.stopPropagation();
            this.selectNextSong();
        });
    }

    sequentialNext() {
        this.currentSongNo = (this.currentSongNo + 1) % this.playlist.length;
    }

    sequentialPrevious() {
        this.currentSongNo = (this.currentSongNo - 1 + this.playlist.length) % this.playlist.length;
    }

    shuffleNext() {
        this.currentSongNo = Math.floor(Math.random() * this.playlist.length);
    }

    fairshuffleNext() {
        let valid = this.probabilities ?? false;

        if (valid) {
            let cumulativeScore = this.currentCumulative[this.currentCumulative.length - 1][1];
            let randSongVal = Math.random() * cumulativeScore;

            let songIndex = this.currentCumulative.findIndex(([_, value]) => {
                return value > randSongVal;
            });

            let songTitle = this.currentCumulative[songIndex][0];
            let songScore = this.currentCumulative[songIndex][1] - (songIndex > 0 ? this.currentCumulative[songIndex - 1][1] : 0);

            let ugh = this.currentCumulative.map((el) => { return Array.from(el) });
//             console.log(ugh);

            this.currentCumulative.splice(songIndex, 1);

            for (let i = songIndex; i < this.currentCumulative.length; i++) {
                this.currentCumulative[i][1] -= songScore;
            }

            if (this.currentCumulative.length == 0) {
                this.computeCumulativeScore();
            }

//             console.log(randSongVal);
//             console.log(songIndex);
//             console.log(this.currentCumulative);
//             console.log(this.playlist);

            let matchSongTitle = (song) => {
                return song.songTitle == songTitle;
            }

            let nextSongNo = this.playlist.findIndex(matchSongTitle);

            if (nextSongNo >= 0) {
                this.currentSongNo = nextSongNo;
            } else {
                this.shuffleNext();
            }


        } else {
            this.shuffleNext();
        }
    }

    selectPreviousSong() {
        switch (this.currentPlayerMode) {
            case 0:
                this.sequentialPrevious();
                break;
            case 1:
                this.shuffleNext();
                break;
            case 2:
                this.fairshuffleNext();
                break;
            default:
                break;
        }

        this.player.playSong(this.playlist[this.currentSongNo]);
    }

    selectNextSong() {
        switch (this.currentPlayerMode) {
            case 0:
                this.sequentialNext();
                break;
            case 1:
                this.shuffleNext();
                break;
            case 2:
                this.fairshuffleNext();
                break;
            default:
                break;
        }

        this.player.playSong(this.playlist[this.currentSongNo]);
    }

    cycleModeCallback() {
        let button = document.getElementById('modeSwitchButton');
        button.classList.toggle(this.playerMode[this.currentPlayerMode]);
        this.currentPlayerMode = (this.currentPlayerMode + 1) % 3;
        button.classList.toggle(this.playerMode[this.currentPlayerMode]);
    }

    computeCumulativeScore() {
        let cumulative = 0;
        this.currentCumulative = this.probabilities.map(([title, score]) => {
            let cumulativeScore = cumulative + score;
            cumulative += score;

            return [title, cumulativeScore]
        });
    }

    async getProbabilitiesCallback(event) {
        let probFile = event.target.files[0];
        Papa.parse(probFile, {
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
                this.probabilities = results.data;
                this.computeCumulativeScore();

                for (let [title, _] of this.probabilities) {
                    let matchSongTitle = (song) => {
                        return song.songTitle == title;
                    }

                    let nextSongNo = this.playlist.findIndex(matchSongTitle);

                    if (nextSongNo == -1) {
                        console.warn(`Missing song: ${title}`)
                    }
                }
            }
        });
    }

    async songSelectedCallback(event) {
        this.currentSongNo = this.playlist.indexOf(event.detail.song);
        await this.player.playSong(event.detail.song);
    }

    async getFilesCallback(event) {
        let audioFiles = Array.from(event.target.files).filter(file => file.type.startsWith('audio'));
        let songsNo  = audioFiles.length;
        let currentChunk = 0;
        this.playlist = [];

        do{
            let currentMax = currentChunk + 50;
            let audioFilesSlice = audioFiles.slice(currentChunk, currentMax+1);

            let playlistSlice = await Promise.all(audioFilesSlice.map(
                async (audio) => {
                let header = audio.slice(0, 10);

                return header.arrayBuffer().then((buf) => {
                    let size = new DataView(buf).getUint32(6);
                    //return audio.slice(0, 1048576).arrayBuffer();
                    return audio.slice(0, size + 10).arrayBuffer();
                }).then((tagBuf) => {
                    let tag = ID3.Parse(tagBuf, false, 2);
                    let framesDict = {};

                    tag.Frames.forEach((frame, i) => {
                        framesDict[frame.ID] = frame;
                    });

                    tag.Frames = framesDict;
                    return { file: audio, tag: tag };
                });
                }
            )
            );

            this.playlist = this.playlist.concat(playlistSlice);

            currentChunk += 50;
        }while(currentChunk < songsNo )



        this.playlist = this.songListContainer.addSongs(this.playlist);

//         console.dir(this);
    }
}

customElements.define("player-manager", PlayerManager, { extends: "div" });
