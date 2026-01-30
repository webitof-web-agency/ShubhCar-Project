const Entry = require('../../models/Entry.model');

class EntriesService {
    async list({ limit = 10, page = 1, status, startDate, endDate, search }) {
        const filter = {};
        if (status) filter.status = status;

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { subject: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (page - 1) * limit;

        // If limit is 'all', return all docs (useful for export)
        let query = Entry.find(filter).sort({ createdAt: -1 });

        if (limit !== 'all') {
            query = query.skip(skip).limit(parseInt(limit));
        }

        const entries = await query.populate('user', 'name email phone');
        const total = await Entry.countDocuments(filter);

        return { entries, total, page, limit };
    }

    async create(data) {
        return Entry.create(data);
    }

    async get(id) {
        return Entry.findById(id).populate('user', 'name email phone');
    }

    async delete(id) {
        return Entry.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
    }

    async markRead(id) {
        return Entry.findByIdAndUpdate(id, { status: 'read' }, { new: true });
    }

    async stats() {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const stats = await Promise.all([
            Entry.countDocuments({ isDeleted: false, createdAt: { $gte: startOfToday } }),
            Entry.countDocuments({ isDeleted: false, createdAt: { $gte: sevenDaysAgo } }),
            Entry.countDocuments({ isDeleted: false, createdAt: { $gte: thirtyDaysAgo } }),
            Entry.countDocuments({ isDeleted: false })
        ]);

        return {
            today: stats[0],
            last7Days: stats[1],
            last30Days: stats[2],
            total: stats[3]
        };
    }
}

module.exports = new EntriesService();
