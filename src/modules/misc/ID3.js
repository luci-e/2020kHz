"use strict";
/**
 * Contains functions for reading ID3-tags of audiofiles.
 * @namespace ID3
 */
let ID3 = {
    /**
     * Parses the ID3-tag of an audiofile.
     * @param {ArrayBuffer} Buffer The buffer of the data of the audiofile to parse.
     * @param {Boolean} [SkipEmptyFrames=false] Determines whether frames with empty data will be excluded from the ID3Tag.
     * @param {Number} [Version=2] The ID3 version to use.
     * @returns {ID3.Tag} An ID3Tag containing the information of the specified audiofile.
     */
    Parse: function(Buffer, SkipEmptyFrames = false, Version = 2) {

        if (!(Buffer instanceof ArrayBuffer)) {
            throw new TypeError("Argument for parameter 'Buffer' must be an instance of ArrayBuffer.");
        }

        let oView = new DataView(Buffer);
        switch (true) {
            //ID3v1.
            case Version <= 1 && ID3.ContainsTag(oView, 1):
                return ID3.V1.Parse(oView, SkipEmptyFrames);
                break;
            //ID3v2.
            case Version >= 2 && ID3.ContainsTag(oView, 2):
                return ID3.V2.Parse(oView, SkipEmptyFrames);
                break;
            //Empty tag.
            default:
                return new ID3.Tag();
                break;
        }
    },
    /**
     * Enumeration of default dataframes which are commonly used in audioplayers.
     * @readonly
     * @enum {String}
     */
    Frames: {
        APIC: "Attached picture",
        TIT2: "Title",
        TPE1: "Author",
        TALB: "Album",
        TYER: "Year of release",
        COMM: "Comment",
        TCON: "Genre",
        TCOM: "Componist",
        TRCK: "Tracknumber"
    },
    /**
     * Checks a file for the existance of an ID3 version-specific Tag-identifier.
     * @param {DataView} View A dataview of the file to check.
     * @param {Number} Version The ID3 version to check for.
     * @returns {Boolean} True if the specified file contains a valid Tag-identifier; otherwise, false.
     */
    ContainsTag: function(View, Version) {
        switch (Version) {
            case 1:
                //Check if the first 3 bytes at the end of the file, subtracting tag-size (128byte) contains the word 'TAG'.
                return (View.getUint8(View.byteLength - 128) === 84 && View.getUint8(View.byteLength - 127) === 65 && View.getUint8(View.byteLength - 126) === 71);
                break;
            case 2:
                //Check if the first 3 bytes contain the word 'ID3'.
                return (View.getUint8(0) === 73 && View.getUint8(1) === 68 && View.getUint8(2) === 51);
                break;
            default:
                return false;
                break;
        }
    }
};

/**
 * Interface for classes that represent a dataframe of an ID3Tag.
 * @interface
 * @memberOf ID3
 * @author Kerry Holz <k.holz@artforge.eu>.
 * @version 1.0.0.
 */
ID3.IFrame = class IFrame {
};
/**
 * Gets the ID of the IFrame.
 * @abstract
 * @type String
 */
ID3.IFrame.prototype.ID = "";
/**
 * Gets the data of the IFrame.
 * @abstract
 * @type String
 */
ID3.IFrame.prototype.Data = "";

/**
 *
 * @class Represents the information of an ID3-Tag of an audiofile.
 * @property {String} Version Gets or sets the version of the Tag.
 * @property {Object} Flags Gets or sets the flags of the Tag.
 * @property {Array<ID3.IFrame>} Frames Gets or sets the dataframes of the Tag.
 * @memberOf ID3
 * @author Kerry Holz <k.holz@artforge.eu>.
 * @version 1.0.0.
 */
ID3.Tag = class Tag {

    /**
     * Initializes a new instance of the Tag class.
     * @param {String} [Version="0.0.0"] The version of the tag.
     * @param {Object} [Flags={}] The flags of the tag.
     * @param {Array<ID3.IFrame>} [Frames=[]] The dataframes of the tag.
     */
    constructor(Version = "0.0.0", Flags = {}, Frames = []) {
        this.Version = Version;
        this.Flags = Flags;
        this.Frames = Frames;
    }
};

/**
 * Contains functions for reading ID3v1-tags of audiofiles.
 * @namespace V1
 * @memberOf ID3
 */
ID3.V1 = {

    /**
     * Parses the ID3v1-tag of an audiofile.
     * @param {DataView} DataView The view on the data of the audiofile to parse.
     * @param {Boolean} [SkipEmptyFrames=false] Determines whether frames with empty data will be excluded from the ID3Tag.
     * @returns {ID3.Tag} An ID3Tag containing the information of the specified audiofile.
     */
    Parse: function(DataView, SkipEmptyFrames = false) {

        const OffsetTag = DataView.byteLength - 128;
        const OffsetTitle = OffsetTag + 3;
        const OffsetAuthor = OffsetTag + 33;
        const OffsetAlbum = OffsetTag + 63;
        const OffsetReleaseYear = OffsetTag + 93;
        const OffsetComment = OffsetTag + 97;
        const OffsetGenre = OffsetTag + 127;

        let oDecoder = new TextDecoder(ID3.V2.Frame.Encoding.LATIN1);
        let iCommentlength = 30;
        let aoFrames = [];
        let FilterNullBytes = Value => Value !== 0x00;

        //Get title.
        aoFrames.push(new ID3.V1.Frame("TIT2", oDecoder.decode(new Uint8Array(DataView.buffer, OffsetTitle, 30).filter(FilterNullBytes))));

        //Get author.
        aoFrames.push(new ID3.V1.Frame("TPE1", oDecoder.decode(new Uint8Array(DataView.buffer, OffsetAuthor, 30).filter(FilterNullBytes))));

        //Get album.
        aoFrames.push(new ID3.V1.Frame("TALB", oDecoder.decode(new Uint8Array(DataView.buffer, OffsetAlbum, 30).filter(FilterNullBytes))));

        //Get year of release.
        aoFrames.push(new ID3.V1.Frame("TYER", oDecoder.decode(new Uint8Array(DataView.buffer, OffsetReleaseYear, 4).filter(FilterNullBytes))));

        //Check if a tracknumber exists (ID3v1.1).
        if (DataView.getUint8(OffsetComment + 29) === 0x00) {
            aoFrames.push(new ID3.V1.Frame("TRCK", DataView.getUint8(OffsetComment + 30)));
            iCommentlength = 28;
        }

        //Get comment.
        aoFrames.push(new ID3.V1.Frame("COMM", oDecoder.decode(new Uint8Array(DataView.buffer, OffsetComment, iCommentlength).filter(FilterNullBytes))));

        //Check if empty frames should get skipped.
        if (SkipEmptyFrames) {
            aoFrames = aoFrames.filter(Frame => {
                if (typeof Frame.Data === "String" && Frame.Data.length === 0) {
                    return false;
                }
                return true;
            });
        }

        //Get genre.
        aoFrames.push(new ID3.V1.Frame("TCON", this.Genres[DataView.getUint8(OffsetGenre)]));

        return new ID3.Tag(`1.${iCommentlength < 30 ? "1" : "0"}.0`, {}, aoFrames);
    },
    /**
     * Enumeration of all possible music-genres of the ID3v1-specification.
     * @see https://de.wikipedia.org/wiki/Liste_der_ID3v1-Genres
     * @readonly
     * @enum {String}
     */
    Genres: [
        "Blues",
        "Classic Rock",
        "Country",
        "Dance",
        "Disco",
        "Funk",
        "Grunge",
        "Hip-Hop",
        "Jazz",
        "Metal",
        "New Age",
        "Oldies",
        "Other",
        "Pop",
        "Rhythm and Blues",
        "Rap",
        "Reggae",
        "Rock",
        "Techno",
        "Industrial",

        "Alternative",
        "Ska",
        "Death Metal",
        "Pranks",
        "Soundtrack",
        "Euro-Techno",
        "Ambient",
        "Trip-Hop",
        "Vocal",
        "Jazz & Funk",
        "Fusion",
        "Trance",
        "Classical",
        "Instrumental",
        "Acid",
        "House",
        "Game",
        "Sound Clip",
        "Gospel",
        "Noise",

        "Alternative Rock",
        "Bass",
        "Soul",
        "Punk",
        "Space",
        "Meditative",
        "Instrumental Pop",
        "Instrumental Rock",
        "Ethnic",
        "Gothic",
        "Darkwave",
        "Techno-Industrial",
        "Electronic",
        "Pop-Folk",
        "Eurodance",
        "Dream",
        "Southern Rock",
        "Comedy",
        "Cult",
        "Gangsta",

        "Top 40",
        "Christian Rap",
        "Pop/Funk",
        "Jungle",
        "Native US",
        "Cabaret",
        "New Wave",
        "Psychedelic",
        "Rave",
        "Showtunes",
        "Trailer",
        "Lo-Fi",
        "Tribal",
        "Acid Punk",
        "Acid Jazz",
        "Polka",
        "Retro",
        "Musical",
        "Rock ’n’ Roll",
        "Hard Rock"
    ]
};

/**
 * @class Represents dataframe of ID3v1.x-Tags acting like dataframes specified for the 2.x version.
 * @property {String} ID Gets or sets the ID of the frame.
 * @property {String} Data Gets or sets the data of the frame.
 * @implements ID3.IFrame
 * @memberOf ID3.V1
 * @author Kerry Holz <k.holz@artforge.eu>.
 * @version 1.0.0.
 */
ID3.V1.Frame = class Frame extends ID3.IFrame {
    /**
     * Initializes a new instance of the Frame class.
     * @param {String} [ID=""] The ID of the frame.
     * @param {String} [Data=""] The data of the frame.
     */
    constructor(ID = "", Data = "") {

        super();

        this.ID = ID;
        this.Data = Data;
    }
};

/**
 * Contains functions for reading ID3v2-tags of audiofiles.
 * @namespace V2
 * @memberOf ID3
 */
ID3.V2 = {

    /**
     * Parses the ID3v2-tag of an audiofile.
     * @param {DataView} DataView The view on the data of the audiofile to parse.
     * @param {Boolean} [SkipEmptyFrames=false] Determines whether frames with empty data will be excluded from the ID3Tag.
     * @returns {ID3.Tag} An ID3Tag containing the information of the specified audiofile.
     */
    Parse: function(DataView, SkipEmptyFrames) {

        SkipEmptyFrames = (typeof SkipEmptyFrames !== "undefined") ? SkipEmptyFrames : false;

        let iMajorVersion = DataView.getUint8(3);
        let iRevision = DataView.getUint8(4);
        let iFlags = DataView.getUint8(5);
        let bUnsynchronisation = iFlags & 1;
        let bExtendedHeader = iFlags & 2;
        let bExperimental = iFlags & 4;
        let iSize = DataView.getUint32(6);

        let b0 = iSize & 0xF000;
        let b1 = iSize & 0x0F00;
        let b2 = iSize & 0x00F0;
        let b3 = iSize & 0x000F;
        
        iSize = (b0 >> 3 | b1 >> 2 | b2 >> 1 | b3);

        let aoFrames = [];

        //Loop through the audiofile and parse dataframes.
        for (let iOffset = 10; iOffset < iSize;) {

            //Check if the end of frames has been reached.
            if (DataView.getUint32(iOffset) === 0x00) {
                break;
            }

            //Get frame ID.
            let sFrameID = "";
            for (let i = 0; i < 4; i++) {
                sFrameID = sFrameID.concat(String.fromCharCode(DataView.getUint8(iOffset++)));
            }

            //Get framesize.
            let iFrameSize = DataView.getUint32(iOffset);
            iOffset += 4;

            //Get framheader-flags.
            let iStatusFlags = DataView.getUint8(iOffset++);
            let iEncodingFlags = DataView.getUint8(iOffset++);

            //Get frame.
            let fnFrameType = null;
            switch (true) {
                case sFrameID === "APIC": //Attached picture frame.
                    fnFrameType = ID3.V2.PictureFrame;
                    break;
                case sFrameID[0] === "T": //Text frame.
                    fnFrameType = ID3.V2.TextFrame;
                    break;
                case sFrameID === "PRIV": //Private frame.
                    fnFrameType = ID3.V2.PrivateFrame;
                    break;
                case sFrameID[0] === "W": //URL frame.
                    fnFrameType = ID3.V2.URLFrame;
                    break;
                case sFrameID === "COMM": //Comment frame.
                    fnFrameType = ID3.V2.CommentFrame;
                    break;
                default:
                    //Skip unknown frame.
                    iOffset += iFrameSize;
                    continue;
            }

            //Create frame.
            let oFrame = new fnFrameType(
                sFrameID,
                iStatusFlags,
                iEncodingFlags,
                new Uint8Array(DataView.buffer, iOffset, iFrameSize)
            );

            //Increase offset to next frame.
            iOffset += iFrameSize;

            //Check if empty frames should get skipped and if the frame has no data.
            if (SkipEmptyFrames && (oFrame.Data.length || oFrame.Data.size) === 0) {
                continue;
            }

            //Append frame.
            aoFrames.push(oFrame);
        }

        return new ID3.Tag(
            `2.${iMajorVersion}.${iRevision}`,
            {
                Unsynchronisation: bUnsynchronisation,
                ExtendedHeader: bExtendedHeader,
                Experimental: bExperimental
            },
            aoFrames);
    }
};

/**
 * @class Represents a baseclass for dataframes of ID3v2.x-Tags.
 * @see http://id3.org/id3v2.3.0#ID3v2_frame_overview
 * @property {String} ID Gets or sets the ID of the Frame.
 * @property {Number} StatusFlags Gets or sets the statusflags of the Frame. @see http://id3.org/id3v2.3.0#Frame_header_flags
 * @property {Number} EncodingFlags Gets or sets the encodingflags of the Frame. @see http://id3.org/id3v2.3.0#Frame_header_flags
 * @property {Boolean} TagAlterPreservation Gets a value indicating whether the Frame should be preserved if the ID3tag is being altered.
 * @property {Boolean} FileAlterPreservation Gets a value indicating whether the Frame should be preserved if the file which contains the ID3tag is being altered.
 * @property {Boolean} ReadOnly Gets a value indicating whether the contents of the Frame is intended to be read only.
 * @property {Boolean} Compression Gets a value indicating whether the Frame is compressed.
 * @property {Boolean} Encryption Gets a value indicating whether the Frame is encrypted.
 * @property {Boolean} GroupingIdentity Gets a value indicating whether the frame belongs in a group with other frames.
 * @implements ID3.IFrame
 * @memberOf ID3.V2
 * @author Kerry Holz <k.holz@artforge.eu>.
 * @version 1.0.0.
 */
ID3.V2.Frame = class Frame extends ID3.IFrame {

    /**
     * Gets a value indicating whether the frame should be preserved if the ID3tag is being altered.
     * @returns {Boolean}
     */
    get TagAlterPreservation() {
        return this.StatusFlags & 1;
    }

    /**
     * Gets a value indicating whether the frame should be preserved if the file which contains the ID3tag is being altered.
     * @returns {Boolean}
     */
    get FileAlterPreservation() {
        return this.StatusFlags & 2;
    }

    /**
     * Gets a value indicating whether the contents of the frame is intended to be read only.
     * @returns {Boolean}
     */
    get ReadOnly() {
        return this.StatusFlags & 4;
    }

    /**
     * Gets a value indicating whether the frame is compressed.
     * @returns {Boolean}
     */
    get Compression() {
        return this.EncodingFlags & 1;
    }

    /**
     * Gets a value indicating whether the frame is encrypted.
     * @returns {Boolean}
     */
    get Encryption() {
        return this.EncodingFlags & 2;
    }

    /**
     * Gets a value indicating whether the frame belongs in a group with other frames.
     * @returns {Boolean}
     */
    get GroupingIdentity() {
        return this.EncodingFlags & 4;
    }

    /**
     * Initializes a new instance of the Frame class.
     * @param {String} [ID=""] The ID of the Frame.
     * @param {Number} [StatusFlags=0] The statusflags of the Frame.
     * @param {Number} [EncodingFlags=0] The encodingflags of the Frame.
     * @param {Uint8Array} Data The data of the Frame.
     */
    constructor(ID = "", StatusFlags = 0x00, EncodingFlags = 0x00, Data) {

        super();

        this.ID = ID;
        this.Data = Data;
        this.StatusFlags = StatusFlags;
        this.EncodingFlags = EncodingFlags;
    }

};

/**
 * Enumeration of possible encodings of textual-content of ID3v2.x-frames.
 * @readonly
 * @enum {String}
 */
ID3.V2.Frame.Encoding = {
    /**
     * UTF-8 encoding.
     * @type String
     */
    UTF8: "utf-8",
    /**
     * UTF-16 encoding.
     * @type String
     */
    UTF16: "utf-8",
    /**
     * Latin-1/ISO 8859-1 encoding.
     * @type String
     */
    LATIN1: "windows-1252"
};

/**
 * @class Represents a text-based commentary dataframe of ID3v2.x-Tags.
 * @see http://id3.org/id3v2.3.0#Comments
 * @property {String} ID Gets or sets the ID of the CommentFrame.
 * @property {Number} StatusFlags Gets or sets the statusflags of the CommentFrame.
 * @property {Number} EncodingFlags Gets or sets the encodingflags of the CommentFrame.
 * @property {String} Data Gets the data of the CommentFrame.
 * @property {String} Encoding Gets the encoding of the data of the CommentFrame.
 * @property {String} Language Gets the language of the data of the CommentFrame.
 * @property {String} ShortDescription Gets the shortdescription of the CommentFrame.
 * @memberOf ID3.V2
 * @augments ID3.V2.Frame
 * @author Kerry Holz <k.holz@artforge.eu>.
 * @version 1.0.0.
 */
ID3.V2.CommentFrame = class CommentFrame extends ID3.V2.Frame {

    /**
     * Initializes a new instance of the CommentFrame class.
     * @param {String} [ID=""] The ID of the CommentFrame.
     * @param {Number} [StatusFlags=0] The statusflags of the CommentFrame.
     * @param {Number} [EncodingFlags=0] The encodingflags of the CommentFrame.
     * @param {Uint8Array} Data The data of the CommentFrame.
     */
    constructor(ID, StatusFlags, EncodingFlags, Data) {

        super(ID, StatusFlags, EncodingFlags);

        /**
         * The textdecoder of the CommentFrame.
         * @type TextDecoder
         * @ignore
         */
        let _oDecoder = null;

        /**
         * The descriptionindex of the CommentFrame.
         * @type Number
         * @ignore
         */
        let _iDescriptionIndex = null;

        //Get encoding.
        this.Encoding = (Data[0] === 0x00)
            ? ID3.V2.Frame.Encoding.LATIN1
            : ID3.V2.Frame.Encoding.UTF16;
        _oDecoder = new TextDecoder(this.Encoding);

        //Parse language.
        this.Language = String.fromCharCode(Data[1]) + String.fromCharCode(Data[2]) + String.fromCharCode(Data[3]);

        //Parse shortdescription.
        _iDescriptionIndex = Data.indexOf(0x00, 4);
        this.ShortDescription = _oDecoder.decode(Data.slice(4, _iDescriptionIndex));

        //Check if the description is a 'null-terminated null-string'.
        if (this.ShortDescription === "" && Data[_iDescriptionIndex + 1] === 0x00) {
            ++_iDescriptionIndex;
        }

        //Parse comment.
        let strData = _oDecoder.decode(Data.slice(_iDescriptionIndex + 1));
        this.Data = strData.substring(0, strData.length - 1);
    }
};

/**
 * @class Represents an image-containing dataframe of ID3v2.x-Tags.
 * @see http://id3.org/id3v2.3.0#Attached_picture
 * @property {String} ID Gets or sets the ID of the PictureFrame.
 * @property {Number} StatusFlags Gets or sets the statusflags of the PictureFrame.
 * @property {Number} EncodingFlags Gets or sets the encodingflags of the PictureFrame.
 * @property {Blob} Data Gets the data of the PictureFrame.
 * @property {String} Encoding Gets the encoding of the data of the PictureFrame.
 * @property {String} MimeType Gets the MIMEType of the data of the PictureFrame.
 * @property {Number} ImageType Gets the type of the image of the PictureFrame.
 * @property {String} Description Gets the description-text of the PictureFrame.
 * @memberOf ID3.V2
 * @augments ID3.V2.Frame
 * @author Kerry Holz <k.holz@artforge.eu>.
 * @version 1.0.0.
 */
ID3.V2.PictureFrame = class PictureFrame extends ID3.V2.Frame {

    /**
     * Initializes a new instance of the PictureFrame class.
     * @param {String} [ID=""] The ID of the PictureFrame.
     * @param {Number} [StatusFlags=0] The statusflags of the PictureFrame.
     * @param {Number} [EncodingFlags=0] The encodingflags of the PictureFrame.
     * @param {Uint8Array} Data The data of the PictureFrame.
     */
    constructor(ID, StatusFlags, EncodingFlags, Data) {

        super(ID, StatusFlags, EncodingFlags);

        /**
         * The textdecoder of the PictureFrame.
         * @type TextDecoder
         * @ignore
         */
        let _oDecoder = null;
        /**
         * The mimeindex of the PictureFrame.
         * @type Number
         * @ignore
         */
        let _iMimeIndex = null;
        /**
         * The descriptionindex of the PictureFrame.
         * @type Number
         * @ignore
         */
        let _iDescriptionIndex = null;

        //Get encoding.
        this.Encoding = (Data[0] === 0x00)
            ? ID3.V2.Frame.Encoding.LATIN1
            : ID3.V2.Frame.Encoding.UTF16;

        //Create decoder according the encoding.
        _oDecoder = new TextDecoder(this.Encoding);

        //Get the index of the null-byte termination of the mimetype.
        _iMimeIndex = Data.indexOf(0x00, 1);

        //Get the mimetype.
        this.MimeType = _oDecoder.decode(Data.slice(1, _iMimeIndex));

        //Get the image type.
        this.ImageType = Data[_iMimeIndex + 1];

        //Get the index of the null-byte termination of the description.
        _iDescriptionIndex = Data.indexOf(0x00, _iMimeIndex + 2);

        //Get the description.
        this.Description = _oDecoder.decode(Data.slice(_iMimeIndex + 2, _iDescriptionIndex));

        //Fetch a blob of the remaining data.(the image).
        this.Data = new Blob([Data.slice(_iDescriptionIndex + 1)], { type: this.MimeType });
    }
};

/**
 * @class Represents a text-based dataframe of ID3v2.x-Tags.
 * @see http://id3.org/id3v2.3.0#Text_information_frames
 * @property {String} ID Gets or sets the ID of the PrivateFrame.
 * @property {Number} StatusFlags Gets or sets the statusflags of the PrivateFrame.
 * @property {Number} EncodingFlags Gets or sets the encodingflags of the PrivateFrame.
 * @property {String} Data Gets the data of the PrivateFrame.
 * @property {String} OwnerIdentifier Gets the owneridentifier of the data of the PrivateFrame.
 * @memberOf ID3.V2
 * @augments ID3.V2.Frame
 * @author Kerry Holz <k.holz@artforge.eu>.
 * @version 1.0.0.
 */
ID3.V2.PrivateFrame = class PrivateFrame extends ID3.V2.Frame {

    /**
     * Initializes a new instance of the PrivateFrame class.
     * @param {String} [ID=""] The ID of the PrivateFrame.
     * @param {Number} [StatusFlags=0] The statusflags of the PrivateFrame.
     * @param {Number} [EncodingFlags=0] The encodingflags of the PrivateFrame.
     * @param {Uint8Array} Data The data of the PrivateFrame.
     * @returns {PrivateFrame}
     */
    constructor(ID, StatusFlags, EncodingFlags, Data) {

        super(ID, StatusFlags, EncodingFlags);

        /**
         * The TextDecoder of the PrivateFrame.
         * @type TextDecoder
         * @ignore
         */
        let _oDecoder = null;
        /**
         * The index of the termination null-byte of the owner identifier of the PrivateFrame.
         * @type Number
         * @ignore
         */
        let _iOwnerIndex = null;

        _oDecoder = new TextDecoder(ID3.V2.Frame.Encoding.LATIN1);

        //Get the index of the null-byte termination of the mimetype.
        _iOwnerIndex = Data.indexOf(0x00);

        //Parse owneridentifier.
        this.OwnerIdentifier = _oDecoder.decode(Data.slice(0, _iOwnerIndex));

        //Decode bytesequence.
        this.Data = _oDecoder.decode(Data.slice(_iOwnerIndex + 1));
    }

};

/**
 * @class Represents a text-based dataframe of ID3v2.x-Tags.
 * @see http://id3.org/id3v2.3.0#Text_information_frames
 * @property {String} ID Gets or sets the ID of the TextFrame.
 * @property {Number} StatusFlags Gets or sets the statusflags of the TextFrame.
 * @property {Number} EncodingFlags Gets or sets the encodingflags of the TextFrame.
 * @property {String} Data Gets the data of the TextFrame.
 * @property {String} Encoding Gets the encoding of the data of the TextFrame.
 * @memberOf ID3.V2
 * @augments ID3.V2.Frame
 * @author Kerry Holz <k.holz@artforge.eu>.
 * @version 1.0.0.
 */
ID3.V2.TextFrame = class TextFrame extends ID3.V2.Frame {

    /**
     * Initializes a new instance of the TextFrame class.
     * @param {String} [ID=""] The ID of the TextFrame.
     * @param {Number} [StatusFlags=0] The statusflags of the TextFrame.
     * @param {Number} [EncodingFlags=0] The encodingflags of the TextFrame.
     * @param {Uint8Array} Data The data of the TextFrame.
     */
    constructor(ID, StatusFlags, EncodingFlags, Data) {

        super(ID, StatusFlags, EncodingFlags);

        //Get encoding.
        this.Encoding = (Data[0] === 0x00)
            ? ID3.V2.Frame.Encoding.LATIN1
            : ID3.V2.Frame.Encoding.UTF16;

        //Decode bytesequence.
        let strData = new TextDecoder(this.Encoding).decode(Data.slice(1));
        this.Data = strData.substring(0, strData.length - 1);
    }

};

/**
 * @class Represents a text-based dataframe containing URLs of ID3v2.x-Tags.
 * @see http://id3.org/id3v2.3.0#URL_link_frames
 * @property {String} ID Gets or sets the ID of the URLFrame.
 * @property {Number} StatusFlags Gets or sets the statusflags of the URLFrame.
 * @property {Number} EncodingFlags Gets or sets the encodingflags of the URLFrame.
 * @property {String} Data Gets the data of the URLFrame.
 * @memberOf ID3.V2
 * @augments ID3.V2.Frame
 * @author Kerry Holz <k.holz@artforge.eu>.
 * @version 1.0.0.
 */
ID3.V2.URLFrame = class URLFrame extends ID3.V2.Frame {

    /**
     * Initializes a new instance of the URLFrame class.
     * @param {String} [ID=""] The ID of the URLFrame.
     * @param {Number} [StatusFlags=0] The statusflags of the URLFrame.
     * @param {Number} [EncodingFlags=0] The encodingflags of the URLFrame.
     * @param {Uint8Array} Data The data of the URLFrame.
     */
    constructor(ID, StatusFlags, EncodingFlags, Data) {

        super(ID, StatusFlags, EncodingFlags);

        //Decode bytesequence until terminating null-byte.
        this.Data = new TextDecoder(ID3.V2.Frame.Encoding.LATIN1).decode(Data.slice(1, Data.indexOf(0x00)));
    }

};
