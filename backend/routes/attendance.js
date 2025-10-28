import express from 'express';
import { 
  createInitialAttendance, 
  updateAttendanceByAI,
  verifyAttendanceWithAI,
  verifyAttendanceWithPhotos,
  hybridAttendanceVerification
} from '../controllers/attendanceController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Initialize attendance records (all Absent by default)
router.post('/session', protect, createInitialAttendance);

// Update with simple student ID list
router.put('/mark', protect, updateAttendanceByAI);

// New verification endpoints
router.post('/verify-with-ai', protect, verifyAttendanceWithAI);
router.post('/verify-with-photos', protect, verifyAttendanceWithPhotos);
router.post('/hybrid-verify', protect, hybridAttendanceVerification);

// Get attendance log
router.get('/session', protect, getSessionAttendance);

export default router;