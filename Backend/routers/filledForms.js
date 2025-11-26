import express from 'express';
import {
  createFilledForm,
  getFilledForms,
  getFormStatistics,
  getFormStatisticsByAgent,
  getFilledFormById,
  updateFilledForm,
  deleteFilledForm
} from '../controllers/filledFormController.js';
import { getFormCountsByAgent } from '../controllers/controller/agentController.js';

const router = express.Router();

// Create new filled form
router.post('/', createFilledForm);

// Get all filled forms with filtering
router.get('/', getFilledForms);

// Get form statistics
router.get('/statistics', getFormStatistics);

// Get form statistics by agent
router.get('/statistics/agent', getFormStatisticsByAgent);

// Get form counts by agent ID
router.get('/counts/:agentId', getFormCountsByAgent);

// Get single filled form
router.get('/:id', getFilledFormById);

// Update filled form
router.put('/:id', updateFilledForm);

// Delete filled form
router.delete('/:id', deleteFilledForm);

export default router;