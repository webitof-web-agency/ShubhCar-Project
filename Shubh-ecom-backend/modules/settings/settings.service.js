const Setting = require('../../models/Setting.model');
const taxService = require('../../services/tax.service');

class SettingsService {
    /**
     * Get all settings, optionally filtered by group
     */
    async list(group) {
        const filter = {};
        if (group) filter.group = group;

        // Return key-value pair object for easy frontend consumption
        const settings = await Setting.find(filter);
        const result = {};

        // Group by 'group' or return flat if filtered? 
        // Let's return a flat map { "store_name": "My Store", ... } 
        // or grouped { general: { ... }, store: { ... } }

        // Common pattern: Return array or key-value map.
        // For frontend use, a map is often easier: settings.store_name

        settings.forEach(s => {
            result[s.key] = s.value;
        });

        return result;
    }

    /**
     * Bulk update settings
     * data: { "store_name": "New Name", "tax_enabled": true }
     */
    async updateBulk(data) {
        const existing = await Setting.find({ key: { $in: Object.keys(data) } }).lean();
        const existingMap = new Map(existing.map((s) => [s.key, s.group]));
        const publicKeys = new Set([
            'site_logo_dark',
            'site_logo_light',
            'site_favicon',
            'tax_price_display_shop',
            'tax_price_display_suffix',
            'prices_include_tax',
            'tax_rate',
            'payment_cod_enabled',
            'payment_razorpay_enabled',
            'razorpay_key_id',
            // Invoice company info (public for frontend invoice display)
            'invoice_company_name',
            'invoice_company_address_line1',
            'invoice_company_address_line2',
            'invoice_company_city',
            'invoice_company_state',
            'invoice_company_pincode',
            'invoice_company_gstin',
            'invoice_company_email',
            'invoice_company_phone',
            'invoice_company_website',
            'invoice_logo_url',
        ]);
        const groupMap = {
            site_logo_dark: 'store',
            site_logo_light: 'store',
            'site_favicon': 'store',
            tax_origin_state: 'tax',
            tax_regions: 'tax',
            tax_classes: 'tax',
            tax_enabled: 'tax',
            tax_rate: 'tax',
            tax_price_display_shop: 'tax',
            tax_price_display_cart: 'tax',
            tax_price_display_suffix: 'tax',
            tax_display_totals: 'tax',
            prices_include_tax: 'tax',
            shipping_defaults: 'shipping',
            shipping_enabled: 'shipping',
            shipping_free_threshold: 'shipping',
            shipping_flat_rate: 'shipping',
            shipping_handling_days: 'shipping',
            order_number_prefix: 'orders',
            order_number_digits: 'orders',
            order_number_start: 'orders',
            order_number_next: 'orders',
            invoice_number_prefix: 'invoice',
            invoice_number_digits: 'invoice',
            invoice_number_start: 'invoice',
            invoice_number_next: 'invoice',
            // Invoice company information
            invoice_company_name: 'invoice',
            invoice_company_address_line1: 'invoice',
            invoice_company_address_line2: 'invoice',
            invoice_company_city: 'invoice',
            invoice_company_state: 'invoice',
            invoice_company_pincode: 'invoice',
            invoice_company_gstin: 'invoice',
            invoice_company_email: 'invoice',
            invoice_company_phone: 'invoice',
            invoice_company_website: 'invoice',
            invoice_logo_url: 'invoice',
            invoice_terms: 'invoice',
            invoice_notes: 'invoice',
            storage_driver: 'storage',
            aws_region: 'storage',
            aws_s3_bucket: 'storage',
            aws_access_key_id: 'storage',
            aws_secret_access_key: 'storage',
            payment_cod_enabled: 'payment',
            payment_razorpay_enabled: 'payment',
            razorpay_key_id: 'payment',
            razorpay_key_secret: 'payment',
        };

        const operations = Object.keys(data).map(key => {
            const group = existingMap.get(key) || groupMap[key] || 'general';
            return {
                updateOne: {
                    filter: { key },
                    update: {
                        $set: {
                            value: data[key],
                            group,
                            isPublic: publicKeys.has(key),
                        },
                    },
                    upsert: true
                }
            };
        });

        if (operations.length > 0) {
            await Setting.bulkWrite(operations);
        }

        if (
            Object.keys(data).some((key) =>
                ['tax_regions', 'tax_origin_state', 'tax_rate'].includes(key),
            )
        ) {
            taxService.taxRegionsCache = null;
            taxService.taxClassesCache = null;
        }

        return this.list(); // Return updated list
    }

    async getByGroup(group) {
        return this.list(group);
    }

    async listPublic() {
        const settings = await Setting.find({ isPublic: true }).lean();
        const result = {};
        settings.forEach(s => {
            result[s.key] = s.value;
        });
        return result;
    }

    /**
     * Get invoice-specific settings with defaults
     * Ensures invoices always have data to display
     */
    async getInvoiceSettings() {
        const allSettings = await this.list();
        
        // Default values for when settings are not configured
        const defaults = {
            invoice_company_name: allSettings.site_name || 'Company Name',
            invoice_company_address_line1: '123, Business Address',
            invoice_company_address_line2: '',
            invoice_company_city: 'City',
            invoice_company_state: 'State',
            invoice_company_pincode: '000000',
            invoice_company_gstin: 'GSTIN NOT CONFIGURED',
            invoice_company_email: 'contact@example.com',
            invoice_company_phone: '+91 1800-000-0000',
            invoice_company_website: 'www.example.com',
            invoice_logo_url: allSettings.site_logo_dark || allSettings.site_logo_light || null,
            invoice_terms: 'Goods once sold will not be taken back or exchanged. All disputes are subject to local jurisdiction.',
            invoice_notes: 'This is a computer generated invoice.',
        };

        // Merge user settings with defaults (user settings take precedence)
        const invoiceSettings = {};
        for (const key in defaults) {
            invoiceSettings[key] = allSettings[key] || defaults[key];
        }

        return invoiceSettings;
    }
}

module.exports = new SettingsService();
