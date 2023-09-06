import { jsonrpc } from './jsonrpc.js';
import { logger } from './log.js';

function check3dLabels (scene, objid='') {
  jsonrpc(`/api/check3dlabels?scene=${scene}&objid=${objid}`).then(ret => {
    logger.setErrorsContent(ret, objid);
  }).catch(reject => {
    logger.log('error check scene!');
  });
}
function check2dLabels (scene) {
  jsonrpc(`/api/check2dlabels?scene=${scene}`).then(ret => {
    logger.setErrorsContent(ret);
  }).catch(reject => {
    logger.log('error check scene!');
  });
}
export { check3dLabels, check2dLabels };
