//src/config/app.config.js

/**
 * ============================================================================
 * CENTRAL APPLICATION CONFIGURATION
 * ============================================================================
 * 
 * Single source of truth for all app settings and data source control.
 * 
 * HOW TO USE:
 * 1. Change `dataSource` settings to switch between demo and real data
 * 2. Configure fallback behavior per domain
 * 3. Services automatically read this config
 * 4. UI components NEVER read this config directly (use hooks like useSiteConfig)
 * 
 * FALLBACK MODES:
 * - 'demo' = Fallback to demo data if primary source fails
 * - 'empty' = Return null/[] (show empty state), don't throw
 * - 'error' = Throw error to UI (surfaced via error handler)
 */

const APP_CONFIG = {
  // ============================================================================
  // SITE INFORMATION & BRANDING
  // ============================================================================
  site: {
    // DYNAMIC SETTINGS TOGGLE
    // Set to true to fetch settings from backend, false to use static config only
    useDynamicSettings: true,

    // BASIC INFORMATION
    name: 'ShubhCars',
    domain: typeof window !== 'undefined' ? window.location.hostname : 'localhost',


    // BRANDING
    logo: null,                     // Path to logo image (e.g., '/logo.png')
    logoDark: null,                 // Dark logo (header)
    logoLight: null,                // Light logo (footer)
    // Set to null if no image logo (will use text initials)
    logoText: null,                 // Custom logo text override (e.g., "SC" for ShubhCars)
    // If null, auto-generates from site.name
    // If set, uses this text instead of image/initials
    favicon: '/favicon.ico',
    tagline: 'Your Trusted Auto Parts Partner',

    // THEME (Primary branding colors)
    theme: {
      primaryColor: 'oklch(68% 0.17 250)', // Trust Blue
    },

    // TAX DISPLAY CONFIGURATION
    // Controls how tax information is displayed across the frontend
    // NOTE: This does NOT calculate tax - backend handles all calculations
    tax: {
      // Display settings for tax labels and suffixes
      display: {
        // Price suffix text based on tax inclusion mode
        suffixes: {
          including: 'incl. taxes',
          excluding: '+ applicable taxes',
        },

        // Tax component labels (CGST, SGST, IGST, etc.)
        breakdownLabels: {
          cgst: 'CGST',
          sgst: 'SGST',
          igst: 'IGST',
          tax: 'Tax',
          gst: 'GST',
        },

        // Show tax breakdown in cart/checkout summaries
        showBreakdown: true,

        // Hide tax components with zero value
        hideZeroComponents: true,

        // Label for tax row in price summaries
        taxRowLabel: 'Tax',
      },

      // Tooltip/help text for tax information
      help: {
        including: 'Price includes all applicable taxes',
        excluding: 'Tax will be calculated at checkout',
      },
    },

    // CONTACT INFORMATION
    contact: {
      email: 'support@autospares.com',
      phone: '+91 98765 43210',
      address: 'Plot No. 45, MIDC Industrial Area, Andheri East, Mumbai 400093, Maharashtra, India',
      coordinates: { lat: 19.1136, lng: 72.8697 }, // Mumbai
    },

    // SOCIAL MEDIA
    social: {
      facebook: '#',
      instagram: '#',
      twitter: '#',
      linkedin: '#',
    },

    // BUSINESS HOURS
    hours: {
      monday: '9:00 AM - 6:00 PM',
      tuesday: '9:00 AM - 6:00 PM',
      wednesday: '9:00 AM - 6:00 PM',
      thursday: '9:00 AM - 6:00 PM',
      friday: '9:00 AM - 6:00 PM',
      saturday: '10:00 AM - 4:00 PM',
      sunday: 'Closed',
    },
  },

  // ============================================================================
  // DATA SOURCE CONTROL (⚙️ CHANGE THESE TO SWITCH DEMO/REAL)
  // ============================================================================
  dataSource: {
    /**
     * PRODUCTS
     * Primary: 'demo' = Use mock product data | 'real' = Fetch from backend API
     * Fallback: What to do if primary fails
     */
    products: {
      source: 'real',
      fallback: 'demo',  // Safe to fallback to demo products
    },

    /**
     * CATEGORIES
     * Primary: 'demo' = Use mock category data | 'real' = Fetch from backend API
     * Fallback: What to do if primary fails
     */
    categories: {
      source: 'real',
      fallback: 'demo',  // Safe to fallback to demo categories
    },

    /**
     * PROFILE DATA
     * Sub-domains for different profile features
     */
    profile: {
      /**
       * BASIC INFO (name, email, phone)
       * Primary: 'demo' = Mock user profile | 'real' = Backend user data
       * Fallback: 'empty' = Show login prompt, don't fallback to demo
       */
      basic: {
        source: 'real',
        fallback: 'empty',  // Show empty state if no backend profile
      },

      /**
       * ADDRESSES
       * Primary: 'demo' = Mock addresses | 'real' = Backend user addresses
       * Fallback: 'demo' = Safe fallback (critical for checkout)
       */
      address: {
        source: 'real',
        fallback: 'demo',  // Critical for checkout, safe to fallback
      },

      /**
       * WISHLIST
       * Primary: 'demo' = localStorage wishlist | 'real' = Backend wishlist
       * Fallback: 'empty' = Show empty wishlist
       */
      wishlist: {
        source: 'real',
        fallback: 'empty',
      },
    },

    /**
     * ORDERS
     * Primary: 'demo' = Mock order data | 'real' = Fetch from backend API
     * Fallback: 'empty' = Show no orders state
     */
    orders: {
      source: 'real',
      fallback: 'empty',
    },

    /**
     * REVIEWS
     * Primary: 'demo' = Mock review data | 'real' = Backend reviews
     * Fallback: 'demo' = Safe to show demo reviews
     */
    reviews: {
      source: 'real',
      fallback: 'demo',
    },

    // ============================================================================
    // AUTHENTICATION & CART (SPECIAL - DO NOT CHANGE)
    // ============================================================================
    /**
     * AUTHENTICATION
     * - Phase 5: Auth is REAL
     * - Controls login/register/logout
     */
    useRealAuth: true,

    /**
     * CART
     * - Phase 8: Cart uses backend for authenticated users
     * - Guest: localStorage
     * - Authenticated: backend cart with real-time sync
     */
    useRealCart: true,
  },

  // ============================================================================
  // FEATURE FLAGS
  // ============================================================================
  features: {
    enableCheckout: true,
    enableWishlist: true,
    enableReviews: true,
    enableRecommendations: true,
  },

  // ============================================================================
  // API CONFIGURATION
  // ============================================================================
  api: {
    /**
     * Base URL for API requests
     * Automatically appends /api/v1 if not present
     * Handles trailing slashes gracefully
     */
    baseUrl: (() => {
      const isProd = process.env.NODE_ENV === 'production';
      const raw = process.env.NEXT_PUBLIC_API_URL;
      if (!raw) {
        if (isProd) {
          throw new Error('NEXT_PUBLIC_API_URL is required in production builds');
        }
        console.warn('[CONFIG] NEXT_PUBLIC_API_URL missing, falling back to localhost for development');
      }
      const base = raw || 'http://localhost:5000';
      const trimmed = base.replace(/\/$/, '');
      return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
    })(),

    /**
     * Origin URL (without /api/v1) for WebSocket, uploads, etc.
     */
    origin: (() => {
      const isProd = process.env.NODE_ENV === 'production';
      const raw = process.env.NEXT_PUBLIC_API_URL;
      if (!raw) {
        if (isProd) {
          throw new Error('NEXT_PUBLIC_API_URL is required in production builds');
        }
        console.warn('[CONFIG] NEXT_PUBLIC_API_URL missing, falling back to localhost for development');
      }
      const base = raw || 'http://localhost:5000';
      const trimmed = base.replace(/\/$/, '');
      return trimmed.endsWith('/api/v1') ? trimmed.replace(/\/api\/v1$/, '') : trimmed;
    })(),

    timeout: 10000,
  },

  // ============================================================================
  // PAYMENT GATEWAYS
  // ============================================================================
  payments: {
    // Global payment settings
    enabled: true, // Master toggle for all online payments (COD unaffected)
    testMode: true, // Global test mode - shows TEST badges on payment methods

    // Redirect paths after payment
    redirects: {
      success: '/order-success', // Redirect after successful payment
      failure: '/order-failed', // Redirect after failed payment
    },

      gateways: {
      razorpay: {
        enabled: true,
        mode: 'test', // 'test' | 'live'
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '', // Config-driven via ENV
        redirect: {
           success: '/order-success?status=success',
           failure: '/order-failed?status=failure'
        }
      }
    },

    methods: {
      // Cash on Delivery - Always enabled by default
      cod: {
        enabled: true,
        id: 'cod',
        displayName: 'Cash on Delivery (COD)',
        description: 'Pay with cash when you receive your order',
        icon: 'Wallet', // Lucide icon name
      },

    

      // Razorpay Payment Gateway
      razorpay: {
         enabled: true, // UI toggle
        id: 'razorpay',
        displayName: 'Razorpay',
        description: 'Pay securely with Cards, UPI, Netbanking',
        icon: 'CreditCard', // Lucide icon fallback
        mode: 'test', // 'test' or 'live'
      },
    },
  },

  // ============================================================================
  // LOGGING
  // ============================================================================
  logging: {
    /**
     * Log data source choices
     * Shows: "[DATA] PRODUCTS: USING DEMO" in console
     */
    logDataSource: true,

    logLevel: 'info', // 'debug' | 'info' | 'warn' | 'error'
  },
};

// ============================================================================
// ENVIRONMENT AUTO-DETECTION
// ============================================================================
if (typeof window !== 'undefined') {
  const isProd = process.env.NODE_ENV === 'production';
  const isStaging = process.env.NEXT_PUBLIC_APP_ENV === 'staging';

  if (isProd) {
    APP_CONFIG.dataSource.products = { source: 'real', fallback: 'error' };
    APP_CONFIG.dataSource.categories = { source: 'real', fallback: 'error' };
    APP_CONFIG.dataSource.orders = { source: 'real', fallback: 'error' };
    APP_CONFIG.dataSource.reviews = { source: 'real', fallback: 'error' };
    APP_CONFIG.dataSource.profile.address = { source: 'real', fallback: 'error' };
    APP_CONFIG.dataSource.profile.wishlist = { source: 'real', fallback: 'error' };
  } else if (isStaging) {
    APP_CONFIG.dataSource.products = { source: 'real', fallback: 'error' };
    APP_CONFIG.dataSource.categories = { source: 'real', fallback: 'error' };
    APP_CONFIG.dataSource.profile.address = { source: 'real', fallback: 'error' };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Log data source being used
 * @param {string} domain - e.g., 'PRODUCTS', 'CATEGORIES', 'PROFILE.ADDRESS'
 * @param {string} source - 'DEMO' or 'REAL'
 * @param {string} reason - Optional reason for the choice
 */
export function logDataSource(domain, source, reason) {
  if (!APP_CONFIG.logging?.logDataSource) return;

  // Defensive guards
  if (!domain) return;

  const safeDomain = String(domain).toUpperCase();

  let safeSource = 'UNKNOWN';
  if (typeof source === 'string') {
    safeSource = source.toUpperCase();
  } else if (typeof source === 'boolean') {
    safeSource = source ? 'DEMO' : 'REAL';
  }

  const message = `[DATA] ${safeDomain}: USING ${safeSource}`;

  if (reason) {
    console.log(`${message} - ${reason}`);
  } else {
    console.log(message);
  }
}

/**
 * Get data source config for a domain (supports both old and new format)
 * @param {string} path - dot-notation path, e.g., 'products', 'profile.basic'
 * @returns {Object} - { source: 'demo'|'real', fallback: 'demo'|'empty'|'error' }
 */
export function getDataSourceConfig(path) {
  const parts = path.split('.');
  let value = APP_CONFIG.dataSource;

  for (const part of parts) {
    value = value?.[part];
    if (value === undefined) {
      return { source: 'demo', fallback: 'demo' }; // Safe default
    }
  }

  // New format: { source, fallback }
  if (typeof value === 'object' && value.source) {
    return {
      source: value.source,
      fallback: value.fallback || 'demo',
    };
  }

  // Old format: 'demo' | 'real' (backward compatible)
  return {
    source: value,
    fallback: 'demo', // Safe default
  };
}




export const isUsingDemo = (path) => {
  const config = getDataSourceConfig(path);
  return config.source === 'demo';
};

export const API_BASE_URL = APP_CONFIG.api.baseUrl;

export default APP_CONFIG;
