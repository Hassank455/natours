const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });

exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

// exports.getTour = catchAsync(async (req, res, next) => {
//   // const isValidObjectId = mongoose.Types.ObjectId.isValid(req.params.id);

//   // if (!isValidObjectId)
//   //   return next(new AppError(`Invalid id ${req.params.id}`, 400));

//   // populate() method to populate the guides field with user data.
//   // const tour = await Tour.findById(req.params.id).populate('guides');
//   const tour = await Tour.findById(req.params.id).populate('reviews');

//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404));
//   }

//   res.status(200).json({
//     status: 'success',
//     results: tour.length,
//     data: {
//       tour,
//     },
//   });
// });
// ---------------------------

// exports.createTour = catchAsync(async (req, res, next) => {
//   const newTour = await Tour.create(req.body);

//   res.status(201).json({
//     status: 'success',
//     data: {
//       tour: newTour,
//     },
//   });
// });
// ---------------------------
// exports.updateTour = catchAsync(async (req, res, next) => {
//   const isValidObjectId = mongoose.Types.ObjectId.isValid(req.params.id);

//   if (!isValidObjectId)
//     return next(new AppError(`The tour is not found with the id.`, 404));
//   const newTour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//     new: true,
//     runValidators: true,
//   });
//   res.status(200).json({
//     status: 'success',
//     data: {
//       newTour,
//     },
//   });
// });
// ---------------------------

// exports.deleteTour = catchAsync(async (req, res, next) => {
//   const isValidObjectId = mongoose.Types.ObjectId.isValid(req.params.id);

//   if (!isValidObjectId)
//     return next(new AppError(`The tour is not found with the id.`, 404));
//   await Tour.findByIdAndDelete(req.params.id);
//   res.status(204).json({
//     status: 'success',
//     data: null,
//   });
// });

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      // المرحلة الأولى: تصفية الجولات اللي تقييمها المتوسط أعلى من أو يساوي 4.5
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    // المرحلة الثانية: تجميع حسب مستوى الصعوبة وتحويله لحروف كبيرة
    {
      $group: {
        _id: { $toUpper: '$difficulty' }, // اسم المجموعة هو مستوى الصعوبة (مثل: EASY، MEDIUM...)
        numTours: { $sum: 1 }, // عدد الجولات في كل مجموعة
        numRatings: { $sum: '$ratingsQuantity' }, // مجموع عدد التقييمات
        avgRating: { $avg: '$ratingsAverage' }, // متوسط التقييم
        avgPrice: { $avg: '$price' }, // متوسط السعر
        minPrice: { $min: '$price' }, // أقل سعر
        maxPrice: { $max: '$price' }, // أعلى سعر
      },
    },
    {
      // المرحلة الثالثة: ترتيب النتائج حسب متوسط السعر تصاعديًا
      $sort: { avgPrice: 1 },
    },
    // ممكن تضيف مرحلة match أخرى لتصفية مثلاً الصعوبة السهلة

    // {
    //   $match: { _id: { $ne: 'EASY' } },
    // },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;

  const plan = await Tour.aggregate([
    {
      // المرحلة الأولى: تفجير مصفوفة startDates إلى تواريخ مفردة
      $unwind: '$startDates',
    },
    {
      // المرحلة الثانية: تصفية التواريخ ضمن السنة المحددة
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: { month: '$_id' },
    },
    {
      $project: {
        _id: 0,
      },
    },
    {
      $sort: { numTourStarts: -1 },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/233/center/34.111745,-118.113491/unit/mi

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    return next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400,
      ),
    );
  }

  const tours = await Tour.find({
    startLocation: {
      $geoWithin: { $centerSphere: [[lng, lat], radius] },
    },
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    return next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400,
      ),
    );
  }

  const distances = await Tour.aggregate([
    {
      // geoNear for calculating distances
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [parseFloat(lng), parseFloat(lat)],
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier, // 0.001 for km, 0.000621371 for mi
      },
    },
    // project to show only distance and name
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});
