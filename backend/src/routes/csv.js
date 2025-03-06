import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse';
import { Readable } from 'stream';
import { authenticateToken } from '../middleware/auth.js';
import CsvData from '../models/CsvData.js';

const router = express.Router();

// Configure multer for CSV upload
const upload = multer({
  limits: {
    fileSize: 1024 * 1024 * 50, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'text/csv') {
      return cb(new Error('Only CSV files are allowed'));
    }
    cb(null, true);
  }
});

// Upload CSV
router.post('/upload', authenticateToken, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const results = [];
    const stream = Readable.from(req.file.buffer.toString());
    
    const parser = stream.pipe(parse({
      columns: true,
      skip_empty_lines: true
    }));

    for await (const record of parser) {
      results.push(record);
      
      // Process in batches of 1000
      if (results.length === 1000) {
        await CsvData.create({
          userId: req.user._id,
          fileName: req.file.originalname,
          data: results
        });
        results.length = 0; // Clear the array
      }
    }

    // Save any remaining records
    if (results.length > 0) {
      await CsvData.create({
        userId: req.user._id,
        fileName: req.file.originalname,
        data: results
      });
    }

    res.json({ message: 'CSV file processed successfully' });
  } catch (error) {
    next(error);
  }
});

// Get CSV data with pagination
router.get('/data', authenticateToken, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const data = await CsvData.find({ userId: req.user._id })
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await CsvData.countDocuments({ userId: req.user._id });

    res.json({
      data,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;