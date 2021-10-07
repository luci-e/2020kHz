class SongListContainer extends ScrollableList {
    constructor() {
        super();
    }

    connectedCallback() {
        super.connectedCallback();
    }

    addSongs(playlist, excludelist = null, listenedlist = null) {
        let songList = [];
        let history = [];
        let excludeSet = new Set();

        for (let songObj of playlist) {
            let song = document.createElement("div", { is: 'song-item' });
            song.file = songObj.file;
            song.tag = songObj.tag;
            song.init();

            song.setAttribute('is', 'song-item');
            song.slot = "element";

            songList.push(song);
        }

        songList = songList.sort((first, second) => {
            let artistCompare = first.songArtist.localeCompare(second.songArtist);

            if (artistCompare == 0) {
                return first.songTitle.localeCompare(second.songTitle);
            }

            return artistCompare;
        });

        songList.forEach(song => {
            this.appendChild(song);
            let songId = song.artistTitle;
            if (excludelist ?.indexOf(songId) >= 0) {
                excludeSet.add(song);
                song.exclude();
            }

            if (listenedlist ?.indexOf(songId) >= 0) {
                song.toggleListenHistory();
                history.push(song);
            }
        });

        return [songList, excludeSet, history];
    }
}

customElements.define("songlist-container", SongListContainer, { extends: "div" });
