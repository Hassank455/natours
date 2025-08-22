const qs = require('qs');

class APIFeatures {
  constructor(mongooseQuery, req) {
    this.query = mongooseQuery;
    this.req = req;
  }

  filter() {
    const rawQuery = this.req.originalUrl.split('?')[1];
    const queryObj = qs.parse(rawQuery);
    // وهذا غير منطقي لأن page, sort, limit, fields ليست فلاتر، وإنما خيارات تحكم في النتيجة النهائية.
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);

    const filters = JSON.parse(
      JSON.stringify(queryObj).replace(
        /\b(gte|gt|lte|lt)\b/g,
        (match) => `$${match}`,
      ),
    );

    this.query = this.query.find(filters);
    return this;
  }

  sort() {
    if (this.req.query.sort) {
      const sortBy = this.req.query.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    if (this.req.query.fields) {
      const fields = this.req.query.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    // *1 convert string to number
    const page = this.req.query.page * 1 || 1;
    const limit = this.req.query.limit * 1 || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;
