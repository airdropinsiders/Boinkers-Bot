const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const readline = require('readline');
const { DateTime } = require('luxon');
const { HttpsProxyAgent } = require('https-proxy-agent');

class Boink {
    constructor() {
        this.headers = {
            "Accept": "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
            "Content-Type": "application/json",
            "Origin": "https://boink.astronomica.io",
            "Referer": "https://boink.astronomica.io/?tgWebAppStartParam=boink376905749",
            "Sec-Ch-Ua": '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        };
        this.proxies = this.loadProxies();
        this.currentProxyIndex = 0;
    }

    loadProxies() {
        try {
            return fs.readFileSync('./../boinkers/data/proxy.txt', 'utf8').split('\n').filter(Boolean);
        } catch (error) {
            this.log('Ora bisa maca file proxy.txt', 'error');
            return [];
        }
    }

    getNextProxy() {
        if (this.proxies.length === 0) return null;
        const proxy = this.proxies[this.currentProxyIndex];
        this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxies.length;
        return proxy;
    }

    log(msg, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        switch(type) {
            case 'success':
                console.log(`[${timestamp}] [*] ${msg}`.green);
                break;
            case 'custom':
                console.log(`[${timestamp}] [*] ${msg}`);
                break;        
            case 'error':
                console.log(`[${timestamp}] [!] ${msg}`.red);
                break;
            case 'warning':
                console.log(`[${timestamp}] [*] ${msg}`.yellow);
                break;
            default:
                console.log(`[${timestamp}] [*] ${msg}`.blue);
        }
    }

    async countdown(seconds) {
        for (let i = seconds; i >= 0; i--) {
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`===== Kabeh akun rampung, ngenteni ${i} detik kanggo nerusake daur ulang =====`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        this.log('', 'info');
    }

    async loginByTelegram(initDataString, proxy) {
        const url = "https://boink.astronomica.io/public/users/loginByTelegram?p=android";
        const payload = { initDataString };
        const httpsAgent = proxy ? new HttpsProxyAgent(proxy) : null;
        
        try {
            const response = await axios.post(url, payload, { 
                headers: this.headers,
                httpsAgent: httpsAgent
            });
            if (response.status === 200) {
                return { success: true, token: response.data.token };
            } else {
                return { success: false, status: response.status };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    saveToken(userId, token) {
        let tokens = {};
        if (fs.existsSync('token.json')) {
            tokens = JSON.parse(fs.readFileSync('token.json', 'utf8'));
        }
        tokens[userId] = token;
        fs.writeFileSync('token.json', JSON.stringify(tokens, null, 2));
    }

    getToken(userId) {
        if (fs.existsSync('token.json')) {
            const tokens = JSON.parse(fs.readFileSync('token.json', 'utf8'));
            return tokens[userId];
        }
        return null;
    }

    async getUserInfo(token, proxy) {
        const url = "https://boink.astronomica.io/api/users/me?p=android";
        const headers = { ...this.headers, "Authorization": token };
        const httpsAgent = proxy ? new HttpsProxyAgent(proxy) : null;
        
        try {
            const response = await axios.get(url, { headers, httpsAgent });
            if (response.status === 200) {
                return { success: true, data: response.data };
            } else {
                return { success: false, status: response.status };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    extractFirstName(initDataString) {
        try {
            const decodedData = decodeURIComponent(initDataString.split('user=')[1].split('&')[0]);
            const userData = JSON.parse(decodedData);
            return userData.first_name;
        } catch (error) {
            this.log("Kesalahan ora bisa njupuk first_name: " + error.message, 'error');
            return "Unknown";
        }
    }

    async upgradeBoinker(token, proxy) {
        const url = "https://boink.astronomica.io/api/boinkers/upgradeBoinker?p=android";
        const payload = {};
        const headers = { ...this.headers, "Authorization": token };
        const httpsAgent = proxy ? new HttpsProxyAgent(proxy) : null;
        
        try {
            const response = await axios.post(url, payload, { headers, httpsAgent });
            if (response.status === 200 && response.data) {
                const { newSoftCurrencyAmount, newSlotMachineEnergy, rank } = response.data;
                this.log(`Upgrade sukses, Coin: ${newSoftCurrencyAmount} | Spin: ${newSlotMachineEnergy} | Rank: ${rank}`, 'success');
                return { success: true };
            } else {
                this.log(`Nganyarke gagal! Kode status: ${response.status}`, 'error');
                return { success: false };
            }
        } catch (error) {
            this.log(`Ora cukup dhuwit recehan kanggo upgrade luwih!`, 'error');
            return { success: false, error: error.message };
        }
    }

    async claimBooster(token, spin, proxy) {
        const payload = spin > 30 
        ? { multiplier: 2, optionNumber: 3 } 
        : { multiplier: 2, optionNumber: 1 };
    
        const httpsAgent = proxy ? new HttpsProxyAgent(proxy) : null;
        
        try {
            const response = await axios.post("https://boink.astronomica.io/api/boinkers/addShitBooster?p=android", payload, {
                headers: { ...this.headers, "Authorization": token },
                httpsAgent: httpsAgent
            });
            if (response.status === 200) {
                const result = response.data;
                let nextBoosterTime = result.boinker?.booster?.x2?.lastTimeFreeOptionClaimed
                    ? DateTime.fromISO(result.boinker.booster.x2.lastTimeFreeOptionClaimed)
                    : null;
    
                if (nextBoosterTime) {
                    nextBoosterTime = nextBoosterTime.plus({ hours: 2, minutes: 5 });
                }
    
                this.log(`Tuku boosts sukses! duwit receh: ${result.userPostBooster.newCryptoCurrencyAmount || 0}`, 'success');
                this.log(`Rank: ${result.userPostBooster.rank}`, 'info');
                if (nextBoosterTime) {
                    this.log(`Tuku boosts sabanjuré: ${nextBoosterTime.toLocaleString(DateTime.DATETIME_MED)}`, 'info');
                } else {
                    this.log(`Ora bisa nemtokake nalika tuku boosts sabanjuré.`, 'warning');
                }
                
                return { success: true, nextBoosterTime };
            } else {
                this.log(`Kesalahan nalika tuku boosts!`, 'error');
                return { success: false, error: 'API error' };
            }
        } catch (error) {
            this.log(`Kesalahan ngirim panjalukan kanggo tuku boosts: ${error.message}`, 'error');
            return { success: false, error: error.message };
        }
    }

    async spinSlotMachine(token, spins, proxy) {
        const spinAmounts = [150, 50, 25, 10, 5, 1];
        let remainingSpins = spins;
        const httpsAgent = proxy ? new HttpsProxyAgent(proxy) : null;
        
        while (remainingSpins > 0) {
            let spinAmount = spinAmounts.find(amount => amount <= remainingSpins) || 1;
            
            const url = `https://boink.astronomica.io/api/play/spinSlotMachine/${spinAmount}?p=android`;
            const headers = { ...this.headers, "Authorization": token };
            
            try {
                const response = await axios.post(url, {}, { headers, httpsAgent });
                if (response.status === 200) {
                    const result = response.data;
                    this.log(`Spin kasil (${result.outcome}): Coin: ${result.newSoftCurrencyAmount.toString().white}${` | Shit: `.magenta}${result.newCryptoCurrencyAmount.toFixed(2).white}`.magenta, 'custom');
                    remainingSpins -= spinAmount;
                } else {
                    this.log(`Kesalahan nalika ngrekam: Kode status ${response.status}`, 'error');
                    break;
                }
            } catch (error) {
                this.log(`Kesalahan ngirim panjalukan rekaman: ${error.message}`, 'error');
                break;
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000)); 
        }
    }

    async performRewardedActions(token, proxy) {
        const getRewardedActionListUrl = "https://boink.astronomica.io/api/rewardedActions/getRewardedActionList?p=android";
        const getUserInfoUrl = "https://boink.astronomica.io/api/users/me?p=android";
        const headers = { ...this.headers, "Authorization": token };
        const httpsAgent = proxy ? new HttpsProxyAgent(proxy) : null;
    
        const skippedTasks = [
            'twitterQuotePost20',
            'telegramShareStory5',
            'emojiOnPostTelegramNewsChannel',
            'NotGoldReward',
            'NotPlatinumReward',
            'connectTonWallet',
            'telegramJoinBoinkersNewsChannel',
            'telegramJoinAcidGames',
            'inviteAFriend'
        ];
    
        try {
            const userInfoResponse = await axios.get(getUserInfoUrl, { headers, httpsAgent });
            if (userInfoResponse.status !== 200) {
                this.log(`Ora bisa entuk informasi pangguna. Kode status: ${userInfoResponse.status}`, 'error');
                return;
            }
            const userInfo = userInfoResponse.data;
    
            this.log("Njupuk dhaptar tugas...", 'info');
            const response = await axios.get(getRewardedActionListUrl, { headers, httpsAgent });
            if (response.status !== 200) {
                this.log(`Ora bisa entuk dhaptar tugas. Kode status: ${response.status}`, 'error');
                return;
            }
    
            const rewardedActions = response.data;
            this.log(`Ngerti ${rewardedActions.length} misi`, 'success');
    
            for (const action of rewardedActions) {
                const nameId = action.nameId;
                
                if (skippedTasks.includes(nameId)) {
                    this.log(`Skip misi: ${nameId}`, 'warning');
                    continue;
                }
    
                const currentTime = new Date();
                let canPerformTask = true;
                let waitTime = null;
    
                if (userInfo.rewardedActions && userInfo.rewardedActions[nameId]) {
                    const lastClaimTime = new Date(userInfo.rewardedActions[nameId].claimDateTime);
                    
                    if (nameId === 'SeveralHourlsReward') {
                        const nextAvailableTime = new Date(lastClaimTime.getTime() + 6 * 60 * 60 * 1000);
                        if (currentTime < nextAvailableTime) {
                            canPerformTask = false;
                            waitTime = nextAvailableTime;
                        }
                    } else if (nameId === 'SeveralHourlsRewardedAdTask' || nameId === 'SeveralHourlsRewardedAdTask2') {
                        const nextAvailableTime = new Date(lastClaimTime.getTime() + 6 * 60 * 1000);
                        if (currentTime < nextAvailableTime) {
                            canPerformTask = false;
                            waitTime = nextAvailableTime;
                        }
                    } else if (userInfo.rewardedActions[nameId].claimDateTime) {
                        canPerformTask = false;
                    }
                }
    
                if (!canPerformTask) {
                    if (waitTime) {
                        const waitMinutes = Math.ceil((waitTime - currentTime) / (60 * 1000));
                        this.log(`Perlu ngenteni ${waitMinutes} menit kanggo terus nggawe misi ${nameId}`, 'info');
                    } else {
                        this.log(`misi ${nameId} wis rampung sadurunge`, 'info');
                    }
                    continue;
                }
    
                if (nameId === 'SeveralHourlsRewardedAdTask' || nameId === 'SeveralHourlsRewardedAdTask2') {
                    const providerId = nameId === 'SeveralHourlsRewardedAdTask' ? 'adsgram' : 'onclicka';
                    await this.handleAdTask(token, nameId, providerId, proxy);
                } else {
                    const clickUrl = `https://boink.astronomica.io/api/rewardedActions/rewardedActionClicked/${nameId}?p=android`;
                    try {
                        const clickResponse = await axios.post(clickUrl, {}, { headers, httpsAgent });
                        this.log(`Nggawe misi ${nameId.yellow}. status: ${`pending`.yellow}`);
                    } catch (clickError) {
                        this.log(`Lỗi khi Nggawe misi ${nameId}: ${clickError.message}`, 'error');
                        if (clickError.response) {
                            this.log(`Chi tiết lỗi: ${JSON.stringify(clickError.response.data)}`, 'error');
                        }
                        continue;
                    }
    
                    this.log(`Enteni 2 detik sadurunge entuk hadiah...`, 'info');
                    await new Promise(resolve => setTimeout(resolve, 2000));
    
                    const claimUrl = `https://boink.astronomica.io/api/rewardedActions/claimRewardedAction/${nameId}?p=android`;
                    try {
                        const claimResponse = await axios.post(claimUrl, {}, { headers, httpsAgent });
                        if (claimResponse.status === 200) {
                            const result = claimResponse.data;
                            const reward = result.prizeGotten;
                            this.log(`Misi lengkap ${nameId} sukses | Penghargaan: ${reward}`, 'success');
                        } else {
                            this.log(`Ora bisa nampa ganjaran ${nameId}. Status wa: ${claimResponse.status}`, 'error');
                        }
                    } catch (claimError) {
                        this.log(`Kesalahan nalika nampa ganjaran ${nameId}: Wektu nunggu isih kasedhiya!`, 'error');
                    }
                }
    
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {
            this.log(`Lỗi khi thực hiện các misi: ${error.message}`, 'error');
            if (error.response) {
                this.log(`Chi tiết lỗi: ${JSON.stringify(error.response.data)}`, 'error');
            }
        }
    }
    
    async handleAdTask(token, nameId, providerId, proxy) {
        const headers = { ...this.headers, "Authorization": token };
        const httpsAgent = proxy ? new HttpsProxyAgent(proxy) : null;
    
        try {
            const clickUrl = `https://boink.astronomica.io/api/rewardedActions/rewardedActionClicked/${nameId}?p=android`;
            await axios.post(clickUrl, {}, { headers, httpsAgent });
            this.log(`Salah ngeklik iklan ${nameId}`, 'success');
    
            await new Promise(resolve => setTimeout(resolve, 2000));
    
            const adWatchedUrl = "https://boink.astronomica.io/api/rewardedActions/ad-watched?p=android";
            await axios.post(adWatchedUrl, { providerId }, { headers, httpsAgent });
            this.log(`Ndeleng iklan dikonfirmasi kanggo ${nameId}`, 'success');
    
            await new Promise(resolve => setTimeout(resolve, 2000));
    
            const claimUrl = `https://boink.astronomica.io/api/rewardedActions/claimRewardedAction/${nameId}?p=android`;
            this.log(`Kirim panjalukan ganjaran kanggo misi iklan ${nameId}...`, 'info');
            const claimResponse = await axios.post(claimUrl, {}, { headers, httpsAgent });
            
            if (claimResponse.status === 200) {
                const result = claimResponse.data;
                const reward = result.prizeGotten;
                this.log(`Iklan misi lengkap ${nameId} sukses | Penghargaan: ${reward}`, 'success');
            } else {
                this.log(`Ora bisa nampa ganjaran misi Iklan${nameId}. Status wa: ${claimResponse.status}`, 'error');
            }
        } catch (error) {
            this.log(`Kesalahan nalika ngolah misi iklan ${nameId}: Wektu nunggu isih kasedhiya!`, 'error');
        }
    }

    async checkProxyIP(proxy) {
        try {
            const proxyAgent = new HttpsProxyAgent(proxy);
            const response = await axios.get('https://api.ipify.org?format=json', {
                httpsAgent: proxyAgent,
                timeout: 10000 
            });
            if (response.status === 200) {
                return response.data.ip;
            } else {
                throw new Error(`Ora bisa mriksa IP proxy. Kode status: ${response.status}`);
            }
        } catch (error) {
            throw new Error(`Kesalahan nalika mriksa IP proxy: ${error.message}`);
        }
    }

    formatProxy(proxy) {
        // from ip:port:user:pass to http://user:pass@ip:port
        // if http format, just keep it
        if (proxy.startsWith('http')) {
            return proxy;
        }

        const parts = proxy.split(':');
        if (parts.length === 4) {
            return `http://${parts[2]}:${parts[3]}@${parts[0]}:${parts[1]}`
        } else {
            return `http://${parts[0]}:${parts[1]}`;
        }
    }

    async main() {
        const dataFile = path.join(__dirname, './../boinkers/data/boinkers.txt');
        const data = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);

        while (true) {
            for (let i = 0; i < data.length; i++) {
                const initDataString = data[i];
                const firstName = this.extractFirstName(initDataString);
                const proxy = this.formatProxy(this.getNextProxy());

                let proxyIP = 'Unknown';
                if (proxy) {
                    try {
                        proxyIP = await this.checkProxyIP(proxy);
                    } catch (error) {
                        this.log(`Ora bisa mriksa IP proxy: ${error.message}`, 'warning');
                        continue;
                    }
                } else {
                    this.log('Ora ana proxy sing kasedhiya', 'warning');
                }

                console.log(`========== Akun ${i+1}/${data.length}  | ${firstName.green} | ip: ${proxyIP} ==========`);
                
                const parsedData = JSON.parse(decodeURIComponent(initDataString.split('user=')[1].split('&')[0]));
                const userId = parsedData.id;

                let token = this.getToken(userId);
                if (!token) {
                    this.log(`Ora ana token sing ditemokake kanggo Akun ${userId}, mlebu...`, 'warning');
                    const loginResult = await this.loginByTelegram(initDataString, proxy);
                    if (loginResult.success) {
                        this.log('Log in sukses!', 'success');
                        token = loginResult.token;
                        this.saveToken(userId, token);
                    } else {
                        this.log(`Mlebet gagal! ${loginResult.status || loginResult.error}`, 'error');
                        continue; 
                    }
                } else {
                    this.log(`Token kasedhiya kanggo Akun ${userId}.`, 'success');
                }

                try {
                    const userInfoResult = await this.getUserInfo(token, proxy);
                    if (userInfoResult.success) {
                        const userInfo = userInfoResult.data;
                        this.log(`Level: ${userInfo.boinkers.currentBoinkerProgression.level}`, 'info');
                        this.log(`Coin Balance: ${userInfo.currencySoft}`, 'info');
                        if (userInfo.currencyCrypto !== undefined) {
                            this.log(`Shit Balance: ${userInfo.currencyCrypto}`, 'info');
                        }
                        this.log(`Spin: ${userInfo.gamesEnergy.slotMachine.energy}`, 'info');

                        const currentTime = DateTime.now();
                        const lastClaimedTime = userInfo.boinkers?.booster?.x2?.lastTimeFreeOptionClaimed 
                            ? DateTime.fromISO(userInfo.boinkers.booster.x2.lastTimeFreeOptionClaimed) 
                            : null;
                        
                        if (!lastClaimedTime || currentTime > lastClaimedTime.plus({ hours: 2, minutes: 5 })) {
                            const boosterResult = await this.claimBooster(token, userInfo.gamesEnergy.slotMachine.energy, proxy);
                            if (!boosterResult.success) {
                                this.log(`Ora bisa njaluk booster: ${boosterResult.error}`, 'error');
                            }
                        } else {
                            const nextBoosterTime = lastClaimedTime.plus({ hours: 2, minutes: 5 });
                            this.log(`Wektu kanggo tuku boosts sabanjuré: ${nextBoosterTime.toLocaleString(DateTime.DATETIME_MED)}`, 'info');
                        }

                        const spinuser = await this.getUserInfo(token, proxy);
                        const spinUser = spinuser.data;
                        const spins = spinUser.gamesEnergy.slotMachine.energy;
                        if (spins > 0) {
                            this.log(`Miwiti syuting karo ${spins} giliran`, 'yellow');
                            await this.spinSlotMachine(token, spins, proxy);
                        } else {
                            this.log('Ora ana giliran', 'warning');
                        }

                        await this.performRewardedActions(token, proxy);

                        let upgradeSuccess = true;
                        while (upgradeSuccess) {
                            const upgradeResult = await this.upgradeBoinker(token, proxy);
                            upgradeSuccess = upgradeResult.success;
                        }
                    } else {
                        this.log(`Ora bisa entuk informasi pangguna! Status wa: ${userInfoResult.status || userInfoResult.error}`, 'error');
                    }
                } catch (error) {
                    this.log(`Kesalahan nalika ngolah Akun: ${error.message}`, 'error');
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            await this.countdown(10 * 60); 
        }
    }
}

const boink = new Boink();
boink.main().catch(err => {
    boink.log(err.message, 'error');
    process.exit(1);
});
