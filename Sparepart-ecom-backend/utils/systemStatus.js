const mongoose = require('mongoose');
const { redis, redisEnabled } = require('../config/redis');
const env = require('../config/env');

const getDatabaseStatus = async () => {
    const mongoStatus = {
        0: 'Disconnected',
        1: 'Connected',
        2: 'Connecting',
        3: 'Disconnecting',
    }[mongoose.connection.readyState] || 'Unknown';

    let redisStatus = 'Disabled';
    if (redisEnabled) {
        try {
            if (redis.isOpen) {
                await redis.ping();
                redisStatus = 'Connected';
            } else {
                redisStatus = 'Disconnected (Socket Closed)';
            }
        } catch (err) {
            redisStatus = 'Error';
        }
    }

    return {
        MongoDB: { status: mongoStatus, sensitive: false },
        Redis: { status: redisStatus, sensitive: false },
    };
};

const getConfigurationStatus = () => {
    const check = (val) => (val ? 'Configured' : 'Missing');

    return {
        'Stripe Payments': {
            status: check(env.STRIPE_SECRET_KEY),
            details: env.STRIPE_SECRET_KEY ? 'Ready to process' : 'SDK disabled',
        },
        'Razorpay Payments': {
            status: check(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET),
        },
        'SMTP Email': {
            status: check(env.SMTP_HOST && env.SMTP_USER),
            details: env.SMTP_HOST || 'Not configured',
        },
        'Google Auth': {
            status: check(env.GOOGLE_CLIENT_ID),
        },
        'AWS S3 Storage': {
            status: check(process.env.AWS_REGION && process.env.AWS_S3_BUCKET),
            details: process.env.AWS_S3_BUCKET || 'Local storage used',
        },
        'JWT Auth': {
            status: check(env.JWT_SECRET),
            sensitive: true,
        }
    };
};

const getSystemStatus = async () => {
    const dbStatus = await getDatabaseStatus();
    const configStatus = getConfigurationStatus();

    return {
        ...dbStatus,
        ...configStatus,
    };
};

module.exports = { getSystemStatus };
