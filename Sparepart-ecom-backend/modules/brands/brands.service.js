const Brand = require('../../models/Brand.model');
const slugify = require('slugify');

class BrandService {
    async list({ limit = 100, page = 1, search, type }) {
        const filter = {};
        if (search) filter.name = { $regex: search, $options: 'i' };
        if (type) filter.type = type;

        const brands = await Brand.find(filter)
            .sort({ name: 1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        const total = await Brand.countDocuments(filter);
        return { brands, total };
    }

    async create(data) {
        if (!data.slug) data.slug = slugify(data.name, { lower: true });
        return Brand.create(data);
    }

    async get(id) {
        return Brand.findById(id);
    }

    async update(id, data) {
        if (data.name && !data.slug) data.slug = slugify(data.name, { lower: true });
        return Brand.findByIdAndUpdate(id, data, { new: true });
    }

    async delete(id) {
        return Brand.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
    }
}

module.exports = new BrandService();
