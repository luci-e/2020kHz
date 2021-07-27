class SongListContainer extends ScrollableList {
    constructor() {
        super();
    }

    connectedCallback() {
        super.connectedCallback();
        this.addEventListener('click', this.songSelectedCallback.bind(this));
    }

    songSelectedCallback(event) {
        let song = event.target.closest('[is=song-item]') ?? false;

        if (song) {
            event.stopPropagation();

            this.dispatchEvent(new CustomEvent('songSelectedEvent', {
                bubbles: true,
                detail : {
                    song: song
                }
            }));
        }
    }

    addSongs(playlist) {
        let i = 0;
        let songList = [];

        for (let songObj of playlist) {

            let song = document.createElement("div", { is: 'song-item' });
            song.file = songObj.file;
            song.tag = songObj.tag;
            song.init();

            song.setAttribute('is', 'song-item');
            song.slot = "element";
            song.setAttribute(i % 2 == 0 ? "even" : "odd", '');

            songList.push(song);
            i++;
        }

        songList = songList.sort( (first, second) =>{
            let titleCompare = first.songArtist.localeCompare(second.songArtist);

            if (titleCompare == 0){
                return first.songTitle.localeCompare(second.songTitle);
            }
            
            return titleCompare;
        });

        //console.log(songList);

        songList.forEach( song => this.appendChild(song));
        return songList;
    }
}

customElements.define("songlist-container", SongListContainer, { extends: "div" });
