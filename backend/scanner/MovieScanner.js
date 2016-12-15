"use strict";

var recursive = require('recursive-readdir');
var Settings = require("../Settings");
var Database = require("../Database");
var MediaItemHelper = require("../helpers/MediaItemHelper");
var fs = require("fs");

var TheMovieDBExtendedInfo = require("./extendedInfo/TheMovieDBExtendedInfo");
var FFProbeExtendedInfo = require("./extendedInfo/FFProbeExtendedInfo");
var ParseFileNameExtendedInfo = require("./extendedInfo/ParseFileNameExtendedInfo");
var TheMovieDBSeriesAndSeasons = require("./extendedInfo/TheMovieDBSeriesAndSeasons");
var ExtrasExtendedInfo = require("./extendedInfo/ExtrasExtendedInfo");

class MovieScanner
{

    constructor()
    {
        this.library = null;
        this.scanning = -1;
        this.scan();
        Settings.addObserver("libraries", this.scan.bind(this));
    }

    setScanTimeout()
    {
        if(this.scanTimeout) {
            clearTimeout(this.scanTimeout)
        }
        this.scanTimeout = setTimeout(this.scan.bind(this), Settings.getValue("scanInterval")*1000);
    }

    scan()
    {
        if(this.scanning!=-1)
        {
            console.log("Scan in progress");
            return;
        }
        console.log("start scanner");
        this.setScanTimeout();
        this.checkForMediaItemsWithMissingFiles();
        this.checkForMediaItemsWithMissingLibrary();
        this.scanNext();
    }

    checkForMediaItemsWithMissingFiles(items)
    {
        console.log("check 4 missing files");
        var items = Database.getAll("media-item");
        function next() {
            if(!items.length)
                return;
            //console.log(MediaItemHelper.getFullFilePath(items[0]));
            fs.stat(MediaItemHelper.getFullFilePath(items[0]), function (err, stat) {
                if (err) {
                    console.log("item missing, removing", items[0].id);
                    Database.deleteObject("media-item", items[0].id);
                }
                items.shift();
                next();
            });
        }
        next();
    }

    checkForMediaItemsWithMissingLibrary()
    {
        console.log("check 4 missing library");
        var libraries = Settings.getValue("libraries");
        var libIds = [];
        for(var c = 0; c<libraries.length; c++)
        {
            libIds.push(libraries[c].uuid);
        }

        var items = Database.getAll("media-item");
        for(c = 0; c<items.length; c++)
        {
            if(libIds.indexOf(items[c].attributes.libraryId)==-1)
            {
                Database.deleteObject("media-item", items[c].id);
            }
        }
    }

    scanNext()
    {
        this.scanning++;
        if(this.scanning>=Settings.getValue("libraries").length)
        {
            this.scanning = -1;
            return;
        }

        this.types = Settings.getValue("videoFileTypes");
        this.library = Settings.getValue("libraries")[this.scanning];
        console.log("start scan", this.library);
        recursive(this.library.folder, [this.willInclude.bind(this)], this.onListed.bind(this));
    }

    willInclude(file, fileRef)
    {
        if(fileRef.isDirectory())
            return false;
        var f = file.split(".");
        var type =  f[f.length-1];
        for(var c = 0; c<this.types.length; c++) {
            if (this.types[c] === type) {
                return false;
            }
        }
        return true;
    }

    onListed(err, files)
    {
        if(err)
        {
            // console.log(err);
            return;
        }
        //console.log("gotAllFiles", files);
        for(var offset = 0; offset<files.length; offset++)
        {
            var file = files[offset].substr(this.library.folder.length);
            if(!Database.findBy("media-item", "filepath", file).length) {
                var obj = {
                        filepath: file,
                        libraryId: this.library.uuid,
                        mediaType: this.library.type
                    };
                if(file.match(/.*sample.*/)){
                    obj.sample = obj.extra = true;
                }else if(file.match(/.*trailer.*/)){
                    obj.sample = obj.extra = true;
                }
                Database.setObject("media-item", obj);
            }
        }
        this.checkForExtendedInfo();
    }

    checkForExtendedInfo()
    {
        // console.log("checking for extended info...");
        var items = Database.findBy("media-item", "libraryId", this.library.uuid);
        //order trailers and samples to the back
        var count = items.length;
        for(var c = 0; c<count; c++) {
            if(items[c].attributes.extra) {
                //console.log("isExtra", items[c]);
                items.push(items.splice(c, 1)[0]);
                count--;
                c--;
            }
        }

        var extendedInfoItems = [
                                    new FFProbeExtendedInfo(),
                                    new ParseFileNameExtendedInfo(),
                                    new TheMovieDBSeriesAndSeasons(),
                                    new TheMovieDBExtendedInfo(),
                                    new ExtrasExtendedInfo()
                                ];

        var loadNext = function()
        {
            if(items.length === 0) {
                console.log("done scanning");
                this.scanNext();
                return;
            }

            var item = items.pop();
            console.log(item.attributes.filepath);

            var prevPromise;
            for(var c = 0; c<extendedInfoItems.length; c++)
            {
                if(prevPromise)
                {
                    prevPromise = prevPromise.then(extendedInfoItems[c].extendInfo.bind(extendedInfoItems[c]));
                }else{
                    prevPromise = extendedInfoItems[c].extendInfo([item, this.library]);
                }
            }
            prevPromise.then(loadNext);

        }.bind(this);
        loadNext();
    }
}

//MovieScanner is a singleton!
module.exports = new MovieScanner();
