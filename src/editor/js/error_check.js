import { jsonrpc } from "./jsonrpc.js";
import { logger } from "./log.js";


function checkScene(scene)
{
    jsonrpc(`/api/checkscene?scene=${scene}`).then(ret=>{
        logger.setErrorsContent(ret);
    }).catch(reject=>{
        logger.log("error check scene!");
    });
}

export {checkScene}