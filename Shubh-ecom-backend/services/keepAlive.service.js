const axios = require('axios');
const logger = require('../config/logger');
const env = require('../config/env');

let keepAliveInterval;

/**
 * Pings the server's health endpoint to prevent sleeping.
 */
const pingHealthEndpoint = async () => {
    try {
        if (!env.BACKEND_ORIGIN) {
            logger.warn('KeepAlive: BACKEND_ORIGIN not set. Skipping ping.');
            return;
        }

        const healthUrl = `${env.BACKEND_ORIGIN}/health`;
        const response = await axios.get(healthUrl);

        if (response.status === 200) {
            logger.info(`KeepAlive: Ping successful. Status: ${response.status}`);
        } else {
            logger.warn(`KeepAlive: Ping returned non-200 status: ${response.status}`);
        }
    } catch (error) {
        logger.error(`KeepAlive: Ping failed. Error: ${error.message}`);
    }
};

/**
 * Starts the Keep-Alive service.
 * Runs every 14 minutes (Render sleeps after 15 mins of inactivity).
 */
const startKeepAlive = () => {
    // Run immediately on start
    pingHealthEndpoint();

    const intervalMs = 14 * 60 * 1000; // 14 minutes
    keepAliveInterval = setInterval(pingHealthEndpoint, intervalMs);
    
    logger.info(`KeepAlive: Service started with ${intervalMs}ms interval.`);
};

/**
 * Stops the Keep-Alive service.
 */
const stopKeepAlive = () => {
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
        logger.info('KeepAlive: Service stopped.');
    }
};

module.exports = {
    startKeepAlive,
    stopKeepAlive
};
