const mongoose = require('mongoose');

const CartItemSchema = new mongoose.Schema({
  productId: String,
  productName: String,
  productImage: String,
  price: Number,
  size: String,
  quantity: Number
}, { _id: false });

const AddressSchema = new mongoose.Schema({
  province: String,
  district: String,
  ward: String,
  detail: String,
  formattedAddress: String,
  // GHN address codes for shipping sync
  provinceId: Number,
  districtId: Number,
  wardCode: String
}, { _id: false });

const ShippingSchema = new mongoose.Schema({
  carrierName: { type: String, default: 'GHN' },
  ghnOrderCode: String,
  trackingNumber: String,
  shippingFee: Number,
  expectedDelivery: String,
  shippingStatus: { type: String, default: '' },
  createdAt: { type: Number, default: () => Date.now() }
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  customerName: { 
    type: String, 
    required: true 
  },
  phoneNumber: { 
    type: String, 
    required: true 
  },
  address: AddressSchema,
  note: { 
    type: String, 
    default: '' 
  },
  items: [CartItemSchema],
  // Legacy fields for backward compatibility
  productId: String,
  productName: String,
  size: String,
  status: { 
    type: String, 
    enum: ['PENDING', 'WAITING_PAYMENT', 'CONFIRMED', 'SHIPPING', 'DELIVERED'], 
    default: 'PENDING' 
  },
  totalDeposit: {
    type: Number,
    default: 0
  },
  shipping: ShippingSchema,
  shippingFee: {
    type: Number,
    default: 0
  },
  createdAt: { 
    type: Number, 
    default: () => Date.now() 
  }
}, { 
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

module.exports = mongoose.model('Order', OrderSchema);
