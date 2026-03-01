const https = require('https');

// Token cache
let currentToken = {
  access_token: null,
  expires_at: null
};

function normalizeText(value) {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getSaleProductName(sale) {
  if (!sale || typeof sale !== 'object') return '';

  const candidates = [
    sale.product?.name,
    sale.product_name,
    sale.productName,
    sale.offer?.name,
    sale.offer_name,
    sale.subscription?.plan?.name,
    sale.subscription?.name
  ];

  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c;
  }
  return '';
}

function shouldDebugAuth() {
  return String(process.env.HOTMART_DEBUG_AUTH || '').toLowerCase() === 'true';
}

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function generateHotmartToken() {
  const { HOTMART_CLIENT_ID, HOTMART_CLIENT_SECRET } = process.env;

  if (!HOTMART_CLIENT_ID || !HOTMART_CLIENT_SECRET) {
    throw new Error('HOTMART_CLIENT_ID e HOTMART_CLIENT_SECRET são obrigatórios');
  }

  const credentials = Buffer.from(`${HOTMART_CLIENT_ID}:${HOTMART_CLIENT_SECRET}`).toString('base64');
  const postData = 'grant_type=client_credentials';

  const options = {
    hostname: 'api-sec-vlc.hotmart.com',
    path: `/security/oauth/token?grant_type=client_credentials&client_id=${HOTMART_CLIENT_ID}&client_secret=${HOTMART_CLIENT_SECRET}`,
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const result = await makeRequest(options, postData);

  if (result.status !== 200 || !result.data.access_token) {
    throw new Error(`Erro ao obter token: ${JSON.stringify(result.data)}`);
  }

  const expiresAt = new Date(Date.now() + (result.data.expires_in * 1000));
  currentToken = {
    access_token: result.data.access_token,
    expires_at: expiresAt
  };

  return currentToken;
}

function isTokenValid() {
  if (!currentToken.access_token || !currentToken.expires_at) return false;
  const marginMs = 5 * 60 * 1000;
  return new Date() < new Date(currentToken.expires_at.getTime() - marginMs);
}

async function getValidToken() {
  if (!isTokenValid()) {
    await generateHotmartToken();
  }
  return currentToken;
}

async function checkEmailInHotmart(email, token) {
  const encodedEmail = encodeURIComponent(email);

  const makeHotmartRequest = (status) => {
    const options = {
      hostname: 'developers.hotmart.com',
      path: `/payments/api/v1/sales/history?transaction_status=${status}&buyer_email=${encodedEmail}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json'
      }
    };
    return makeRequest(options, null);
  };

  const [completeResult, approvedResult] = await Promise.all([
    makeHotmartRequest('COMPLETE'),
    makeHotmartRequest('APPROVED')
  ]);

  const completeSales = completeResult.data?.items || [];
  const approvedSales = approvedResult.data?.items || [];
  const sales = [...completeSales, ...approvedSales];

  return sales;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  try {
    const { email } = JSON.parse(event.body || '{}');

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'Email é obrigatório' })
      };
    }

    const trimmedEmail = email.toLowerCase().trim();

    if (!trimmedEmail.includes('@')) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'Email inválido' })
      };
    }

    const token = await getValidToken();
    const sales = await checkEmailInHotmart(trimmedEmail, token);

    const targetProductName = process.env.HOTMART_PRODUCT_NAME || 'Depois do Enxoval';
    const normalizedTarget = normalizeText(targetProductName);

    const detectedProductNames = sales
      .map((sale) => getSaleProductName(sale))
      .filter((name) => typeof name === 'string' && name.trim());

    const matchingSales = sales.filter((sale) => {
      const productName = getSaleProductName(sale);
      const normalizedProduct = normalizeText(productName);
      return normalizedProduct.includes(normalizedTarget);
    });

    const emailAuthorizedForProduct = matchingSales.length > 0;

    if (emailAuthorizedForProduct) {
      const userData = {
        email: trimmedEmail,
        name: matchingSales[0]?.buyer?.name || 'Usuário',
        totalPurchases: matchingSales.length,
        lastPurchase: matchingSales[0]?.purchase_date
      };

      const debug = shouldDebugAuth()
        ? {
            requiredProduct: targetProductName,
            detectedProducts: detectedProductNames.slice(0, 20)
          }
        : undefined;

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          message: `Email autorizado para o produto: ${targetProductName}`,
          user: userData,
          authorized: true,
          ...(debug ? { debug } : {})
        })
      };
    } else {
      const debug = shouldDebugAuth()
        ? {
            requiredProduct: targetProductName,
            detectedProducts: detectedProductNames.slice(0, 20)
          }
        : undefined;

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          message: `Email não possui compra/assinatura do produto necessário: ${targetProductName}`,
          authorized: false,
          ...(debug ? { debug } : {})
        })
      };
    }

  } catch (error) {
    console.error('Erro ao verificar email:', error.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: error.message,
        authorized: false
      })
    };
  }
};
