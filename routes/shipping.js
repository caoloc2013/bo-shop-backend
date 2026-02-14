const express = require('express');
const router = express.Router();
const axios = require('axios');
const ShippingCarrier = require('../models/ShippingCarrier');

// Helper: get active GHN carrier config from DB
async function getGHNConfig() {
  const carrier = await ShippingCarrier.findOne({ code: 'ghn', isActive: true });
  if (!carrier) {
    throw new Error('Chưa cấu hình đơn vị vận chuyển GHN hoặc GHN chưa được kích hoạt');
  }
  return {
    baseUrl: carrier.baseUrl || 'https://dev-online-gateway.ghn.vn/shiip/public-api',
    token: carrier.apiToken,
    shopId: carrier.shopId,
    shopDistrictId: carrier.shopDistrictId || 1542,
    shopWardCode: carrier.shopWardCode || '21012',
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

// GET provinces
router.get('/provinces', async (req, res) => {
  try {
    const cfg = await getGHNConfig();
    const response = await axios.get(`${cfg.baseUrl}/master-data/province`, {
      headers: { Token: cfg.token }
    });
    res.json(response.data);
  } catch (error) {
    console.error('GHN Get Provinces Error:', error.response?.data || error.message);
    res.status(500).json({ message: error.message || 'Không thể lấy danh sách tỉnh/thành từ GHN', error: error.response?.data });
  }
});

// GET districts by province
router.get('/districts/:provinceId', async (req, res) => {
  try {
    const cfg = await getGHNConfig();
    const response = await axios.post(`${cfg.baseUrl}/master-data/district`, {
      province_id: parseInt(req.params.provinceId)
    }, {
      headers: { Token: cfg.token }
    });
    res.json(response.data);
  } catch (error) {
    console.error('GHN Get Districts Error:', error.response?.data || error.message);
    res.status(500).json({ message: error.message || 'Không thể lấy danh sách quận/huyện từ GHN', error: error.response?.data });
  }
});

// GET wards by district
router.get('/wards/:districtId', async (req, res) => {
  try {
    const cfg = await getGHNConfig();
    const response = await axios.post(`${cfg.baseUrl}/master-data/ward`, {
      district_id: parseInt(req.params.districtId)
    }, {
      headers: { Token: cfg.token }
    });
    res.json(response.data);
  } catch (error) {
    console.error('GHN Get Wards Error:', error.response?.data || error.message);
    res.status(500).json({ message: error.message || 'Không thể lấy danh sách xã/phường từ GHN', error: error.response?.data });
  }
});

// POST calculate shipping fee
router.post('/fee', async (req, res) => {
  try {
    const cfg = await getGHNConfig();
    const { to_district_id, to_ward_code, weight, insurance_value, items } = req.body;
    
    const fromDistrictId = parseInt(cfg.shopDistrictId) || 0;
    const toDistrictId = parseInt(to_district_id);
    
    if (!fromDistrictId) {
      return res.status(400).json({ 
        message: 'Chưa cấu hình địa chỉ shop (shopDistrictId). Vào Cấu hình → Chỉnh sửa GHN để cập nhật.',
      });
    }

    // Auto-discover available service
    let serviceId = 2; // Default: standard delivery
    try {
      const svcRes = await axios.post(`${cfg.baseUrl}/v2/shipping-order/available-services`, {
        shop_id: parseInt(cfg.shopId),
        from_district: fromDistrictId,
        to_district: toDistrictId
      }, { headers: cfg.headers });
      const services = svcRes.data?.data || [];
      if (services.length > 0) {
        // Prefer standard (service_type_id = 2), fallback to first available
        const standard = services.find(s => s.service_type_id === 2);
        serviceId = standard ? standard.service_id : services[0].service_id;
      }
    } catch (svcErr) {
      console.warn('Could not discover GHN services, using default:', svcErr.response?.data?.message || svcErr.message);
    }
    
    const payload = {
      from_district_id: fromDistrictId,
      from_ward_code: String(cfg.shopWardCode || ''),
      service_id: serviceId,
      service_type_id: null,
      to_district_id: toDistrictId,
      to_ward_code: String(to_ward_code),
      weight: weight || 500,
      length: 30,
      width: 25,
      height: 10,
      insurance_value: insurance_value || 0,
      items: items || []
    };

    console.log('GHN Fee payload:', JSON.stringify(payload));

    const response = await axios.post(`${cfg.baseUrl}/v2/shipping-order/fee`, payload, {
      headers: cfg.headers
    });
    res.json(response.data);
  } catch (error) {
    const ghnError = error.response?.data;
    console.error('GHN Fee Calculation Error:', ghnError || error.message);
    const msg = ghnError?.message || error.message || 'Không thể tính phí vận chuyển';
    res.status(error.response?.status || 500).json({ message: msg, error: ghnError });
  }
});

// POST create shipping order
router.post('/create-order', async (req, res) => {
  try {
    const cfg = await getGHNConfig();
    const {
      to_name, to_phone, to_address, to_ward_code, to_district_id,
      to_ward_name, to_district_name, to_province_name,
      weight, insurance_value, cod_amount, content, items, note
    } = req.body;

    const payload = {
      payment_type_id: 2,
      note: note || '',
      required_note: 'CHOTHUHANG',
      from_name: cfg.shopName,
      from_phone: cfg.shopPhone,
      from_address: cfg.shopAddress,
      from_ward_name: cfg.shopWardName,
      from_district_name: cfg.shopDistrictName,
      from_province_name: cfg.shopProvinceName,
      to_name,
      to_phone,
      to_address,
      to_ward_name: to_ward_name || '',
      to_district_name: to_district_name || '',
      to_province_name: to_province_name || '',
      to_ward_code,
      to_district_id: parseInt(to_district_id),
      weight: weight || 500,
      length: 30,
      width: 25,
      height: 10,
      service_type_id: 2,
      insurance_value: insurance_value || 0,
      cod_amount: cod_amount || 0,
      content: content || 'Đơn hàng Bo Shop',
      items: items || [{ name: 'Sản phẩm', quantity: 1, weight: 500 }]
    };

    const response = await axios.post(`${cfg.baseUrl}/v2/shipping-order/create`, payload, {
      headers: cfg.headers
    });
    res.json(response.data);
  } catch (error) {
    console.error('GHN Create Order Error:', error.response?.data || error.message);
    res.status(500).json({ message: error.message || 'Không thể tạo đơn vận chuyển GHN', error: error.response?.data });
  }
});

// GET tracking info
router.get('/tracking/:orderCode', async (req, res) => {
  try {
    const cfg = await getGHNConfig();
    const response = await axios.post(`${cfg.baseUrl}/v2/shipping-order/detail`, {
      order_code: req.params.orderCode
    }, {
      headers: cfg.headers
    });
    res.json(response.data);
  } catch (error) {
    console.error('GHN Tracking Error:', error.response?.data || error.message);
    res.status(500).json({ message: error.message || 'Không thể tra cứu đơn vận chuyển', error: error.response?.data });
  }
});

// GET test GHN connection (validate token)
router.get('/test-connection', async (req, res) => {
  try {
    const cfg = await getGHNConfig();
    
    // 1. Check token is valid by fetching provinces
    const response = await axios.get(`${cfg.baseUrl}/master-data/province`, {
      headers: { Token: cfg.token }
    });
    const provinces = response.data?.data || [];
    
    // 2. Try to get shop list to verify ShopId
    let shops = [];
    let shopWarning = '';
    try {
      const shopRes = await axios.get(`${cfg.baseUrl}/v2/shop/all`, {
        headers: { Token: cfg.token },
        params: { offset: 0, limit: 50, client_phone: '' }
      });
      shops = shopRes.data?.data?.shops || [];
      
      if (shops.length > 0) {
        const matchedShop = shops.find(s => String(s._id) === String(cfg.shopId));
        if (!matchedShop) {
          shopWarning = `⚠️ ShopId "${cfg.shopId}" không tìm thấy trên GHN. Các shop có sẵn: ${shops.map(s => `${s._id} (${s.name})`).join(', ')}. Hãy cập nhật ShopId trong cấu hình.`;
        }
      }
    } catch (shopErr) {
      console.warn('Could not fetch shop list:', shopErr.response?.data?.message || shopErr.message);
    }

    res.json({
      success: true,
      message: shopWarning || `Kết nối GHN thành công! (${provinces.length} tỉnh/thành)`,
      shopId: cfg.shopId,
      shopName: cfg.shopName,
      availableShops: shops.map(s => ({ id: s._id, name: s.name, phone: s.phone, address: s.address })),
      warning: shopWarning || undefined
    });
  } catch (error) {
    const ghnError = error.response?.data;
    let message = 'Không thể kết nối GHN';
    if (error.response?.status === 401) {
      message = 'API Token không hợp lệ hoặc đã hết hạn. Vui lòng cập nhật token mới.';
    } else if (error.response?.status === 400) {
      message = `GHN trả lỗi: ${ghnError?.message || 'Bad Request'}`;
    } else if (error.message?.includes('Chưa cấu hình')) {
      message = error.message;
    }
    res.status(error.response?.status || 500).json({
      success: false,
      message,
      error: ghnError || error.message
    });
  }
});

// POST refresh GHN order status
router.post('/refresh-status/:orderCode', async (req, res) => {
  try {
    const cfg = await getGHNConfig();
    const response = await axios.post(`${cfg.baseUrl}/v2/shipping-order/detail`, {
      order_code: req.params.orderCode
    }, {
      headers: cfg.headers
    });
    const ghnData = response.data?.data;
    
    // Update order in DB if found
    const Order = require('../models/Order');
    const order = await Order.findOne({ 'shipping.ghnOrderCode': req.params.orderCode });
    if (order && ghnData) {
      order.shipping.shippingStatus = ghnData.status;
      if (ghnData.expected_delivery_time) {
        order.shipping.expectedDelivery = ghnData.expected_delivery_time;
      }
      if (ghnData.total_fee) {
        order.shipping.shippingFee = ghnData.total_fee;
      }
      // Auto update order status based on GHN status
      if (['delivered', 'return', 'cancel'].includes(ghnData.status)) {
        if (ghnData.status === 'delivered') order.status = 'DELIVERED';
      }
      await order.save();
    }
    
    res.json({ data: ghnData, order });
  } catch (error) {
    console.error('GHN Refresh Status Error:', error.response?.data || error.message);
    res.status(500).json({ message: error.message || 'Không thể cập nhật trạng thái', error: error.response?.data });
  }
});

module.exports = router;
