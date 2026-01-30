
const mongoose = require('mongoose');
const Brand = require('../models/Brand.model');
const mongoConfig = require('../config/mongo');

// 20 Top Manufacturer Brands with Logos
const brands = [
    { name: "Bosch", logo: "https://logo.clearbit.com/bosch.com" },
    { name: "Denso", logo: "https://logo.clearbit.com/denso.com" },
    { name: "NGK", logo: "https://logo.clearbit.com/ngkntk.com" },
    { name: "Valeo", logo: "https://logo.clearbit.com/valeo.com" },
    { name: "Brembo", logo: "https://logo.clearbit.com/brembo.com" },
    { name: "Monroe", logo: "https://logo.clearbit.com/monroe.com" },
    { name: "SKF", logo: "https://logo.clearbit.com/skf.com" },
    { name: "LuK", logo: "https://logo.clearbit.com/schaeffler.com" },
    { name: "Sachs", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Sachs_Logo.svg/2560px-Sachs_Logo.svg.png" },
    { name: "TRW", logo: "https://logo.clearbit.com/trwaftermarket.com" },
    { name: "Mahle", logo: "https://logo.clearbit.com/mahle.com" },
    { name: "Mann-Filter", logo: "https://logo.clearbit.com/mann-filter.com" },
    { name: "Continental", logo: "https://logo.clearbit.com/continental.com" },
    { name: "Delphi", logo: "https://logo.clearbit.com/delphi.com" },
    { name: "Aisin", logo: "https://logo.clearbit.com/aisin.com" },
    { name: "KYB", logo: "https://logo.clearbit.com/kyb.com" },
    { name: "Hella", logo: "https://logo.clearbit.com/hella.com" },
    { name: "Hitachi", logo: "https://logo.clearbit.com/hitachi.com" },
    { name: "Exide", logo: "https://logo.clearbit.com/exide.com" },
    { name: "Bilstein", logo: "https://logo.clearbit.com/bilstein.com" }
];

const seedBrands = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoConfig.connectMongo(); // Fixed function name

        console.log(`Seeding ${brands.length} manufacturer brands...`);

        for (const brand of brands) {
            const slug = brand.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

            await Brand.findOneAndUpdate(
                { slug: slug },
                {
                    name: brand.name,
                    slug: slug,
                    logo: brand.logo,
                    type: 'manufacturer',
                    status: 'active',
                    isDeleted: false
                },
                { upsert: true, new: true }
            );
            console.log(`Processed: ${brand.name}`);
        }

        console.log('Seeding complete!');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seedBrands();
