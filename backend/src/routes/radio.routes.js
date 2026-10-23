import { Router } from 'express'
import { searchStations, listCountries } from '../controllers/radioController.js'

const router = Router()

router.get('/stations/search', searchStations)
router.get('/stations/countries', listCountries)

export default router