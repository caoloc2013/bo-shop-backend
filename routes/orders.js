const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const ShippingCarrier = require('../models/ShippingCarrier');
const axios = require('axios');

// Helper: get active GHN carrier config from DB
async function getGHNConfig() {
  const carrier = await ShippingCarrier.findOne({ code: 'ghn', isActive: true });
  if (!carrier) {
    throw new Error('Chưa cấu hình đơn vị vận chuyển GHN hoặc GHN chưa được kích hoạt. Vào tab Cấu hình để thêm.');
  }
  return {
    baseUrl: carrier.baseUrl || 'https://dev-online-gateway.ghn.vn/shiip/public-api',
    token: carrier.apiToken,
    shopId: carrier.shopId,
    shopName: carrier.shopName || 'Bo Shop',
    shopPhone: carrier.shopPhone || '0909000000',
    shopAddress: carrier.shopAddress || '',
    shopProvinceName: carrier.shopProvinceName || '',
    shopDistrictName: carrier.shopDistrictName || '',
    shopWardName: carrier.shopWardName || '',
    headers: {
      'Content-Type': 'application/json',
      'Token': carrier.apiToken,
      'ShopId': carrier.shopId
    }
  };
}

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
      status: req.body.status || 'PENDING',
      totalDeposit: req.body.totalDeposit || 0,
      shippingFee: req.body.shippingFee || 0,
      createdAt: Date.now()
    });
    const saved = await order.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT update order (toggle status or update fields)
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

    // Update shipping info if provided
    if (req.body.shipping) {
      order.shipping = req.body.shipping;
    }

    // Update address if provided (e.g. adding GHN codes)
    if (req.body.address) {
      order.address = { ...order.address.toObject(), ...req.body.address };
    }
    
    const updated = await order.save();
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST sync GHN address codes for an order (auto-match from address names)
router.post('/:id/sync-ghn-address', async (req, res) => {
  try {
    const cfg = await getGHNConfig();
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    const provinceName = order.address.province || '';
    const districtName = order.address.district || '';
    const wardName = order.address.ward || '';

    if (!provinceName || !districtName) {
      return res.status(400).json({ message: 'Đơn hàng thiếu thông tin tỉnh/quận' });
    }

    // Helper: normalize Vietnamese text for matching
    const normalize = (str) => str.toLowerCase()
      .replace(/\s+/g, ' ').trim()
      .replace(/^(tỉnh|thành phố|tp\.?|t\.p\.?)\s+/i, '')
      .replace(/^(quận|huyện|thị xã|thành phố|tx\.?|tp\.?)\s+/i, '')
      .replace(/^(phường|xã|thị trấn|tt\.?)\s+/i, '');

    // 1. Find GHN province
    const provRes = await axios.get(`${cfg.baseUrl}/master-data/province`, {
      headers: { Token: cfg.token }
    });
    const provinces = provRes.data.data || [];
    const normProv = normalize(provinceName);
    
    const matchedProvince = provinces.find(p => {
      const names = [p.ProvinceName, ...(p.NameExtension || [])];
      return names.some(n => normalize(n) === normProv || normalize(n).includes(normProv) || normProv.includes(normalize(n)));
    });

    if (!matchedProvince) {
      return res.status(400).json({ message: `Không tìm thấy tỉnh "${provinceName}" trên GHN` });
    }

    // 2. Find GHN district
    const distRes = await axios.post(`${cfg.baseUrl}/master-data/district`, {
      province_id: matchedProvince.ProvinceID
    }, { headers: { Token: cfg.token } });
    const districts = distRes.data.data || [];
    const normDist = normalize(districtName);
    
    const matchedDistrict = districts.find(d => {
      const names = [d.DistrictName, ...(d.NameExtension || [])];
      return names.some(n => normalize(n) === normDist || normalize(n).includes(normDist) || normDist.includes(normalize(n)));
    });

    if (!matchedDistrict) {
      return res.status(400).json({ message: `Không tìm thấy quận/huyện "${districtName}" trên GHN` });
    }

    // 3. Find GHN ward (optional - some areas don't have wards)
    let matchedWardCode = '';
    if (wardName) {
      const wardRes = await axios.post(`${cfg.baseUrl}/master-data/ward`, {
        district_id: matchedDistrict.DistrictID
      }, { headers: { Token: cfg.token } });
      const wards = wardRes.data.data || [];
      const normWard = normalize(wardName);
      
      const matchedWard = wards.find(w => {
        const names = [w.WardName, ...(w.NameExtension || [])];
        return names.some(n => normalize(n) === normWard || normalize(n).includes(normWard) || normWard.includes(normalize(n)));
      });

      if (matchedWard) {
        matchedWardCode = matchedWard.WardCode;
      }
    }

    // 4. Update order address with GHN codes
    order.address = {
      ...order.address.toObject(),
      provinceId: matchedProvince.ProvinceID,
      districtId: matchedDistrict.DistrictID,
      wardCode: matchedWardCode
    };

    const updated = await order.save();
    res.json({
      order: updated,
      matched: {
        province: matchedProvince.ProvinceName,
        district: matchedDistrict.DistrictName,
        wardCode: matchedWardCode
      }
    });
  } catch (error) {
    console.error('Sync GHN Address Error:', error.response?.data || error.message);
    res.status(500).json({
      message: error.message || 'Lỗi đồng bộ địa chỉ GHN',
      error: error.response?.data || error.message
    });
  }
});
router.post('/:id/create-shipping', async (req, res) => {
  try {
    const cfg = await getGHNConfig();

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Build items list for GHN
    const ghnItems = (order.items || []).map(item => ({
      name: item.productName || 'Sản phẩm',
      quantity: item.quantity || 1,
      weight: 300 // default weight per item in grams
    }));

    const totalAmount = (order.items || []).reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalWeight = ghnItems.reduce((sum, item) => sum + (item.weight * item.quantity), 0) || 500;

    // Auto-detect available service_type_id from GHN
    let serviceTypeId = 2; // default
    try {
      const svcRes = await axios.post(`${cfg.baseUrl}/v2/shipping-order/available-services`, {
        shop_id: parseInt(cfg.shopId),
        from_district: cfg.shopDistrictId,
        to_district: order.address.districtId || 0
      }, { headers: cfg.headers });
      const services = svcRes.data?.data || [];
      if (services.length > 0) {
        serviceTypeId = services[0].service_type_id;
        console.log(`GHN: Using service_type_id=${serviceTypeId} (${services[0].short_name || services[0].service_id})`);
      }
    } catch (svcErr) {
      console.warn('Could not auto-detect service, using default:', svcErr.response?.data?.message || svcErr.message);
    }

    const payload = {
      payment_type_id: 2, // Buyer pays shipping
      note: order.note || '',
      required_note: 'CHOTHUHANG',
      from_name: cfg.shopName,
      from_phone: cfg.shopPhone,
      from_address: cfg.shopAddress,
      from_ward_name: cfg.shopWardName,
      from_district_name: cfg.shopDistrictName,
      from_province_name: cfg.shopProvinceName,
      to_name: order.customerName,
      to_phone: order.phoneNumber,
      to_address: order.address.formattedAddress || order.address.detail || '',
      to_ward_name: order.address.ward || '',
      to_district_name: order.address.district || '',
      to_province_name: order.address.province || '',
      to_ward_code: order.address.wardCode || '',
      to_district_id: order.address.districtId || 0,
      weight: totalWeight,
      length: 30,
      width: 25,
      height: 10,
      service_type_id: serviceTypeId,
      insurance_value: Math.min(totalAmount, 5000000),
      cod_amount: totalAmount - (order.totalDeposit || 0),
      content: `Đơn hàng Bo Shop - ${order.customerName}`,
      items: ghnItems
    };

    console.log('GHN Create Shipping Payload:', JSON.stringify(payload, null, 2));

    const response = await axios.post(`${cfg.baseUrl}/v2/shipping-order/create`, payload, {
      headers: cfg.headers
    });

    const ghnData = response.data.data;

    // Update order with shipping info
    order.shipping = {
      carrierName: 'GHN',
      ghnOrderCode: ghnData.order_code,
      trackingNumber: ghnData.order_code,
      shippingFee: ghnData.total_fee || 0,
      expectedDelivery: ghnData.expected_delivery_time || '',
      shippingStatus: 'ready_to_pick',
      createdAt: Date.now()
    };
    order.status = 'SHIPPING';

    const updated = await order.save();
    res.json({ order: updated, ghnResponse: ghnData });
  } catch (error) {
    const ghnErr = error.response?.data;
    console.error('Create GHN Shipping Error:', ghnErr || error.message);
    res.status(500).json({ 
      message: ghnErr?.message || error.message || 'Không thể tạo đơn vận chuyển GHN', 
      error: ghnErr || error.message 
    });
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
