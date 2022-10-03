console.log('starting...');

const spawn = require('child_process').spawn;
const util = require('util');
const os = require('os');

var netStats = {
    all_total: 0,
    rx_total: 0,
    tx_total: 0,
    rx_start: 0,
    tx_start: 0,
    rx_session: 0,
    tx_session: 0,
};

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
                    netStats.rx_total = getMBfromBytes(v[1]);
                    isFirstUpdate.rx_setted = true;
                    break;
                case 'BytesSentPersec':
                    netStats.tx_total = getMBfromBytes(v[1]);
                    isFirstUpdate.tx_setted = true;
                    break;
                case 'BytesTotalPersec':
                    netStats.all_total = getMBfromBytes(v[1]);
                    break;
                case 'Name':
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
        netStats.rx_session = (Number(netStats.rx_total)-Number(netStats.rx_start)).toFixed(2);
    }
    if (isFirstUpdate.tx == false){
        netStats.tx_session = (Number(netStats.tx_total)-Number(netStats.tx_start)).toFixed(2);;
    }    
};

function getMBfromBytes(bytes){
    return (parseInt(bytes)/1000000).toFixed(2);
};

function sumNumStrings(str1, str2){
    return (Number(str1)+Number(str2)).toFixed(2);
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
},1000);

return true;