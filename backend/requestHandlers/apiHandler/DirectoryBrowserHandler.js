/**
 * Created by owenray on 18-4-2016.
 */
"use strict"
var IApiHandler = require("./IApiHandler");
var querystring = require("querystring");
var fs = require("fs");

class DirectoryBrowserHandler extends IApiHandler
{
    handle(request, response, url)
    {
        if(url.pathname!="/api/browse")
        {
            return false;
        }

        var query = querystring.parse(url.query);
        if(!query.directory) {
            query.directory = "/";
        }
        if(query.directory[query.directory.length-1]!="/") {
            query.directory += "/";
        }

        fs.readdir(
            query.directory,
            this.onDirectoryList.bind([query.directory, response]));
        return true;
    }

    onDirectoryList(err, result)
    {
        var directory = this[0];
        var response = this[1];
        if(err)
        {
            return response.end(JSON.stringify({"error":err}));
        }

        var pos = 0;

        //function to loop over files to see if they are directories
        function stat(err, res)
        {
            console.log(arguments);
            if(res||err)
            {
                if(res&&res.isDirectory()) //is the file a directory? move along
                {
                    pos++;
                }else{// file is not a directory remove from the results
                    result.splice(pos, 1);
                }

                if(pos==result.length)//all files processed, return result
                {
                    return response.end(JSON.stringify({"result":result}));
                }
            }
            console.log("STAT!", directory+result[pos]);
            fs.stat(directory+result[pos], stat);
        }
        stat();

    }
}

module.exports = DirectoryBrowserHandler;