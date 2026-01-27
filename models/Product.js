const mongoose = require('mongoose');

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
  sizes: [{ 
    type: String 
  }]
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
