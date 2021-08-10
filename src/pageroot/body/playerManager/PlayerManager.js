class PlayerManager extends HTMLDivElement {
    playlist;
    excludeset = new Set();
    currentPlayerMode;
    currentSongNo = 0;
    currentPlayerMode = 0;

    probabilities = null;
    currentCumulative = null;
    currentPermutation = null;
    currentFairShuffleIndex;

    rng = new LCG();

    get playerMode() {
        const mode = ['sequential', 'shuffle', 'fairshuffle']
        return mode;
    };

    constructor() {
        super();
    }

    connectedCallback() {
        window.addEventListener('load', () => {
            document.getElementById('uploadFilesButton').addEventListener('input', this.getFilesCallback.bind(this));
            document.getElementById('uploadProbsButton').addEventListener('input', this.getProbabilitiesCallback.bind(this));
            document.getElementById('modeSwitchButton').addEventListener('click', this.cycleModeCallback.bind(this));

            this.songListContainer = document.getElementById('songList');
            this.player = document.getElementById('player');
        });

        this.addEventListener('songSelectedEvent', this.songSelectedCallback.bind(this));
        this.addEventListener('songExcludedEvent', this.songExcludedCallback.bind(this));

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

        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('previoustrack', this.selectPreviousSong.bind(this));
            navigator.mediaSession.setActionHandler('nexttrack', this.selectNextSong.bind(this));
        }
    }

    sequentialNext() {
        this.currentSongNo = (this.currentSongNo + 1) % this.playlist.length;
    }

    sequentialPrevious() {
        this.currentSongNo = (this.currentSongNo - 1 + this.playlist.length) % this.playlist.length;
    }

    shuffleNext() {
        this.currentSongNo = Math.floor(this.rng.nextFloat() * this.playlist.length);
    }

    shufflePrevious() {
        this.currentSongNo = Math.floor(this.rng.previousFloat() * this.playlist.length);
    }

    fairshuffleNext() {
        this.currentFairShuffleIndex = (this.currentFairShuffleIndex + 1) % this.currentPermutation.length;
        this.currentSongNo = this.currentPermutation[this.currentFairShuffleIndex];
    }

    fairshufflePrevious() {
        this.currentFairShuffleIndex = (this.currentFairShuffleIndex - 1 + this.currentPermutation.length) % this.currentPermutation.length;
        this.currentSongNo = this.currentPermutation[this.currentFairShuffleIndex];
    }

    selectPreviousSong() {
        while (true) {
            switch (this.currentPlayerMode) {
                case 0:
                    this.sequentialPrevious();
                    break;
                case 1:
                    this.shufflePrevious();
                    break;
                case 2:
                    this.fairshufflePrevious();
                    break;
                default:
                    break;
            }

            let selectedSong = this.playlist[this.currentSongNo];

            if (this.excludeset.has(selectedSong))
                continue;

            this.playSong(selectedSong);
            break;
        }
    }

    selectNextSong() {
        while (true) {
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

            let selectedSong = this.playlist[this.currentSongNo];

            if (this.excludeset.has(selectedSong))
                continue;

            this.playSong(selectedSong);
            break;
        }
    }

    cycleModeCallback() {
        let button = document.getElementById('modeSwitchButton');
        button.classList.toggle(this.playerMode[this.currentPlayerMode]);
        this.currentPlayerMode = (this.currentPlayerMode + 1) % 3;
        button.classList.toggle(this.playerMode[this.currentPlayerMode]);
    }

    computeFairPermutation() {
        let valid = this.probabilities ?? false;

        if (valid) {
            this.currentFairShuffleIndex = 0;
            this.currentPermutation = [];

            let cumulative = 0;
            this.currentCumulative = this.probabilities.map(([title, score]) => {
                let cumulativeScore = cumulative + score;
                cumulative += score;

                return [title, cumulativeScore]
            });

            for (let remainingSongs = this.currentCumulative.length; remainingSongs > 0; remainingSongs--) {

                let cumulativeScore = this.currentCumulative[this.currentCumulative.length - 1][1];
                let randSongVal = Math.random() * cumulativeScore;

                let songIndex = this.currentCumulative.findIndex(([_, value]) => {
                    return value > randSongVal;
                });

                let songTitle = this.currentCumulative[songIndex][0];
                let songScore = this.currentCumulative[songIndex][1] - (songIndex > 0 ? this.currentCumulative[songIndex - 1][1] : 0);

                this.currentCumulative.splice(songIndex, 1);

                for (let i = songIndex; i < this.currentCumulative.length; i++) {
                    this.currentCumulative[i][1] -= songScore;
                }

                let matchSongTitle = (song) => {
                    return song.songTitle == songTitle;
                }

                let nextSongNo = this.playlist.findIndex(matchSongTitle);

                if (nextSongNo >= 0) {
                    this.currentPermutation.push(nextSongNo);
                } else {
                    continue;
                }
            }
        } else {
            console.error('No valid probabilities table');
        }
    }

    async getProbabilitiesCallback(event) {
        let probFile = event.target.files[0];
        Papa.parse(probFile, {
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
                this.probabilities = results.data;
                event.target.style.backgroundColor = 'lightgreen';
                this.computeFairPermutation();

                // for (let [title, _] of this.probabilities) {
                //     let matchSongTitle = (song) => {
                //         return song.songTitle == title;
                //     }
                //
                //     let nextSongNo = this.playlist.findIndex(matchSongTitle);
                //
                //     if (nextSongNo == -1) {
                //         console.warn(`Missing song: ${title}`)
                //     }
                // }
            }
        });
    }

    async songSelectedCallback(event) {
        this.currentSongNo = this.playlist.indexOf(event.detail.song);
        await this.playSong();
    }

    async songExcludedCallback(event) {
        let excludedSong = event.detail.song;
        if (this.excludeset.has(excludedSong)) {
            this.excludeset.delete(excludedSong);
        } else {
            this.excludeset.add(excludedSong);
        }

        window.localStorage.setItem('excludedSongs', JSON.stringify(Array.from(this.excludeset).map(song => { return `${song.songArtist} ${song.songTitle}` })));
    }

    async playSong(song = this.playlist[this.currentSongNo]) {
        await this.player.playSong(song);

        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song.songTitle,
                artist: song.songArtist,
                artwork: [
                    { src: this.player.playingSongImage.src, sizes: '256x256', type: 'image/*' },
                ]
            });
        }
    }

    async getFilesCallback(event) {
        let audioFiles = Array.from(event.target.files).filter(file => file.type.startsWith('audio'));
        let songsNo = audioFiles.length;
        let currentChunk = 0;
        this.playlist = [];

        do {
            let currentMax = currentChunk + 50;
            let audioFilesSlice = audioFiles.slice(currentChunk, currentMax + 1);

            let playlistSlice = await Promise.all(audioFilesSlice.map(
                async (audio) => {
                    let header = audio.slice(0, 10);

                    return header.arrayBuffer().then((buf) => {
                        let size = new DataView(buf).getUint32(6);
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
        } while (currentChunk < songsNo)

        let excludedSongs = JSON.parse(window.localStorage.getItem('excludedSongs'));

        [this.playlist, this.excludeset] = this.songListContainer.addSongs(this.playlist, excludedSongs);
    }
}

customElements.define("player-manager", PlayerManager, { extends: "div" });
