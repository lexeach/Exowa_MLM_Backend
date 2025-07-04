const con = require('../dbConnection/index');
async function checkteam(reffer){
    let [righteam] = await con.execute("SELECT count(*) as right_count FROM `referral_team` WHERE `Referral_id`=? and `side`=?", [reffer, 'right']);
    let [lefteam] = await con.execute("SELECT count(*) as left_count FROM `referral_team` WHERE `Referral_id`=? and `side`=?", [reffer, 'left']);
    let result=0
    if(righteam.length>0 && lefteam.length>0){
        result= righteam[0].right_count>lefteam[0].left_count?lefteam[0].left_count:righteam[0].right_count;
    }
    return result;
}
module.exports = {
    checkteam
}