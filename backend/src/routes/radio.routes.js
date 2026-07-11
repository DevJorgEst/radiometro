import { Router } from 'express'
import { searchStations } from '../controllers/radioController.js'

const router = Router()

router.get('/stations/search', searchStations)

export default router