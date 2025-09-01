const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

// mergeParams to get access to params from other routers
const router = express.Router({ mergeParams: true });

router.use(authController.protect);

// POST /tour/232441/reviews
// Get /tour/232441/reviews
// POST /reviews

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview,
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview,
  )
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview,
  );
// router.get('/', reviewController.getAllReviews);
// router.post('/create', authController.protect, reviewController.createReview);

module.exports = router;
