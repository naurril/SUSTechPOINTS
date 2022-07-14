

function jsonrpc(url, method="GET", param){
    const req = new Request(url);
    let init = {
        method: method,
        
        mode: 'cors', // no-cors, *cors, same-origin
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'same-origin', // include, *same-origin, omit
        headers: {
          'Content-Type': 'application/json',
          // 'Content-Type': 'application/x-www-form-urlencoded',
          "x-user-token": window.pointsGlobalConfig.userToken,
        },
        redirect: 'follow', // manual, *follow, error
        referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        
    };

    if (param){
      init.body = JSON.stringify(param);
    }
    
    
    return fetch(req, init).then(response=>{
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }else{
            return response.json();
        }
    });
}


export{jsonrpc}