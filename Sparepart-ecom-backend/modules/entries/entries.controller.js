const asyncHandler = require('../../utils/asyncHandler');
const entriesService = require('./entries.service');
const { success } = require('../../utils/apiResponse');
const UAParser = require('ua-parser-js');

exports.list = asyncHandler(async (req, res) => {
    const data = await entriesService.list(req.query);
    return success(res, data);
});

exports.create = asyncHandler(async (req, res) => {
    const userAgentString = req.headers['user-agent'];
    const parser = new UAParser(userAgentString);
    const uaResult = parser.getResult();

    // Extract IP
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const entryData = {
        ...req.body,
        ip,
        userAgent: userAgentString,
        browser: `${uaResult.browser.name || 'Unknown'} ${uaResult.browser.version || ''}`.trim(),
        os: `${uaResult.os.name || 'Unknown'} ${uaResult.os.version || ''}`.trim(),
        isGuest: !req.user,
        user: req.user ? req.user._id : undefined
    };

    const data = await entriesService.create(entryData);
    return success(res, data, 'Message sent successfully');
});

exports.get = asyncHandler(async (req, res) => {
    const data = await entriesService.get(req.params.id);
    return success(res, data);
});

exports.remove = asyncHandler(async (req, res) => {
    await entriesService.delete(req.params.id);
    return success(res, null, 'Entry deleted');
});

exports.markRead = asyncHandler(async (req, res) => {
    const data = await entriesService.markRead(req.params.id);
    return success(res, data, 'Marked as read');
});

exports.stats = asyncHandler(async (req, res) => {
    const data = await entriesService.stats();
    return success(res, data);
});
