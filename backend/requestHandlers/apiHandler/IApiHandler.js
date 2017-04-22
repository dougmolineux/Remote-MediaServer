/**
 * Created by owen on 14-4-2016.
 */
"use strict";

class IApiHandler
{

    /**
     *
     * @param {IncomingMessage} request
     * @param {ServerResponse} response
     * @param {{pathname:string,query:string}} url
     * @returns {boolean} handled or not?
     */
    handle()
    {
       return false;
    }
}

module.exports = IApiHandler;