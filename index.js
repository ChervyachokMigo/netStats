console.log('starting...');

const spawn = require('child_process').spawn;
const util = require('util');
const os = require('os');
const colors = require('colors');

var netStats = {
    all_total: 0,
    rx_total: 0,
    tx_total: 0,
    rx_start: 0,
    tx_start: 0,
    rx_session: 0,
    tx_session: 0,
    rx_speed: 0,
    tx_speed: 0,
    rx_speeds: [],
    tx_speeds: [],
    avg_rx_speed: 0,
    avg_tx_speed: 0
};



const refrash_speed = 5;    //1 = 1 секунда, 3 = 1/3 секунды
var average_speed_longly = 3; //за указаное количество секунд

average_speed_longly *= refrash_speed;

var isFirstUpdate = {rx: true, tx: true, rx_setted: false, tx_setted: false};

const powershell = spawn('powershell.exe', ['-NoLogo', '-InputFormat', 'Text', '-NoExit', '-ExecutionPolicy', 'Unrestricted', '-Command', '-'], {
    stdio: 'pipe',
    windowsHide: true,
    maxBuffer: 1024 * 20000,
    encoding: 'UTF-8',
    env: util._extend({}, process.env, { LANG: 'en_US.UTF-8' })
  });

powershell.on('error', function (e) {
    console.log(e.toString('utf8'))
});

powershell.stderr.on('data', function (data) {
    console.log(data.toString('utf8'));
});

powershell.on('close', function () {
    powershell.kill();
});

powershell.stdout.on('data', function (data) {
    data = data.toString('utf8').trim();
    if (data.length>0){
        data = data.split('\r\n');
        data = data.map((v)=>v.split(':').map((v2)=>v2.trim()));
        data.map((v)=>{
            switch (v[0]){
                case 'BytesReceivedPersec':
                    if (parseInt(v[1])>0){
                        let rx_total_old = netStats.rx_total;
                        netStats.rx_total = getMBfromBytes(v[1]);
                        netStats.rx_speed = ((parseFloat(netStats.rx_total) - parseFloat(rx_total_old))*refrash_speed).toFixed(3);
                        netStats.rx_speeds.push(Number(netStats.rx_speed));
                        isFirstUpdate.rx_setted = true;
                    };
                    break;
                case 'BytesSentPersec':
                    if (parseInt(v[1])>0){
                        let tx_total_old = netStats.tx_total;
                        netStats.tx_total = getMBfromBytes(v[1]);
                        netStats.tx_speed = ((parseFloat(netStats.tx_total) - parseFloat(tx_total_old))*refrash_speed).toFixed(3);
                        netStats.tx_speeds.push(Number(netStats.tx_speed));
                        
                        isFirstUpdate.tx_setted = true;
                    };
                    break;
                case 'BytesTotalPersec':
                    if (parseInt(v[1])>0){
                        netStats.all_total = getMBfromBytes(v[1]);
                    };
                    break;
                case 'Name':
                    //console.log(v[1])
                    break;
                default:
                    break;
            }
        })
        calculateNetStats();
        printNetStats();
    }
});

function calculateNetStats(){
    if (isFirstUpdate.rx_setted == true && isFirstUpdate.rx == true){
        netStats.rx_start = netStats.rx_total;
        isFirstUpdate.rx = false;
    }
    if (isFirstUpdate.tx_setted == true && isFirstUpdate.tx == true){
        netStats.tx_start = netStats.tx_total;
        isFirstUpdate.tx = false;
    }
    if (isFirstUpdate.rx == false){
        netStats.rx_session = (Number(netStats.rx_total)-Number(netStats.rx_start)).toFixed(3);
    }
    if (isFirstUpdate.tx == false){
        netStats.tx_session = (Number(netStats.tx_total)-Number(netStats.tx_start)).toFixed(3);
    }

    if (netStats.tx_speeds.length>average_speed_longly){
        netStats.tx_speeds.shift();
    }
    if (netStats.rx_speeds.length>average_speed_longly){
        netStats.rx_speeds.shift();
    }


    netStats.avg_rx_speed = netStats.rx_speeds.length==average_speed_longly?netStats.rx_speeds.reduce((a,b)=>a+b)/average_speed_longly:0;
    netStats.avg_tx_speed = netStats.tx_speeds.length==average_speed_longly?netStats.tx_speeds.reduce((a,b)=>a+b)/average_speed_longly:0;
    
    
    
};

function getMBfromBytes(bytes){
    return (parseInt(bytes)/1000000).toFixed(3);
};

function sumNumStrings(str1, str2){
    return (Number(str1)+Number(str2)).toFixed(3);
};

function printNetStats(){
    console.clear();
    /*console.log(`С начала запуска компьютера:\n`);
    console.log(`Получено: ${netStats.rx_start} MB\n`);
    console.log(`Отправлено: ${netStats.tx_start} MB\n`);
    console.log(`Всего: ${sumNumStrings(netStats.rx_start, netStats.tx_start)} MB`);*/
    console.log(`За текущую сессию:`);
    console.log(`Получено: ${netStats.rx_session} MB`);
    console.log(`Отправлено: ${netStats.tx_session} MB`);
    console.log(`Всего: ${sumNumStrings(netStats.rx_session, netStats.tx_session)} MB`);
    console.log(`Всего:`);
    console.log(`Получено: ${netStats.rx_total} MB`);
    console.log(`Отправлено: ${netStats.tx_total} MB`);
    console.log(`Всего: ${netStats.all_total} MB`);  
    console.log(`Скорость:`);
    console.log(`Приём: ${netStats.rx_speed} MB/СЕК`);  
    /*if (netStats.tx_speed>=netStats.avg_tx_speed){
        console.log(`Отдача: ${netStats.tx_speed} MB/СЕК`.green);
    } else {
        console.log(`Отдача: ${netStats.tx_speed} MB/СЕК`.red);
    }*/
    if (netStats.tx_speed>=0.15){
        console.log(`Отдача: ${netStats.tx_speed} MB/СЕК`.green);
    } else {
        console.log(`Отдача: ${netStats.tx_speed} MB/СЕК`.red);
    }
    console.log(`Средняя скорость:`);
    console.log(`Приём: ${netStats.avg_rx_speed.toFixed(3)} MB/СЕК`);
    if (netStats.avg_tx_speed>=0.15){
        console.log(`Отдача: ${netStats.avg_tx_speed.toFixed(3)} MB/СЕК`.green);
    } else {
        console.log(`Отдача: ${netStats.avg_tx_speed.toFixed(3)} MB/СЕК`.red);
    }
    
};

const powershellCmd = 'Get-WmiObject Win32_PerfRawData_Tcpip_NetworkInterface | select Name,BytesReceivedPersec,BytesSentPersec,BytesTotalPersec | fl'
const _psToUTF8 = '$OutputEncoding = [System.Console]::OutputEncoding = [System.Console]::InputEncoding = [System.Text.Encoding]::UTF8 ; ';

setInterval( ()=>{
    try {
        powershell.stdin.write(_psToUTF8 + powershellCmd + os.EOL);
        //powershell.stdin.write('exit' + os.EOL);
        //powershell.stdin.end();
    } catch (e) {
        console.log(e.toString('utf8'));
    }
},1000/refrash_speed);

return true;