"use strict";
/**
 * Created by owenray on 29-06-16.
 */

var IExtendedInfo = require("./IExtendedInfo");
var Promise = require("node-promise").Promise;
var FFProbe = require('../../FFProbe');
var Database = require("../../Database");

class FFProbeExtendedInfo extends IExtendedInfo
{
    extendInfo(args)
    {
        var mediaItem = args[0];
        var library = args[1];
        var promise = new Promise();

        if(mediaItem.attributes.gotfileinfo||mediaItem.attributes.extra) {
            promise.resolve([mediaItem, library]);
            return promise;
        }

        var file = decodeURI(library.folder+mediaItem.attributes.filepath);
        FFProbe.getInfo(file)
            .then(function(fileData)
            {
                if(!fileData||!fileData.format)
                    return promise.resolve([mediaItem, library]);
                
                mediaItem.attributes.width = fileData.streams[0].width;
                mediaItem.attributes.height = fileData.streams[0].height;
                mediaItem.attributes.fileduration = parseFloat(fileData.format.duration);
                mediaItem.attributes.filesize = parseInt(fileData.format.size);
                mediaItem.attributes.bitrate = fileData.format.bit_rate;
                mediaItem.attributes.gotfileinfo = true;
                Database.update("media-item", mediaItem);
                promise.resolve([mediaItem, library]);
            });
        return promise;
    }
}

module.exports = FFProbeExtendedInfo;