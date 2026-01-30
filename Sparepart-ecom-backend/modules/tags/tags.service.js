const Tag = require('../../models/Tag.model');
const slugify = require('slugify');

class TagService {
    async list({ limit = 100, page = 1, search }) {
        const filter = {};
        if (search) filter.name = { $regex: search, $options: 'i' };

        const tags = await Tag.find(filter)
            .sort({ name: 1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Tag.countDocuments(filter);
        return { tags, total };
    }

    async create(data) {
        if (!data.slug) data.slug = slugify(data.name, { lower: true });
        return Tag.create(data);
    }

    async update(id, data) {
        if (data.name && !data.slug) data.slug = slugify(data.name, { lower: true });
        return Tag.findByIdAndUpdate(id, data, { new: true });
    }

    async delete(id) {
        return Tag.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
    }
}

module.exports = new TagService();
