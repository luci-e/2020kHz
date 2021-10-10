class PlayerManager extends HTMLDivElement {
  playlist;
  excludeset = new Set();
  currentPlayerMode;
  currentSongNo = 0;
  currentPlayerMode = 0;
  playingSong = null;

  probabilities = null;
  currentCumulative = null;
  currentPermutation = null;
  currentFairShuffleIndex;

  history = new Array();
  historyIndex = 0;
  historySurfTimer;

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
      document.getElementById('sortButton').addEventListener('click', this.toggleSortingMenu.bind(this));
      document.querySelectorAll('.sortingButton').forEach(item => {
        item.addEventListener('click', this.sortSongsCallback.bind(this));
      })

      // TODO OH GOD REMOVE
      $('#clearHistoryButton').click(this.clearHistory.bind(this));

      this.songListContainer = document.getElementById('songList');
      this.player = document.getElementById('player');
    });

    this.addEventListener('songSelectedEvent', this.songSelectedCallback.bind(this));
    this.addEventListener('songExcludedEvent', this.songExcludedCallback.bind(this));
    this.addEventListener('songListenedEvent', this.songListenedCallback.bind(this));

    this.addEventListener('songEnded', (e) => {
      e.stopPropagation();
      this.selectNextSong();
    });

    this.addEventListener('previousInHistory', async (e) => {
      e.stopPropagation();
      this.selectPreviousInHistorySong();
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

  getSongIndex(songArtistTitle) {
    let songIndex = this.playlist.findIndex((song) => {
      return `${song.songArtist} ${song.songTitle}` == songArtistTitle;
    });

    if (songIndex >= 0) {
      return songIndex;
    }

    return
  }

  selectPreviousInHistorySong() {
    if (this.historyIndex > 0) {
      this.historyIndex -= 1;
      this.currentSongNo = getSongIndex(this.history[this.historyIndex]);
      this.playSong();
    } else {
      console.log('No history left');
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
    this.currentSongNo = this.getSongIndex(this.currentPermutation[this.currentFairShuffleIndex].artistTitle);
  }

  fairshufflePrevious() {
    this.currentFairShuffleIndex = (this.currentFairShuffleIndex - 1 + this.currentPermutation.length) % this.currentPermutation.length;
    this.currentSongNo = this.getSongIndex(this.currentPermutation[this.currentFairShuffleIndex].artistTitle);
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

      if (this.history.indexOf(this.currentSongNo) >= 0)
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

        let nextSong = this.playlist.find(matchSongTitle);
        nextSong.score = songScore;

        if (nextSong) {
          this.currentPermutation.push(nextSong);
        } else {
          continue;
        }

      }
    } else {
      console.error('No valid probabilities table');
    }
  }

  getProbabilitiesCallback(event) {
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

  clearHistory() {
    for (let s of this.history) {
      s.toggleListenHistory();
    }

    this.history = [];
    this.historyIndex = 0;

    window.localStorage.setItem('listenHistory', JSON.stringify([]));
  }

  addSongToHistory(song, remove = false) {
    if (this.history.length > 0 && this.historyIndex != this.history.length - 1) {
      this.history.splice(this.historyIndex, 1);
    }

    let duplicate = this.history.indexOf(song);

    if (duplicate >= 0) {
      this.history.splice(duplicate, 1);
    } else {
      song.toggleListenHistory();
    }

    if (!remove) {
      this.history.push(song);
    }

    window.localStorage.setItem('listenHistory', JSON.stringify(this.history.map(s => s.artistTitle)));

    this.historyIndex = this.history.length - 1;
  }

  songListenedCallback(event) {
    this.addSongToHistory(event.detail.song, true);
  }

  songSelectedCallback(event) {
    this.currentSongNo = this.playlist.indexOf(event.detail.song);
    this.playSong();
  }

  songExcludedCallback(event) {
    let excludedSong = event.detail.song;
    if (this.excludeset.has(excludedSong)) {
      this.excludeset.delete(excludedSong);
    } else {
      this.excludeset.add(excludedSong);
    }

    excludedSong.toggleExclude();

    window.localStorage.setItem('excludedSongs', JSON.stringify(Array.from(this.excludeset).map(song => {
      return `${song.songArtist} ${song.songTitle}`
    })));
  }

  playSong(song = this.playlist[this.currentSongNo]) {
    this.player.playSong(song);

    clearTimeout(this.historySurfTimer);

    this.historySurfTimer = setTimeout(() => {
      this.addSongToHistory(song);
    }, 1 * 1000);

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.songTitle,
        artist: song.songArtist,
        artwork: [{
          src: this.player.playingSongImage.src,
          sizes: '256x256',
          type: 'image/*'
        }, ]
      });
    }
  }

  async getFilesCallback(event) {
    document.getElementById('uploadFilesButton').classList.replace('fileUploadComplete', 'fileUploadInProgress');

    let audioFiles = Array.from(event.target.files).filter(file => file.type.startsWith('audio'));
    let songsNo = audioFiles.length;
    let currentChunk = 0;
    this.playlist = [];

    do {
      let currentMax = currentChunk + 50;
      let audioFilesSlice = audioFiles.slice(currentChunk, currentMax);

      let playlistSlice = await Promise.all(audioFilesSlice.map(
        async (audio) => {
          let header = audio.slice(0, 10);

          return header.arrayBuffer().then((buf) => {
            let size = new DataView(buf).getUint32(6);
            return audio.slice(0, size + 10).arrayBuffer();
          }).then((tagBuf) => {
            let tag = ID3.Parse(tagBuf, false, 2);
            let framesDict = {};

            tag.Frames.forEach((frame, _) => {
              framesDict[frame.ID] = frame;
            });

            tag.Frames = framesDict;
            return {
              file: audio,
              tag: tag
            };
          });
        }
      ));

      this.playlist = this.playlist.concat(playlistSlice);

      currentChunk += 50;
    } while (currentChunk < songsNo)

    let excludedSongs = JSON.parse(window.localStorage.getItem('excludedSongs'));
    let listenedSongs = JSON.parse(window.localStorage.getItem('listenHistory'));

    [this.playlist, this.excludeset, this.history] = this.songListContainer.addSongs(this.playlist, excludedSongs, listenedSongs);

    this.historyIndex = Math.max(this.history.length - 1, 0);

    this.sortSongs('sortByArtistAscending');

    document.getElementById('uploadFilesButton').classList.replace('fileUploadInProgress', 'fileUploadComplete');
  }

  toggleSortingMenu(pressEvent) {
    pressEvent.preventDefault();
    let menu = $('#sortingMenu');

    let w = menu.width();
    let h = menu.height();

    let clientX = pressEvent.clientX;
    let clientY = pressEvent.clientY;

    let offsetX = (window.innerWidth < (clientX + w + 10)) ? (-w - 10) : 10;
    let offsetY = (window.innerHeight < (clientY + h + 10)) ? (-h - 10) : 10;

    menu.toggle();
    menu.offset({
      left: clientX + offsetX,
      top: clientY + offsetY
    });
  }

  sortSongs(optionName) {
    const sortChildren = (
      container,
      childSelector,
      sortingFunction
    ) => {
      const items = [...(container.querySelectorAll(childSelector))];

      let docFragment = document.createDocumentFragment();

      items
        .sort(sortingFunction)
        .forEach(item => docFragment.appendChild(item));

      container.appendChild(docFragment);
    };


    let sortingFunction = null;

    switch (optionName) {
      case 'sortByArtistAscending':
        sortingFunction = (song1, song2) => {
          let artistCompare = song1.songArtist.localeCompare(song2.songArtist);

          if (artistCompare == 0) {
              return song1.songTitle.localeCompare(song2.songTitle);
          }

          return artistCompare;
        };
        break;
      case 'sortByArtistDescending':
        sortingFunction = (song1, song2) => {
          let artistCompare = song1.songArtist.localeCompare(song2.songArtist);

          if (artistCompare == 0) {
              return song1.songTitle.localeCompare(song2.songTitle);
          }

          return -1 * artistCompare;
        };

        break;
      case 'sortByTitleAscending':
        sortingFunction = (song1, song2) => {
          return song1.songTitle.localeCompare(song2.songTitle);
        };
        break;
      case 'sortByTitleDescending':
        sortingFunction = (song1, song2) => {
          return -1 * song1.songTitle.localeCompare(song2.songTitle);
        };
        break;
      case 'sortByVoteAscending':
        if (this.probabilities) {
          console.log('h');
          sortingFunction = (song1, song2) => {
            return Math.sign(song1.score - song2.score);
          };
        }
        break;
      case 'sortByVoteDescending':
        if (this.probabilities) {
          sortingFunction = (song1, song2) => {
            return -1 * Math.sign(song1.score - song2.score);
          };
        }
        break;
    }

    if (sortingFunction) {
      sortChildren(this.songListContainer, '[is="song-item"]', sortingFunction);
      this.playlist = [...(this.songListContainer.querySelectorAll('[is="song-item"]'))];
    }

  }

  sortSongsCallback(sortingOption) {
    let option = sortingOption.target;
    let optionName = option.getAttribute('name');

    this.sortSongs(optionName);
  }

}

customElements.define("player-manager", PlayerManager, {
  extends: "div"
});
