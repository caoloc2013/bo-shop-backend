const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// GET all orders
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET order by id
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create order
router.post('/', async (req, res) => {
  try {
    const order = new Order({
      customerName: req.body.customerName,
      phoneNumber: req.body.phoneNumber,
      address: req.body.address,
      note: req.body.note || '',
      items: req.body.items || [],
      productId: req.body.productId,
      productName: req.body.productName,
      size: req.body.size,
      status: 'PENDING',
      createdAt: Date.now()
    });
    const saved = await order.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT update order (toggle status)
router.put('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Toggle status if no specific status provided
    if (req.body.status) {
      order.status = req.body.status;
    } else {
      order.status = order.status === 'PENDING' ? 'CONFIRMED' : 'PENDING';
    }
    
    const updated = await order.save();
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE order
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Order.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json({ message: 'Order deleted', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
