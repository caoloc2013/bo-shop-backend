const mongoose = require('mongoose');

// Sub-schema for size with stock status
const SizeSchema = new mongoose.Schema({
  size: { 
    type: String, 
    required: true 
  },
  inStock: { 
    type: Boolean, 
    default: true 
  }
}, { _id: false });

const ProductSchema = new mongoose.Schema({
  categoryId: { 
    type: String,
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    default: '' 
  },
  price: { 
    type: Number, 
    required: true 
  },
  images: [{ 
    type: String 
  }],
  videoUrl: { 
    type: String,
    default: ''
  },
  sizes: [SizeSchema]
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

module.exports = mongoose.model('Product', ProductSchema);
