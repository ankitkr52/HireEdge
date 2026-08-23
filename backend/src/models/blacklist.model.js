const mongoose = require('mongoose');


const blacklistTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: [true, "token is required to be added to blacklist"]
    }
}, {
    timestamps: true
})

blacklistTokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });
blacklistTokenSchema.index({ token: 1 });

const tokenBlacklistModel = mongoose.model("blacklistToken", blacklistTokenSchema)


module.exports = tokenBlacklistModel;