const { pool } = require('../dbConnection/index');
// const indiaTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
// const formattedTime = new Date(indiaTime);
// const time = formattedTime.toISOString().slice(0, 19).replace("T", " ");
const indiaTime = new Date().toLocaleString("en-GB", { timeZone: "Asia/Kolkata", hour12: false, });
const [datePart, timePart] = indiaTime.split(', ');
const Time = `${datePart.split('/').reverse().join('-')} ${timePart}`;
const { trx_id } = require('./createRandomNum');
// const conn = pool;

// Calculate referral bonus
const calculateReferralBonusWithTurboCheck = async (conn, level, pool, amount, referrerId) => {
    // Validate input parameters
    if (!level || !pool || !amount || !referrerId) {
        throw new Error('Invalid parameters for bonus calculation');
    }
    let bonusAmount;

    // Match Solidity logic for level vs pool comparison
    if (level === pool) {

        const [system_data] = await conn.execute('SELECT * FROM system_settings');
        if (system_data.length == 0) {
            console.log('system data not found');
            return;
        }
        // Get user's turbo status
        const [user] = await conn.execute(`SELECT is_turbo FROM user WHERE userid = ? LIMIT 1`, [referrerId]);
        if (!user || !user.length) {
            throw new Error(`Referrer ${referrerId} not found`);
        }
        //check level is active or not
        const [isActive_Level] = await conn.execute(
            `SELECT 1 FROM user_levels WHERE userid = ? AND level = ? AND is_active = TRUE LIMIT 1`,
            [referrerId, pool]
        );
        // Apply turbo or non-turbo percentage as in Solidity
        if (user[0].is_turbo && isActive_Level.length > 0) {
            console.log(user[0].is_turbo && isActive_Level, 'user[0].is_turbo && isActive_Level');

            const SPONSOR_REWARD_PERCENT = system_data[0].SPONSOR_REWARD_PERCENT
            bonusAmount = (parseFloat(SPONSOR_REWARD_PERCENT) / 100) * parseFloat(amount);  // 20% for turbo
        } else {
            const is_notTurbo_per = system_data[0].is_notTurbo_per;
            bonusAmount = (parseFloat(is_notTurbo_per) / 100) * parseFloat(amount);  //10% for without turbo
            const SPONSOR_REWARD_PERCENT = system_data[0].SPONSOR_REWARD_PERCENT
            let mainbonus = (parseFloat(SPONSOR_REWARD_PERCENT) / 100) * parseFloat(amount);  // 20% for turbo
            await conn.execute('UPDATE user SET turbo_income = turbo_income + ? WHERE userid = ?', [(mainbonus - bonusAmount), referrerId]);
        }
    } else {
        // 1% for other levels
        bonusAmount = amount / 100;
    }

    return parseFloat(bonusAmount);
};

// Calculate coreferral bonus
const calculateCoreferralBonusWithTurboCheck = async (conn, level, pool, amount, coreferrerId) => {
    if (!level || !pool || !amount || !coreferrerId) {
        throw new Error('Invalid parameters for coreferral bonus calculation');
    }

    let bonusAmount;

    if (level === pool) {
        const [system_data] = await conn.execute('SELECT * FROM system_settings');
        if (system_data.length === 0) {
            console.log('System settings not found');
            return;
        }

        const [user] = await conn.execute(`SELECT is_turbo FROM user WHERE userid = ? LIMIT 1`, [coreferrerId]);
        if (!user || !user.length) {
            throw new Error(`Coreferrer ${coreferrerId} not found`);
        }
        //  Check partner level activation status
        const [isActive_Level] = await conn.execute(
            `SELECT 1 FROM partner_levels 
             WHERE userid = ? AND level = ? AND is_active = TRUE LIMIT 1`,
            [coreferrerId, pool]
        );

        if (user[0].is_turbo && isActive_Level.length > 0) {
            const COREFFERAL_REWARD_PERCENT = system_data[0].COREFFERAL_REWARD_PERCENT;
            bonusAmount = (parseFloat(COREFFERAL_REWARD_PERCENT) / 100) * parseFloat(amount);
        } else {
            const is_notTurbo_per = system_data[0].is_notTurbo_per;
            bonusAmount = (parseFloat(is_notTurbo_per) / 100) * parseFloat(amount);
            const SPONSOR_REWARD_PERCENT = system_data[0].SPONSOR_REWARD_PERCENT
            let mainbonus = (parseFloat(SPONSOR_REWARD_PERCENT) / 100) * parseFloat(amount);  // 20% for turbo
            await conn.execute('UPDATE user SET turbo_income = turbo_income + ? WHERE userid = ?', [(mainbonus - bonusAmount), coreferrerId]);
        }
    } else {
        bonusAmount = amount / 100;
    }
    return parseFloat(bonusAmount);
};

///processReferralBonuses--------------------
const processReferralBonuses = async (conn, userId, referral_user, level, amount, pool, time, payment_id, isrefferal = false) => {
    // Validate input parameters
    if (!conn || !userId || level < 1 || level > 10 || !amount || !pool || !time) {
        throw new Error('Invalid parameters for referral bonus processing');
    }
    try {
        // Get user's referrer (with proper null checks)
        const [user] = await conn.execute(`SELECT reffereral_code FROM user WHERE userid = ? LIMIT 1`, [userId]);
        if (!user || !user[0]?.reffereral_code) {
            console.log(`No referrer found for user ${userId}`);
            return;
        }
        const referrerId = user[0].reffereral_code;
        if (!referrerId) return;
        // Calculate bonus amount with turbo check
        const bonusAmount = await calculateReferralBonusWithTurboCheck(conn, level, pool, amount, referrerId);
        if (isNaN(bonusAmount) || bonusAmount <= 0) {
            throw new Error(`Invalid bonus amount calculated: ${bonusAmount}`);
        }

        // Get referrer's data with transaction safety
        const [referrer] = await conn.execute(`SELECT userid, income FROM user WHERE userid = ? FOR UPDATE`, [referrerId]);
        if (!referrer[0]) throw new Error(`Referrer ${referrerId} not found`);

        // Check if referrer has next level activated
        const [hasNextLevel] = await conn.execute(
            `SELECT 1 FROM user_levels WHERE userid = ? AND level = ? AND is_active = TRUE LIMIT 1`,
            [referrerId, pool + 1]
        );

        // Process bonus based on level activation status
        // if (hasNextLevel.length > 0) {
        //     // // Direct credit to balance with atomic update
        //     // await conn.execute(`UPDATE user SET income = income + ? WHERE userid = ?`, [bonusAmount, referrerId]);
        //     // Directly add to distributed (like Solidity)
        //     await conn.execute(`UPDATE system_settings SET total_distributed = total_distributed + ?`, [bonusAmount]);
        // } else {
        //     // // Credit to upgrade pool with upsert
        //     // await conn.execute(
        //     //     `INSERT INTO user_upgrade_power (userid, level, amount, time)
        //     //      VALUES (?, ?, ?, ?)
        //     //      ON DUPLICATE KEY UPDATE
        //     //         amount = amount + VALUES(amount),
        //     //         time = GREATEST(time, VALUES(time))`,
        //     //     [referrerId, pool, bonusAmount, time]
        //     // );
        //     // Also update user's income to reflect the upgrade power addition
        //     await conn.execute(`UPDATE user SET income = income + ? WHERE userid = ?`, [bonusAmount, referrerId]);
        // }

        //update users income by bonusAmount
        await conn.execute(`UPDATE user SET income = income + ?,sponser_income =sponser_income+?,user_turnover = user_turnover + ? WHERE userid = ?`, [bonusAmount, bonusAmount, amount, referrerId]);

        // Update height levels with dynamic field selection
        const heightField = `level_${Math.min(level, 10)}`; // Ensure we don't exceed level_10
        await conn.execute(
            `INSERT INTO height_levels (userid, pool_level, ${heightField}, time) 
             VALUES (?, ?, 1, ?)
             ON DUPLICATE KEY UPDATE 
                ${heightField} = ${heightField} + 1,
                time = VALUES(time)`,
            [referrerId, pool, time]
        );

        // Record transaction with proper balance tracking
        const [userPower] = await conn.execute('SELECT amount FROM user_upgrade_power WHERE level = ? AND userid=?', [level, referrerId]);
        const txId = await trx_id();
        const trx_type = isrefferal ? 'referral_bonus' : 'upgrade bonus';
        const userPreIncome = parseFloat(referrer[0].income);
        const userCurrIncome = userPreIncome + parseFloat(bonusAmount);

        // Add upgrade power bonus (25/10000 of LEVEL_PRICE as in Solidity)
        const [levelPrice] = await conn.execute('SELECT amount FROM levels WHERE level = ?', [pool]);
        const upgradePowerBonus = (parseFloat(levelPrice[0].amount) * 25) / 10000;
        const userPrePower = userPower.length ? parseFloat(userPower[0].amount) : 0;
        const userCurrPower = userPower.length ? userPrePower + parseFloat(upgradePowerBonus) : upgradePowerBonus;

        //insert or update power upgrade 
        await conn.execute(
            `INSERT INTO user_upgrade_power (userid, level, amount, time) 
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE 
                    amount = amount + VALUES(amount),
                    time = GREATEST(time, VALUES(time))`,
            [referrerId, level, upgradePowerBonus, time]
        );
        //inser trx history  
        await conn.execute(
            `INSERT INTO transaction_history 
             (userid, transaction_id,payment_id, transaction_type, amount, old_balance, current_balance,sender_id,level,
              datetime,upgrade_level,power,old_power,current_power) VALUES (?, ?, ? , ?, ?, ?, ?, ?, ?,?,?,?,?,?)`,
            [referrerId, txId, payment_id, trx_type, bonusAmount, userPreIncome, userCurrIncome, referral_user, level,
                time, pool, upgradePowerBonus, userPrePower, userCurrPower
            ]
        );

        const total_distributed = parseFloat(bonusAmount) + parseFloat(upgradePowerBonus);
        // Update system distributed amount atomically
        await conn.execute(`UPDATE system_settings SET total_distributed = total_distributed + ?,system_reserve =system_reserve-?`,
            [total_distributed, total_distributed]);
        // Add notification history
        await conn.execute(
            `INSERT INTO notification_history 
             (userid, action, type, status, time) 
             VALUES (?, ?, ?, ?, ?)`,
            [referrerId, `Congrats! You have received ${trx_type}.`, trx_type, 0, time]
        );

        // Process next level if applicable (max 10 levels deep)
        if (level < 10 && referrerId >= 1) {
            await processReferralBonuses(conn, referrerId, referral_user, level + 1, amount, pool, time, payment_id, isrefferal);
        }
    } catch (error) {
        console.error('Error in processReferralBonuses:', error);
        throw error; // Re-throw to handle in calling function
    }
};
///processCoreferralBonuses-------------
const processCoreferralBonuses = async (conn, userId, referral_user, level, amount, pool, time, payment_id, isrefferal) => {
    // Validate input parameters
    if (!conn || !userId || level < 1 || level > 10 || isNaN(amount) || isNaN(pool) || !time) {
        throw new Error('Invalid parameters for co-referral bonus processing');
    }
    try {
        //  Get user's co-referrer with proper locking
        const [user] = await conn.execute(`SELECT coreferrer_code FROM user WHERE userid = ? LIMIT 1 FOR UPDATE`, [userId]);

        if (!user?.[0]?.coreferrer_code) {
            console.log(`No co-referrer found for user ${userId}`);
            return;
        }
        const coreferrerId = user[0].coreferrer_code;
        if (!coreferrerId) return;
        //  Get co-referrer's data with transaction safety
        const [coreferrer] = await conn.execute(`SELECT userid, income FROM user WHERE userid = ? LIMIT 1 FOR UPDATE`, [coreferrerId]);
        if (!coreferrer[0]) {
            console.log(`Co-referrer ${coreferrerId} not found`);
            return;
        }
        //  Calculate bonus amount with validation
        const bonusAmount = await calculateCoreferralBonusWithTurboCheck(conn, level, pool, amount, coreferrerId);

        if (isNaN(bonusAmount) || bonusAmount <= 0) {
            throw new Error(`Invalid bonus amount calculated: ${bonusAmount}`);
        };

        //  Check partner next level activation status 
        const [hasNextLevel] = await conn.execute(
            `SELECT 1 FROM partner_levels 
             WHERE userid = ? AND level = ? AND is_active = TRUE LIMIT 1`,
            [coreferrerId, pool + 1]
        );

        //  Process bonus based on activation status
        // if (hasNextLevel.length > 0) {
        //     // // Direct credit to income balance (atomic update)
        //     // await conn.execute(`UPDATE user SET income = income + ? WHERE userid = ?`, [bonusAmount, coreferrerId]);
        //     // Directly add to distributed (like Solidity)
        //     await conn.execute(`UPDATE system_settings SET total_distributed = total_distributed + ?`, [bonusAmount]);
        // } else {
        //     // Credit to upgrade pool with upsert
        //     // await conn.execute(
        //     //     `INSERT INTO partner_upgrade_power (userid, level, amount, time)
        //     //      VALUES (?, ?, ?, ?)
        //     //      ON DUPLICATE KEY UPDATE
        //     //         amount = amount + VALUES(amount),
        //     //         time = GREATEST(time, VALUES(time))`,
        //     //     [coreferrerId, pool, bonusAmount, time]
        //     // );
        //     // Still credit to income (if this is your business logic)
        //     await conn.execute(`UPDATE user SET income = income + ? WHERE userid = ?`, [bonusAmount, coreferrerId]);
        // }

        //update users income by bonusAmount
        await conn.execute(`UPDATE user SET income = income + ?,partner_income =partner_income+?,user_turnover = user_turnover + ? WHERE userid = ?`, [bonusAmount, bonusAmount, amount, coreferrerId]);

        // Update partner height levels with dynamic field
        const heightField = `level_${Math.min(level, 10)}`;
        await conn.execute(
            `INSERT INTO partner_height_levels (userid, pool_level, ${heightField}, time) 
             VALUES (?, ?, 1, ?)
             ON DUPLICATE KEY UPDATE 
                ${heightField} = ${heightField} + 1,
                time = VALUES(time)`,
            [coreferrerId, pool, time]
        );

        //  Record transaction with full details  'partner upgrade bonus','upgrade bonus'
        const [userPower] = await conn.execute('SELECT amount FROM partner_upgrade_power WHERE level = ? AND userid=?', [level, coreferrerId]);

        const txId = await trx_id();
        const trx_type = isrefferal ? 'coreferral_bonus' : 'partner upgrade bonus';
        const userPreIncome = parseFloat(coreferrer[0].income);
        const userCurrIncome = userPreIncome + parseFloat(bonusAmount);

        // Add upgrade power bonus (25/10000 of LEVEL_PRICE as in Solidity)
        const [levelPrice] = await conn.execute('SELECT amount FROM levels WHERE level = ?', [pool]);
        const upgradePowerBonus = (parseFloat(levelPrice[0].amount) * 25) / 10000;
        const userPrePower = userPower.length ? parseFloat(userPower[0].amount) : 0;
        const userCurrPower = userPower.length ? userPrePower + parseFloat(upgradePowerBonus) : upgradePowerBonus;

        //insert or update power upgrade 
        await conn.execute(
            `INSERT INTO partner_upgrade_power (userid, level, amount, time) 
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE 
                    amount = amount + VALUES(amount),
                    time = GREATEST(time, VALUES(time))`,
            [coreferrerId, level, upgradePowerBonus, time]
        );

        //inser trx history
        await conn.execute(
            `INSERT INTO transaction_history 
             (userid, transaction_id,payment_id, transaction_type, amount, old_balance, current_balance,sender_id,level,
              datetime,upgrade_level,power,old_power,current_power) VALUES (?, ?, ? , ?, ?, ?, ?, ?, ?,?,?,?,?,?)`,
            [coreferrerId, txId, payment_id, trx_type, bonusAmount, userPreIncome, userCurrIncome, referral_user, level,
                time, pool, upgradePowerBonus, userPrePower, userCurrPower
            ]
        );

        //  Update system distributed amount atomically
        const total_distributed = parseFloat(bonusAmount) + parseFloat(upgradePowerBonus);
        await conn.execute(`UPDATE system_settings SET total_distributed = total_distributed + ?,system_reserve =system_reserve-?`,
            [total_distributed, total_distributed]);
        // Add notification history
        await conn.execute(
            `INSERT INTO notification_history 
             (userid, action, type, status, time) 
             VALUES (?, ?, ?, ?, ?)`,
            [coreferrerId, `Congrats! You have recieve ${trx_type}.`, trx_type, 0, time]
        );

        //  Process next level if applicable (max 10 levels deep)
        if (level < 10) {
            await processCoreferralBonuses(conn, coreferrerId, referral_user, level + 1, amount, pool, time, payment_id, isrefferal);
        }
    } catch (error) {
        console.error('Error in processCoreferralBonuses:', { userId, level, amount, pool, time, error: error.message, stack: error.stack });
        throw error;
    }
};
// Add partner count to upline
async function addPartnerCount(conn, level, userId) {
    try {
        // Get coreferrer ID
        const [[user]] = await conn.execute(`SELECT coreferrer_code FROM user WHERE userid = ? LIMIT 1`, [userId]);
        if (!user || !user.coreferrer_code) return;
        const coreferrer_code = user.coreferrer_code;

        // Update partner count
        await conn.execute(`UPDATE user SET partner_count = partner_count + 1  WHERE userid = ?`, [coreferrer_code]);

        // Recursively update upline (max 7 levels deep)
        if (level < 7) {
            await addPartnerCount(conn, level + 1, coreferrer_code);
        }
    } catch (error) {
        console.error('Error in addPartnerCount:', error);
        throw error;
    }
}



module.exports = {
    processReferralBonuses,
    processCoreferralBonuses,
    addPartnerCount,

}


