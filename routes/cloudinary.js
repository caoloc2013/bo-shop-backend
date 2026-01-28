const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'dvzmzifvb',
  api_key: '938842312466289',
  api_secret: 'Xy9pJe6kD6HE5qDpt8TF7j89TVE'
});

// GET /api/cloudinary/images - Lấy danh sách tất cả ảnh
router.get('/images', async (req, res) => {
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      resource_type: 'image',
      max_results: 100,
      prefix: 'bo-shop'
    });
    
    const images = result.resources.map(img => ({
      publicId: img.public_id,
      url: img.secure_url,
      width: img.width,
      height: img.height,
      format: img.format,
      createdAt: img.created_at
    }));
    
    res.json(images);
  } catch (error) {
    console.error('Cloudinary get images error:', error);
    res.status(500).json({ error: 'Không thể lấy danh sách ảnh' });
  }
});

// GET /api/cloudinary/videos - Lấy danh sách tất cả videos
router.get('/videos', async (req, res) => {
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      resource_type: 'video',
      max_results: 50,
      prefix: 'bo-shop'
    });
    
    const videos = result.resources.map(vid => ({
      publicId: vid.public_id,
      url: vid.secure_url,
      duration: vid.duration,
      format: vid.format,
      createdAt: vid.created_at
    }));
    
    res.json(videos);
  } catch (error) {
    console.error('Cloudinary get videos error:', error);
    res.status(500).json({ error: 'Không thể lấy danh sách video' });
  }
});

// GET /api/cloudinary/all - Lấy tất cả media (ảnh + video)
router.get('/all', async (req, res) => {
  try {
    const [imagesResult, videosResult] = await Promise.all([
      cloudinary.api.resources({
        type: 'upload',
        resource_type: 'image',
        max_results: 100,
        prefix: 'bo-shop'
      }),
      cloudinary.api.resources({
        type: 'upload',
        resource_type: 'video',
        max_results: 50,
        prefix: 'bo-shop'
      })
    ]);
    
    const images = imagesResult.resources.map(img => ({
      type: 'image',
      publicId: img.public_id,
      url: img.secure_url,
      width: img.width,
      height: img.height,
      format: img.format,
      createdAt: img.created_at
    }));
    
    const videos = videosResult.resources.map(vid => ({
      type: 'video',
      publicId: vid.public_id,
      url: vid.secure_url,
      duration: vid.duration,
      format: vid.format,
      createdAt: vid.created_at
    }));
    
    res.json([...images, ...videos]);
  } catch (error) {
    console.error('Cloudinary get all error:', error);
    res.status(500).json({ error: 'Không thể lấy danh sách media' });
  }
});

// POST /api/cloudinary/upload - Upload media mới
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Không có file được upload' });
    }

    const isVideo = req.file.mimetype.startsWith('video/');
    const resourceType = isVideo ? 'video' : 'image';
    
    // Convert buffer to base64 data URI
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;
    
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'bo-shop',
      resource_type: resourceType,
      transformation: isVideo ? undefined : [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    });
    
    res.json({
      success: true,
      publicId: result.public_id,
      url: result.secure_url,
      type: resourceType,
      width: result.width,
      height: result.height
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ error: 'Upload thất bại: ' + error.message });
  }
});

// DELETE /api/cloudinary/:publicId - Xóa media
router.delete('/:publicId(*)', async (req, res) => {
  try {
    const { publicId } = req.params;
    const { resourceType = 'image' } = req.query;
    
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    
    if (result.result === 'ok' || result.result === 'not found') {
      res.json({ success: true, message: 'Đã xóa media' });
    } else {
      res.status(400).json({ error: 'Không thể xóa media' });
    }
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    res.status(500).json({ error: 'Xóa thất bại: ' + error.message });
  }
});

module.exports = router;
