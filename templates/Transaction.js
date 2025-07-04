const {URL} = require("./url");

const message = (from,to,amountA,tokenA,amountB,tokenB,hashA,hashB) => {
return `
<!doctype html>
<html lang="en">
<head> 
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="${URL}/assets/img/fav.png"> 
  <title>Email</title>
</head>
<body>
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout:fixed;background-color:#fff" id="bodyTable">
    <tbody>
      <tr>
        <td style="padding-right:10px;padding-left:10px;" align="center" valign="top" id="bodyCell">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" class="wrapperBody" style="max-width:600px;margin-top: 10px">
            <tbody>
              <tr>
                <td align="center" valign="top">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" class="tableCard" style="background-color:#fff; border-width: 2px; border-color:#E4082D;border-style:solid;  border-radius: 5px;">
                    <tbody> 
                      <tr style="">
                        <td style="padding-bottom: 0px;" align="left" valign="middle" class="emailLogo"> 
                          <a href="#" target="_blink" style="text-decoration:none">
                            <img alt="" border="0" src="${URL}/assets/img/transactions.webp" style="width:100%; height:auto; margin: 0 auto;display: block;">
                          </a>
                        </td>
                      </tr>  
  
                        <tr>
                        <td style="padding-top: 40px;padding-bottom: 0px; padding-left: 20px; padding-right: 20px; text-align: left;"  valign="top" class="subTitle">
                         <h1 class="text" style="  border-radius: 5px; color:#000;font-family:roboto;font-size:30px; text-align: center; font-weight: 600; font-style:normal;letter-spacing:0.8px;line-height:22px;text-transform:none;padding:8px;margin:0 auto"> Congratulation  </h1>  
                        </td>
                      </tr>

                       <tr>
                        <td style="padding-top: 0px;padding-bottom: 10px; padding-left: 20px; padding-right: 20px; text-align: left;"  valign="top" class="subTitle">
                         <h1 class="text" style="  border-radius: 5px; color:#000;font-family:roboto;font-size:16px; text-align: center; font-weight: 400; font-style:normal;letter-spacing:0.8px;line-height:22px;text-transform:none;padding:8px;margin:0 auto"> 
                          Your Transaction is Performed successfully.
                          </h1>
                          <table style="width:100%; border:1px solid #d7cccc; color:#747070;padding: 10px; font-size: 20px;border-radius: 7px;" >
                            <tr>
                              <td style="color:black ;font-weight: 600">Sender</td>
                              <td style="text-align: right; padding: 4px; ">${from}</td>                              
                            </tr>
                            <tr>
                              <td style="color:black ;font-weight: 600">Receiver</td>
                              <td style="text-align: right; padding: 4px; ">${to}</td>
                            
                            </tr>
                            <tr style="width:100%; border:1px solid black">
                              <td style="color:black;font-weight: 600">Send Amount</td>
                              <td style="text-align: right;padding: 4px;">${amountA} ${tokenA}</td>                            
                            </tr>                           
                            <tr style="width:100%; border:1px solid black">
                              <td style="color:black;font-weight: 600">Receive Amount</td>
                              <td style="text-align: right;padding: 4px;">${amountB} ${tokenB}</td>                            
                            </tr>                           
                              ${hashA ? `<tr style="width:100%; border:1px solid black">
                                <td style="color:black;font-weight: 600">Transaction ${tokenA} Hash/Id</td>
                                <td style="text-align: right;padding: 4px;">${hashA}</td>                              
                              </tr>` : ''}
                              ${hashB ? `<tr style="width:100%; border:1px solid black">
                                <td style="color:black;font-weight: 600">Transaction ${tokenB} Hash/Id</td>
                                <td style="text-align: right;padding: 4px;">${hashB}</td>                              
                              </tr>` : ''}
                          </table> 
                        </td>
                        
                      </tr>
                           
                      <tr>
                        <td style="padding-top: 20px;  border-bottom: 1px solid #c5c5c5; padding-left: 15px; padding-right: 20px; text-align: left;"  valign="top" class="subTitle">
                          <h4 class="text" style=" color:#000;font-family:'roboto';font-size:18px;font-weight:600;font-style:normal;letter-spacing:0px;line-height:24px;text-transform:none;text-align:left;padding:0;margin:0"> </h4>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding-top: 20px;padding-bottom: 0px; padding-left: 15px; padding-right: 20px; text-align: center;"  valign="top" class="subTitle">
                          <h4 class="text" style=" color:#000;font-family:Poppins,Helvetica,Arial,sans-serif;font-size:20px;font-weight:600;font-style:normal;letter-spacing:1px;line-height:24px;text-transform:none;text-align:center;padding-bottom:10px;margin:0">  Thanks & Regards
                          </h4>
                          <!-- <h4 class="text" style=" color:#ff3b00;font-family:Poppins,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;font-style:normal;letter-spacing:1px;line-height:20px;text-transform:none;text-align:center;padding-bottom:0px;margin:0">  Mi Pay
                          </h4> -->
                         <img alt="" border="0" src="${URL}/assets/img/logo.png" style="width:18%; height:auto; margin: 0 auto;display: block;">
                        </td>
                      </tr>

                       <tr>
                        <td style="padding-top: 20px;  border-bottom: 1px solid #c5c5c5; padding-left: 15px; padding-right: 20px; text-align: left;"  valign="top" class="subTitle">
                          <h4 class="text" style=" color:#000;font-family:'roboto';font-size:18px;font-weight:600;font-style:normal;letter-spacing:0px;line-height:24px;text-transform:none;text-align:left;padding:0;margin:0"> </h4>

                        </td>
                      </tr>
    
                    </tbody>
                  </table> 
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;
}

module.exports = {message};