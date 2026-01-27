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
  formattedAddress: String
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
    enum: ['PENDING', 'CONFIRMED'], 
    default: 'PENDING' 
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
