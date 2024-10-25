const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const readline = require('readline');
const printBanner = require("./config/banner");
const { DateTime } = require('luxon');

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
            process.stdout.write(`===== All accounts complete, wait ${i} seconds to continue loop =====`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        this.log('', 'info');
    }

    async loginByTelegram(initDataString) {
        const url = "https://boink.astronomica.io/public/users/loginByTelegram?p=android";
        const payload = { initDataString };
        try {
            const response = await axios.post(url, payload, { headers: this.headers });
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

    async getUserInfo(token) {
        const url = "https://boink.astronomica.io/api/users/me?p=android";
        const headers = { ...this.headers, "Authorization": token };
        try {
            const response = await axios.get(url, { headers });
            if (response.status === 200) {
                return { success: true, data: response.data };
            } else {
                return { success: false, status: response.status };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async handleFriendActions(token, friendIds) {
        for (const friendId of friendIds) {
            await this.claimFriendReward(token, friendId);
            await this.pushFriendToPlay(token, friendId);
        }
    }

    extractFirstName(initDataString) {
        try {
            const decodedData = decodeURIComponent(initDataString.split('user=')[1].split('&')[0]);
            const userData = JSON.parse(decodedData);
            return userData.first_name;
        } catch (error) {
            this.log("Error unable to match first_name: " + error.message, 'error');
            return "Unknown";
        }
    }

    async upgradeBoinker(token) {
        const url = "https://boink.astronomica.io/api/boinkers/upgradeBoinker?p=android";
        const payload = {};
        const headers = { ...this.headers, "Authorization": token };
        try {
            const response = await axios.post(url, payload, { headers });
            if (response.status === 200 && response.data) {
                const { newSoftCurrencyAmount, newSlotMachineEnergy, rank } = response.data;
                this.log(`Upgrade sukses, Coin: ${newSoftCurrencyAmount} | Spin: ${newSlotMachineEnergy} | Rank: ${rank}`, 'success');
                return { success: true };
            } else {
                this.log(`Upgrade failed! Kode status: ${response.status}`, 'error');
                return { success: false };
            }
        } catch (error) {
            this.log(`Not enough coins to upgrade further!`, 'error');
            return { success: false, error: error.message };
        }
    }


    async claimBooster(token, spin) {
        const payload = spin > 30 
        ? { multiplier: 2, optionNumber: 3 } 
        : { multiplier: 2, optionNumber: 1 };
    
        try {
            const response = await axios.post("https://boink.astronomica.io/api/boinkers/addShitBooster?p=android", payload, {
                headers: { ...this.headers, "Authorization": token },
            });
            if (response.status === 200) {
                const result = response.data;
                let nextBoosterTime = result.boinker?.booster?.x2?.lastTimeFreeOptionClaimed
                    ? DateTime.fromISO(result.boinker.booster.x2.lastTimeFreeOptionClaimed)
                    : null;
    
                if (nextBoosterTime) {
                    nextBoosterTime = nextBoosterTime.plus({ hours: 2, minutes: 5 });
                }
    
                this.log(`Buy boosts success! coin: ${result.userPostBooster.newCryptoCurrencyAmount || 0}`, 'success');
                this.log(`Rank: ${result.userPostBooster.rank}`, 'info');
                if (nextBoosterTime) {
                    this.log(`Get boosts every day: ${nextBoosterTime.toLocaleString(DateTime.DATETIME_MED)}`, 'info');
                } else {
                    this.log(`Can not determine when to buy the next boosts.`, 'warning');
                }
                
                return { success: true, nextBoosterTime };
            } else {
                this.log(`Error naling for boosts!`, 'error');
                return { success: false, error: 'API error' };
            }
        } catch (error) {
            console.log(error);
            this.log(`Error sending request to buy boosts: ${error.message}`, 'error');
            return { success: false, error: error.message };
        }
    }

    async spinSlotMachine(token, spins) {
        const spinAmounts = [150, 50, 25, 10, 5, 1];
        let remainingSpins = spins;
        
        while (remainingSpins > 0) {
            let spinAmount = spinAmounts.find(amount => amount <= remainingSpins) || 1;
            
            const url = `https://boink.astronomica.io/api/play/spinSlotMachine/${spinAmount}?p=android`;
            const headers = { ...this.headers, "Authorization": token };
            
            try {
                const response = await axios.post(url, {}, { headers });
                if (response.status === 200) {
                    const result = response.data;
                    this.log(`Spin successfully (${result.outcome}): Coin: ${result.newSoftCurrencyAmount.toString().white}${` | Shit: `.magenta}${result.newCryptoCurrencyAmount.toFixed(2).white}`.magenta, 'custom');
                    remainingSpins -= spinAmount;
                } else {
                    this.log(`Recording error: Status code ${response.status}`, 'error');
                    break;
                }
            } catch (error) {
                this.log(`Error sending record request: ${error.message}`, 'error');
                break;
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000)); 
        }
    }

    async performRewardedActions(token) {
        const getRewardedActionListUrl = "https://boink.astronomica.io/api/rewardedActions/getRewardedActionList?p=android";
        const getUserInfoUrl = "https://boink.astronomica.io/api/users/me?p=android";
        const headers = { ...this.headers, "Authorization": token };
    
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
            const userInfoResponse = await axios.get(getUserInfoUrl, { headers });
            if (userInfoResponse.status !== 200) {
                this.log(`Unable to get user information. Status code: ${userInfoResponse.status}`, 'error');
                return;
            }
            const userInfo = userInfoResponse.data;
    
            this.log("Take a to-do list...", 'info');
            const response = await axios.get(getRewardedActionListUrl, { headers });
            if (response.status !== 200) {
                this.log(`Could not get task list. Kode status: ${response.status}`, 'error');
                return;
            }
    
            const rewardedActions = response.data;
            this.log(`Understand ${rewardedActions.length} misi`, 'success');
    
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
                        this.log(`It took ${waitMinutes} minutes to continue creating the mission ${nameId}`, 'info');
                    } else {
                        this.log(`misi ${nameId} it has been done before`, 'info');
                    }
                    continue;
                }
    
                if (nameId === 'SeveralHourlsRewardedAdTask' || nameId === 'SeveralHourlsRewardedAdTask2') {
                    const providerId = nameId === 'SeveralHourlsRewardedAdTask' ? 'adsgram' : 'onclicka';
                    await this.handleAdTask(token, nameId, providerId);
                } else {
                    const clickUrl = `https://boink.astronomica.io/api/rewardedActions/rewardedActionClicked/${nameId}?p=android`;
                    try {
                        const clickResponse = await axios.post(clickUrl, {}, { headers });
                        this.log(`Create a mission ${nameId.yellow}. status: ${`pending`.yellow}`);
                    } catch (clickError) {
                        this.log(`Error Create a mission ${nameId}: ${clickError.message}`, 'error');
                        if (clickError.response) {
                            this.log(`Error details: ${JSON.stringify(clickError.response.data)}`, 'error');
                        }
                        continue;
                    }
    
                    this.log(`Please wait 2 seconds before getting your gift...`, 'info');
                    await new Promise(resolve => setTimeout(resolve, 2000));
    
                    const claimUrl = `https://boink.astronomica.io/api/rewardedActions/claimRewardedAction/${nameId}?p=android`;
                    try {
                        const claimResponse = await axios.post(claimUrl, {}, { headers });
                        if (claimResponse.status === 200) {
                            const result = claimResponse.data;
                            const reward = result.prizeGotten;
                            this.log(`Misi lengkap ${nameId} sukses | Penghargaan: ${reward}`, 'success');
                        } else {
                            this.log(`Unable to receive rewards ${nameId}. Status wa: ${claimResponse.status}`, 'error');
                        }
                    } catch (claimError) {
                        this.log(`Mistakes go unpunished ${nameId}: Waiting time is still available!`, 'error');
                    }
                }
    
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {
            this.log(`Error while executing the misi: ${error.message}`, 'error');
            if (error.response) {
                this.log(`Error details: ${JSON.stringify(error.response.data)}`, 'error');
            }
        }
    }
    
    async handleAdTask(token, nameId, providerId) {
        const headers = { ...this.headers, "Authorization": token };
    
        try {
            const clickUrl = `https://boink.astronomica.io/api/rewardedActions/rewardedActionClicked/${nameId}?p=android`;
            await axios.post(clickUrl, {}, { headers });
            this.log(`Clicked on the wrong ad ${nameId}`, 'success');
    
            await new Promise(resolve => setTimeout(resolve, 2000));
    
            const adWatchedUrl = "https://boink.astronomica.io/api/rewardedActions/ad-watched?p=android";
            await axios.post(adWatchedUrl, { providerId }, { headers });
            this.log(`View the ad confirmed for ${nameId}`, 'success');
    
            await new Promise(resolve => setTimeout(resolve, 2000));
    
            const claimUrl = `https://boink.astronomica.io/api/rewardedActions/claimRewardedAction/${nameId}?p=android`;
            this.log(`Submit a reward request for an ad mission ${nameId}...`, 'info');
            const claimResponse = await axios.post(claimUrl, {}, { headers });
            
            if (claimResponse.status === 200) {
                const result = claimResponse.data;
                const reward = result.prizeGotten;
                this.log(`Complete mission ads ${nameId} sukses | Penghargaan: ${reward}`, 'success');
            } else {
                this.log(`Can't get Ad mission rewards${nameId}. Status wa: ${claimResponse.status}`, 'error');
            }
        } catch (error) {
            this.log(`Error processing ad mission ${nameId}: Waiting time is still available!`, 'error');
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

                console.log(`Account ${i + 1}/${data.length} | ${firstName.green}`);
                
                const parsedData = JSON.parse(decodeURIComponent(initDataString.split('user=')[1].split('&')[0]));
                const userId = parsedData.id;

                let token = this.getToken(userId);
                if (!token) {
                    this.log(`No token found for Account ${userId}, login...`, 'warning');
                    const loginResult = await this.loginByTelegram(initDataString);
                    if (loginResult.success) {
                        this.log('Log in sukses!', 'success');
                        token = loginResult.token;
                        this.saveToken(userId, token);
                    } else {
                        this.log(`Login failed! ${loginResult.status || loginResult.error}`, 'error');
                        continue; 
                    }
                } else {
                    this.log(`Token available for Account ${userId}.`, 'success');
                }

                try {
                    const userInfoResult = await this.getUserInfo(token);
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
                            const boosterResult = await this.claimBooster(token, userInfo.gamesEnergy.slotMachine.energy);
                            if (!boosterResult.success) {
                                this.log(`Can't get a booster: ${boosterResult.error}`, 'error');
                            }
                        } else {
                            const nextBoosterTime = lastClaimedTime.plus({ hours: 2, minutes: 5 });
                            this.log(`Time to buy the next boosts: ${nextBoosterTime.toLocaleString(DateTime.DATETIME_MED)}`, 'info');
                        }

                        const spinuser = await this.getUserInfo(token);
                        const spinUser = spinuser.data;
                        const spins = spinUser.gamesEnergy.slotMachine.energy;
                        if (spins > 0) {
                            this.log(`Start filming with ${spins} turns`, 'yellow');
                            await this.spinSlotMachine(token, spins);
                        } else {
                            this.log('There is no turn', 'warning');
                        }

                        await this.performRewardedActions(token);

                        let upgradeSuccess = true;
                        while (upgradeSuccess) {
                            const upgradeResult = await this.upgradeBoinker(token);
                            upgradeSuccess = upgradeResult.success;
                        }
                    } else {
                        this.log(`Could not get user information! My status: ${userInfoResult.status || userInfoResult.error}`, 'error');
                    }
                } catch (error) {
                    this.log(`Error while processing Account: ${error.message}`, 'error');
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            await this.countdown(10 * 60); 
        }
    }
}


printBanner();
const boink = new Boink();
boink.main().catch(err => {
    boink.log(err.message, 'error');
    process.exit(1);
});
