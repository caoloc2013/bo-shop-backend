const express = require('express');
const router = express.Router();
const ShippingCarrier = require('../models/ShippingCarrier');

// GET all carriers
router.get('/', async (req, res) => {
  try {
    const carriers = await ShippingCarrier.find().sort({ createdAt: -1 });
    res.json(carriers);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải danh sách đơn vị vận chuyển', error: error.message });
  }
});

// GET single carrier
router.get('/:id', async (req, res) => {
  try {
    const carrier = await ShippingCarrier.findById(req.params.id);
    if (!carrier) return res.status(404).json({ message: 'Không tìm thấy đơn vị vận chuyển' });
    res.json(carrier);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải đơn vị vận chuyển', error: error.message });
  }
});

// POST create carrier
router.post('/', async (req, res) => {
  try {
    const carrier = new ShippingCarrier(req.body);
    const saved = await carrier.save();
    res.status(201).json(saved);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: `Mã "${req.body.code}" đã tồn tại. Vui lòng dùng mã khác.` });
    }
    res.status(500).json({ message: 'Lỗi tạo đơn vị vận chuyển', error: error.message });
  }
});

// PUT update carrier
router.put('/:id', async (req, res) => {
  try {
    const updated = await ShippingCarrier.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Không tìm thấy đơn vị vận chuyển' });
    res.json(updated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: `Mã "${req.body.code}" đã tồn tại.` });
    }
    res.status(500).json({ message: 'Lỗi cập nhật đơn vị vận chuyển', error: error.message });
  }
});

// DELETE carrier
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await ShippingCarrier.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Không tìm thấy đơn vị vận chuyển' });
    res.json({ message: 'Đã xóa đơn vị vận chuyển', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi xóa đơn vị vận chuyển', error: error.message });
  }
});

module.exports = router;
