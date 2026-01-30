const mongoose = require('mongoose');
const Setting = require('./models/Setting.model');

const MONGO_URI = 'mongodb+srv://developerwebitof_db_user:OXk1jmw0bqkKb2AB@cluster0.2yooeyc.mongodb.net/spareparts-ecommerce';

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');

        const publicKeys = [
            'tax_price_display_shop',
            'tax_price_display_suffix',
            'prices_include_tax',
            'tax_rate'
        ];

        const result = await Setting.updateMany(
            { key: { $in: publicKeys } },
            { $set: { isPublic: true } }
        );

        console.log('Updated settings:', result);
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
