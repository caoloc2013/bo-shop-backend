const mongoose = require('mongoose');

const ShippingCarrierSchema = new mongoose.Schema({
  name: { type: String, required: true },           // "Giao Hàng Nhanh"
  code: { type: String, required: true, unique: true }, // "ghn"
  isActive: { type: Boolean, default: true },
  
  // API Config
  apiToken: { type: String, default: '' },
  shopId: { type: String, default: '' },
  baseUrl: { type: String, default: '' },
  
  // Sender / Shop info
  shopDistrictId: { type: Number, default: 0 },
  shopWardCode: { type: String, default: '' },
  shopName: { type: String, default: '' },
  shopPhone: { type: String, default: '' },
  shopAddress: { type: String, default: '' },
  shopProvinceName: { type: String, default: '' },
  shopDistrictName: { type: String, default: '' },
  shopWardName: { type: String, default: '' }
}, { timestamps: true });

// Virtual id field
ShippingCarrierSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('ShippingCarrier', ShippingCarrierSchema);
