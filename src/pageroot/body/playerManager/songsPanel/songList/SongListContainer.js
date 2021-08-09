class SongListContainer extends ScrollableList {
    constructor() {
        super();
    }

    connectedCallback() {
        super.connectedCallback();
    }

    addSongs(playlist) {
        let songList = [];

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

        songList.forEach(song => this.appendChild(song));
        return songList;
    }
}

customElements.define("songlist-container", SongListContainer, { extends: "div" });
