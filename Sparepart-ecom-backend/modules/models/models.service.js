const Model = require('../../models/Model.model');
const slugify = require('slugify');

class ModelService {
    async list({ limit = 100, page = 1, search }) {
        const filter = {};
        if (search) filter.year = { $regex: search, $options: 'i' };

        const models = await Model.find(filter)
            .sort({ year: -1 }) // Sort by year descending (newest first)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        const total = await Model.countDocuments(filter);
        return { models, total };
    }

    async create(data) {
        if (!data.slug && data.year) {
            data.slug = slugify(data.year, { lower: true });
        }
        return Model.create(data);
    }

    async get(id) {
        return Model.findById(id);
    }

    async update(id, data) {
        if (data.year && !data.slug) {
            data.slug = slugify(data.year, { lower: true });
        }
        return Model.findByIdAndUpdate(id, data, { new: true });
    }

    async delete(id) {
        return Model.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
    }
}

module.exports = new ModelService();
