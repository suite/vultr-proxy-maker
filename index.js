const request = require('request')
const path = require('path');
const config = require(path.join(__dirname, 'config.json'));
var readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
let apikey = config.apikey

console.log('Welcome to proxy creator written by Matt')

let locationnum, vpsplannum, osnum, proxiesnum



function createScript() {
    request({
        url: 'https://api.vultr.com/v1/startupscript/list',
        headers: {
            'API-Key': apikey
        }, 
        json:true
    }, function(err, resp, body) {
        var found = false
        Object.keys(body).forEach( function (key) { 
            if(body[key].name == 'proxyscript') {
                found = true
               
            }
        });

        if(!found) {
            console.log('Script not found, creating..')
            request({
                url: 'https://api.vultr.com/v1/startupscript/create',
                headers: {
                    'API-Key': apikey
                }, 
                method:'post',
                formData: {
                    //This script is a direct copy of the one from https://github.com/dzt/easy-proxy
                    //All credits go to Peter @pxtvr
                    name: 'proxyscript',
                    script: '#!/bin/bash\n' + 
                            'echo hello world > /root/hello &&' +
                            'yum install squid wget httpd-tools -y &&' +
                            'touch /etc/squid/passwd &&' +
                            `htpasswd -b /etc/squid/passwd ${config.proxy.username} ${config.proxy.password} &&` +
                            'wget -O /etc/squid/squid.conf https://raw.githubusercontent.com/dzt/easy-proxy/master/confg/userpass/squid.conf --no-check-certificate &&' +
                            'touch /etc/squid/blacklist.acl &&' +
                            'systemctl restart squid.service && systemctl enable squid.service &&' +
                            'iptables -I INPUT -p tcp --dport 3128 -j ACCEPT &&' +
                            'iptables-save'
                }
            }, function(err, resp, body) {
                
                if(resp.statusCode == 200) {
                    console.log('Created script, moving on...')
                    return init()
                } else {
                    console.log(resp.statusCode)
                }
            })
        } else {
            console.log('Script already made, moving on...')
           
            return init()
        }
        
    })
}


function init() {

    rl.question('How many proxies? ', (answer) => {
        console.log(answer + ' proxies will be made.');
        proxiesnum = answer

        request({
            url: 'https://api.vultr.com/v1/regions/list',
            json:true
        }, function(err,resp,body) {
            // console.log(body)
            Object.keys(body).forEach( function (key) { 
                console.log('['+ body[key].DCID+ '] '+ body[key].name); 
            });
           
            rl.question('Select a location i.e. (3). ', (answer) => {
                console.log('[' + body[answer].name + '] is selected.');
                locationnum = answer
        
                return getVpsPlan()
       
            });
        })

    });


    
}

function getVpsPlan() {
    request({
        url: 'https://api.vultr.com/v1/plans/list',
        json:true
    }, function(err,resp,body) {
        // console.log(body)
        Object.keys(body).forEach( function (key) { 
            if(body[key].plan_type === 'SSD') {
                console.log('['+body[key].VPSPLANID + '] ' + body[key].name + ' $' + body[key].price_per_month + '/mo'); 
            }
           
        });
     
        rl.question('Select a vps plan i.e. (3). ', (answer) => {
            console.log('[' + body[answer].name + '] is selected.');
            vpsplannum = answer
        
            return getOS()
    
            
        });
    })
}

function getOS() {
    request({
        url: 'https://api.vultr.com/v1/os/list',
        json:true
    }, function(err,resp,body) {
        // console.log(body)
        Object.keys(body).forEach( function (key) { 
        
            console.log('[' + body[key].OSID + '] ' + body[key].name ); 
            
           
        });
     
        rl.question('Select a OS plan (tested with CentOS 7 x64 [167]). ', (answer) => {
            console.log('[' + body[answer].name + '] is selected.');
            osnum = answer
            // rl.close();

       
                return createSever()
 
            
        });
    })
}

function createSever() {

    for(var i =0 ; i < proxiesnum; i++) {
        console.log('creating proxy... (fingers crossed)')
    
        var sid;
        request({
            url: 'https://api.vultr.com/v1/startupscript/list',
            headers: {
                'API-Key': apikey
            }, 
            json:true
        }, function(err, resp, body) {
            Object.keys(body).forEach( function (key) { 
                if(body[key].name == 'proxyscript') {
                    sid = body[key].SCRIPTID
                }
            })
            let data = {
                DCID: locationnum,
                VPSPLANID: vpsplannum,
                OSID: osnum,
                SCRIPTID: sid
                // userdata: Buffer.from(userdata).toString('base64')
                    
            }
        
            // console.log(data)
        
        
            
            var subid
            request({
                url: 'https://api.vultr.com/v1/server/create',
                headers: {
                    'API-Key': apikey
                },
                method: 'POST',
                formData: data,
                json: true
            }, function(err, resp, body) {
                // console.log(body)
                subid = body.SUBID
                console.log('Server is being made, wait 120s...')
    
                setTimeout(() => {
                    request({
                        url: 'https://api.vultr.com/v1/server/list',
                        headers: {
                            'API-Key': apikey
                        },
                        json: true
                    }, function(err, resp, body) {
                           
                        console.log(body[subid].main_ip + `:3128:${config.proxy.username}:${config.proxy.password}`)
                        
                    })
                    
                }, 1000*120)
                // return final(body.SUBID)
            })
        })
    }

    
    
    


}


createScript()
