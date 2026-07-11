import { Router } from 'express'
import { authMiddleware } from '../middlewares/authMiddleware.js'
import {
  getFavorites,
  addFavorite,
  removeFavorite,
} from '../controllers/favoritesController.js'

const router = Router()

router.get('/', authMiddleware, getFavorites)
router.post('/', authMiddleware, addFavorite)
router.delete('/:id', authMiddleware, removeFavorite)

export default router
