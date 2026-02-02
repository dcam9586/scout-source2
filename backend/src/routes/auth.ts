import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { config } from '../config/config';
import { User } from '../models/User';
import { generateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

interface ShopifyAuthQuery {
  code?: string;
  hmac?: string;
  shop?: string;
  state?: string;
  timestamp?: string;
}

/**
 * OAuth Step 1: Redirect to Shopify authorization
 * GET /auth/shopify
 */
router.get('/shopify', (req: Request, res: Response): void => {
  const shop = (req.query.shop as string)?.trim();

  if (!shop) {
    res.status(400).json({ error: 'Shop parameter is required' });
    return;
  }

  // Validate shop format (e.g., mystore.myshopify.com)
  if (!/^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/.test(shop)) {
    res.status(400).json({ error: 'Invalid shop format' });
    return;
  }

  const state = crypto.randomBytes(16).toString('hex');
  const scopes = config.shopify.apiScopes.join(',');

  const authUrl = new URL('https://shopify.com/admin/oauth/authorize');
  authUrl.searchParams.append('client_id', config.shopify.apiKey);
  authUrl.searchParams.append('scope', scopes);
  authUrl.searchParams.append('redirect_uri', `${config.shopify.backendUrl}/api/v1/auth/callback`);
  authUrl.searchParams.append('state', state);

  // Store state in Redis for validation
  // In production, store with TTL: await redis.setex(`shopify:state:${state}`, 600, shop);

  res.json({
    authUrl: authUrl.toString(),
  });
});

/**
 * OAuth Step 2: Shopify redirects here with authorization code
 * GET /auth/callback
 */
router.get('/callback', async (req: Request, res: Response): Promise<void> => {
  const { code, hmac, shop, state, timestamp, host } = req.query as ShopifyAuthQuery & { host?: string };

  if (!code || !shop || !hmac || !timestamp) {
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }

  // Debug: Log all parameters
  console.log('Callback parameters received:', {
    code,
    hmac,
    shop,
    state,
    timestamp,
    host,
    allParams: req.query,
  });

  // Validate HMAC - include all parameters that Shopify sends
  const paramsForHmac = {
    code,
    host: host || '',
    shop,
    state: state || '',
    timestamp,
  };
  
  const hmacValid = verifyShopifyHmac(paramsForHmac, hmac, config.shopify.apiSecret);

  console.log('HMAC validation result:', hmacValid);

  if (!hmacValid) {
    console.error('HMAC validation failed');
    res.status(401).json({ error: 'Invalid HMAC signature' });
    return;
  }

  try {
    console.log('Step 1: Exchanging code for access token...');
    // Exchange code for access token
    const tokenUrl = `https://${shop}/admin/oauth/access_token`;
    console.log('Token URL:', tokenUrl);
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: config.shopify.apiKey,
        client_secret: config.shopify.apiSecret,
        code,
      }),
    });

    console.log('Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error('Token response error:', errorBody);
      throw new Error(`Token exchange failed: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json() as any;
    console.log('Token data received:', { hasAccessToken: !!tokenData.access_token, expiresIn: tokenData.expires_in });
    
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 86400; // Default to 24 hours if not provided

    console.log('Step 2: Saving/updating user in database...');
    // Save or update user in database
    let user = await User.findByShop(shop);
    if (!user) {
      console.log('Creating new user...');
      user = await User.create(shop, accessToken, refreshToken);
    } else {
      console.log('Updating existing user...');
      const expiresAt = new Date(Date.now() + (expiresIn * 1000));
      console.log('Token expires at:', expiresAt);
      await User.updateAccessToken(user.id, accessToken, expiresAt);
    }

    console.log('Step 3: User saved, user ID:', user?.id);

    // Generate JWT token
    const jwtToken = generateToken(user.id, shop);
    console.log('Step 4: JWT token generated:', jwtToken.substring(0, 20) + '...');

    // Redirect back to frontend with token
    // Use the same base URL as the app (ngrok domain in dev, production URL in prod)
    const frontendUrl = config.shopify.appUrl;
    const redirectUrl = new URL(`${frontendUrl}/?token=${jwtToken}&shop=${shop}`);

    console.log('Step 5: Redirecting to:', redirectUrl.toString());
    res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('OAuth callback error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: 'Authentication failed', details: errorMessage });
  }
});

/**
 * Verify Shopify HMAC signature
 */
function verifyShopifyHmac(
  params: Record<string, string | undefined>,
  hmac: string,
  secret: string
): boolean {
  // Create message exactly as Shopify does: sort params (excluding hmac itself) and join with &
  const message = Object.keys(params)
    .filter((key) => params[key]) // Only include keys with values
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  console.log('HMAC Verification:', {
    secret,
    message,
    receivedHmac: hmac,
  });

  const hash = crypto
    .createHmac('sha256', secret)
    .update(message, 'utf-8')
    .digest('hex');

  console.log('Calculated HMAC:', hash);
  console.log('Match:', hash === hmac);

  return hash === hmac;
}

export default router;
