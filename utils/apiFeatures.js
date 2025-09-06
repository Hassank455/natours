// const qs = require('qs');

// class APIFeatures {
//   constructor(mongooseQuery, req) {
//     this.query = mongooseQuery;
//     this.req = req;
//   }

//   filter() {
//     // const rawQuery = this.req.originalUrl.split('?')[1];
//     // const queryObj = qs.parse(rawQuery);
//     // // وهذا غير منطقي لأن page, sort, limit, fields ليست فلاتر، وإنما خيارات تحكم في النتيجة النهائية.

//     // نشتغل مباشرة على req.query
//     const queryObj = { ...this.req.query };
//     // page, sort, limit, fields ليست فلاتر، وإنما خيارات للتحكّم في شكل النتيجة
//     const excludedFields = ['page', 'sort', 'limit', 'fields'];
//     excludedFields.forEach((el) => delete queryObj[el]);

//     const filters = JSON.parse(
//       JSON.stringify(queryObj).replace(
//         /\b(gte|gt|lte|lt)\b/g,
//         (match) => `$${match}`,
//       ),
//     );

//     this.query = this.query.find(filters);
//     return this;
//   }

//   sort() {
//     if (this.req?.query?.sort) {
//       const sortBy = this.req.query.sort.split(',').join(' ');
//       this.query = this.query.sort(sortBy);
//     } else {
//       this.query = this.query.sort('-createdAt');
//     }
//     return this;
//   }

//   limitFields() {
//     if (this.req?.query?.fields) {
//       const fields = this.req.query.fields.split(',').join(' ');
//       this.query = this.query.select(fields);
//     } else {
//       this.query = this.query.select('-__v');
//     }
//     return this;
//   }

//   paginate() {
//     // *1 convert string to number
//     const page = this.req?.query?.page * 1 || 1;
//     const limit = this.req?.query?.limit * 1 || 100;
//     const skip = (page - 1) * limit;

//     this.query = this.query.skip(skip).limit(limit);

//     return this;
//   }
// }

// module.exports = APIFeatures;

const qs = require('qs');

class APIFeatures {
  constructor(mongooseQuery, req) {
    this.query = mongooseQuery;
    this.req = req;
  }

  // small helper: هل في مفاتيح فيها أقواس []؟
  static _hasBracketKeys(obj) {
    return Object.keys(obj || {}).some(
      (k) => k.includes('[') && k.includes(']'),
    );
  }

  filter() {
    // 1) خذ نسخة من query “بعد” ما تمّ sanitation في app.js
    let baseQuery = this.req.query || {};

    // 2) لو لسا شايف مفاتيح فيها []، استخدم qs.parse من الـ URL الخام كـ fallback
    if (APIFeatures._hasBracketKeys(baseQuery)) {
      const raw = this.req.originalUrl.split('?')[1] || '';
      baseQuery = qs.parse(raw); // يصير ratingsAverage: { gte: '4.7' }
    }

    // 3) احذف مفاتيح التحكم
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    const queryObj = { ...baseQuery };
    excludedFields.forEach((k) => delete queryObj[k]);

    // 4) استبدل operators: gte|gt|lte|lt|ne|in|nin -> $gte ...
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(
      /\b(gte|gt|lte|lt|ne|in|nin)\b/g,
      (m) => `$${m}`,
    );
    let filters = JSON.parse(queryStr);

    // 5) حوّل القيم الرقمية/البولينية بعمق
    const castDeep = (o) => {
      if (Array.isArray(o)) return o.map(castDeep);
      if (o && typeof o === 'object') {
        for (const k of Object.keys(o)) o[k] = castDeep(o[k]);
        return o;
      }
      if (typeof o === 'string') {
        if (o === 'true') return true;
        if (o === 'false') return false;
        if (!isNaN(o) && o.trim() !== '') return Number(o);
      }
      return o;
    };
    filters = castDeep(filters);

    this.query = this.query.find(filters);
    return this;
  }


  sort() {
    if (this.req?.query?.sort) {
      const sortBy = this.req.query.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      // للتجربة مع explain، ألغِ الفرز الافتراضي (أو أضف index على createdAt)
      // this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    if (this.req?.query?.fields) {
      const fields = this.req.query.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    const page = this.req?.query?.page * 1 || 1;
    const limit = this.req?.query?.limit * 1 || 100;
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

module.exports = APIFeatures;
