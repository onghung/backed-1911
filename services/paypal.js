const axios = require('axios');

async function generateAccessToken() {
    const response = await axios({
        url: process.env.PAYPAL_BASE_URL + '/v1/oauth2/token',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        auth: {
            username: process.env.PAYPAL_CLIENT_ID,
            password: process.env.PAYPAL_SECRET
        },
        data: 'grant_type=client_credentials'
    });
    return response.data.access_token;
}

exports.createOrder = async () => {
    const accessToken = await generateAccessToken();
    
    const response = await axios({
        url: process.env.PAYPAL_BASE_URL + '/v2/checkout/orders',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + accessToken
        },
        data: JSON.stringify({
            intent: 'CAPTURE',
            purchase_units: [
                {
                    items: [
                        {
                            name: 'Kích hoạt tài khoản sách nói TLU',
                            description: 'Kích hoạt để trải nghiệm toàn bộ tính năng của ứng dụng',
                            quantity: 1,
                            unit_amount: {
                                currency_code: 'USD',
                                value: '100.00'
                            }
                        }
                    ],
                    amount: {
                        currency_code: 'USD',
                        value: '100.00',
                        breakdown: {
                            item_total: {
                                currency_code: 'USD',
                                value: '100.00'
                            }
                        }
                    }
                }
            ],
            application_context: {
                return_url: 'http://10.0.2.2:8080/complete-order',
                cancel_url: 'http://10.0.2.2:8080/cancel-order',
                shipping_preference: 'NO_SHIPPING',
                user_action: 'PAY_NOW',
                brand_name: 'Audio book'
            }
        })
    });
    return response.data.links.find(link => link.rel === 'approve').href
}

exports.capturePayment = async (orderId) => {
    const accessToken = await generateAccessToken();

    const response = await axios({
        url: process.env.PAYPAL_BASE_URL + `/v2/checkout/orders/${orderId}/capture`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + accessToken
        },
    })

    return response.data
}


this.createOrder().then(result => console.log(result))
